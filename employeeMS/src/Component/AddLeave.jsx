import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

const AddLeave = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [form, setForm] = useState({
    employee_id: id || "",
    leave_type: "Annual",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) {
      axios
        .get(`${apiBaseUrl}/employee/${id}`, { withCredentials: true })
        .then((res) => {
          if (res.data.Status) {
            setEmployee(Array.isArray(res.data.Result) ? res.data.Result[0] : res.data.Result);
          } else {
            setError(res.data.Error || "Could not load employee details");
          }
        })
        .catch((err) => setError(err.response?.data?.Error || err.message || "Could not load employee details"));
    }
  }, [id]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (form.end_date < form.start_date) {
      setError("End date cannot be before start date.");
      setLoading(false);
      return;
    }
    try {
      const res = await axios.post(`${apiBaseUrl}/leaves`, form, { withCredentials: true });
      if (res.data?.Status) {
        navigate("/dashboard/leaves");
      } else {
        throw new Error(res.data?.Error?.message || res.data?.Error || "Could not add leave request");
      }
    } catch (err) {
      setError(err.response?.data?.Error || err.message || "Could not add leave request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-800 dark:text-white">Apply Leave</h3>
      {employee && (
        <div className="p-3 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 text-sm text-center">
          <strong>Employee:</strong> {employee.full_name} (ID: {id})
        </div>
      )}
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">{error}</div>}
      <form className="card space-y-4 max-w-3xl" onSubmit={handleSubmit}>
        <input type="hidden" name="employee_id" value={form.employee_id} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <input type="date" className="input-field" name="start_date" value={form.start_date} onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">End Date</label>
            <input type="date" className="input-field" name="end_date" value={form.end_date} min={form.start_date || undefined} onChange={handleChange} required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Reason</label>
          <textarea className="input-field" name="reason" rows="3" value={form.reason} onChange={handleChange} placeholder="Enter reason for leave" required></textarea>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Submitting..." : "Apply Leave"}</button>
          <button type="button" className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600" onClick={() => navigate("/dashboard/employee")}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default AddLeave;
