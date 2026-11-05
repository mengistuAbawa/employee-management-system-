import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

const Department = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axios.get(`${apiBaseUrl}/auth/department`, { withCredentials: true });
      if (res.data.Status) {
        setDepartments(res.data.Result || []);
      } else {
        setError(res.data.Error || "Failed to fetch departments");
      }
    } catch (err) {
      console.error(err);
      setError("Error fetching departments");
    } finally {
      setLoading(false);
    }
  };

  const filteredDepartments = departments.filter((d) => {
    const name = (d?.name || "").toString().toLowerCase();
    return name.includes(query.trim().toLowerCase());
  });

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this department?")) return;
    setLoading(true);
    setError("");
    try {
      const res = await axios.delete(`${apiBaseUrl}/auth/delete_department/${id}`, { withCredentials: true });
      if (!res.data?.Status) throw new Error(res.data?.Error || "Delete failed");
      await fetchDepartments();
    } catch (err) {
      setError(err.response?.data?.Error || err.message || "Delete failed");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading departments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Departments</h3>
        <Link
          to="add"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Department
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 rounded-lg">{error}</div>
      )}

      <div className="flex gap-3 items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search departments..."
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 text-left rounded-l-lg">#</th>
              <th className="px-4 py-3 text-left">Department Name</th>
              <th className="px-4 py-3 text-left">Created</th>
              <th className="px-4 py-3 text-right rounded-r-lg">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDepartments.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No departments found.{' '}
                  <Link to="add" className="text-blue-600 hover:underline">Add one</Link>
                </td>
              </tr>
            ) : (
              filteredDepartments.map((dept, idx) => (
                <tr key={dept.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{dept.name}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm">{dept.created_at ? new Date(dept.created_at).toLocaleDateString() : "-"}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                    <Link
                      to={`edit/${dept.id}`}
                      className="inline-block px-3 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded hover:bg-green-200 dark:hover:bg-green-800"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(dept.id)}
                      className="inline-block px-3 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Department;
