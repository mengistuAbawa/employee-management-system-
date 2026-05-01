import React, { useEffect, useState } from "react";
import axios from "axios";
import { LayoutDashboard, CalendarOff, Wallet, Clock } from "lucide-react";

const EmployeeDashboardHome = () => {
  const [employee, setEmployee] = useState(null);
  const [stats, setStats] = useState({
    totalLeaves: 0,
    pendingLeaves: 0,
    approvedLeaves: 0,
    salary: 0,
  });

  const employeeId = localStorage.getItem("employeeId");

  useEffect(() => {
    if (!employeeId) return;

    axios.get(`http://localhost:3000/employee/detail/${employeeId}`, { withCredentials: true })
      .then((res) => {
        if (res.data?.Status) setEmployee(res.data.Result);
      })
      .catch((err) => console.error(err));

    axios.get(`http://localhost:3000/employee/leaves/${employeeId}`, { withCredentials: true })
      .then((res) => {
        if (res.data?.Status) {
          const leaves = res.data.Result || [];
          const pending = leaves.filter((l) => l.status === "pending").length;
          const approved = leaves.filter((l) => l.status === "approved").length;
          setStats((prev) => ({ ...prev, totalLeaves: leaves.length, pendingLeaves: pending, approvedLeaves: approved }));
        }
      })
      .catch((err) => console.error(err));

    axios.get(`http://localhost:3000/employee/salary/${employeeId}`, { withCredentials: true })
      .then((res) => {
        if (res.data?.Status) setStats((prev) => ({ ...prev, salary: res.data.Salary || 0 }));
      })
      .catch((err) => console.error(err));
  }, [employeeId]);

  const cards = [
    { label: "Total Leaves", value: stats.totalLeaves, icon: <LayoutDashboard size={24} />, color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200" },
    { label: "Pending Leaves", value: stats.pendingLeaves, icon: <Clock size={24} />, color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200" },
    { label: "Approved Leaves", value: stats.approvedLeaves, icon: <CalendarOff size={24} />, color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200" },
    { label: "Salary", value: `$${stats.salary}`, icon: <Wallet size={24} />, color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200" },
  ];

  return (
    <div className="space-y-6">
      <h4 className="text-xl font-bold text-gray-800 dark:text-white">Welcome, {employee?.full_name || "Employee"}!</h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="card flex items-center gap-4">
            <div className={`p-3 rounded-lg ${c.color}`}>{c.icon}</div>
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">{c.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h5 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Profile Overview</h5>
        <div className="flex items-center gap-4">
          <img
            src={employee?.image ? `http://localhost:3000/images/${employee.image}` : "http://localhost:3000/images/default.png"}
            alt="employee"
            className="w-16 h-16 rounded-full object-cover border-2 border-blue-500"
          />
          <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
            <p><strong>Name:</strong> {employee?.full_name || "N/A"}</p>
            <p><strong>Email:</strong> {employee?.email || "N/A"}</p>
            <p><strong>Address:</strong> {employee?.address || "N/A"}</p>
            <p><strong>Category ID:</strong> {employee?.category_id || "N/A"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboardHome;

