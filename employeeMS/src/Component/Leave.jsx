import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { ChevronLeft, ChevronRight } from "lucide-react";

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");
const pageSize = 100;

const getStatusBadge = (status) => {
  const styles = {
    approved: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
  };
  const label = status ? status[0].toUpperCase() + status.slice(1) : "Unknown";
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-700"}`}>{label}</span>;
};

const formatDate = (date) => new Date(`${String(date).slice(0, 10)}T00:00:00`).toLocaleDateString();

const Leave = () => {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    employee_id: "",
    leave_type: "Annual",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceSaving, setBalanceSaving] = useState(false);
  const [balanceForm, setBalanceForm] = useState({
    employee_id: "",
    leave_type_id: "",
    balance_year: String(new Date().getFullYear()),
    entitled_days: "",
  });

  const fetchLeaves = useCallback(async (nextOffset) => {
    setListLoading(true);
    try {
      const response = await axios.get(`${apiBaseUrl}/leaves`, {
        params: { limit: pageSize, offset: nextOffset },
        withCredentials: true,
      });
      if (!response.data?.Status) {
        throw new Error(response.data?.Error || "Could not load leave requests");
      }
      setLeaves(response.data.Result || []);
      setTotal(Number(response.data.Meta?.total || 0));
      setOffset(nextOffset);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not load leave requests");
    } finally {
      setListLoading(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await axios.get(`${apiBaseUrl}/auth/employee`, { withCredentials: true });
      if (!response.data?.Status) {
        throw new Error(response.data?.Error || "Could not load employees");
      }
      setEmployees(response.data.Result || []);
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not load employees");
    }
  }, []);

  useEffect(() => {
    fetchLeaves(0);
    fetchEmployees();
  }, [fetchEmployees, fetchLeaves]);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const loadLeaveBalances = async (employeeId, year, selectedTypeId = "") => {
    if (!employeeId) {
      setLeaveBalances([]);
      setBalanceForm((current) => ({ ...current, employee_id: "", leave_type_id: "", entitled_days: "" }));
      return;
    }
    setBalanceLoading(true);
    try {
      const response = await axios.get(`${apiBaseUrl}/leave-balances/${employeeId}`, {
        params: { year },
        withCredentials: true,
      });
      if (!response.data?.Status) {
        throw new Error(response.data?.Error || "Could not load leave balances");
      }
      const balances = response.data.Result || [];
      setLeaveBalances(balances);
      const selected = balances.find((balance) => String(balance.leave_type_id) === String(selectedTypeId))
        || balances.find((balance) => balance.leave_type === "Annual")
        || balances[0];
      setBalanceForm((current) => ({
        ...current,
        employee_id: employeeId,
        balance_year: String(year),
        leave_type_id: selected?.leave_type_id ? String(selected.leave_type_id) : "",
        entitled_days: selected ? String(selected.entitled_days) : "",
      }));
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not load leave balances");
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleBalanceChange = (event) => {
    const { name, value } = event.target;
    if (name === "employee_id") {
      setBalanceForm((current) => ({ ...current, employee_id: value }));
      loadLeaveBalances(value, balanceForm.balance_year, balanceForm.leave_type_id);
      return;
    }
    if (name === "balance_year") {
      setBalanceForm((current) => ({ ...current, balance_year: value }));
      return;
    }
    if (name === "leave_type_id") {
      const selected = leaveBalances.find((balance) => String(balance.leave_type_id) === value);
      setBalanceForm((current) => ({
        ...current,
        leave_type_id: value,
        entitled_days: selected ? String(selected.entitled_days) : "",
      }));
      return;
    }
    setBalanceForm((current) => ({ ...current, [name]: value }));
  };

  const handleBalanceSubmit = async (event) => {
    event.preventDefault();
    setBalanceSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await axios.put(`${apiBaseUrl}/leave-balances`, {
        ...balanceForm,
        balance_year: Number(balanceForm.balance_year),
        entitled_days: Number(balanceForm.entitled_days),
      }, { withCredentials: true });
      if (!response.data?.Status) {
        throw new Error(response.data?.Error || "Could not update leave entitlement");
      }
      setSuccess(response.data.Message || "Leave entitlement updated.");
      await loadLeaveBalances(balanceForm.employee_id, balanceForm.balance_year, balanceForm.leave_type_id);
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not update leave entitlement");
    } finally {
      setBalanceSaving(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    if (form.end_date < form.start_date) {
      setError("End date cannot be before start date.");
      setLoading(false);
      return;
    }
    try {
      const response = await axios.post(`${apiBaseUrl}/leaves`, form, { withCredentials: true });
      if (!response.data?.Status) {
        throw new Error(response.data?.Error || "Could not add leave request");
      }
      setForm({ employee_id: "", leave_type: "Annual", start_date: "", end_date: "", reason: "" });
      setSuccess(response.data.Message || "Leave request added.");
      await fetchLeaves(0);
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not add leave request");
    } finally {
      setLoading(false);
    }
  };

  const reviewLeave = async (id, action) => {
    setActionId(id);
    setError("");
    setSuccess("");
    try {
      const response = await axios.put(`${apiBaseUrl}/leaves/${id}/${action}`, {}, { withCredentials: true });
      if (!response.data?.Status) {
        throw new Error(response.data?.Error || `Could not ${action} leave`);
      }
      setSuccess(response.data.Message || `Leave ${action}d.`);
      await fetchLeaves(offset);
      const reviewedLeave = leaves.find((leave) => String(leave.id) === String(id));
      if (
        action === "approve" &&
        reviewedLeave &&
        String(reviewedLeave.employee_id) === String(balanceForm.employee_id)
      ) {
        await loadLeaveBalances(balanceForm.employee_id, balanceForm.balance_year, balanceForm.leave_type_id);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || `Could not ${action} leave`);
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this leave request?")) return;
    setActionId(id);
    setError("");
    setSuccess("");
    try {
      const response = await axios.delete(`${apiBaseUrl}/leaves/${id}`, { withCredentials: true });
      if (!response.data?.Status) {
        throw new Error(response.data?.Error || "Could not delete leave request");
      }
      setSuccess(response.data.Message || "Leave request deleted.");
      await fetchLeaves(offset);
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not delete leave request");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-800 dark:text-white">Manage Leaves</h3>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">{error}</div>}
      {success && <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">{success}</div>}

      <form className="card max-w-3xl space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Employee</label>
            <select name="employee_id" className="input-field" onChange={handleChange} value={form.employee_id} required>
              <option value="">Select employee</option>
              {employees
                .filter((employee) => employee.employment_status === "active" && employee.approval_status === "approved")
                .map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Leave type</label>
            <select name="leave_type" className="input-field" onChange={handleChange} value={form.leave_type} required>
              <option value="Annual">Annual</option>
              <option value="Sick">Sick</option>
              <option value="Casual">Casual</option>
              <option value="Maternity">Maternity</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Start date</label>
            <input type="date" className="input-field" name="start_date" onChange={handleChange} value={form.start_date} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">End date</label>
            <input type="date" className="input-field" name="end_date" onChange={handleChange} value={form.end_date} min={form.start_date || undefined} required />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Reason</label>
          <textarea className="input-field" name="reason" rows="3" onChange={handleChange} value={form.reason} maxLength={5000} required />
        </div>
        <button type="submit" className="btn-primary w-full md:w-auto" disabled={loading}>
          {loading ? "Submitting..." : "Add leave request"}
        </button>
      </form>

      <section className="card space-y-4">
        <div>
          <h4 className="text-lg font-bold text-gray-800 dark:text-white">Configure leave allowance</h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Set yearly entitlements; approved requests automatically count toward used days.</p>
        </div>
        <form className="grid grid-cols-1 items-end gap-4 md:grid-cols-2 xl:grid-cols-5" onSubmit={handleBalanceSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Employee</label>
            <select name="employee_id" className="input-field" value={balanceForm.employee_id} onChange={handleBalanceChange} required>
              <option value="">Select employee</option>
              {employees
                .filter((employee) => employee.employment_status === "active" && employee.approval_status === "approved")
                .map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Leave type</label>
            <select name="leave_type_id" className="input-field" value={balanceForm.leave_type_id} onChange={handleBalanceChange} disabled={!leaveBalances.length || balanceLoading} required>
              <option value="">Select type</option>
              {leaveBalances.map((balance) => <option key={balance.leave_type_id} value={balance.leave_type_id}>{balance.leave_type}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Year</label>
            <input
              type="number"
              name="balance_year"
              className="input-field"
              min="1900"
              max="9999"
              value={balanceForm.balance_year}
              onChange={handleBalanceChange}
              onBlur={() => {
                const year = Number(balanceForm.balance_year);
                if (Number.isInteger(year) && year >= 1900 && year <= 9999) {
                  loadLeaveBalances(balanceForm.employee_id, year, balanceForm.leave_type_id);
                }
              }}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Entitled days</label>
            <input type="number" name="entitled_days" className="input-field" min="0" max="3660" step="0.5" value={balanceForm.entitled_days} onChange={handleBalanceChange} disabled={!balanceForm.leave_type_id} required />
          </div>
          <button type="submit" className="btn-primary" disabled={balanceSaving || balanceLoading || !balanceForm.leave_type_id}>
            {balanceSaving ? "Saving..." : balanceLoading ? "Loading..." : "Save allowance"}
          </button>
        </form>
        {balanceForm.leave_type_id && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Used {Number(leaveBalances.find((balance) => String(balance.leave_type_id) === balanceForm.leave_type_id)?.used_days || 0)} days;
            remaining after this change: {Math.max(
              0,
              Number(balanceForm.entitled_days || 0) -
                Number(leaveBalances.find((balance) => String(balance.leave_type_id) === balanceForm.leave_type_id)?.used_days || 0),
            )} days.
          </p>
        )}
      </section>

      <div className="card overflow-hidden">
        <h4 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Leave Requests</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th className="rounded-l-lg px-4 py-3">#</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3">End</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="rounded-r-lg px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Loading leave requests...</td></tr>
              ) : leaves.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">No leave requests found.</td></tr>
              ) : leaves.map((leave, index) => (
                <tr key={leave.id} className="border-b last:border-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">{offset + index + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{leave.employee_name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{leave.leave_type}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatDate(leave.start_date)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatDate(leave.end_date)}</td>
                  <td className="max-w-xs whitespace-pre-wrap px-4 py-3 text-gray-600 dark:text-gray-300">{leave.reason}</td>
                  <td className="px-4 py-3">{getStatusBadge(leave.status)}</td>
                  <td className="space-x-1 whitespace-nowrap px-4 py-3 text-right">
                    {leave.status === "pending" && (
                      <>
                        <button type="button" disabled={actionId === leave.id} onClick={() => reviewLeave(leave.id, "approve")} className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 disabled:opacity-50 dark:bg-green-900 dark:text-green-200">Approve</button>
                        <button type="button" disabled={actionId === leave.id} onClick={() => reviewLeave(leave.id, "reject")} className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 disabled:opacity-50 dark:bg-red-900 dark:text-red-200">Reject</button>
                      </>
                    )}
                    {leave.status !== "approved" && <button type="button" disabled={actionId === leave.id} onClick={() => handleDelete(leave.id)} className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200">Delete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t p-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          <span>Showing {total === 0 ? 0 : offset + 1}–{Math.min(offset + leaves.length, total)} of {total}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => fetchLeaves(Math.max(0, offset - pageSize))} disabled={listLoading || offset === 0} aria-label="Previous leave page" className="rounded border p-2 disabled:opacity-40 dark:border-gray-600"><ChevronLeft size={18} /></button>
            <button type="button" onClick={() => fetchLeaves(offset + pageSize)} disabled={listLoading || offset + pageSize >= total} aria-label="Next leave page" className="rounded border p-2 disabled:opacity-40 dark:border-gray-600"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leave;
