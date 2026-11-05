import React, { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Menu, Moon, Sun, Users, ShieldCheck, X } from "lucide-react";
import { useTheme } from "../ThemeContext";

const PublicLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-800 md:hidden"
            aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link to="/" className="flex items-center gap-2 font-bold tracking-tight text-slate-900 dark:text-white">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white">
              <Users size={19} />
            </span>
            <span>Employee<span className="text-blue-600">MS</span></span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 text-sm text-slate-500 dark:text-gray-400 sm:flex">
            <ShieldCheck size={17} className="text-emerald-600" />
            Employee services portal
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
      </header>

      <div className="relative flex flex-1">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-10 bg-slate-950/40 md:hidden"
            onClick={closeSidebar}
          />
        )}
        <aside
          className={`fixed inset-y-16 left-0 z-20 w-64 border-r border-slate-200 bg-white p-4 transition-transform dark:border-gray-800 dark:bg-gray-900 md:static md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">
            Welcome
          </p>
          <nav aria-label="Public navigation" className="space-y-1">
            <NavLink
              to="/"
              end
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-800"
                }`
              }
            >
              <Users size={18} /> Home
            </NavLink>
            <NavLink
              to="/adminlogin"
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-800"
                }`
              }
            >
              <ShieldCheck size={18} /> Administrator
            </NavLink>
            <NavLink
              to="/employee_login"
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-800"
                }`
              }
            >
              <Users size={18} /> Employee
            </NavLink>
          </nav>
          <div className="mt-8 rounded-2xl bg-slate-50 p-4 dark:bg-gray-800/70">
            <p className="text-sm font-semibold">Your workplace, organized</p>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-gray-400">
              Securely manage employee services, attendance, and leave requests.
            </p>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 items-start justify-center p-4 sm:p-8">
          <div className="w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>

      <footer className="border-t border-slate-200 bg-white px-6 py-4 text-center text-xs text-slate-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
        <span>© {new Date().getFullYear()} EmployeeMS</span>
        <span className="mx-2">·</span>
        <span>Secure access for employees and administrators</span>
      </footer>
    </div>
  );
};

export default PublicLayout;
