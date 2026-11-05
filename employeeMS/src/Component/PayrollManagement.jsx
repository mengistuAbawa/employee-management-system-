import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  BadgeCheck,
  CalendarDays,
  CircleDollarSign,
  FileText,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const periodForMonth = (month) => {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const [year, monthNumber] = month.split("-").map(Number);
  const end = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return {
    period_start: `${month}-01`,
    period_end: `${month}-${String(end).padStart(2, "0")}`,
  };
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const formatMoney = (value, currency) => {
  const amount = Number(value || 0);
  const currencyCode = String(currency || "USD").trim();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};

const statusClass = {
  draft: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  finalized: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
};

const PayrollManagement = () => {
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [month, setMonth] = useState(currentMonth);
  const [currency, setCurrency] = useState("USD");
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [loadingRun, setLoadingRun] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingItem, setSavingItem] = useState(null);
  const selectedRunIdRef = useRef(null);

  const fetchRun = useCallback(async (runId) => {
    setLoadingRun(true);
    try {
      const response = await axios.get(`${apiBaseUrl}/payroll/runs/${runId}`, { withCredentials: true });
      if (!response.data?.Status) throw new Error(response.data?.Error || "Could not load payroll details.");
      selectedRunIdRef.current = response.data.Result.id;
      setSelectedRun(response.data.Result);
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not load payroll details.");
    } finally {
      setLoadingRun(false);
    }
  }, []);

  const fetchRuns = useCallback(async (preferredRunId) => {
    setLoadingRuns(true);
    try {
      const response = await axios.get(`${apiBaseUrl}/payroll/runs`, {
        params: { limit: 100, offset: 0 },
        withCredentials: true,
      });
      if (!response.data?.Status) throw new Error(response.data?.Error || "Could not load payroll runs.");
      const rows = response.data.Result || [];
      setRuns(rows);
      if (preferredRunId || (selectedRunIdRef.current && rows.some((run) => run.id === selectedRunIdRef.current))) {
        await fetchRun(preferredRunId || selectedRunIdRef.current);
      } else if (rows.length) {
        await fetchRun(rows[0].id);
      } else {
        selectedRunIdRef.current = null;
        setSelectedRun(null);
      }
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not load payroll runs.");
    } finally {
      setLoadingRuns(false);
    }
  }, [fetchRun]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const totals = useMemo(() => {
    const items = selectedRun?.items || [];
    return {
      employees: items.length,
      gross: items.reduce((sum, item) => sum + Number(item.base_pay) + Number(item.overtime_pay) + Number(item.bonus), 0),
      deductions: items.reduce((sum, item) => sum + Number(item.deductions), 0),
      net: items.reduce((sum, item) => sum + Number(item.net_pay), 0),
    };
  }, [selectedRun]);

  const handleCreateRun = async (event) => {
    event.preventDefault();
    const period = periodForMonth(month);
    if (!period) {
      setError("Choose a valid payroll month.");
      return;
    }
    setCreating(true);
    setError("");
    setNotice("");
    try {
      const response = await axios.post(`${apiBaseUrl}/payroll/runs`, {
        ...period,
        currency_code: currency.trim().toUpperCase(),
      }, { withCredentials: true });
      if (!response.data?.Status) throw new Error(response.data?.Error || "Could not create payroll run.");
      setNotice("Draft payroll run created. Review and update its line items before finalizing.");
      await fetchRuns(response.data.Result.run.id);
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not create payroll run.");
    } finally {
      setCreating(false);
    }
  };

  const handleSaveItem = async (event, item) => {
    event.preventDefault();
    setSavingItem(item.id);
    setError("");
    setNotice("");
    const formData = new FormData(event.currentTarget);
    const amount = (name) => formData.get(name);
    try {
      const response = await axios.put(
        `${apiBaseUrl}/payroll/runs/${selectedRun.id}/items/${item.id}`,
        {
          base_pay: amount("base_pay"),
          overtime_pay: amount("overtime_pay"),
          bonus: amount("bonus"),
          deductions: amount("deductions"),
        },
        { withCredentials: true },
      );
      if (!response.data?.Status) throw new Error(response.data?.Error || "Could not save payroll item.");
      setNotice(`Payroll details saved for ${item.full_name}.`);
      await fetchRuns(selectedRun.id);
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not save payroll item.");
    } finally {
      setSavingItem(null);
    }
  };

  const handleFinalize = async () => {
    if (!selectedRun || selectedRun.status !== "draft") return;
    if (!window.confirm("Finalize this payroll run? Finalized amounts cannot be changed.")) return;
    setError("");
    setNotice("");
    try {
      const response = await axios.post(
        `${apiBaseUrl}/payroll/runs/${selectedRun.id}/finalize`,
        {},
        { withCredentials: true },
      );
      if (!response.data?.Status) throw new Error(response.data?.Error || "Could not finalize payroll.");
      setNotice("Payroll finalized and payslip records generated.");
      await fetchRuns(selectedRun.id);
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not finalize payroll.");
    }
  };

  const handleDeleteDraft = async () => {
    if (!selectedRun || selectedRun.status !== "draft") return;
    if (!window.confirm("Delete this draft payroll run and its line items?")) return;
    setError("");
    setNotice("");
    try {
      const response = await axios.delete(`${apiBaseUrl}/payroll/runs/${selectedRun.id}`, { withCredentials: true });
      if (!response.data?.Status) throw new Error(response.data?.Error || "Could not delete payroll draft.");
      selectedRunIdRef.current = null;
      setSelectedRun(null);
      setNotice("Draft payroll run deleted.");
      await fetchRuns();
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not delete payroll draft.");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Compensation operations</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <CircleDollarSign size={25} /> Payroll management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create monthly drafts, review amounts, and lock finalized payroll.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchRuns(selectedRun?.id)}
          disabled={loadingRuns}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <RefreshCw size={16} className={loadingRuns ? "animate-spin" : ""} /> Refresh
        </button>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">{notice}</div>}

      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays size={19} className="text-blue-600 dark:text-blue-400" />
          <h2 className="font-bold text-gray-900 dark:text-white">Create monthly payroll draft</h2>
        </div>
        <form onSubmit={handleCreateRun} className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
            Pay month
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              required
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
            Currency
            <input
              value={currency}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              required
              minLength={3}
              maxLength={3}
              pattern="[A-Za-z]{3}"
              className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 uppercase text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </label>
          <button type="submit" disabled={creating} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {creating ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}
            {creating ? "Creating…" : "Create draft"}
          </button>
          <p className="basis-full text-xs text-gray-500 dark:text-gray-400">
            Each eligible employee receives one full monthly base salary. Overtime, bonus, and deductions are editable on the draft.
          </p>
        </form>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(260px,0.75fr)_minmax(0,2fr)]">
        <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700">
            <h2 className="font-bold text-gray-900 dark:text-white">Payroll runs</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Select a run to review the employee totals.</p>
          </div>
          {loadingRuns ? (
            <p role="status" className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading payroll runs…</p>
          ) : runs.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No payroll runs yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {runs.map((run) => (
                <li key={run.id}>
                  <button
                    type="button"
                    onClick={() => fetchRun(run.id)}
                    className={`w-full px-5 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedRun?.id === run.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white">{formatDate(run.period_start)} – {formatDate(run.period_end)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusClass[run.status] || statusClass.cancelled}`}>{run.status}</span>
                    </span>
                    <span className="mt-1 block text-sm text-gray-500 dark:text-gray-400">
                      {Number(run.employee_count).toLocaleString()} employees · {formatMoney(run.total_net_pay, run.currency_code)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="min-w-0 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {!selectedRun ? (
            <div className="px-5 py-16 text-center text-sm text-gray-500 dark:text-gray-400">
              <FileText size={28} className="mx-auto mb-3 opacity-60" />
              Create or select a payroll run to see its details.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-700">
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">Pay period: {formatDate(selectedRun.period_start)} – {formatDate(selectedRun.period_end)}</h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {totals.employees} employees · Gross {formatMoney(totals.gross, selectedRun.currency_code)} · Deductions {formatMoney(totals.deductions, selectedRun.currency_code)} · Net {formatMoney(totals.net, selectedRun.currency_code)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedRun.status === "draft" ? (
                    <>
                      <button type="button" onClick={handleDeleteDraft} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40">
                        <Trash2 size={15} /> Delete draft
                      </button>
                      <button type="button" onClick={handleFinalize} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                        <BadgeCheck size={16} /> Finalize
                      </button>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                      <BadgeCheck size={16} /> Finalized
                    </span>
                  )}
                </div>
              </div>
              {loadingRun ? (
                <p role="status" className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading payroll details…</p>
              ) : selectedRun.items?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[970px] text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">
                      <tr>
                        <th className="px-4 py-3">Employee</th>
                        <th className="px-3 py-3 text-right">Base</th>
                        <th className="px-3 py-3 text-right">Overtime</th>
                        <th className="px-3 py-3 text-right">Bonus</th>
                        <th className="px-3 py-3 text-right">Deductions</th>
                        <th className="px-3 py-3 text-right">Net pay</th>
                        {selectedRun.status === "draft" && <th className="px-4 py-3">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {selectedRun.items.map((item) => (
                        <tr key={item.id} className="text-gray-700 dark:text-gray-200">
                          <td className="px-4 py-3">
                            <span className="block font-semibold text-gray-900 dark:text-white">{item.full_name}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{item.department_name || item.email}</span>
                          </td>
                          {selectedRun.status === "draft" ? (
                            <>
                              {[
                                ["base_pay", item.base_pay],
                                ["overtime_pay", item.overtime_pay],
                                ["bonus", item.bonus],
                                ["deductions", item.deductions],
                              ].map(([name, value]) => (
                                <td key={name} className="px-3 py-3">
                                  <input
                                    aria-label={`${name.replace("_", " ")} for ${item.full_name}`}
                                    name={name}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    defaultValue={value}
                                    required
                                    form={`payroll-item-${item.id}`}
                                    className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-right text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                                  />
                                </td>
                              ))}
                              <td className="px-3 py-3 text-right font-bold text-gray-900 dark:text-white">{formatMoney(item.net_pay, selectedRun.currency_code)}</td>
                              <td className="px-4 py-3">
                                <form
                                  id={`payroll-item-${item.id}`}
                                  onSubmit={(event) => handleSaveItem(event, item)}
                                  className="text-right"
                                >
                                <button
                                  type="submit"
                                  disabled={savingItem === item.id}
                                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                  {savingItem === item.id ? "Saving…" : "Save amounts"}
                                </button>
                                </form>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-3 text-right">{formatMoney(item.base_pay, selectedRun.currency_code)}</td>
                              <td className="px-3 py-3 text-right">{formatMoney(item.overtime_pay, selectedRun.currency_code)}</td>
                              <td className="px-3 py-3 text-right">{formatMoney(item.bonus, selectedRun.currency_code)}</td>
                              <td className="px-3 py-3 text-right">{formatMoney(item.deductions, selectedRun.currency_code)}</td>
                              <td className="px-3 py-3 text-right font-bold">{formatMoney(item.net_pay, selectedRun.currency_code)}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">This run has no payroll items.</p>
              )}
              {selectedRun.status === "draft" && (
                <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  Net pay is calculated as base pay + overtime + bonus − deductions. Finalized payroll is immutable.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default PayrollManagement;
