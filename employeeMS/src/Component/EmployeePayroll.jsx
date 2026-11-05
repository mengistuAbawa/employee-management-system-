import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { BadgeCheck, FileText, Wallet } from "lucide-react";

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

const formatDate = (date) => {
  if (!date) return "—";
  const parsedDate = new Date(`${String(date).slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsedDate.getTime())
    ? "—"
    : parsedDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const formatMoney = (amount, currency) => new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: String(currency || "USD").trim(),
  maximumFractionDigits: 2,
}).format(Number(amount || 0));

const EmployeePayroll = () => {
  const [payroll, setPayroll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payslipError, setPayslipError] = useState("");
  const [payslipLoading, setPayslipLoading] = useState(null);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const employeeId = localStorage.getItem("employeeId");

  const fetchPayroll = useCallback(async () => {
    if (!employeeId) {
      setError("Employee account information is unavailable. Please sign in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${apiBaseUrl}/employee/payroll/${employeeId}`, { withCredentials: true });
      if (!response.data?.Status) {
        throw new Error(response.data?.Error || "Could not load payroll records.");
      }
      setPayroll(response.data.Result || []);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not load payroll records.");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchPayroll();
  }, [fetchPayroll]);

  const handleViewPayslip = async (record) => {
    setPayslipLoading(record.id);
    setPayslipError("");
    try {
      const response = await axios.get(
        `${apiBaseUrl}/employee/payroll/${employeeId}/payslips/${record.payslip_id}`,
        { withCredentials: true },
      );
      if (!response.data?.Status) {
        throw new Error(response.data?.Error || "Could not load payslip.");
      }
      setSelectedPayslip(response.data.Result);
    } catch (requestError) {
      setPayslipError(requestError.response?.data?.Error || requestError.message || "Could not load payslip.");
    } finally {
      setPayslipLoading(null);
    }
  };

  const latestPayroll = payroll[0];
  const metrics = [
    {
      label: "Latest net pay",
      value: latestPayroll ? formatMoney(latestPayroll.net_pay, latestPayroll.currency) : "—",
      icon: <Wallet size={21} />,
      color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    },
    {
      label: "Finalized payroll periods",
      value: payroll.length.toLocaleString(),
      icon: <BadgeCheck size={21} />,
      color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    },
    {
      label: "Latest payslip",
      value: latestPayroll?.payslip_id ? "Generated" : latestPayroll ? "Not generated" : "—",
      icon: <FileText size={21} />,
      color: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Personal records</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <Wallet size={24} /> Payroll
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">View your finalized pay periods and payslip status.</p>
        </div>
        <Link to="/employee/dashboard" className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">Back to dashboard</Link>
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <span>{error}</span>
          <button type="button" onClick={fetchPayroll} disabled={loading} className="font-semibold underline disabled:opacity-50">Try again</button>
        </div>
      )}
      {payslipError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{payslipError}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${metric.color}`}>{metric.icon}</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{metric.label}</p>
            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{metric.value}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700">
          <h2 className="font-bold text-gray-900 dark:text-white">Payroll history</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Only finalized payroll is shown here.</p>
        </div>
        {loading ? (
          <p role="status" className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">Loading payroll records…</p>
        ) : payroll.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No finalized payroll records are available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">Pay period</th>
                  <th className="px-4 py-3 text-right">Base pay</th>
                  <th className="px-4 py-3 text-right">Additional pay</th>
                  <th className="px-4 py-3 text-right">Deductions</th>
                  <th className="px-4 py-3 text-right">Net pay</th>
                  <th className="px-4 py-3">Payslip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {payroll.map((record) => (
                  <tr key={record.id} className="text-gray-700 dark:text-gray-200">
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatDate(record.period_start)} – {formatDate(record.period_end)}
                    </td>
                    <td className="px-4 py-3 text-right">{formatMoney(record.base_pay, record.currency)}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(Number(record.overtime_pay) + Number(record.bonus), record.currency)}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(record.deductions, record.currency)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatMoney(record.net_pay, record.currency)}</td>
                    <td className="px-4 py-3">
                      {record.payslip_id ? (
                        <button
                          type="button"
                          onClick={() => handleViewPayslip(record)}
                          disabled={payslipLoading === record.id}
                          className="text-xs font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900 disabled:opacity-50 dark:text-blue-300 dark:hover:text-blue-200"
                        >
                          {payslipLoading === record.id ? "Loading…" : `View payslip · ${formatDate(record.payslip_generated_at)}`}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">Not generated</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #payslip-print, #payslip-print * { visibility: visible !important; }
              #payslip-print { position: fixed !important; inset: 0 !important; overflow: visible !important; background: #fff !important; color: #111 !important; box-shadow: none !important; }
              .payslip-no-print { display: none !important; }
            }
          `}</style>
          <section
            id="payslip-print"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payslip-title"
            className="w-full max-w-xl rounded-2xl bg-white p-6 text-gray-900 shadow-2xl"
          >
            <div className="payslip-no-print mb-5 flex items-center justify-between gap-3">
              <h2 id="payslip-title" className="text-xl font-bold">Payslip</h2>
              <button type="button" onClick={() => setSelectedPayslip(null)} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-100">Close</button>
            </div>
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-lg font-bold">{selectedPayslip.full_name}</h3>
              <p className="text-sm text-gray-600">{selectedPayslip.email}{selectedPayslip.department_name ? ` · ${selectedPayslip.department_name}` : ""}</p>
              <p className="mt-3 text-sm font-medium">Pay period: {formatDate(selectedPayslip.period_start)} – {formatDate(selectedPayslip.period_end)}</p>
            </div>
            <dl className="divide-y divide-gray-200">
              {[
                ["Base pay", selectedPayslip.base_pay],
                ["Overtime", selectedPayslip.overtime_pay],
                ["Bonus", selectedPayslip.bonus],
                ["Deductions", -Number(selectedPayslip.deductions)],
              ].map(([label, amount]) => (
                <div key={label} className="flex justify-between gap-4 py-3 text-sm">
                  <dt>{label}</dt>
                  <dd>{formatMoney(amount, selectedPayslip.currency)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 py-4 text-base font-bold">
                <dt>Net pay</dt>
                <dd>{formatMoney(selectedPayslip.net_pay, selectedPayslip.currency)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-gray-500">Generated {new Date(selectedPayslip.generated_at).toLocaleString()}</p>
            <div className="payslip-no-print mt-5 flex justify-end">
              <button type="button" onClick={() => window.print()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                Print / Save as PDF
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default EmployeePayroll;
