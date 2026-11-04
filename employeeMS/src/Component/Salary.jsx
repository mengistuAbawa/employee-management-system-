import React, { useEffect, useState } from "react";
import axios from "axios";

const Salary = () => {
  const [employees, setEmployees] = useState([]);
  const [totalSalary, setTotalSalary] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [newSalary, setNewSalary] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchEmployees = () => {
    axios
      .get("http://localhost:3000/auth/employee", { withCredentials: true })
      .then((res) => {
        if (res.data.Status) {
          setEmployees(res.data.Result || []);
          const total = (res.data.Result || []).reduce(
            (sum, emp) => sum + (parseFloat(emp.salary) || 0),
            0
          );
          setTotalSalary(total);
        }
      })
      .catch((err) => console.error("Fetch employees error:", err));
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

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
        `http://localhost:3000/auth/update_salary/${selectedEmployee.id}`,
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
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">No employees found.</td>
              </tr>
            )}
          </tbody>
        </table>
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

