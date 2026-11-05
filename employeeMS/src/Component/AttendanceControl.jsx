import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Clock, CheckCircle, XCircle, Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");
const pageSize = 50;

const AttendanceControl = () => {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchAttendances = useCallback(async (nextOffset) => {
    setLoading(true);
    try {
      const params = { limit: pageSize, offset: nextOffset };
      if (statusFilter !== "all") params.status = statusFilter;
      if (dateFilter) params.date = dateFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      const response = await axios.get(`${apiBaseUrl}/attendances`, {
        params,
        withCredentials: true,
      });
      if (!response.data?.Status) {
        throw new Error(response.data?.Error || "Could not load attendance records");
      }
      setAttendances(response.data.Result || []);
      setTotal(Number(response.data.Meta?.total || 0));
      setOffset(nextOffset);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not load attendance records");
    } finally {
      setLoading(false);
    }
  }, [dateFilter, searchTerm, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAttendances(0);
    }, searchTerm ? 250 : 0);
    return () => clearTimeout(timer);
  }, [dateFilter, fetchAttendances, searchTerm, statusFilter]);

  const reviewAttendance = async (id, action) => {
    setReviewingId(id);
    setError("");
    try {
      const response = await axios.put(`${apiBaseUrl}/attendances/${id}/${action}`, {}, { withCredentials: true });
      if (!response.data?.Status) {
        throw new Error(response.data?.Error || `Could not ${action} attendance`);
      }
      await fetchAttendances(offset);
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || `Could not ${action} attendance`);
    } finally {
      setReviewingId(null);
    }
  };

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + attendances.length, total);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Clock size={28} className="text-blue-500" />
          <h4 className="text-2xl font-bold text-gray-800 dark:text-white">Attendance Control</h4>
        </div>
        <button
          type="button"
          onClick={() => fetchAttendances(offset)}
          className="btn-primary flex items-center gap-2 px-4 py-2"
          disabled={loading}
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div role="alert" className="card rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
          <input
            type="search"
            placeholder="Search employee or email..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <input
          type="date"
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b p-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing {pageStart}–{pageEnd} of {total} records
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fetchAttendances(Math.max(0, offset - pageSize))}
              disabled={loading || offset === 0}
              aria-label="Previous attendance page"
              className="rounded-lg border p-2 disabled:opacity-40 dark:border-gray-600"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => fetchAttendances(offset + pageSize)}
              disabled={loading || offset + pageSize >= total}
              aria-label="Next attendance page"
              className="rounded-lg border p-2 disabled:opacity-40 dark:border-gray-600"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Clock in</th>
                <th className="px-4 py-3 text-left">Clock out</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">Loading attendance records...</td></tr>
              ) : attendances.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">No matching attendance records found.</td></tr>
              ) : attendances.map((attendance, index) => (
                <tr key={attendance.id} className="border-b hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium">{offset + index + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                    <div>{attendance.employee_name}</div>
                    <div className="text-xs font-normal text-gray-500">{attendance.email}</div>
                  </td>
                  <td className="px-4 py-3">{new Date(`${String(attendance.date).slice(0, 10)}T00:00:00`).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{attendance.clock_in_time || "—"}</td>
                  <td className="px-4 py-3">{attendance.clock_out_time || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      attendance.status === "approved" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                        attendance.status === "rejected" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" :
                          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    }`}>
                      {attendance.status}
                    </span>
                  </td>
                  <td className="space-x-1 whitespace-nowrap px-4 py-3 text-right">
                    {attendance.status === "pending" && (
                      <>
                        <button
                          type="button"
                          onClick={() => reviewAttendance(attendance.id, "approve")}
                          disabled={reviewingId === attendance.id}
                          className="inline-flex items-center rounded-md bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200 disabled:opacity-50 dark:bg-green-900 dark:text-green-200"
                        >
                          <CheckCircle size={14} className="mr-1" /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => reviewAttendance(attendance.id, "reject")}
                          disabled={reviewingId === attendance.id}
                          className="inline-flex items-center rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-900 dark:text-red-200"
                        >
                          <XCircle size={14} className="mr-1" /> Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceControl;
