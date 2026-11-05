import React, { useState, useEffect } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Clock,
  CalendarOff,
  Wallet,
  Award,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
} from "lucide-react";
import axios from "axios";
import { useTheme } from "../ThemeContext";

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [employee, setEmployee] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const employeeId = localStorage.getItem("employeeId");

  useEffect(() => {
    if (!employeeId) {
      navigate("/employee_login");
      return;
    }
    axios
      .get(`${apiBaseUrl}/employee/detail/${employeeId}`, { withCredentials: true })
      .then((result) => {
        if (result.data && result.data.Status) {
          setEmployee(result.data.Result);
        }
      })
      .catch((err) => console.log(err));
  }, [employeeId, navigate]);

  const handleLogout = () => {
    axios
      .get(`${apiBaseUrl}/employee/logout`, { withCredentials: true })
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
    { path: "/employee/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { path: "/employee/dashboard/attendance", label: "Attendance", icon: <Clock size={20} /> },
    { path: "/employee/dashboard/leaves", label: "Leave", icon: <CalendarOff size={20} /> },
    { path: "/employee/dashboard/payroll", label: "Payroll", icon: <Wallet size={20} /> },
    { path: "/employee/dashboard/performance", label: "Performance", icon: <Award size={20} /> },
    { path: "/employee/dashboard/notifications", label: "Notifications", icon: <Bell size={20} /> },
    { path: "/employee/dashboard/settings", label: "Settings", icon: <Settings size={20} /> },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 transition-colors overflow-hidden">
      {/* Mobile Toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md text-gray-700 dark:text-gray-200"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed md:relative z-40 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-20"
        }`}
      >
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <img
              src={
                employee?.image
                  ? `${apiBaseUrl}/images/${employee.image}`
                  : `${apiBaseUrl}/images/default.png`
              }
              alt="employee"
              className="w-12 h-12 rounded-full object-cover border-2 border-blue-500"
            />
            <div className={`${sidebarOpen ? "block" : "hidden md:hidden"}`}>
              <h5 className="font-bold text-gray-800 dark:text-white">{employee?.full_name || "Employee"}</h5>
              <small className="text-gray-500 dark:text-gray-400">Employee Panel</small>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}
                >
                  {item.icon}
                  <span className={`${sidebarOpen ? "block" : "hidden md:hidden"}`}>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            <span className={`${sidebarOpen ? "block" : "hidden md:hidden"}`}>
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
          >
            <LogOut size={20} />
            <span className={`${sidebarOpen ? "block" : "hidden md:hidden"}`}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between transition-colors">
          <h4 className="text-lg font-bold text-gray-800 dark:text-white ml-10 md:ml-0">Employee Management System</h4>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-3 text-center text-sm text-gray-500 dark:text-gray-400 transition-colors">
          <small>© Employee Management System. All rights reserved.</small>
        </footer>
      </main>
    </div>
  );
};

export default EmployeeDashboard;
