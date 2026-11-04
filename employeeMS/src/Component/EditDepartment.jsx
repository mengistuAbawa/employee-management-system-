import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const EditDepartment = () => {
  const { id } = useParams();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchDepartment();
  }, [id]);

  const fetchDepartment = async () => {
    try {
      const res = await axios.get("http://localhost:3000/auth/department", { withCredentials: true });


      if (res.data.Status) {
        const dept = res.data.Result?.find((d) => String(d.id) === String(id));
        if (dept) {
          setName(dept.name);
        } else {
          setError("Department not found");
        }
      } else {
        setError("Failed to fetch departments");
      }
    } catch (err) {
      console.error(err);
      setError("Error fetching department");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Department name is required");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const res = await axios.put(
        `http://localhost:3000/auth/edit_department/${id}`,
        { name: name.trim() },
        { withCredentials: true }
      );

      if (res.data.Status) {
        navigate("/dashboard/department");
      } else {
        setError(res.data?.Error || "Failed to update department");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.Error || "Error updating department");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div>Loading...</div></div>;
  if (error) return (
    <div className="max-w-md mx-auto p-8">
      <div className="bg-red-100 text-red-700 p-6 rounded-lg text-center dark:bg-red-900 dark:text-red-200">
        {error}
        <button 
          onClick={() => navigate("/dashboard/department")}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 ml-2"
        >
          Back to Departments
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto">
      <div className="card">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white text-center mb-6">Edit Department</h3>
        
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Department Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving..." : "Update Department"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard/department")}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditDepartment;

