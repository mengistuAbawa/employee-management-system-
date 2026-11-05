import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Bell, CheckCheck, CheckCircle2, RefreshCw } from "lucide-react";

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

const formatDate = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};

const EmployeeNotifications = () => {
  const employeeId = localStorage.getItem("employeeId");
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fetchNotifications = useCallback(async () => {
    if (!employeeId) {
      setError("Employee account information is unavailable. Please sign in again.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get(`${apiBaseUrl}/employee/notifications/${employeeId}`, {
        params: { status: filter },
        withCredentials: true,
      });
      if (!response.data?.Status) throw new Error(response.data?.Error || "Could not load notifications.");
      setNotifications(response.data.Result || []);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }, [employeeId, filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (notificationId) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await axios.put(
        `${apiBaseUrl}/employee/notifications/${employeeId}/${notificationId}/read`,
        {},
        { withCredentials: true },
      );
      if (!response.data?.Status) throw new Error(response.data?.Error || "Could not update notification.");
      setNotifications((current) => current.map((notification) => (
        notification.id === notificationId
          ? { ...notification, read_at: response.data.Result.read_at }
          : notification
      )));
      setNotice("Notification marked as read.");
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not update notification.");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAllRead = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await axios.put(
        `${apiBaseUrl}/employee/notifications/${employeeId}/read-all`,
        {},
        { withCredentials: true },
      );
      if (!response.data?.Status) throw new Error(response.data?.Error || "Could not update notifications.");
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((notification) => ({ ...notification, read_at: notification.read_at || readAt })));
      setNotice(`${Number(response.data.updated || 0)} notification(s) marked as read.`);
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not update notifications.");
    } finally {
      setSaving(false);
    }
  };

  const unreadCount = notifications.filter((notification) => !notification.read_at).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Your updates</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white"><Bell size={24} /> Notifications</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Personal in-app messages and announcement updates.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={fetchNotifications} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button type="button" onClick={handleMarkAllRead} disabled={saving || unreadCount === 0} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            <CheckCheck size={16} /> Mark all read
          </button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">{notice}</div>}

      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-700">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">Inbox</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{unreadCount} unread in this view</p>
          </div>
          <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900">
            <option value="all">All notifications</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>
        {loading ? (
          <p role="status" className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">Loading notifications…</p>
        ) : notifications.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Bell size={28} className="mx-auto mb-3 text-gray-400" />
            <p className="font-semibold text-gray-800 dark:text-gray-200">No notifications found</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">New announcements and messages will appear here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {notifications.map((notification) => (
              <li key={notification.id} className={`flex flex-wrap items-start justify-between gap-4 px-5 py-4 ${notification.read_at ? "" : "bg-blue-50/50 dark:bg-blue-950/20"}`}>
                <div className="flex min-w-0 flex-1 gap-3">
                  <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${notification.read_at ? "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"}`}>
                    {notification.read_at ? <CheckCircle2 size={17} /> : <Bell size={17} />}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white">{notification.title}</p>
                      {!notification.read_at && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">New</span>}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-600 dark:text-gray-300">{notification.body}</p>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{notification.notification_type.replaceAll("_", " ")} · {formatDate(notification.created_at)}</p>
                  </div>
                </div>
                {!notification.read_at && (
                  <button type="button" onClick={() => handleMarkRead(notification.id)} disabled={saving} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                    Mark read
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default EmployeeNotifications;
