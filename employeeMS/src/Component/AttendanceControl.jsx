import React, { useState, useEffect } from "react";
import axios from "axios";
import { Clock, CheckCircle, XCircle, Search, RefreshCw } from "lucide-react";

const AttendanceControl = () => {
  const [attendances, setAttendances] = useState([]);
  const [filteredAttendances, setFilteredAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    fetchAttendances();
  }, []);

  const fetchAttendances = async () => {
    try {
      const res = await axios.get("http://localhost:3000/attendances", {
        params: { limit: 50, offset: 0 },
        withCredentials: true,
      });
      if (res.data.Status) {
        const data = res.data.Result || [];
        setAttendances(data);
        setFilteredAttendances(data);

      } else {
        setError(res.data.Error || "Failed to fetch attendances");
      }
    } catch (err) {
      setError(err.response?.data?.Error || "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filtered = attendances.filter(att => {
      const matchesSearch = att.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           att.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || att.status === statusFilter;
      const matchesDate = !dateFilter || new Date(att.date).toISOString().split('T')[0] === dateFilter;
      return matchesSearch && matchesStatus && matchesDate;
    });
    setFilteredAttendances(filtered);
  }, [attendances, searchTerm, statusFilter, dateFilter]);

  const handleApprove = async (id) => {
    if (!confirm("Approve this attendance record?")) return;
    try {
      const res = await axios.put(`http://localhost:3000/attendances/${id}/approve`, {}, { withCredentials: true });
      if (res.data.Status) {
        fetchAttendances();
      } else {
        alert(res.data.Error || "Approve failed");
      }
    } catch (err) {
      alert(err.response?.data?.Error || "Approve failed");
    }
  };

  const handleReject = async (id) => {
    if (!confirm("Reject this attendance record?")) return;
    try {
      const res = await axios.put(`http://localhost:3000/attendances/${id}/reject`, {}, { withCredentials: true });
      if (res.data.Status) {
        fetchAttendances();
      } else {
        alert(res.data.Error || "Reject failed");
      }
    } catch (err) {
      alert(err.response?.data?.Error || "Reject failed");
    }
  };

  if (loading) return <div className="card p-8 text-center">Loading attendances...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={28} className="text-blue-500" />
          <h4 className="text-2xl font-bold text-gray-800 dark:text-white">Attendance Control</h4>
        </div>
        <button 
          onClick={fetchAttendances} 
          className="flex items-center gap-2 btn-primary px-4 py-2"
          disabled={loading}
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="card p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200 border border-red-200 dark:border-red-800 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by employee name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="flex justify-between items-center mb-4 p-4 border-b">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredAttendances.length} of {attendances.length} records
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 uppercase text-gray-500 dark:text-gray-400 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Clock In</th>
                <th className="px-4 py-3 text-left">Clock Out</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    {attendances.length === 0 ? "No attendance records found." : "No matching records found."}
                  </td>
                </tr>
              ) : (
                filteredAttendances.map((att, idx) => (
                  <tr key={att.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{att.employee_name}</td>
                    <td className="px-4 py-3">{new Date(att.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{att.clock_in_time || 'N/A'}</td>
                    <td className="px-4 py-3">{att.clock_out_time || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        att.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        att.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {att.status?.charAt(0).toUpperCase() + att.status?.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      {att.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(att.id)}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800 rounded-md transition-colors"
                          >
                            <CheckCircle size={14} className="mr-1" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(att.id)}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800 rounded-md transition-colors"
                          >
                            <XCircle size={14} className="mr-1" />
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceControl;
