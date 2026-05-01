import React, { useEffect, useState } from "react";
import axios from "axios";
import { CalendarOff, Plus } from "lucide-react";

const getStatusBadge = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "approved") return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200">Approved</span>;
  if (s === "rejected") return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200">Rejected</span>;
  return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200">Pending</span>;
};

const EmployeeMyLeaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leave_type: "Annual", start_date: "", end_date: "", reason: "" });
  const [loading, setLoading] = useState(false);

  const employeeId = localStorage.getItem("employeeId");

  const fetchLeaves = () => {
    if (!employeeId) return;
    axios
      .get(`http://localhost:3000/employee/leaves/${employeeId}`, { withCredentials: true })
      .then((res) => {
        if (res.data?.Status) setLeaves(res.data.Result || []);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchLeaves();
  }, [employeeId]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:3000/auth/leaves", { ...form, employee_id: employeeId }, { withCredentials: true });
      if (res.data.Status) {
        setForm({ leave_type: "Annual", start_date: "", end_date: "", reason: "" });
        setShowForm(false);
        fetchLeaves();
      } else {
        alert(res.data.Error || "Failed to apply leave");
      }
    } catch (err) {
      console.error(err);
      alert("Error applying leave");
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
                <input type="date" name="end_date" className="input-field" value={form.end_date} onChange={handleChange} required />
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
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{new Date(l.start_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{new Date(l.end_date).toLocaleDateString()}</td>
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

