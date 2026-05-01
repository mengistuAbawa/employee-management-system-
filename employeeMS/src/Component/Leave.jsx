import React, { useState, useEffect } from "react";
import axios from "axios";

const getStatusBadge = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "approved") return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200">Approved</span>;
  if (s === "rejected") return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200">Rejected</span>;
  return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200">Pending</span>;
};

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

  useEffect(() => {
    fetchLeaves();
    fetchEmployees();
  }, []);

  const fetchLeaves = () => {
    axios
      .get("http://localhost:3000/auth/leaves", { withCredentials: true })
      .then((res) => {
        if (res.data.Status) setLeaves(res.data.Result || []);
      })
      .catch((err) => console.error("Fetch leaves error:", err));
  };

  const fetchEmployees = () => {
    axios
      .get("http://localhost:3000/auth/employee", { withCredentials: true })
      .then((res) => {
        if (res.data.Status) setEmployees(res.data.Result || []);
      })
      .catch((err) => console.error("Fetch employees error:", err));
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:3000/auth/leaves", form, { withCredentials: true });
      if (res.data.Status) {
        setForm({ employee_id: "", leave_type: "Annual", start_date: "", end_date: "", reason: "" });
        fetchLeaves();
      } else {
        alert(res.data.Error?.message || res.data.Error || "Failed to add leave");
      }
    } catch (err) {
      console.error(err);
      alert("Error adding leave");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      const res = await axios.put(`http://localhost:3000/auth/leaves/${id}/approve`, {}, { withCredentials: true });
      if (res.data.Status) fetchLeaves();
      else alert(res.data.Error || "Failed to approve leave");
    } catch (err) {
      console.error(err);
      alert("Error approving leave");
    }
  };

  const handleReject = async (id) => {
    try {
      const res = await axios.put(`http://localhost:3000/auth/leaves/${id}/reject`, {}, { withCredentials: true });
      if (res.data.Status) fetchLeaves();
      else alert(res.data.Error || "Failed to reject leave");
    } catch (err) {
      console.error(err);
      alert("Error rejecting leave");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this leave record?")) return;
    try {
      const res = await axios.delete(`http://localhost:3000/auth/leaves/${id}`, { withCredentials: true });
      if (res.data.Status) fetchLeaves();
      else alert(res.data.Error || "Failed to delete leave");
    } catch (err) {
      console.error(err);
      alert("Error deleting leave");
    }
  };

  const getEmployeeName = (id) => {
    const emp = employees.find((e) => String(e.id) === String(id));
    return emp ? emp.full_name : `ID: ${id}`;
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-800 dark:text-white">Manage Leaves</h3>

      <form className="card space-y-4 max-w-3xl" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Employee</label>
            <select name="employee_id" className="input-field" onChange={handleChange} value={form.employee_id} required>
              <option value="">Select Employee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Leave Type</label>
            <select name="leave_type" className="input-field" onChange={handleChange} value={form.leave_type}>
              <option value="Annual">Annual</option>
              <option value="Sick">Sick</option>
              <option value="Casual">Casual</option>
              <option value="Maternity">Maternity</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Start Date</label>
            <input type="date" className="input-field" name="start_date" onChange={handleChange} value={form.start_date} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">End Date</label>
            <input type="date" className="input-field" name="end_date" onChange={handleChange} value={form.end_date} required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Reason</label>
          <textarea className="input-field" name="reason" rows="3" onChange={handleChange} value={form.reason} required></textarea>
        </div>
        <button type="submit" className="btn-primary w-full md:w-auto" disabled={loading}>
          {loading ? "Submitting..." : "Apply Leave"}
        </button>
      </form>

      <div className="card overflow-x-auto">
        <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Leave Requests</h4>
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 rounded-l-lg">#</th>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">End</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 rounded-r-lg text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leaves.length > 0 ? (
              leaves.map((l, index) => (
                <tr key={l.id || index} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{l.employee_name || getEmployeeName(l.employee_id)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{l.leave_type}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{new Date(l.start_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{new Date(l.end_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{l.reason}</td>
                  <td className="px-4 py-3">{getStatusBadge(l.status)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                    {l.status === "pending" && (
                      <>
                        <button onClick={() => handleApprove(l.id)} className="inline-block px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800">Approve</button>
                        <button onClick={() => handleReject(l.id)} className="inline-block px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800">Reject</button>
                      </>
                    )}
                    <button onClick={() => handleDelete(l.id)} className="inline-block px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600">Delete</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">No leave requests found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Leave;

