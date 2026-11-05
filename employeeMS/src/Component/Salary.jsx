import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

const Salary = () => {
  const [employees, setEmployees] = useState([]);
  const [totalSalary, setTotalSalary] = useState(0);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [newSalary, setNewSalary] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [employeeResponse, salaryResponse] = await Promise.all([
        axios.get(`${apiBaseUrl}/auth/employee`, {
          params: { limit: 20, offset: page * 20, status: "active" },
          withCredentials: true,
        }),
        axios.get(`${apiBaseUrl}/total_salary`, { withCredentials: true }),
      ]);
      if (!employeeResponse.data.Status) throw new Error(employeeResponse.data.Error || "Could not load employee salaries");
      if (!salaryResponse.data.Status) throw new Error(salaryResponse.data.Error || "Could not load total salary");
      setEmployees(employeeResponse.data.Result || []);
      setTotalEmployees(Number(employeeResponse.data.Meta?.total || 0));
      setTotalSalary(Number(salaryResponse.data.Salary || 0));
    } catch (err) {
      console.error("Fetch salaries failed:", err);
      setError(err.response?.data?.Error || err.message || "Could not load salary details");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const openUpdateModal = (employee) => {
    setSelectedEmployee(employee);
    setNewSalary(employee.salary || "");
    setIsModalOpen(true);
  };

const handleUpdateSalary = (e) => {
    e.preventDefault();
    if (!selectedEmployee || !newSalary) return;

    setIsLoading(true);
    axios
      .put(
        `${apiBaseUrl}/update_salary/${selectedEmployee.id}`,
        { salary: newSalary },
        { withCredentials: true }
      )
      .then((res) => {
        if (res.data.Status) {
          setIsModalOpen(false);
          fetchEmployees();
          alert("Salary updated successfully!");
        } else {
          alert(res.data.Error || "Failed to update salary");
        }
      })
      .catch((err) => {
        console.error("Update salary error:", err);
        alert("Error updating salary");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
    setNewSalary("");
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-800 dark:text-white">Salary Details</h3>

      <div className="card bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
        <h5 className="text-lg font-semibold">
          Total Salary Payout: <strong className="text-2xl">${totalSalary.toLocaleString()}</strong>
        </h5>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 rounded-l-lg">#</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Salary</th>
              <th className="px-4 py-3 rounded-r-lg">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.length > 0 ? (
              employees.map((e, idx) => (
                <tr key={e.id} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{e.full_name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{e.email}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{e.category_name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">${e.salary}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openUpdateModal(e)}
                      className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                    >
                      Update
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                  {loading ? "Loading employees..." : "No active employees found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
        <span>{totalEmployees ? `${page * 20 + 1}–${Math.min((page + 1) * 20, totalEmployees)} of ${totalEmployees}` : "0 employees"}</span>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary px-3 py-1" onClick={() => setPage((current) => Math.max(current - 1, 0))} disabled={page === 0 || loading}>
            Previous
          </button>
          <button type="button" className="btn-secondary px-3 py-1" onClick={() => setPage((current) => current + 1)} disabled={(page + 1) * 20 >= totalEmployees || loading}>
            Next
          </button>
        </div>
      </div>

      {/* Update Salary Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                Update Salary
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Employee: <span className="font-medium">{selectedEmployee?.full_name}</span>
              </p>
              <form onSubmit={handleUpdateSalary}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    New Salary
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={newSalary}
                    onChange={(e) => setNewSalary(e.target.value)}
                    required
                    min="0"
                    step="0.01"
                    placeholder="Enter new salary"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50"
                  >
                    {isLoading ? "Updating..." : "Update Salary"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Salary;
