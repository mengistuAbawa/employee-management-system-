import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Bell, Megaphone, Plus, RefreshCw, Send, Trash2 } from "lucide-react";

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");
const emptyAnnouncement = () => ({ title: "", body: "", expires_at: "", department_ids: [] });
const emptyNotification = () => ({ audience: "all", employee_id: "", department_id: "", title: "", body: "" });

const formatDate = (value) => {
  if (!value) return "No expiry";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "No expiry"
    : date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};

const asLocalDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const CommunicationsManagement = () => {
  const [activeTab, setActiveTab] = useState("announcements");
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [announcementForm, setAnnouncementForm] = useState(emptyAnnouncement);
  const [notificationForm, setNotificationForm] = useState(emptyNotification);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fetchAnnouncements = useCallback(async () => {
    try {
      const response = await axios.get(`${apiBaseUrl}/announcements`, {
        params: { limit: 100, offset: 0 },
        withCredentials: true,
      });
      if (!response.data?.Status) throw new Error(response.data?.Error || "Could not load announcements.");
      const rows = response.data.Result || [];
      setAnnouncements(rows);
      return rows;
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not load announcements.");
      return null;
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await axios.get(`${apiBaseUrl}/notifications`, {
        params: { limit: 100, offset: 0 },
        withCredentials: true,
      });
      if (!response.data?.Status) throw new Error(response.data?.Error || "Could not load notifications.");
      setNotifications(response.data.Result || []);
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not load notifications.");
    }
  }, []);

  const fetchReferenceData = useCallback(async () => {
    try {
      const [departmentResponse, employeeResponse] = await Promise.all([
        axios.get(`${apiBaseUrl}/department`, { withCredentials: true }),
        axios.get(`${apiBaseUrl}/auth/employee`, {
          params: { status: "active", limit: 100, offset: 0 },
          withCredentials: true,
        }),
      ]);
      if (!departmentResponse.data?.Status || !employeeResponse.data?.Status) {
        throw new Error(departmentResponse.data?.Error || employeeResponse.data?.Error || "Could not load audience options.");
      }
      setDepartments(departmentResponse.data.Result || []);
      setEmployees((employeeResponse.data.Result || []).filter((employee) => employee.approval_status === "approved"));
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not load audience options.");
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    await Promise.all([fetchAnnouncements(), fetchNotifications(), fetchReferenceData()]);
    setLoading(false);
  }, [fetchAnnouncements, fetchNotifications, fetchReferenceData]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startNewAnnouncement = () => {
    setSelectedAnnouncement(null);
    setAnnouncementForm(emptyAnnouncement());
    setError("");
    setNotice("");
  };

  const selectAnnouncement = (announcement) => {
    setSelectedAnnouncement(announcement);
    setAnnouncementForm({
      title: announcement.title,
      body: announcement.body,
      expires_at: asLocalDateTime(announcement.expires_at),
      department_ids: (announcement.departments || []).map((department) => String(department.id)),
    });
    setError("");
    setNotice("");
  };

  const handleSaveAnnouncement = async (event) => {
    event.preventDefault();
    const expiresAt = announcementForm.expires_at ? new Date(announcementForm.expires_at) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      setError("Enter a valid expiration date and time.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    const payload = {
      title: announcementForm.title,
      body: announcementForm.body,
      expires_at: expiresAt ? expiresAt.toISOString() : null,
      department_ids: announcementForm.department_ids.map(Number),
    };
    try {
      const response = selectedAnnouncement
        ? await axios.put(`${apiBaseUrl}/announcements/${selectedAnnouncement.id}`, payload, { withCredentials: true })
        : await axios.post(`${apiBaseUrl}/announcements`, payload, { withCredentials: true });
      if (!response.data?.Status) throw new Error(response.data?.Error || "Could not save announcement.");
      const saved = response.data.Result;
      const departmentRows = departments.filter((department) => payload.department_ids.includes(Number(department.id)));
      const next = { ...saved, departments: departmentRows };
      setSelectedAnnouncement(next);
      setAnnouncementForm({
        ...announcementForm,
        expires_at: asLocalDateTime(saved.expires_at),
      });
      setNotice(selectedAnnouncement ? "Announcement changes saved." : "Announcement draft created.");
      await fetchAnnouncements();
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not save announcement.");
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!selectedAnnouncement) return;
    const nextPublishedState = !selectedAnnouncement.is_published;
    if (nextPublishedState && !window.confirm("Publish this announcement to its selected audience now?")) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await axios.post(
        `${apiBaseUrl}/announcements/${selectedAnnouncement.id}/publish`,
        { is_published: nextPublishedState },
        { withCredentials: true },
      );
      if (!response.data?.Status) throw new Error(response.data?.Error || "Could not update announcement status.");
      setSelectedAnnouncement((current) => ({ ...current, ...response.data.Result }));
      setNotice(nextPublishedState
        ? `Announcement published; ${Number(response.data.notificationCount || 0)} employee notifications created.`
        : "Announcement unpublished.");
      await fetchAnnouncements();
      await fetchNotifications();
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not update announcement status.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAnnouncement = async () => {
    if (!selectedAnnouncement || !window.confirm("Delete this unpublished announcement draft?")) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await axios.delete(`${apiBaseUrl}/announcements/${selectedAnnouncement.id}`, { withCredentials: true });
      if (!response.data?.Status) throw new Error(response.data?.Error || "Could not delete announcement.");
      setSelectedAnnouncement(null);
      setAnnouncementForm(emptyAnnouncement());
      setNotice("Announcement draft deleted.");
      await fetchAnnouncements();
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not delete announcement.");
    } finally {
      setSaving(false);
    }
  };

  const handleSendNotification = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await axios.post(`${apiBaseUrl}/notifications`, {
        ...notificationForm,
        employee_id: notificationForm.audience === "employee" ? Number(notificationForm.employee_id) : null,
        department_id: notificationForm.audience === "department" ? Number(notificationForm.department_id) : null,
      }, { withCredentials: true });
      if (!response.data?.Status) throw new Error(response.data?.Error || "Could not send notification.");
      setNotice(`Notification sent to ${response.data.Result.recipientCount} employee(s).`);
      setNotificationForm(emptyNotification());
      await fetchNotifications();
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not send notification.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Organization communications</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">Announcements & notifications</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Publish department-targeted updates or send in-app messages to employees.</p>
        </div>
        <button type="button" onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">{notice}</p>}

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {[
          ["announcements", "Announcements", <Megaphone size={16} key="announcement-icon" />],
          ["notifications", "Send notification", <Bell size={16} key="notification-icon" />],
        ].map(([tab, label, icon]) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === tab ? "border-blue-600 text-blue-700 dark:text-blue-300" : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"}`}>
            {icon}{label}
          </button>
        ))}
      </div>

      {activeTab === "announcements" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.3fr)]">
          <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">Announcement register</h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{announcements.length} recent announcements</p>
              </div>
              <button type="button" onClick={startNewAnnouncement} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"><Plus size={14} /> New</button>
            </div>
            {loading ? (
              <p role="status" className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading announcements…</p>
            ) : announcements.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No announcements yet.</p>
            ) : (
              <ul className="max-h-[720px] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-700">
                {announcements.map((announcement) => (
                  <li key={announcement.id}>
                    <button type="button" onClick={() => selectAnnouncement(announcement)} className={`w-full px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedAnnouncement?.id === announcement.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold text-gray-900 dark:text-white">{announcement.title}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${announcement.is_published ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"}`}>
                          {announcement.is_published ? "Published" : "Draft"}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                        {(announcement.departments || []).length ? announcement.departments.map((department) => department.name).join(", ") : "All employees"}
                      </span>
                      <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">Expires: {formatDate(announcement.expires_at)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">{selectedAnnouncement ? "Edit announcement" : "Create announcement draft"}</h2>
                {selectedAnnouncement && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Status: {selectedAnnouncement.is_published ? "Published" : "Draft"}</p>}
              </div>
              {selectedAnnouncement?.is_published && <span className="text-xs text-gray-500 dark:text-gray-400">Published messages notify the selected audience.</span>}
            </div>
            <form onSubmit={handleSaveAnnouncement} className="space-y-4">
              <label className="grid gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                Title
                <input value={announcementForm.title} onChange={(event) => setAnnouncementForm((form) => ({ ...form, title: event.target.value }))} maxLength={255} required className="rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-900" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                Message
                <textarea value={announcementForm.body} onChange={(event) => setAnnouncementForm((form) => ({ ...form, body: event.target.value }))} maxLength={20000} rows={7} required className="resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-900" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                Target departments <span className="font-normal text-gray-500">(leave unselected for all employees)</span>
                <select
                  multiple
                  value={announcementForm.department_ids}
                  onChange={(event) => setAnnouncementForm((form) => ({
                    ...form,
                    department_ids: Array.from(event.target.selectedOptions, (option) => option.value),
                  }))}
                  className="min-h-28 rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
                >
                  {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                </select>
              </label>
              <label className="grid max-w-sm gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                Expiration (optional)
                <input type="datetime-local" value={announcementForm.expires_at} onChange={(event) => setAnnouncementForm((form) => ({ ...form, expires_at: event.target.value }))} min={asLocalDateTime(new Date())} className="rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-900" />
              </label>
              <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
                {selectedAnnouncement && !selectedAnnouncement.is_published && (
                  <button type="button" onClick={handleDeleteAnnouncement} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300"><Trash2 size={15} /> Delete draft</button>
                )}
                {selectedAnnouncement && (
                  <button type="button" onClick={handlePublishToggle} disabled={saving} className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${selectedAnnouncement.is_published ? "border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-200" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
                    {selectedAnnouncement.is_published ? "Unpublish" : "Publish"}
                  </button>
                )}
                <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{saving ? "Saving…" : selectedAnnouncement ? "Save changes" : "Save draft"}</button>
              </div>
            </form>
          </section>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.3fr)]">
          <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 font-bold text-gray-900 dark:text-white">Send in-app notification</h2>
            <form onSubmit={handleSendNotification} className="space-y-4">
              <label className="grid gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                Audience
                <select value={notificationForm.audience} onChange={(event) => setNotificationForm((form) => ({ ...form, audience: event.target.value, employee_id: "", department_id: "" }))} className="rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-900">
                  <option value="all">All active employees</option>
                  <option value="department">A department</option>
                  <option value="employee">One employee</option>
                </select>
              </label>
              {notificationForm.audience === "department" && (
                <label className="grid gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                  Department
                  <select value={notificationForm.department_id} onChange={(event) => setNotificationForm((form) => ({ ...form, department_id: event.target.value }))} required className="rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-900">
                    <option value="">Select department</option>
                    {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                  </select>
                </label>
              )}
              {notificationForm.audience === "employee" && (
                <label className="grid gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                  Employee
                  <select value={notificationForm.employee_id} onChange={(event) => setNotificationForm((form) => ({ ...form, employee_id: event.target.value }))} required className="rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-900">
                    <option value="">Select employee</option>
                    {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name} · {employee.email}</option>)}
                  </select>
                </label>
              )}
              <label className="grid gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                Title
                <input value={notificationForm.title} onChange={(event) => setNotificationForm((form) => ({ ...form, title: event.target.value }))} maxLength={255} required className="rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-900" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                Message
                <textarea value={notificationForm.body} onChange={(event) => setNotificationForm((form) => ({ ...form, body: event.target.value }))} maxLength={5000} rows={5} required className="resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-900" />
              </label>
              <button type="submit" disabled={saving || loading} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                <Send size={16} /> {saving ? "Sending…" : "Send notification"}
              </button>
            </form>
          </section>

          <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700">
              <h2 className="font-bold text-gray-900 dark:text-white">Recent notifications</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Most recent 100 organization notifications.</p>
            </div>
            {loading ? (
              <p role="status" className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading notifications…</p>
            ) : notifications.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No notifications have been sent.</p>
            ) : (
              <ul className="max-h-[720px] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-700">
                {notifications.map((notification) => (
                  <li key={notification.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white">{notification.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${notification.read_at ? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"}`}>
                        {notification.read_at ? "Read" : "Unread"}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{notification.body}</p>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {notification.employee_name} · {notification.department_name || "No department"} · {formatDate(notification.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default CommunicationsManagement;
