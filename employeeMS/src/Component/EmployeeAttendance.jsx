import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Clock, LogIn, LogOut, CalendarDays } from "lucide-react";

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

const EmployeeAttendance = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [status, setStatus] = useState("out");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await axios.get(`${apiBaseUrl}/employee/attendance`, { withCredentials: true });
      if (!res.data.Status) {
        throw new Error(res.data.Error || "Could not load attendance history");
      }

      const rows = res.data.Result || [];
      setHistory(rows);
      const today = res.data.TodayAttendance;
      setStatus(today?.clock_in_time && !today.clock_out_time ? "in" : "out");
      setError("");
    } catch (err) {
      setError(err.response?.data?.Error || err.message || "Could not load attendance history");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const recordAttendance = async (action) => {
    setActionLoading(true);
    setError("");
    try {
      const response = await axios.post(
        `${apiBaseUrl}/employee/attendance`,
        { action },
        { withCredentials: true },
      );
      if (!response.data.Status) {
        throw new Error(response.data.Error || "Could not record attendance");
      }
      await fetchHistory();
    } catch (err) {
      setError(err.response?.data?.Error || err.message || "Could not record attendance");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h4 className="flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-white">
        <Clock size={24} /> Attendance
      </h4>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="card space-y-4 text-center">
          <CalendarDays size={48} className="mx-auto text-blue-500" />
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white">{currentTime.toLocaleTimeString()}</h2>
          <p className="text-gray-500 dark:text-gray-400">
            {currentTime.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
          <div className="mt-2 flex justify-center gap-3">
            <button
              onClick={() => recordAttendance("clock_in")}
              disabled={status === "in" || actionLoading || historyLoading}
              className="btn-success flex items-center gap-2 disabled:opacity-50"
            >
              <LogIn size={18} /> Clock In
            </button>
            <button
              onClick={() => recordAttendance("clock_out")}
              disabled={status === "out" || actionLoading || historyLoading}
              className="btn-danger flex items-center gap-2 disabled:opacity-50"
            >
              <LogOut size={18} /> Clock Out
            </button>
          </div>
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
            status === "in"
              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
              : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
          }`}>
            Status: {status === "in" ? "Clocked In" : "Clocked Out"}
          </span>
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h5 className="text-lg font-bold text-gray-800 dark:text-white">Attendance History</h5>
            <button onClick={fetchHistory} disabled={historyLoading} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
              {historyLoading ? "Loading..." : "Refresh"}
            </button>
          </div>
          {historyLoading ? (
            <p className="py-6 text-center text-gray-500 dark:text-gray-400">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="py-6 text-center text-gray-500 dark:text-gray-400">No attendance records found.</p>
          ) : (
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {history.slice(0, 10).map((record) => (
                <div key={record.id} className="flex items-center justify-between rounded-lg border bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700">
                  <div>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{new Date(`${String(record.date).slice(0, 10)}T00:00:00`).toLocaleDateString()}</span>
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                      {record.clock_in_time || "—"} – {record.clock_out_time || "Not clocked out"}
                    </span>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs ${
                    record.status === "approved" ? "bg-green-100 text-green-700" :
                    record.status === "rejected" ? "bg-red-100 text-red-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>
                    {record.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeAttendance;
