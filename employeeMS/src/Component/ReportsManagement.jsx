import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { BarChart3, Download, FileSpreadsheet, Printer, RefreshCw } from "lucide-react";

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

const localDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const today = localDateString(new Date());
const firstOfMonth = `${today.slice(0, 7)}-01`;

const reports = {
  workforce: {
    label: "Workforce",
    dataKey: "employeeStatuses",
    columns: [
      ["department_name", "Department"],
      ["employment_status", "Employment"],
      ["approval_status", "Approval"],
      ["employee_count", "Employees"],
    ],
  },
  attendance: {
    label: "Attendance",
    dataKey: "attendance",
    columns: [
      ["date", "Date"],
      ["employee_name", "Employee"],
      ["department_name", "Department"],
      ["clock_in_time", "Clock in"],
      ["clock_out_time", "Clock out"],
      ["status", "Status"],
    ],
  },
  absence: {
    label: "Absence estimate",
    dataKey: "attendanceByDay",
    columns: [
      ["report_date", "Weekday"],
      ["expected_count", "Expected employees"],
      ["present_count", "With a clock-in"],
      ["approved_leave_count", "On approved leave"],
      ["absent_estimate", "No clock-in estimate"],
    ],
  },
  leave: {
    label: "Leave requests",
    dataKey: "leaves",
    columns: [
      ["employee_name", "Employee"],
      ["department_name", "Department"],
      ["leave_type", "Type"],
      ["start_date", "From"],
      ["end_date", "To"],
      ["status", "Status"],
    ],
  },
  payroll: {
    label: "Payroll",
    dataKey: "payrollSummary",
    columns: [
      ["period_start", "Period start"],
      ["period_end", "Period end"],
      ["employee_count", "Employees paid"],
      ["total_net_pay", "Net payroll"],
      ["currency_code", "Currency"],
    ],
  },
  performance: {
    label: "Performance",
    dataKey: "performance",
    columns: [
      ["employee_name", "Employee"],
      ["department_name", "Department"],
      ["period_start", "Period start"],
      ["period_end", "Period end"],
      ["rating", "Rating / 5"],
      ["status", "Status"],
    ],
  },
};

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

const csvValue = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
};

const ReportsManagement = () => {
  const [range, setRange] = useState({ from: firstOfMonth, to: today });
  const [appliedRange, setAppliedRange] = useState({ from: firstOfMonth, to: today });
  const [report, setReport] = useState(null);
  const [activeReport, setActiveReport] = useState("workforce");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = useCallback(async (period) => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`${apiBaseUrl}/reports/summary`, {
        params: period,
        withCredentials: true,
      });
      if (!response.data?.Status) {
        throw new Error(response.data?.Error || "Could not load reports.");
      }
      setReport(response.data.Result);
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not load reports.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport(appliedRange);
  }, [appliedRange, loadReport]);

  const currentDefinition = reports[activeReport];
  const currentRows = report?.[currentDefinition.dataKey] || [];

  const workforceTotals = useMemo(() => {
    const employees = report?.employeeStatuses || [];
    return employees.reduce((total, row) => (
      row.employment_status === "active" && row.approval_status === "approved"
        ? total + row.employee_count
        : total
    ), 0);
  }, [report]);

  const reportTotals = useMemo(() => {
    const days = report?.attendanceByDay || [];
    return {
      present: days.reduce((total, row) => total + row.present_count, 0),
      absent: days.reduce((total, row) => total + row.absent_estimate, 0),
      pendingLeaves: (report?.leaveSummary || [])
        .filter((row) => row.status === "pending")
        .reduce((total, row) => total + row.request_count, 0),
    };
  }, [report]);

  const departmentTotals = useMemo(() => {
    const totals = new Map();
    for (const row of report?.employeeStatuses || []) {
      totals.set(row.department_name, (totals.get(row.department_name) || 0) + row.employee_count);
    }
    return [...totals.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
      .slice(0, 8);
  }, [report]);

  const maxDepartmentCount = Math.max(1, ...departmentTotals.map((row) => row.count));
  const maxDailyAttendance = Math.max(1, ...(report?.attendanceByDay || []).map((row) => row.present_count));

  const exportCsv = () => {
    if (!currentRows.length) return;
    const headers = currentDefinition.columns.map(([, label]) => label);
    const lines = [
      headers.map(csvValue).join(","),
      ...currentRows.map((row) => currentDefinition.columns.map(([key]) => csvValue(row[key])).join(",")),
    ];
    const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ems-${activeReport}-${appliedRange.from}-to-${appliedRange.to}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleGenerate = (event) => {
    event.preventDefault();
    if (!range.from || !range.to || range.from > range.to) {
      setError("Choose a valid date range.");
      return;
    }
    setAppliedRange({ ...range });
  };

  const truncationKey = activeReport === "leave" ? "leaves" : activeReport;
  const isTruncated = report?.truncated?.[truncationKey] === true;

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .reports-print-area, .reports-print-area * { visibility: visible; }
          .reports-print-area { position: absolute; inset: 0; width: 100%; padding: 0 !important; color: #111827 !important; background: #fff !important; }
          .reports-no-print { display: none !important; }
        }
      `}</style>
      <div className="reports-print-area space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Organization insights</p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
              <BarChart3 size={25} /> Reports & analytics
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Workforce, attendance, leave, payroll, and performance reporting.
            </p>
          </div>
          <form onSubmit={handleGenerate} className="reports-no-print flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
              From
              <input type="date" value={range.from} max={range.to || undefined} onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))} required className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800" />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
              To
              <input type="date" value={range.to} min={range.from || undefined} max={today} onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))} required className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800" />
            </label>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Generate
            </button>
          </form>
        </header>

        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Active employees", workforceTotals, "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"],
            ["Pending leave requests", reportTotals.pendingLeaves, "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"],
            ["Recorded attendance", reportTotals.present, "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"],
            ["Estimated absences", reportTotals.absent, "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"],
          ].map(([label, value, color]) => (
            <article key={label} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
              <p className={`mt-2 inline-flex rounded-lg px-3 py-1 text-2xl font-bold ${color}`}>{loading ? "—" : numberFormat.format(value)}</p>
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">{label.startsWith("Active") ? "Current workforce" : `${appliedRange.from} to ${appliedRange.to}`}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="font-bold text-gray-900 dark:text-white">Employees by department</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Current employee distribution</p>
            {departmentTotals.length ? (
              <div className="mt-5 space-y-3">
                {departmentTotals.map((row) => (
                  <div key={row.name} className="grid grid-cols-[minmax(90px,130px)_1fr_36px] items-center gap-3 text-sm">
                    <span className="truncate text-gray-600 dark:text-gray-300" title={row.name}>{row.name}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                      <span className="block h-full rounded-full bg-blue-600" style={{ width: `${(row.count / maxDepartmentCount) * 100}%` }} />
                    </span>
                    <span className="text-right font-semibold text-gray-800 dark:text-gray-200">{row.count}</span>
                  </div>
                ))}
              </div>
            ) : <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">No employee data available.</p>}
          </article>

          <article className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="font-bold text-gray-900 dark:text-white">Attendance trend</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Employees with a valid clock-in on weekdays</p>
            {report?.attendanceByDay?.length ? (
              <div className="mt-5 flex h-36 items-end gap-1 overflow-x-auto border-b border-gray-100 pb-1 dark:border-gray-700">
                {report.attendanceByDay.slice(-30).map((row) => (
                  <div key={row.report_date} className="group flex h-full min-w-5 flex-1 items-end justify-center">
                    <span title={`${row.report_date}: ${row.present_count} present`} className="w-full max-w-5 rounded-t bg-blue-500 transition-colors group-hover:bg-blue-700" style={{ height: `${Math.max(3, (row.present_count / maxDailyAttendance) * 100)}%` }} />
                  </div>
                ))}
              </div>
            ) : <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">No weekdays in the selected range.</p>}
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">The chart shows the latest 30 weekdays in the selected range.</p>
          </article>
        </section>

        <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="reports-no-print flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-700">
            <div className="flex flex-wrap gap-2">
              {Object.entries(reports).map(([key, definition]) => (
                <button key={key} type="button" onClick={() => setActiveReport(key)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${activeReport === key ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"}`}>
                  {definition.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={exportCsv} disabled={loading || currentRows.length === 0} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                <FileSpreadsheet size={16} /> Export Excel CSV
              </button>
              <button type="button" onClick={() => window.print()} disabled={loading || !report} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                <Printer size={16} /> Print / Save PDF
              </button>
            </div>
          </div>
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700">
            <h2 className="font-bold text-gray-900 dark:text-white">{currentDefinition.label}</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {activeReport === "workforce" ? "Current employee counts by department and account status." : `Reporting period: ${appliedRange.from} to ${appliedRange.to}`}
            </p>
          </div>
          {activeReport === "absence" && (
            <p className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              Absence is an estimate based on today’s active approved workforce, weekdays, recorded clock-ins, and approved leave. Public holidays and historical employment dates are not configured.
            </p>
          )}
          {activeReport === "payroll" && (
            <p className="border-b border-blue-100 bg-blue-50 px-5 py-3 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
              Payroll runs are included when their finalized pay period overlaps the selected dates. Totals remain grouped by run and currency.
            </p>
          )}
          {loading ? (
            <p role="status" className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">Generating reports…</p>
          ) : !currentRows.length ? (
            <p className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No {currentDefinition.label.toLowerCase()} data found for this report.</p>
          ) : (
            <>
              {isTruncated && <p className="px-5 pt-4 text-xs text-amber-700 dark:text-amber-300">Showing the first 1,000 records. Narrow the date range to include all details.</p>}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-left text-sm dark:divide-gray-700">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-700/50 dark:text-gray-300">
                    <tr>{currentDefinition.columns.map(([, label]) => <th key={label} className="whitespace-nowrap px-5 py-3 font-semibold">{label}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {currentRows.map((row, index) => (
                      <tr key={row.id || row.payroll_run_id || row.report_date || `${row.department_name}-${row.status}-${index}`} className="text-gray-700 dark:text-gray-200">
                        {currentDefinition.columns.map(([key]) => (
                          <td key={key} className="whitespace-nowrap px-5 py-3">
                            {row[key] === null || row[key] === undefined || row[key] === ""
                              ? "—"
                              : typeof row[key] === "number"
                                ? numberFormat.format(row[key])
                                : String(row[key]).replaceAll("_", " ")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <div className="reports-no-print border-t border-gray-100 px-5 py-3 text-xs text-gray-400 dark:border-gray-700 dark:text-gray-500">
            <Download size={13} className="mr-1 inline" /> CSV files open in Excel. The print action supports saving this report as PDF.
          </div>
        </section>
      </div>
    </div>
  );
};

export default ReportsManagement;
