import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

const AddAdmin = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${apiBaseUrl}/add_admin`, form, { withCredentials: true });
      if (res.data?.Status) navigate("/dashboard");
      else alert(res.data?.Error || "Add failed");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.Error || "Add admin error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-start pt-4">
      <div className="card w-full max-w-md">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white text-center mb-6">Add Admin</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Full Name</label>
            <input name="full_name" className="input-field" value={form.full_name} onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
            <input name="email" type="email" className="input-field" value={form.email} onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Password</label>
            <input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={72} className="input-field" value={form.password} onChange={handleChange} required />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1" disabled={loading}>{loading ? "Saving..." : "Save"}</button>
            <button type="button" className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600" onClick={() => navigate(-1)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAdmin;
