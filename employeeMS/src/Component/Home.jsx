import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";


const initialState = {
  dashboardData: {
    adminTotal: 0,
    employeeTotal: 0,
    pendingTotal: 0,
    totalSalary: 0,
    totalCategory: 0,
    leaveStats: { applied: 0, approved: 0, rejected: 0, pending: 0 },
  },
  admins: [],
  activeAdminsCount: 0,
  departments: [],
  pulsingMetrics: {},
};

const reducer = (state, action) => {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, ...action.payload };
    case "SET_METRIC_PULSE": {
      const { key, ttlMs = 1500 } = action;
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
        activeAdminsCount: action.activeCount,
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

  const triggerPulse = (metricKey) => {
    dispatch({ type: "SET_METRIC_PULSE", key: metricKey });
    setTimeout(() => {
      dispatch({ type: "CLEAR_METRIC_PULSE", key: metricKey });
    }, 1500);
  };

  useEffect(() => {
    // 1. INITIAL HYDRATION VIA REST API
    const fetchInitialData = async () => {
      try {
        const [adminRes, employeeRes, salaryRes, categoryRes, adminListRes, leaveRes, pendingRes, deptRes] =
          await Promise.all([
            axios.get("http://localhost:3000/admin_count", { withCredentials: true }),
            axios.get("http://localhost:3000/employee_count", { withCredentials: true }),
            axios.get("http://localhost:3000/total_salary", { withCredentials: true }),
            axios.get("http://localhost:3000/total_category", { withCredentials: true }),
            axios.get("http://localhost:3000/admin", { withCredentials: true }),
            axios.get("http://localhost:3000/leave_counts", { withCredentials: true }),
            axios.get("http://localhost:3000/pending_employee_count", { withCredentials: true }),
            axios.get("http://localhost:3000/departments_performance", { withCredentials: true }), // New endpoint
          ]);

        dispatch({
          type: "HYDRATE",
          payload: {
            dashboardData: {
              adminTotal: adminRes.data.Result?.[0]?.admin ?? 0,
              employeeTotal: employeeRes.data.Result?.[0]?.employee ?? 0,
              totalSalary: salaryRes.data.Salary ?? 0,
              totalCategory: categoryRes.data.Result?.[0]?.category ?? 0,
              pendingTotal: pendingRes.data.Result?.[0]?.pending ?? 0,
              leaveStats: leaveRes.data.Result || {
                applied: 0,
                approved: 0,
                rejected: 0,
                pending: 0,
              },
            },
            admins: adminListRes.data.Result || [],
            departments: deptRes.data.Result || [],
          },
        });
      } catch (err) {
        console.error("Failed fetching initial dashboard state:", err);
      }
    };

    fetchInitialData();

    // 2. REAL-TIME WEBSOCKET SUBSCRIPTION
    const socket = io("http://localhost:3000", { withCredentials: true });
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
      // Keep admin rows in sync (optional event)
      dispatch({
        type: "ADMIN_PRESENCE_CHANGED",
        activeCount: data.activeCount ?? state.activeAdminsCount,
        adminListState: data.adminListState,
      });
    });


    socket.on("departmentPerformanceUpdated", (data) => {
      dispatch({ type: "DEPARTMENT_PERFORMANCE_UPDATED", departments: data.departments });
    });

    socket.on("disconnect", () => {
      // You can show a disconnected badge if desired
    });

    // Cleanup connection on unmount to prevent resource memory leaks
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  const { dashboardData, admins, activeAdminsCount, departments, pulsingMetrics } = state;

  const formatNumber = (n) => {
    const num = Number(n ?? 0);
    return Number.isFinite(num) ? num.toLocaleString() : "0";
  };


  const handleDelete = async (id) => {
    if (!window.confirm("Delete this admin?")) return;
    setDeletingAdminId(id);
    setAdminActionError("");
    try {
      const res = await axios.delete(`http://localhost:3000/delete_admin/${id}`, { withCredentials: true });
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
    { key: "employeeTotal", label: "Total Employee", value: dashboardData.employeeTotal, color: "text-emerald-600", link: "/dashboard/employee" },
    { key: "totalCategory", label: "Total Category", value: dashboardData.totalCategory, color: "text-amber-600", link: "/dashboard/category" },
    { key: "totalSalary", label: "Total Salary", value: `$${formatNumber(dashboardData.totalSalary)}`, color: "text-purple-600", link: "/dashboard/salary" },
    { key: "pendingTotal", label: "Pending Employees", value: dashboardData.pendingTotal, color: "text-red-600", link: "/dashboard/pending_employees" },
    { key: "activeAdmins", label: "Active Admins Online", value: `${activeAdminsCount} of ${admins.length || 1}`, color: "text-cyan-600", link: null },
  ];

  return (
    <div className="space-y-6 p-4">
      {/* Top Real-time Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((s) => (
          <div 
            key={s.label} 
            className={`p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center transition-all duration-700 transform ${
              pulsingMetrics[s.key] ? "bg-emerald-50 dark:bg-emerald-950/40 scale-105 border-emerald-400" : ""
            }`}
          >
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{s.label}</h4>
            <div className="mt-2">
              <span className={`text-3xl font-bold ${s.color}`}>
                {s.key === "totalSalary" ? s.value : formatNumber(s.value)}
              </span>
            </div>
            {s.link && (
              <Link to={s.link} className="text-xs text-blue-500 hover:underline mt-2 inline-block">
                View Details
              </Link>
            )}
          </div>
        ))}
      </div>

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
          <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Admin Operational Status</h4>
          {adminActionError && (
            <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">
              {adminActionError}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50精密">
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

      {/* Bottom Grid: Dynamic Department Performance Tracker */}
      <div className="p-5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Real-time Department Performance & Skill Progression</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <div key={dept.id} className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
              <div className="flex justify-between items-start">
                <h5 className="font-bold text-gray-800 dark:text-white">{dept.name}</h5>
                <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                  {dept.user_count} Users
                </span>
              </div>
              <div className="mt-4 space-y-1">
                <div className="flex justify-between text-xs font-medium text-gray-500">
                  <span>Skill Level: <b className="text-gray-700 dark:text-gray-200">{dept.skill_title}</b></span>
                  <span>{dept.avg_experience_score ?? "N/A"}{dept.avg_experience_score == null ? "" : "%"}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-1000" 
                    style={{ width: `${Math.min(dept.avg_experience_score ?? 0, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;