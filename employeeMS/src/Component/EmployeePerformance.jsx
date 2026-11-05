import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Award, CheckCircle2, LoaderCircle, RefreshCw } from "lucide-react";

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const EmployeePerformance = () => {
  const employeeId = localStorage.getItem("employeeId");
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fetchReviews = useCallback(async () => {
    if (!employeeId) {
      setError("Employee account information is unavailable. Please sign in again.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get(`${apiBaseUrl}/employee/performance/${employeeId}`, { withCredentials: true });
      if (!response.data?.Status) throw new Error(response.data?.Error || "Could not load performance reviews.");
      setReviews(response.data.Result || []);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not load performance reviews.");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleAcknowledge = async (review) => {
    if (!window.confirm("Acknowledge that you received this review? This confirms receipt, not agreement with its contents.")) return;
    setSavingId(review.id);
    setError("");
    setNotice("");
    try {
      const response = await axios.post(
        `${apiBaseUrl}/employee/performance/${employeeId}/reviews/${review.id}/acknowledge`,
        {},
        { withCredentials: true },
      );
      if (!response.data?.Status) throw new Error(response.data?.Error || "Could not acknowledge review.");
      setNotice("Review receipt acknowledged.");
      await fetchReviews();
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not acknowledge review.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Growth and development</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white"><Award size={25} /> Performance reviews</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Review your feedback and goals. Acknowledgement confirms receipt only.</p>
        </div>
        <button type="button" onClick={fetchReviews} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">{notice}</div>}

      {loading ? (
        <p role="status" className="rounded-xl border border-gray-100 bg-white px-5 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">Loading performance reviews…</p>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white px-5 py-12 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <Award size={30} className="mx-auto mb-3 text-gray-400" />
          <p className="font-semibold text-gray-800 dark:text-gray-200">No reviews available</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Submitted reviews from your administrator will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4 dark:border-gray-700">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Review period</p>
                  <h2 className="mt-1 font-bold text-gray-900 dark:text-white">{formatDate(review.period_start)} – {formatDate(review.period_end)}</h2>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                  review.status === "acknowledged"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                }`}>{review.status}</span>
              </header>
              {review.rating !== null && (
                <p className="mt-4 text-sm font-semibold text-blue-700 dark:text-blue-300">
                  Rating: {Number(review.rating).toFixed(2)} / 5
                </p>
              )}
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-200">{review.summary || "No written summary was provided."}</p>
              {review.goals?.length > 0 && (
                <section className="mt-5">
                  <h3 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">Goals</h3>
                  <ul className="space-y-2">
                    {review.goals.map((goal) => (
                      <li key={goal.id} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-gray-800 dark:text-gray-200">{goal.title}</p>
                          <span className="rounded-full bg-white px-2 py-0.5 text-xs capitalize text-gray-600 dark:bg-gray-800 dark:text-gray-300">{goal.status.replace("_", " ")}</span>
                        </div>
                        {goal.description && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{goal.description}</p>}
                        {goal.due_date && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Due {formatDate(goal.due_date)}</p>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {review.status === "submitted" && (
                <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Acknowledging confirms you received the review; it does not mean you agree with its contents.</p>
                  <button type="button" onClick={() => handleAcknowledge(review)} disabled={savingId === review.id} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                    {savingId === review.id ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Acknowledge receipt
                  </button>
                </footer>
              )}
              {review.status === "acknowledged" && (
                <p className="mt-5 inline-flex items-center gap-2 border-t border-gray-100 pt-4 text-sm text-emerald-700 dark:border-gray-700 dark:text-emerald-300">
                  <CheckCircle2 size={16} /> Acknowledged {review.acknowledged_at ? new Date(review.acknowledged_at).toLocaleDateString() : ""}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeePerformance;
