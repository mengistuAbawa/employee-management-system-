import React, { useEffect, useState } from "react";
import axios from "axios";
import { Wallet, DollarSign, CreditCard } from "lucide-react";

const EmployeePayroll = () => {
  const [employee, setEmployee] = useState(null);
  const [payrollHistory, setPayrollHistory] = useState([]);

  const employeeId = localStorage.getItem("employeeId");

  useEffect(() => {
    if (!employeeId) return;

    axios.get(`http://localhost:3000/employee/detail/${employeeId}`, { withCredentials: true })
      .then((res) => { if (res.data?.Status) setEmployee(res.data.Result); })
      .catch((err) => console.error(err));

    axios.get(`http://localhost:3000/employee/salary/${employeeId}`, { withCredentials: true })
      .then((res) => {
        if (res.data?.Status) {
          const salary = res.data.Salary || 0;
          setPayrollHistory([
            { month: "June 2025", amount: salary, status: "Paid", date: "2025-06-30" },
            { month: "May 2025", amount: salary, status: "Paid", date: "2025-05-31" },
            { month: "April 2025", amount: salary, status: "Paid", date: "2025-04-30" },
          ]);
        }
      })
      .catch((err) => console.error(err));
  }, [employeeId]);

  const currentSalary = employee?.salary || 0;

  const cards = [
    { label: "Current Salary", value: `$${currentSalary}`, icon: <DollarSign size={24} />, color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200" },
    { label: "Annual Gross", value: `$${currentSalary * 12}`, icon: <CreditCard size={24} />, color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200" },
    { label: "Net Pay (Est.)", value: `$${Math.round(currentSalary * 0.85)}`, icon: <Wallet size={24} />, color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200" },
  ];

  return (
    <div className="space-y-6">
      <h4 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
        <Wallet size={24} /> Payroll
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      <div className="card overflow-x-auto">
        <h5 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Payroll History</h5>
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 rounded-l-lg">#</th>
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 rounded-r-lg">Date</th>
            </tr>
          </thead>
          <tbody>
            {payrollHistory.length > 0 ? (
              payrollHistory.map((p, idx) => (
                <tr key={idx} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">{idx + 1}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.month}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">${p.amount}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200">{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.date}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">No payroll records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeePayroll;

