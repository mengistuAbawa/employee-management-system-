import React, { useState, useEffect } from "react";
import axios from "axios";
import { Clock, LogIn, LogOut, CalendarDays } from "lucide-react";

const EmployeeAttendance = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [status, setStatus] = useState("out");
  const [records, setRecords] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [employeeId] = useState(localStorage.getItem('employeeId') || '1'); // TODO: Get from auth context

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await axios.get("http://localhost:3000/employee/attendance", { withCredentials: true });
      if (res.data.Status) {
        setHistory(res.data.Result || []);
      }
    } catch (err) {
      console.error("History fetch failed", err);
    } finally {
      setHistoryLoading(false);
    }
  };

    const handleClockIn = async () => {
    await fetchHistory(); // Refresh after action
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const clockInTime = now.toTimeString().split(' ')[0];
    setStatus("in");
    setRecords((prev) => [{ type: "Clock In", time: clockInTime, date: today }, ...prev]);
    try {
      await axios.post("http://localhost:3000/employee/attendance", {
        employee_id: employeeId,
        date: today,
        clock_in_time: clockInTime
      }, { withCredentials: true });
      fetchHistory();
    } catch (err) {
      console.error("Clock in failed", err);
    }
  };

    const handleClockOut = async () => {
    await fetchHistory(); // Refresh after action
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const clockOutTime = now.toTimeString().split(' ')[0];
    setStatus("out");
    setRecords((prev) => [{ type: "Clock Out", time: clockOutTime, date: today }, ...prev]);
    try {
      await axios.post("http://localhost:3000/employee/attendance", {
        employee_id: employeeId,
        date: today,
        clock_out_time: clockOutTime
      }, { withCredentials: true });
      fetchHistory();
    } catch (err) {
      console.error("Clock out failed", err);
    }
  };

  return (
    <div className="space-y-6">
      <h4 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
        <Clock size={24} /> Attendance
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card text-center space-y-4">
          <CalendarDays size={48} className="mx-auto text-blue-500" />
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white">{currentTime.toLocaleTimeString()}</h2>
          <p className="text-gray-500 dark:text-gray-400">
            {currentTime.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
          <div className="flex justify-center gap-3 mt-2">
            <button onClick={handleClockIn} disabled={status === "in"} className="btn-success flex items-center gap-2 disabled:opacity-50">
              <LogIn size={18} /> Clock In
            </button>
            <button onClick={handleClockOut} disabled={status === "out"} className="btn-danger flex items-center gap-2 disabled:opacity-50">
              <LogOut size={18} /> Clock Out
            </button>
          </div>
          <div>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${status === "in" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200" : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"}`}>
              Status: {status === "in" ? "Clocked In" : "Clocked Out"}
            </span>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h5 className="text-lg font-bold text-gray-800 dark:text-white">Attendance History</h5>
            <button onClick={fetchHistory} disabled={historyLoading} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
              {historyLoading ? "Loading..." : "Refresh"}
            </button>
          </div>
          {historyLoading ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-6">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-6">No attendance records found.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {history.slice(0, 10).map((rec) => (
                <div key={rec.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border">
                  <div>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{new Date(rec.date).toLocaleDateString()}</span>
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                      {rec.clock_in_time} - {rec.clock_out_time || 'N/A'}
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    rec.status === 'approved' ? 'bg-green-100 text-green-700' :
                    rec.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {rec.status}
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

