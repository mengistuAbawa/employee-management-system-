import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { CalendarOff, Plus } from "lucide-react";

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

const getStatusBadge = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "approved") return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200">Approved</span>;
  if (s === "rejected") return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200">Rejected</span>;
  return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200">Pending</span>;
};

const EmployeeMyLeaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leave_type: "Annual", start_date: "", end_date: "", reason: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const employeeId = localStorage.getItem("employeeId");

  const fetchLeaves = useCallback(() => {
    if (!employeeId) return;
    Promise.all([
      axios.get(`${apiBaseUrl}/employee/leaves/${employeeId}`, { withCredentials: true }),
      axios.get(`${apiBaseUrl}/employee/dashboard-summary`, { withCredentials: true }),
    ])
      .then(([leaveResponse, dashboardResponse]) => {
        if (!leaveResponse.data?.Status) {
          throw new Error(leaveResponse.data?.Error || "Could not load leave history");
        }
        if (!dashboardResponse.data?.Status) {
          throw new Error(dashboardResponse.data?.Error || "Could not load leave balances");
        }
        setLeaves(leaveResponse.data.Result || []);
        setLeaveBalances(dashboardResponse.data.Result?.leaveBalances || []);
        setError("");
      })
      .catch((requestError) => setError(requestError.response?.data?.Error || requestError.message || "Could not load leave information"));
  }, [employeeId]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    if (form.end_date < form.start_date) {
      setError("End date cannot be before start date.");
      setLoading(false);
      return;
    }
    try {
      const res = await axios.post(`${apiBaseUrl}/employee/leaves`, form, { withCredentials: true });
      if (res.data?.Status) {
        setForm({ leave_type: "Annual", start_date: "", end_date: "", reason: "" });
        setShowForm(false);
        setSuccess(res.data.Message || "Leave request submitted.");
        fetchLeaves();
      } else {
        throw new Error(res.data?.Error || "Could not apply for leave");
      }
    } catch (err) {
      setError(err.response?.data?.Error || err.message || "Could not apply for leave");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <CalendarOff size={24} /> My Leaves
        </h4>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={18} /> Apply Leave
        </button>
      </div>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">{error}</div>}
      {success && <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">{success}</div>}

      <section className="card">
        <h5 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Leave balances</h5>
        {leaveBalances.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No leave balances are configured for this year yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {leaveBalances.map((balance) => (
              <div key={balance.leave_type} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <p className="font-semibold text-gray-800 dark:text-gray-100">{balance.leave_type}</p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  {Number(balance.remaining_days)} days remaining
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {Number(balance.used_days)} used of {Number(balance.entitled_days)} entitled
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {showForm && (
        <div className="card">
          <h5 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Apply for Leave</h5>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Leave Type</label>
                <select name="leave_type" className="input-field" value={form.leave_type} onChange={handleChange} required>
                  <option value="Annual">Annual</option>
                  <option value="Sick">Sick</option>
                  <option value="Casual">Casual</option>
                  <option value="Maternity">Maternity</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Start Date</label>
                <input type="date" name="start_date" className="input-field" value={form.start_date} onChange={handleChange} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">End Date</label>
                <input type="date" name="end_date" className="input-field" value={form.end_date} min={form.start_date || undefined} onChange={handleChange} required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Reason</label>
              <textarea name="reason" className="input-field" rows="2" value={form.reason} onChange={handleChange} required></textarea>
            </div>
            <button type="submit" className="btn-success" disabled={loading}>{loading ? "Submitting..." : "Submit Application"}</button>
          </form>
        </div>
      )}

      <div className="card overflow-x-auto">
        <h5 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Leave History</h5>
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 rounded-l-lg">#</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">End</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3 rounded-r-lg">Status</th>
            </tr>
          </thead>
          <tbody>
            {leaves.length > 0 ? (
              leaves.map((l, idx) => (
                <tr key={l.id || idx} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">{idx + 1}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{l.leave_type}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{new Date(`${String(l.start_date).slice(0, 10)}T00:00:00`).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{new Date(`${String(l.end_date).slice(0, 10)}T00:00:00`).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{l.reason}</td>
                  <td className="px-4 py-3">{getStatusBadge(l.status)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">No leave records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeeMyLeaves;
