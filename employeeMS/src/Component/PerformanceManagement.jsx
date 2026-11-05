import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Award,
  CheckCircle2,
  LoaderCircle,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");
const reviewStatuses = ["draft", "submitted", "acknowledged"];
const goalStatuses = ["not_started", "in_progress", "completed", "cancelled"];

const emptyGoal = () => ({ title: "", description: "", due_date: "", status: "not_started" });
const emptyReviewForm = () => ({ employee_id: "", period_start: "", period_end: "", rating: "", summary: "", goals: [] });

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const StatusBadge = ({ status }) => (
  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
    status === "draft"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
      : status === "submitted"
        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
  }`}>
    {status}
  </span>
);

const GoalFields = ({ goals, onChange, disabled = false }) => {
  const updateGoal = (index, key, value) => {
    onChange(goals.map((goal, goalIndex) => goalIndex === index ? { ...goal, [key]: value } : goal));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Goals</h3>
        {!disabled && (
          <button type="button" onClick={() => onChange([...goals, emptyGoal()])} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400">
            <Plus size={14} /> Add goal
          </button>
        )}
      </div>
      {goals.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No goals added.</p>
      ) : goals.map((goal, index) => (
        <div key={goal.id || index} className="grid gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700 md:grid-cols-2">
          <label className="grid gap-1 text-xs font-medium text-gray-600 dark:text-gray-300 md:col-span-2">
            Goal title
            <input
              value={goal.title}
              onChange={(event) => updateGoal(index, "title", event.target.value)}
              maxLength={255}
              required
              disabled={disabled}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
            Description
            <textarea
              value={goal.description || ""}
              onChange={(event) => updateGoal(index, "description", event.target.value)}
              maxLength={2000}
              rows={2}
              disabled={disabled}
              className="resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
              Due date
              <input
                type="date"
                value={goal.due_date ? String(goal.due_date).slice(0, 10) : ""}
                onChange={(event) => updateGoal(index, "due_date", event.target.value)}
                disabled={disabled}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
              Status
              <select
                value={goal.status || "not_started"}
                onChange={(event) => updateGoal(index, "status", event.target.value)}
                disabled={disabled}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800"
              >
                {goalStatuses.map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}
              </select>
            </label>
          </div>
          {!disabled && (
            <button type="button" onClick={() => onChange(goals.filter((_, goalIndex) => goalIndex !== index))} className="justify-self-start text-xs font-semibold text-red-600 hover:text-red-800 dark:text-red-400">
              Remove goal
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

const PerformanceManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [createForm, setCreateForm] = useState(emptyReviewForm);
  const [editForm, setEditForm] = useState(emptyReviewForm);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fetchReviews = useCallback(async () => {
    setLoadingReviews(true);
    try {
      const params = { limit: 100, offset: 0 };
      if (statusFilter !== "all") params.status = statusFilter;
      if (appliedSearch) params.search = appliedSearch;
      const response = await axios.get(`${apiBaseUrl}/performance/reviews`, { params, withCredentials: true });
      if (!response.data?.Status) throw new Error(response.data?.Error || "Could not load performance reviews.");
      setReviews(response.data.Result || []);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not load performance reviews.");
    } finally {
      setLoadingReviews(false);
    }
  }, [appliedSearch, statusFilter]);

  const fetchEmployees = useCallback(async () => {
    setLoadingEmployees(true);
    try {
      const response = await axios.get(`${apiBaseUrl}/auth/employee`, {
        params: { status: "active", limit: 100, offset: 0 },
        withCredentials: true,
      });
      if (!response.data?.Status) throw new Error(response.data?.Error || "Could not load employees.");
      setEmployees((response.data.Result || []).filter((employee) => employee.approval_status === "approved"));
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not load employees.");
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
    fetchEmployees();
  }, [fetchEmployees, fetchReviews]);

  const fetchReview = async (reviewId) => {
    setError("");
    try {
      const response = await axios.get(`${apiBaseUrl}/performance/reviews/${reviewId}`, { withCredentials: true });
      if (!response.data?.Status) throw new Error(response.data?.Error || "Could not load review details.");
      const review = response.data.Result;
      setSelectedReview(review);
      setEditForm({
        rating: review.rating === null ? "" : String(review.rating),
        summary: review.summary || "",
        goals: (review.goals || []).map((goal) => ({
          ...goal,
          due_date: goal.due_date ? String(goal.due_date).slice(0, 10) : "",
        })),
      });
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not load review details.");
    }
  };

  const goalPayload = (goals) => goals.map((goal) => ({
    title: goal.title.trim(),
    description: goal.description || "",
    due_date: goal.due_date || null,
    status: goal.status || "not_started",
  }));

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await axios.post(`${apiBaseUrl}/performance/reviews`, {
        ...createForm,
        employee_id: Number(createForm.employee_id),
        rating: createForm.rating === "" ? null : Number(createForm.rating),
        goals: goalPayload(createForm.goals),
      }, { withCredentials: true });
      if (!response.data?.Status) throw new Error(response.data?.Error || "Could not create review.");
      setNotice("Draft performance review created.");
      setCreateForm(emptyReviewForm());
      await fetchReviews();
      await fetchReview(response.data.Result.id);
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not create review.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async (event) => {
    event.preventDefault();
    if (!selectedReview) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await axios.put(`${apiBaseUrl}/performance/reviews/${selectedReview.id}`, {
        rating: editForm.rating === "" ? null : Number(editForm.rating),
        summary: editForm.summary,
        goals: goalPayload(editForm.goals),
      }, { withCredentials: true });
      if (!response.data?.Status) throw new Error(response.data?.Error || "Could not save review.");
      setNotice("Draft review saved.");
      await fetchReviews();
      await fetchReview(selectedReview.id);
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not save review.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedReview) return;
    if (!window.confirm("Submit this review to the employee? Submitted reviews can no longer be edited.")) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await axios.post(`${apiBaseUrl}/performance/reviews/${selectedReview.id}/submit`, {}, { withCredentials: true });
      if (!response.data?.Status) throw new Error(response.data?.Error || "Could not submit review.");
      setNotice("Review submitted for employee acknowledgement.");
      await fetchReviews();
      await fetchReview(selectedReview.id);
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not submit review.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!selectedReview || !window.confirm("Delete this draft review and its goals?")) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await axios.delete(`${apiBaseUrl}/performance/reviews/${selectedReview.id}`, { withCredentials: true });
      if (!response.data?.Status) throw new Error(response.data?.Error || "Could not delete review.");
      setSelectedReview(null);
      setNotice("Draft review deleted.");
      await fetchReviews();
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not delete review.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Growth and development</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white"><Award size={25} /> Performance reviews</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create draft reviews, set goals, then submit them for employee acknowledgement.</p>
        </div>
        <button type="button" onClick={() => { fetchReviews(); fetchEmployees(); }} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">{notice}</p>}

      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 font-bold text-gray-900 dark:text-white">Create a review draft</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="grid gap-1 text-sm font-medium text-gray-700 dark:text-gray-200 md:col-span-2">
              Employee
              <select
                value={createForm.employee_id}
                onChange={(event) => setCreateForm((form) => ({ ...form, employee_id: event.target.value }))}
                required
                disabled={loadingEmployees}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
              >
                <option value="">{loadingEmployees ? "Loading employees…" : "Select an active employee"}</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name} · {employee.email}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              Period start
              <input type="date" value={createForm.period_start} onChange={(event) => setCreateForm((form) => ({ ...form, period_start: event.target.value }))} required className="rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-900" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              Period end
              <input type="date" value={createForm.period_end} onChange={(event) => setCreateForm((form) => ({ ...form, period_end: event.target.value }))} required className="rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-900" />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-[180px_1fr]">
            <label className="grid content-start gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              Rating (0–5)
              <input type="number" min="0" max="5" step="0.01" value={createForm.rating} onChange={(event) => setCreateForm((form) => ({ ...form, rating: event.target.value }))} className="rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-900" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              Summary
              <textarea rows={3} maxLength={5000} value={createForm.summary} onChange={(event) => setCreateForm((form) => ({ ...form, summary: event.target.value }))} className="resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-900" />
            </label>
          </div>
          <GoalFields goals={createForm.goals} onChange={(goals) => setCreateForm((form) => ({ ...form, goals }))} />
          <button type="submit" disabled={saving || loadingEmployees || employees.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />} Create draft
          </button>
        </form>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.5fr)]">
        <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-100 p-4 dark:border-gray-700">
            <h2 className="font-bold text-gray-900 dark:text-white">Review register</h2>
            <form onSubmit={(event) => { event.preventDefault(); setAppliedSearch(searchInput.trim()); }} className="mt-3 flex gap-2">
              <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search employee or department" className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900" />
              <button type="submit" className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white dark:bg-gray-700">Search</button>
            </form>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900">
              <option value="all">All statuses</option>
              {reviewStatuses.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}
            </select>
          </div>
          {loadingReviews ? (
            <p role="status" className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading reviews…</p>
          ) : reviews.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No performance reviews match these filters.</p>
          ) : (
            <ul className="max-h-[720px] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-700">
              {reviews.map((review) => (
                <li key={review.id}>
                  <button type="button" onClick={() => fetchReview(review.id)} className={`w-full px-4 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedReview?.id === review.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white">{review.full_name}</span>
                      <StatusBadge status={review.status} />
                    </span>
                    <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{formatDate(review.period_start)} – {formatDate(review.period_end)} · {review.goal_count} goals</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {!selectedReview ? (
            <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">Select a review to view details and manage its draft.</p>
          ) : (
            <>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4 dark:border-gray-700">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selectedReview.full_name}</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{selectedReview.email} · {selectedReview.department_name || "No department"}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{formatDate(selectedReview.period_start)} – {formatDate(selectedReview.period_end)}</p>
                </div>
                <StatusBadge status={selectedReview.status} />
              </div>
              {selectedReview.status === "draft" ? (
                <form onSubmit={handleSaveDraft} className="space-y-4">
                  <label className="grid max-w-[180px] gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                    Rating (0–5)
                    <input type="number" min="0" max="5" step="0.01" value={editForm.rating} onChange={(event) => setEditForm((form) => ({ ...form, rating: event.target.value }))} className="rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-900" />
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                    Summary
                    <textarea rows={5} maxLength={5000} value={editForm.summary} onChange={(event) => setEditForm((form) => ({ ...form, summary: event.target.value }))} className="resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-900" />
                  </label>
                  <GoalFields goals={editForm.goals} onChange={(goals) => setEditForm((form) => ({ ...form, goals }))} />
                  <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
                    <button type="button" onClick={handleDeleteReview} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300">
                      <Trash2 size={15} /> Delete draft
                    </button>
                    <button type="submit" disabled={saving} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200">
                      Save draft
                    </button>
                    <button type="button" onClick={handleSubmitReview} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                      <Send size={15} /> Submit to employee
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Rating</p>
                    <p className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">{selectedReview.rating === null ? "Not rated" : `${Number(selectedReview.rating).toFixed(2)} / 5`}</p>
                    <p className="mt-4 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200">{selectedReview.summary || "No summary provided."}</p>
                  </div>
                  <GoalFields goals={selectedReview.goals || []} onChange={() => {}} disabled />
                  <p className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"><CheckCircle2 size={16} /> Submitted reviews are read-only; the employee can acknowledge receipt.</p>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default PerformanceManagement;
