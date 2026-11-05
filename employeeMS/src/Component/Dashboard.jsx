import React, { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useTheme } from "../ThemeContext";
import profile from "./Image/profile.jpg";

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [pendingCount, setPendingCount] = useState(0);
  const [attendancePendingCount, setAttendancePendingCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [pendingRes, attendanceRes] = await Promise.all([
          axios.get("http://localhost:3000/pending_employee_count", { withCredentials: true }),
          axios.get("http://localhost:3000/pending_attendance_count", { withCredentials: true }),
        ]);

        if (pendingRes.data.Status) {
          setPendingCount(pendingRes.data.Result?.[0]?.pending ?? 0);
        }
        if (attendanceRes.data.Status) {
          setAttendancePendingCount(attendanceRes.data.Result?.[0]?.pending ?? 0);
        }
      } catch (err) {
        console.log(err);
      }
    };

    fetchCounts();
  }, [location.pathname]);

  const handleLogout = () => {
    axios
      .post("http://localhost:3000/logout", {}, { withCredentials: true })
      .then((result) => {
        if (result.data.Status) {
          localStorage.removeItem("valid");
          localStorage.removeItem("role");
          localStorage.removeItem("employeeId");
          navigate("/");
        }
      })
      .catch((err) => console.log(err));
  };

  const navItems = [
    {
      to: "/dashboard",
      label: "Dashboard",
      icon:
        "M4 6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6zM14 6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V6zM4 16a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2zM14 16a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2z",
    },
    {
      to: "/dashboard/employee",
      label: "Manage Employees",
      icon:
        "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    },
    {
      to: "/dashboard/category",
      label: "Category",
      icon: "M4 6h16M4 10h16M4 14h16M4 18h16",
    },
    {
      to: "/dashboard/profile",
      label: "Profile",
      icon:
        "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    },
    {
      to: "/dashboard/pending_employees",
      label: "Pending Employees",
      icon:
        "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
      badge: pendingCount,
    },
    {
      to: "/dashboard/leaves",
      label: "Leave",
      icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    },
    {
      to: "/dashboard/salary",
      label: "Salary Management",
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    {
      to: "/dashboard/payroll",
      label: "Payroll Runs",
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    },
    {
      to: "/dashboard/performance",
      label: "Performance",
      icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 3c-2.134 0-4.147.56-5.882 1.538A12.004 12.004 0 003 12c0 5.523 3.582 10.214 8.545 11.49A12.003 12.003 0 0021 12c0-2.134-.56-4.147-1.538-5.882z",
    },
    {
      to: "/dashboard/communications",
      label: "Announcements",
      icon: "M3 11l18-5v12L3 13v-2zm0 0v5a2 2 0 002 2h2l2 3h4l-2.5-5.5M21 12h1",
    },
    {
      to: "/dashboard/reports",
      label: "Reports & Analytics",
      icon: "M3 3v18h18M18 17V9M13 17V5M8 17v-3",
    },
    {
      to: "/dashboard/department",
      label: "Department",
      icon: "M7 21h10a2 2 0 002-2V9a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z",
    },
    {
      to: "/dashboard/positions",
      label: "Positions",
      icon: "M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2zm3 4h6m-6 4h6m-6 4h3",
    },
    {
      to: "/dashboard/attendance",
      label: "Attendance Control",
      icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
      badge: attendancePendingCount,
    },
    {
      to: "/dashboard/help-support",
      label: "Help & Support",
      icon:
        "M18.364 18.364A9 9 0 005.636 5.636m12.728 0L18.364 5.636M5.636 18.364l.707.707m12.728 0l-.707-.707M5.636 5.636l.707.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
    },
  ];

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 dark:bg-black text-white flex flex-col transition-colors">
        <div className="p-6 flex items-center gap-3 border-b border-gray-700">
          <img src={profile} alt="profile" className="w-10 h-10 rounded-full object-cover" />
          <span className="text-lg font-bold">Admin Panel</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    location.pathname === item.to ||
                    (item.to !== "/dashboard" && location.pathname.startsWith(item.to))
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  <span className="flex-1">{item.label}</span>
                  {item.badge > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{item.badge}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-700 space-y-2">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            {theme === "dark" ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between transition-colors">
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Employee Management System</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage workforce, departments, and positions.</p>
          </div>
          <Link to="/" className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700">
            Public site
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>

        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-3 text-center text-sm text-gray-500 dark:text-gray-400 transition-colors">
          About: This system helps manage employees, categories, and admins.
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;
