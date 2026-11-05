import React, { useCallback, useEffect, useReducer, useRef, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import { RefreshCw } from "lucide-react";


const initialState = {
  dashboardData: {
    adminTotal: 0,
    employeeTotal: 0,
    pendingTotal: 0,
    totalCategory: 0,
    leaveStats: { applied: 0, approved: 0, rejected: 0, pending: 0 },
    attendance: { present: 0, absent: 0 },
    payroll: { totals: [] },
    salaryCommitment: [],
  },
  admins: [],
  activeAdminsCount: 0,
  departments: [],
  recentEmployees: [],
  recentActivity: [],
  pulsingMetrics: {},
};

const reducer = (state, action) => {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, ...action.payload };
    case "SET_METRIC_PULSE": {
      const { key } = action;
      return {
        ...state,
        pulsingMetrics: { ...state.pulsingMetrics, [key]: true },
      };
    }
    case "CLEAR_METRIC_PULSE": {
      const { key } = action;
      return {
        ...state,
        pulsingMetrics: { ...state.pulsingMetrics, [key]: false },
      };
    }
    case "EMPLOYEE_COUNT_UPDATED":
      return {
        ...state,
        dashboardData: { ...state.dashboardData, employeeTotal: action.total },
      };
    case "PENDING_EMPLOYEES_UPDATED":
      return {
        ...state,
        dashboardData: { ...state.dashboardData, pendingTotal: action.total },
      };
    case "LEAVE_STATS_UPDATED":
      return {
        ...state,
        dashboardData: { ...state.dashboardData, leaveStats: action.leaveStats },
      };
    case "ADMIN_PRESENCE_CHANGED":
      return {
        ...state,
        activeAdminsCount: action.activeCount ?? state.activeAdminsCount,
        admins: action.adminListState ?? state.admins,
      };
    case "DEPARTMENT_PERFORMANCE_UPDATED":
      return {
        ...state,
        departments: action.departments,
      };
    default:
      return state;
  }
};

const Home = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const socketRef = useRef(null);
  const [deletingAdminId, setDeletingAdminId] = useState(null);
  const [adminActionError, setAdminActionError] = useState("");
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const apiUrl = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

  const triggerPulse = (metricKey) => {
    dispatch({ type: "SET_METRIC_PULSE", key: metricKey });
    setTimeout(() => {
      dispatch({ type: "CLEAR_METRIC_PULSE", key: metricKey });
    }, 1500);
  };

  const fetchDashboardData = useCallback(async (signal) => {
    setDashboardLoading(true);
    setDashboardError("");
    try {
      const [summaryRes, adminListRes] = await Promise.all([
        axios.get(`${apiUrl}/dashboard/summary`, { withCredentials: true, signal }),
        axios.get(`${apiUrl}/admin`, { withCredentials: true, signal }),
      ]);
      if (!summaryRes.data?.Status || !adminListRes.data?.Status || !summaryRes.data?.Result) {
        throw new Error(summaryRes.data?.Error || adminListRes.data?.Error || "Dashboard data is unavailable.");
      }
      const summary = summaryRes.data.Result;
      dispatch({
        type: "HYDRATE",
        payload: {
          dashboardData: {
            adminTotal: summary.adminTotal,
            employeeTotal: summary.employeeTotal,
            totalCategory: summary.totalCategory,
            pendingTotal: summary.pendingTotal,
            leaveStats: summary.leaveStats,
            attendance: summary.attendance,
            payroll: summary.payroll,
            salaryCommitment: summary.salaryCommitment,
          },
          admins: adminListRes.data.Result,
          departments: summary.departments,
          recentEmployees: summary.recentEmployees,
          recentActivity: summary.recentActivity,
        },
      });
    } catch (err) {
      if (axios.isCancel(err)) return;
      console.error("Failed fetching admin dashboard data:", err);
      setDashboardError(err.response?.data?.Error || err.message || "Could not load dashboard data.");
    } finally {
      if (!signal?.aborted) setDashboardLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    const controller = new AbortController();
    fetchDashboardData(controller.signal);

    const socket = io(apiUrl, { withCredentials: true });
    socketRef.current = socket;

    socket.on("connect", () => console.log("Connected to Real-Time Matrix Pipeline"));

    // Real-Time Event Listeners
    socket.on("employeeCountUpdated", (data) => {
      dispatch({ type: "EMPLOYEE_COUNT_UPDATED", total: data.total });
      triggerPulse("employeeTotal");
    });

    socket.on("pendingEmployeesUpdated", (data) => {
      dispatch({ type: "PENDING_EMPLOYEES_UPDATED", total: data.total });
      triggerPulse("pendingTotal");
    });

    socket.on("leaveStatsUpdated", (data) => {
      dispatch({ type: "LEAVE_STATS_UPDATED", leaveStats: data });
      triggerPulse("leaveStats");
    });

    socket.on("adminPresenceChanged", (data) => {
      dispatch({
        type: "ADMIN_PRESENCE_CHANGED",
        activeCount: data.activeCount,
        adminListState: data.adminListState,
      });
    });

    socket.on("adminListUpdated", (data) => {
      dispatch({
        type: "ADMIN_PRESENCE_CHANGED",
        activeCount: data.activeCount,
        adminListState: data.adminListState,
      });
    });


    socket.on("disconnect", () => {
      // You can show a disconnected badge if desired
    });

    // Cleanup connection on unmount to prevent resource memory leaks
    return () => {
      controller.abort();
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [apiUrl, fetchDashboardData]);

  const { dashboardData, admins, activeAdminsCount, departments, pulsingMetrics } = state;

  const formatNumber = (n) => {
    const num = Number(n ?? 0);
    return Number.isFinite(num) ? num.toLocaleString() : "0";
  };

  const formatMoney = (amount, currency) => {
    const value = Number(amount ?? 0);
    if (currency === "UNSPECIFIED") return `${formatNumber(value)} (currency not set)`;
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return `${currency} ${formatNumber(value)}`;
    }
  };

  const formatDate = (date) => {
    if (!date) return "Date unavailable";
    const parsedDate = new Date(date);
    return Number.isNaN(parsedDate.getTime())
      ? "Date unavailable"
      : parsedDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this admin?")) return;
    setDeletingAdminId(id);
    setAdminActionError("");
    try {
      const res = await axios.delete(`${apiUrl}/delete_admin/${id}`, { withCredentials: true });
      if (!res.data?.Status) {
        setAdminActionError(res.data?.Error || "Failed to delete admin.");
        return;
      }
      dispatch({
        type: "HYDRATE",
        payload: {
          admins: admins.filter((admin) => (admin.ID ?? admin.id) !== id),
          dashboardData: {
            ...dashboardData,
            adminTotal: Math.max(0, dashboardData.adminTotal - 1),
          },
        },
      });
    } catch (err) {
      console.error("Delete admin error", err);
      setAdminActionError(err.response?.data?.Error || "Failed to delete admin.");
    } finally {
      setDeletingAdminId(null);
    }
  };

  const stats = [
    { key: "employeeTotal", label: "Active employees", value: dashboardData.employeeTotal, color: "text-emerald-600", link: "/dashboard/employee" },
    { key: "presentToday", label: "Present today", value: dashboardData.attendance.present, color: "text-blue-600", link: "/dashboard/attendance" },
    { key: "absentToday", label: "Not checked in", value: dashboardData.attendance.absent, color: "text-amber-600", link: "/dashboard/attendance" },
    { key: "pendingTotal", label: "Pending employees", value: dashboardData.pendingTotal, color: "text-red-600", link: "/dashboard/pending_employees" },
    { key: "salaryCommitment", label: "Current monthly salary", value: dashboardData.salaryCommitment || [], color: "text-indigo-600", link: "/dashboard/salary" },
    { key: "monthlyPayroll", label: "Finalized payroll (month)", value: dashboardData.payroll.totals || [], color: "text-purple-600", link: "/dashboard/payroll" },
    { key: "totalCategory", label: "Job categories", value: dashboardData.totalCategory, color: "text-cyan-600", link: "/dashboard/category" },
  ];

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Organization overview</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Admin dashboard</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">A live view of your workforce and operations.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => fetchDashboardData()} disabled={dashboardLoading} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
            <RefreshCw size={15} className={dashboardLoading ? "animate-spin" : ""} /> Refresh data
          </button>
          <Link to="/dashboard/payroll" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
            Run payroll
          </Link>
          <Link to="/dashboard/employee" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
            Manage employees
          </Link>
        </div>
      </div>

      {dashboardLoading ? (
        <p role="status" className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-5 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">Loading live dashboard data…</p>
      ) : dashboardError ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <p className="font-semibold">Dashboard data could not be loaded.</p>
          <p className="mt-1">{dashboardError}</p>
          <button type="button" onClick={() => fetchDashboardData()} className="mt-3 rounded-lg bg-red-700 px-3 py-2 font-semibold text-white hover:bg-red-800">Try again</button>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => (
          <Link
            key={s.key}
            to={s.link}
            className={`rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 ${
              pulsingMetrics[s.key] ? "ring-2 ring-emerald-400" : ""
            }`}
          >
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className={`mt-3 ${s.key === "monthlyPayroll" || s.key === "salaryCommitment" ? "space-y-1 text-base" : "text-3xl"} font-bold tracking-tight ${s.color}`}>
              {s.key === "monthlyPayroll" || s.key === "salaryCommitment"
                ? s.value.length
                  ? s.value.map((row) => <span key={row.currency} className="block">{formatMoney(row.total, row.currency)}</span>)
                  : <span className="block text-sm font-medium text-gray-500 dark:text-gray-400">{s.key === "monthlyPayroll" ? "No finalized payroll this month" : "No salary records available"}</span>
                : formatNumber(s.value)}
            </p>
          </Link>
          ))}
        </div>
        </>
      )}

      {/* Middle Grid: Leave Details & Admin Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time Leave Stats Card */}
        <div className={`p-5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-700 ${
          pulsingMetrics["leaveStats"] ? "bg-blue-50 dark:bg-blue-950/20" : ""
        }`}>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-bold text-gray-800 dark:text-white">Leave Details</h4>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Live Sync
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Applied", value: dashboardData.leaveStats.applied, color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200" },
              { label: "Approved", value: dashboardData.leaveStats.approved, color: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-200" },
              { label: "Rejected", value: dashboardData.leaveStats.rejected, color: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200" },
              { label: "Pending", value: dashboardData.leaveStats.pending, color: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200" },
            ].map((l) => (
              <div key={l.label} className={`rounded-xl p-3 text-center ${l.color}`}>
                <div className="text-xs font-medium uppercase tracking-wider">{l.label}</div>
                <div className="text-2xl font-bold mt-1">{formatNumber(l.value)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Admin List Table */}
        <div className="p-5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h4 className="text-lg font-bold text-gray-800 dark:text-white">Admin operational status</h4>
            <span className="text-xs text-gray-500 dark:text-gray-400">{formatNumber(activeAdminsCount)} online</span>
          </div>
          {adminActionError && (
            <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">
              {adminActionError}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-3 py-2.5">Full Name</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-gray-500">No administration personnel found</td>
                  </tr>
                ) : (
                  admins.map((admin) => (
                    <tr key={admin.ID ?? admin.id} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50/50">
                      <td className="px-3 py-3">
                        <div className="font-medium text-gray-800 dark:text-gray-200">{admin.full_name}</div>
                        <div className="text-xs text-gray-400">{admin.email}</div>
                      </td>
                      <td className="px-3 py-3">
                        {admin.is_online ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                            Offline
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <Link to={`/dashboard/edit_admin/${admin.ID ?? admin.id}`} className="px-2 py-1 text-xs font-medium rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-200 mr-2 hover:bg-cyan-200">
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(admin.ID ?? admin.id)}
                          disabled={deletingAdminId !== null}
                          className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingAdminId === (admin.ID ?? admin.id) ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">Department distribution</h4>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Active employees by department</p>
            </div>
            <Link to="/dashboard/department" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">Manage</Link>
          </div>
          {departments.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">No department data available yet.</p>
          ) : (
            <div className="space-y-4">
              {departments.map((dept) => {
                const share = dashboardData.employeeTotal
                  ? Math.round((dept.employee_count / dashboardData.employeeTotal) * 100)
                  : 0;
                return (
                  <div key={dept.id}>
                    <div className="mb-1.5 flex justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-gray-700 dark:text-gray-200">{dept.name}</span>
                      <span className="shrink-0 text-gray-500 dark:text-gray-400">{formatNumber(dept.employee_count)} · {share}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                      <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${share}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white">Recent registrations</h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Latest employee profiles added</p>
          </div>
          {state.recentEmployees.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">No employee registrations to show.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {state.recentEmployees.map((employee) => (
                <li key={employee.id} className="flex items-center justify-between gap-3 py-3 first:pt-1">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">{employee.full_name}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{employee.department_name || "No department"} · {employee.email}</p>
                  </div>
                  <time className="shrink-0 text-xs text-gray-500 dark:text-gray-400">{formatDate(employee.created_at)}</time>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">Recent system activity</h4>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Administrative changes recorded in the audit log</p>
            </div>
          </div>
          {state.recentActivity.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">No audit activity has been recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700/50 dark:text-gray-400">
                  <tr>
                    <th className="px-3 py-2.5">Action</th>
                    <th className="px-3 py-2.5">Record</th>
                    <th className="px-3 py-2.5">Performed by</th>
                    <th className="px-3 py-2.5 text-right">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {state.recentActivity.map((activity) => (
                    <tr key={activity.id}>
                      <td className="px-3 py-3 font-medium text-gray-800 dark:text-gray-200">{activity.action}</td>
                      <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{activity.entity_type}{activity.entity_id ? ` #${activity.entity_id}` : ""}</td>
                      <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{activity.actor_name || "System"}</td>
                      <td className="px-3 py-3 text-right text-gray-500 dark:text-gray-400">{formatDate(activity.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Home;