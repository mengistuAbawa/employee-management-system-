import React, { useEffect, useState } from "react";
import axios from "axios";

const PendingEmployees = () => {
  const [pending, setPending] = useState([]);

  const fetchPending = () => {
    axios
      .get("http://localhost:3000/pending_employees", {
        params: { limit: 20, offset: 0 },
        withCredentials: true,
      })
      .then((res) => {
        if (res.data.Status) {
          setPending(res.data.Result || []);
        } else {
          alert(res.data.Error);
        }
      })
      .catch((err) => console.log(err));
  };


  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id) => {
    try {
      const res = await axios.put(
        `http://localhost:3000/auth/employees/${id}/approve`,
        {},
        { withCredentials: true }
      );
      if (res.data.Status) {
        fetchPending();
      } else {
        alert(res.data.Error || "Failed to approve");
      }
    } catch (err) {
      console.error(err);
      alert("Error approving employee");
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("Are you sure you want to reject this employee?")) return;
    try {
      const res = await axios.put(
        `http://localhost:3000/auth/employees/${id}/reject`,
        {},
        { withCredentials: true }
      );
      if (res.data.Status) {
        fetchPending();
      } else {
        alert(res.data.Error || "Failed to reject");
      }
    } catch (err) {
      console.error(err);
      alert("Error rejecting employee");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Pending Employee Registrations</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">{pending.length} pending</span>
      </div>

      <div className="overflow-x-auto card">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 rounded-l-lg">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Salary</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3 rounded-r-lg text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {pending.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                  No pending employee registrations
                </td>
              </tr>
            ) : (
              pending.map((e) => (
                <tr key={e.id} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{e.full_name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{e.email}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{e.category_name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{e.department_name || "Unassigned"}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{e.salary}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{e.address}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                    <button
                      onClick={() => handleApprove(e.id)}
                      className="inline-block px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(e.id)}
                      className="inline-block px-3 py-1.5 text-xs font-medium rounded-lg bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800"
                    >
                      Reject
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

export default PendingEmployees;
