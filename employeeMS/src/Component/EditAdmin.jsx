import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

const EditAdmin = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ full_name: "", email: "" });
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const res = await axios.get(`http://localhost:3000/admin/${id}`, { withCredentials: true });
        if (res.data?.Status) {
          const data = res.data.Result || res.data;
          setForm({ full_name: data.full_name || "", email: data.email || "" });
        } else {
          setError(res.data?.Error || "Admin not found");
        }
      } catch (e) {
        setError(e.response?.data?.Error || "Failed to fetch admin");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchAdmin();
    else {
      setError("Missing admin id");
      setLoading(false);
    }
  }, [id]);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await axios.put(`http://localhost:3000/edit_admin/${id}`, form, { withCredentials: true });
      if (res.data?.Status) navigate("/dashboard/admin");
      else setError(res.data?.Error || "Update failed");
    } catch (err) {
      setError(err.response?.data?.Error || "Failed to update admin");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center mt-10 text-gray-600 dark:text-gray-300">Loading...</div>;

  return (
    <div className="flex justify-center items-start pt-4">
      <div className="card w-full max-w-md">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white text-center mb-6">Edit Admin</h3>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Full Name</label>
            <input
              name="full_name"
              className="input-field"
              value={form.full_name}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
            <input
              name="email"
              type="email"
              className="input-field"
              value={form.email}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
              onClick={() => navigate(-1)}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAdmin;

