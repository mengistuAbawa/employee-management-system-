import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CalendarOff,
  Camera,
  CheckCircle2,
  Clock3,
  DollarSign,
  Megaphone,
  UserRound,
} from "lucide-react";

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

const formatDate = (date) => {
  if (!date) return "Date unavailable";
  const parsedDate = new Date(`${String(date).slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsedDate.getTime())
    ? "Date unavailable"
    : parsedDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const parseTime = (time) => {
  if (typeof time !== "string") return null;
  const [hours, minutes, seconds = "0"] = time.split(":").map(Number);
  if (![hours, minutes, seconds].every(Number.isFinite)) return null;
  return hours * 3600 + minutes * 60 + seconds;
};

const getWorkedHours = (attendance, now) => {
  const start = parseTime(attendance?.clock_in_time);
  if (start === null) return null;
  const end = attendance.clock_out_time
    ? parseTime(attendance.clock_out_time)
    : now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  if (end === null) return null;
  const elapsedSeconds = end >= start ? end - start : end + 24 * 60 * 60 - start;
  return Math.max(0, elapsedSeconds / 3600);
};

const formatMoney = (amount, currency) => new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: String(currency || "USD").trim(),
  maximumFractionDigits: 2,
}).format(Number(amount || 0));

const StatusBadge = ({ status }) => {
  const style = status === "approved" || status === "acknowledged"
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
    : status === "rejected"
      ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
      : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${style}`}>{status}</span>;
};

const EmployeeDashboardHome = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [attendanceAction, setAttendanceAction] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const fileInputRef = useRef(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${apiBaseUrl}/employee/dashboard-summary`,
        { withCredentials: true },
      );
      if (!response.data?.Status) {
        throw new Error(response.data?.Error || "Could not load employee dashboard.");
      }
      setDashboard(response.data.Result);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not load employee dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedImage) {
      setImagePreview("");
      return undefined;
    }
    const previewUrl = URL.createObjectURL(selectedImage);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [selectedImage]);

  const recordAttendance = async (action) => {
    if (!dashboard?.profile?.id) return;
    setAttendanceAction(action);
    setNotice({ type: "", text: "" });
    try {
      const response = await axios.post(
        `${apiBaseUrl}/employee/attendance`,
        { action },
        { withCredentials: true },
      );
      if (!response.data?.Status) {
        throw new Error(response.data?.Error || "Could not record attendance.");
      }
      setNotice({ type: "success", text: response.data.Message || "Attendance recorded." });
      await fetchDashboard();
    } catch (requestError) {
      setNotice({
        type: "error",
        text: requestError.response?.data?.Error || requestError.message || "Could not record attendance.",
      });
    } finally {
      setAttendanceAction("");
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setNotice({ type: "error", text: "Choose a JPEG, PNG, WebP, or GIF image." });
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNotice({ type: "error", text: "Profile images must be 5 MB or smaller." });
      event.target.value = "";
      return;
    }
    setNotice({ type: "", text: "" });
    setSelectedImage(file);
  };

  const uploadImage = async () => {
    const employeeId = dashboard?.profile?.id;
    if (!employeeId || !selectedImage) return;
    setImageBusy(true);
    setNotice({ type: "", text: "" });
    const formData = new FormData();
    formData.append("image", selectedImage);

    try {
      const response = await axios.put(
        `${apiBaseUrl}/employee/update_profile_image/${employeeId}`,
        formData,
        { withCredentials: true },
      );
      if (!response.data?.Status) {
        throw new Error(response.data?.Error || "Could not update profile image.");
      }
      setDashboard((current) => ({
        ...current,
        profile: { ...current.profile, image: response.data.image },
      }));
      setSelectedImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setNotice({ type: "success", text: response.data.Message || "Profile photo updated." });
    } catch (requestError) {
      setNotice({
        type: "error",
        text: requestError.response?.data?.Error || requestError.message || "Could not update profile image.",
      });
    } finally {
      setImageBusy(false);
    }
  };

  if (loading && !dashboard) {
    return <p role="status" className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Loading your dashboard…</p>;
  }

  if (!dashboard && error) {
    return (
      <div className="card space-y-4">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <button type="button" onClick={fetchDashboard} className="btn-primary w-fit">Try again</button>
      </div>
    );
  }

  const {
    profile,
    todayAttendance,
    attendanceHistory,
    leaveStats,
    recentLeaves,
    leaveBalances,
    latestPayroll,
    announcements,
    notifications,
    reviews,
  } = dashboard;
  const workedHours = getWorkedHours(todayAttendance, currentTime);
  const leaveDaysAvailable = leaveBalances.reduce((sum, balance) => sum + Number(balance.remaining_days || 0), 0);
  const isClockedIn = Boolean(todayAttendance?.clock_in_time && !todayAttendance.clock_out_time);
  const avatar = imagePreview || (profile.image
    ? `${apiBaseUrl}/images/${profile.image}`
    : `${apiBaseUrl}/images/default.png`);

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      {notice.text && (
        <p role={notice.type === "error" ? "alert" : "status"} className={`rounded-lg px-4 py-3 text-sm ${
          notice.type === "error"
            ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            : "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
        }`}>
          {notice.text}
        </p>
      )}

      <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-800 p-6 text-white shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-blue-200">Employee workspace</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Welcome, {profile.full_name}</h1>
            <p className="mt-2 text-sm text-blue-100">
              {profile.department_name || "No department assigned"}
              {profile.category_name ? ` · ${profile.category_name}` : ""}
            </p>
            <p className="mt-4 text-sm text-blue-100">
              {currentTime.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <Link to="/employee/dashboard/attendance" className="inline-flex w-fit items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-blue-900 transition hover:bg-blue-50">
            Attendance <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Hours today", value: workedHours === null ? "—" : `${workedHours.toFixed(1)} h`, icon: <Clock3 size={20} />, tone: "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300" },
          { label: "Pending leave requests", value: Number(leaveStats.pending || 0).toLocaleString(), icon: <CalendarOff size={20} />, tone: "text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300" },
          { label: "Available leave days", value: leaveBalances.length ? leaveDaysAvailable.toLocaleString(undefined, { maximumFractionDigits: 1 }) : "—", icon: <CalendarDays size={20} />, tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300" },
          { label: "Latest finalized pay", value: latestPayroll ? formatMoney(latestPayroll.net_pay, latestPayroll.currency) : "—", icon: <DollarSign size={20} />, tone: "text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-300" },
        ].map((metric) => (
          <div key={metric.label} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${metric.tone}`}>{metric.icon}</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{metric.label}</p>
            <p className="mt-1 truncate text-xl font-bold text-gray-900 dark:text-white">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 xl:col-span-2">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Today’s attendance</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Record your workday attendance.</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isClockedIn
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
            }`}>
              {isClockedIn ? "Currently clocked in" : todayAttendance?.clock_out_time ? "Workday complete" : "Not clocked in"}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
              <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Clock in</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{todayAttendance?.clock_in_time || "—"}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
              <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Clock out</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{todayAttendance?.clock_out_time || "—"}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
              <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Hours worked</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{workedHours === null ? "—" : `${workedHours.toFixed(1)} hours`}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={() => recordAttendance("clock_in")} disabled={Boolean(attendanceAction) || Boolean(todayAttendance)} className="btn-success disabled:cursor-not-allowed disabled:opacity-50">
              {attendanceAction === "clock_in" ? "Recording…" : "Clock in"}
            </button>
            <button type="button" onClick={() => recordAttendance("clock_out")} disabled={Boolean(attendanceAction) || !isClockedIn} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
              {attendanceAction === "clock_out" ? "Recording…" : "Clock out"}
            </button>
            <span className="self-center text-xs text-gray-500 dark:text-gray-400">Status: {todayAttendance?.status || "No record"}</span>
          </div>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">My profile</h2>
            <UserRound size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <img src={avatar} alt={`${profile.full_name} profile`} onError={(event) => { event.currentTarget.src = `${apiBaseUrl}/images/default.png`; }} className="h-16 w-16 rounded-full border-2 border-blue-100 object-cover dark:border-blue-900" />
              <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Choose a new profile photo" className="absolute -bottom-1 -right-1 rounded-full bg-blue-600 p-1.5 text-white shadow hover:bg-blue-700">
                <Camera size={14} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} className="hidden" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-gray-900 dark:text-white">{profile.full_name}</p>
              <p className="truncate text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{profile.department_name || "Department not set"}</p>
            </div>
          </div>
          {selectedImage && (
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={uploadImage} disabled={imageBusy} className="btn-primary px-3 py-2 text-sm disabled:opacity-50">{imageBusy ? "Saving…" : "Save photo"}</button>
              <button type="button" onClick={() => { setSelectedImage(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
            </div>
          )}
          <Link to="/employee/dashboard/settings" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">
            Account settings <ArrowRight size={15} />
          </Link>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Leave balance</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Current-year balance by leave type</p>
            </div>
            <Link to="/employee/dashboard/leaves" className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">My leave</Link>
          </div>
          {leaveBalances.length === 0 ? (
            <p className="py-5 text-center text-sm text-gray-500 dark:text-gray-400">No leave balances have been configured for this year.</p>
          ) : (
            <div className="space-y-3">
              {leaveBalances.map((balance) => (
                <div key={balance.leave_type} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-700/50">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{balance.leave_type}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {Number(balance.remaining_days).toLocaleString()} of {Number(balance.entitled_days).toLocaleString()} days
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            {Number(leaveStats.approved || 0)} approved · {Number(leaveStats.pending || 0)} awaiting review · {Number(leaveStats.total || 0)} total requests
          </p>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Latest finalized pay</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your most recent completed payroll</p>
            </div>
            <DollarSign size={20} className="text-violet-600 dark:text-violet-400" />
          </div>
          {latestPayroll ? (
            <div className="rounded-lg bg-violet-50 p-4 dark:bg-violet-900/20">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatMoney(latestPayroll.net_pay, latestPayroll.currency)}</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {formatDate(latestPayroll.period_start)} – {formatDate(latestPayroll.period_end)}
              </p>
              {latestPayroll.finalized_at && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Finalized {formatDate(latestPayroll.finalized_at)}</p>}
            </div>
          ) : (
            <p className="py-5 text-center text-sm text-gray-500 dark:text-gray-400">No finalized payroll record is available yet.</p>
          )}
          <Link to="/employee/dashboard/payroll" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">
            View payroll <ArrowRight size={15} />
          </Link>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent attendance</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your latest recorded work sessions</p>
            </div>
            <Link to="/employee/dashboard/attendance" aria-label="View all attendance" className="text-blue-600 hover:text-blue-700 dark:text-blue-400"><ArrowRight size={18} /></Link>
          </div>
          {attendanceHistory.length === 0 ? (
            <p className="py-5 text-center text-sm text-gray-500 dark:text-gray-400">No attendance records yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {attendanceHistory.map((record) => (
                <li key={record.id} className="flex items-center justify-between gap-3 py-3 first:pt-1">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{formatDate(record.date)}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{record.clock_in_time || "—"} – {record.clock_out_time || "In progress"}</p>
                  </div>
                  <StatusBadge status={record.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Leave requests</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Recent request status</p>
            </div>
            <Link to="/employee/dashboard/leaves" aria-label="View all leave requests" className="text-blue-600 hover:text-blue-700 dark:text-blue-400"><ArrowRight size={18} /></Link>
          </div>
          {recentLeaves.length === 0 ? (
            <p className="py-5 text-center text-sm text-gray-500 dark:text-gray-400">You have not submitted a leave request.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentLeaves.map((leave) => (
                <li key={leave.id} className="flex items-center justify-between gap-3 py-3 first:pt-1">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{leave.leave_type}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatDate(leave.start_date)} – {formatDate(leave.end_date)}</p>
                  </div>
                  <StatusBadge status={leave.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <Megaphone size={19} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Announcements</h2>
          </div>
          {announcements.length === 0 ? (
            <p className="py-5 text-center text-sm text-gray-500 dark:text-gray-400">There are no current announcements.</p>
          ) : (
            <ul className="space-y-3">
              {announcements.map((announcement) => (
                <li key={announcement.id} className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
                  <p className="font-semibold text-gray-900 dark:text-white">{announcement.title}</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">{announcement.body}</p>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{formatDate(announcement.published_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bell size={19} className="text-amber-600 dark:text-amber-400" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Notifications</h2>
            </div>
            <Link to="/employee/dashboard/notifications" className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">Open inbox</Link>
          </div>
          {notifications.length === 0 ? (
            <p className="py-5 text-center text-sm text-gray-500 dark:text-gray-400">You’re all caught up.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {notifications.map((notification) => (
                <li key={notification.id} className="flex gap-3 py-3 first:pt-1">
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{notification.title}</p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{notification.body}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatDate(notification.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {reviews.length > 0 && (
        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Performance reviews</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {reviews.map((review) => (
              <article key={review.id} className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatDate(review.period_start)} – {formatDate(review.period_end)}</p>
                  <StatusBadge status={review.status} />
                </div>
                {review.rating !== null && <p className="mt-2 text-sm font-medium text-blue-700 dark:text-blue-300">Rating: {Number(review.rating).toFixed(1)} / 5</p>}
                {review.summary && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{review.summary}</p>}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default EmployeeDashboardHome;
