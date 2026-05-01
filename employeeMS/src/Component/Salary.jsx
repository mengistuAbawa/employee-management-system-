import React, { useEffect, useState } from "react";
import axios from "axios";

const Salary = () => {
  const [employees, setEmployees] = useState([]);
  const [totalSalary, setTotalSalary] = useState(0);

  useEffect(() => {
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
  }, []);

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
              <th className="px-4 py-3 rounded-r-lg">Salary</th>
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
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">No employees found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Salary;

