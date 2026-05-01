import React, { useState, useEffect } from "react";
import { Clock, LogIn, LogOut, CalendarDays } from "lucide-react";

const EmployeeAttendance = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [status, setStatus] = useState("out");
  const [records, setRecords] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClockIn = () => {
    const now = new Date();
    setStatus("in");
    setRecords((prev) => [{ type: "Clock In", time: now.toLocaleTimeString(), date: now.toLocaleDateString() }, ...prev]);
  };

  const handleClockOut = () => {
    const now = new Date();
    setStatus("out");
    setRecords((prev) => [{ type: "Clock Out", time: now.toLocaleTimeString(), date: now.toLocaleDateString() }, ...prev]);
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
          <h5 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Today's Records</h5>
          {records.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-6">No records for today yet.</p>
          ) : (
            <ul className="space-y-2">
              {records.map((rec, idx) => (
                <li key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <span className="font-medium text-gray-800 dark:text-gray-200">{rec.type}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{rec.time}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeAttendance;

