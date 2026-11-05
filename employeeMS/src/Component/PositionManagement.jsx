import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { BriefcaseBusiness, Plus, RotateCcw } from "lucide-react";

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");
const emptyForm = { title: "", department_id: "", description: "" };

const PositionManagement = () => {
  const [positions, setPositions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [positionResponse, departmentResponse] = await Promise.all([
        axios.get(`${apiBaseUrl}/positions`, { withCredentials: true }),
        axios.get(`${apiBaseUrl}/auth/department`, { withCredentials: true }),
      ]);
      if (!positionResponse.data?.Status || !departmentResponse.data?.Status) {
        throw new Error(positionResponse.data?.Error || departmentResponse.data?.Error || "Could not load positions.");
      }
      setPositions(positionResponse.data.Result || []);
      setDepartments(departmentResponse.data.Result || []);
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not load positions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const payload = {
      ...form,
      title: form.title.trim(),
      department_id: form.department_id || null,
    };

    try {
      const response = editingId
        ? await axios.put(`${apiBaseUrl}/positions/${editingId}`, {
            ...payload,
            is_active: positions.find((position) => String(position.id) === String(editingId))?.is_active ?? true,
          }, { withCredentials: true })
        : await axios.post(`${apiBaseUrl}/positions`, payload, { withCredentials: true });
      if (!response.data?.Status) throw new Error(response.data?.Error || "Could not save position.");
      setSuccess(response.data.Message || (editingId ? "Position updated." : "Position created."));
      setForm(emptyForm);
      setEditingId(null);
      await fetchData();
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not save position.");
    } finally {
      setSaving(false);
    }
  };

  const editPosition = (position) => {
    setEditingId(position.id);
    setForm({
      title: position.title,
      department_id: position.department_id ?? "",
      description: position.description || "",
    });
    setError("");
    setSuccess("");
  };

  const togglePosition = async (position) => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await axios.put(`${apiBaseUrl}/positions/${position.id}`, {
        title: position.title,
        department_id: position.department_id,
        description: position.description || "",
        is_active: !position.is_active,
      }, { withCredentials: true });
      if (!response.data?.Status) throw new Error(response.data?.Error || "Could not update position status.");
      setSuccess(response.data.Message || "Position status updated.");
      await fetchData();
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not update position status.");
    } finally {
      setSaving(false);
    }
  };

  const filteredPositions = positions.filter((position) =>
    `${position.title} ${position.department_name || "Organization-wide"}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Organization structure</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <BriefcaseBusiness size={24} /> Position management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create department-specific or organization-wide positions and assign them to employees.</p>
        </div>
      </header>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      {success && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{success}</p>}

      <section className="card">
        <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">{editingId ? "Edit position" : "Create position"}</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Position title
            <input
              className="input-field mt-1 w-full"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              maxLength={150}
              required
            />
          </label>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Department
            <select
              className="input-field mt-1 w-full"
              value={form.department_id}
              onChange={(event) => setForm((current) => ({ ...current, department_id: event.target.value }))}
            >
              <option value="">Organization-wide</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200 md:col-span-2">
            Description <span className="font-normal text-gray-500">(optional)</span>
            <textarea
              className="input-field mt-1 w-full"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              rows={3}
              maxLength={2000}
            />
          </label>
          <div className="flex justify-end gap-2 md:col-span-2">
            {editingId && <button type="button" className="btn-secondary" onClick={cancelEdit} disabled={saving}>Cancel</button>}
            <button type="submit" className="btn-primary inline-flex items-center gap-2" disabled={saving}>
              {editingId ? <RotateCcw size={16} /> : <Plus size={16} />}
              {saving ? "Saving…" : editingId ? "Save changes" : "Create position"}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Positions</h2>
          <input
            type="search"
            className="input-field w-full sm:max-w-xs"
            placeholder="Search title or department"
            aria-label="Search positions"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3 text-right">Employees</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading positions…</td></tr>
              ) : filteredPositions.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No positions found. Create a position to get started.</td></tr>
              ) : filteredPositions.map((position) => (
                <tr key={position.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 dark:text-white">{position.title}</p>
                    {position.description && <p className="mt-1 max-w-md truncate text-xs text-gray-500">{position.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{position.department_name || "Organization-wide"}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{Number(position.employee_count).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      position.is_active
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    }`}>{position.is_active ? "Active" : "Inactive"}</span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button type="button" onClick={() => editPosition(position)} disabled={saving} className="mr-3 font-medium text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-400">Edit</button>
                    <button type="button" onClick={() => togglePosition(position)} disabled={saving} className="font-medium text-gray-600 hover:underline disabled:opacity-50 dark:text-gray-300">
                      {position.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default PositionManagement;
