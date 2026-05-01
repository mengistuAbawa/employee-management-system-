import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const Home = () => {
  const [adminTotal, setAdminTotal] = useState(0);
  const [admins, setAdmins] = useState([]);
  const [employeeTotal, setEmployeeTotal] = useState(0);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [totalSalary, setTotalSalary] = useState(0);
  const [totalCategory, setTotalCategory] = useState(0);
  const [leaveStats, setLeaveStats] = useState({
    applied: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
  });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [adminRes, employeeRes, salaryRes, categoryRes, adminListRes, leaveRes, pendingRes] =
          await Promise.all([
            axios.get("http://localhost:3000/auth/admin_count", { withCredentials: true }),
            axios.get("http://localhost:3000/auth/employee_count", { withCredentials: true }),
            axios.get("http://localhost:3000/auth/total_salary", { withCredentials: true }),
            axios.get("http://localhost:3000/auth/total_category", { withCredentials: true }),
            axios.get("http://localhost:3000/auth/admin", { withCredentials: true }),
            axios.get("http://localhost:3000/auth/leave_counts", { withCredentials: true }),
            axios.get("http://localhost:3000/auth/pending_employee_count", { withCredentials: true }),
          ]);

        if (adminRes.data?.Status) setAdminTotal(adminRes.data.Result?.[0]?.admin ?? 0);
        if (employeeRes.data?.Status) setEmployeeTotal(employeeRes.data.Result?.[0]?.employee ?? 0);
        if (salaryRes.data?.Status) setTotalSalary(salaryRes.data.Salary ?? 0);
        if (categoryRes.data?.Status) setTotalCategory(categoryRes.data.Result?.[0]?.category ?? 0);
        if (adminListRes.data?.Status) setAdmins(adminListRes.data.Result || []);
        if (leaveRes.data?.Status) setLeaveStats(leaveRes.data.Result || { applied: 0, approved: 0, rejected: 0, pending: 0 });
        if (pendingRes.data?.Status) setPendingTotal(pendingRes.data.Result?.[0]?.pending ?? 0);
      } catch (err) {
        console.error("Failed fetching counts:", err);
      }
    };

    fetchCounts();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this admin?")) return;
    try {
      const res = await axios.delete(`http://localhost:3000/auth/delete_admin/${id}`, { withCredentials: true });
      if (res.data?.Status) {
        setAdmins((prev) => prev.filter((a) => (a.ID ?? a.id) !== id));
      } else {
        alert("Delete failed");
      }
    } catch (err) {
      console.error("Delete admin error", err);
      alert("Delete error");
    }
  };

  const stats = [
    { label: "Admin", value: adminTotal, color: "text-blue-600" },
    { label: "Employee", value: employeeTotal, color: "text-emerald-600" },
    { label: "Total Salary", value: totalSalary, color: "text-purple-600" },
    { label: "Total Category", value: totalCategory, color: "text-amber-600" },
    { label: "Pending", value: pendingTotal, color: "text-red-600", link: "/dashboard/pending_employees" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card text-center">
            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{s.label}</h4>
            <div className="mt-2">
              <span className={`text-3xl font-bold ${s.color}`}>{s.value}</span>
            </div>
            {s.link && (
              <Link to={s.link} className="text-xs text-blue-500 hover:underline mt-1 inline-block">View pending</Link>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Leave Details</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Applied", value: leaveStats.applied, color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200" },
              { label: "Approved", value: leaveStats.approved, color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200" },
              { label: "Rejected", value: leaveStats.rejected, color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200" },
              { label: "Pending", value: leaveStats.pending, color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200" },
            ].map((l) => (
              <div key={l.label} className={`rounded-lg p-3 text-center ${l.color}`}>
                <div className="text-xs font-medium uppercase">{l.label}</div>
                <div className="text-2xl font-bold mt-1">{l.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Admin List</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 py-2 rounded-l-lg">#</th>
                  <th className="px-3 py-2">Full Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2 rounded-r-lg text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">No admins found</td>
                  </tr>
                ) : (
                  admins.map((admin, idx) => (
                    <tr key={admin.ID ?? admin.id} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">{admin.full_name}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{admin.email}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <Link to={`/dashboard/edit_admin/${admin.ID ?? admin.id}`} className="inline-block px-2 py-1 text-xs font-medium rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-200 hover:bg-cyan-200 dark:hover:bg-cyan-800 mr-1">Edit</Link>
                        <button onClick={() => handleDelete(admin.ID ?? admin.id)} className="inline-block px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800">Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

