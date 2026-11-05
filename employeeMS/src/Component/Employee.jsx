import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import profile from "./Image/profile.jpg";

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");
const pageSize = 20;

const Employee = () => {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [employmentFilter, setEmploymentFilter] = useState("active");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offboardingEmployee, setOffboardingEmployee] = useState(null);
  const [departureReason, setDepartureReason] = useState("");
  const [offboarding, setOffboarding] = useState(false);
  const [offboardingError, setOffboardingError] = useState("");

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${apiBaseUrl}/employee`, {
        params: {
          limit: pageSize,
          offset: page * pageSize,
          search,
          status: employmentFilter,
        },
        withCredentials: true,
      });
      if (!data.Status) throw new Error(data.Error || "Could not load employees");
      setEmployees(data.Result || []);
      setTotal(Number(data.Meta?.total || 0));
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not load employees");
    } finally {
      setLoading(false);
    }
  }, [page, search, employmentFilter]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const openOffboarding = (employee) => {
    setOffboardingEmployee(employee);
    setDepartureReason("");
    setOffboardingError("");
  };

  const handleOffboarding = async (event) => {
    event.preventDefault();
    if (!offboardingEmployee || !departureReason.trim()) {
      setOffboardingError("Enter a reason before confirming this employee's departure.");
      return;
    }

    setOffboarding(true);
    setOffboardingError("");
    try {
      const { data } = await axios.put(
        `${apiBaseUrl}/employees/${offboardingEmployee.id}/offboard`,
        { reason: departureReason.trim() },
        { withCredentials: true },
      );
      if (!data.Status) throw new Error(data.Error || "Could not record employee departure");
      setOffboardingEmployee(null);
      setDepartureReason("");
      if (page > 0 && page * pageSize >= total - 1) {
        setPage((current) => current - 1);
      } else {
        await fetchEmployees();
      }
    } catch (requestError) {
      setOffboardingError(requestError.response?.data?.Error || requestError.message || "Could not record employee departure");
    } finally {
      setOffboarding(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      {offboardingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Record employee departure</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {offboardingEmployee.full_name} will no longer be able to sign in. Their profile, salary, attendance, and leave history will be retained.
            </p>
            <form onSubmit={handleOffboarding} className="mt-4 space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Departure reason
                <textarea
                  className="input-field mt-1 min-h-28 w-full"
                  value={departureReason}
                  onChange={(event) => setDepartureReason(event.target.value)}
                  maxLength={2000}
                  required
                  autoFocus
                />
              </label>
              {offboardingError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{offboardingError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setOffboardingEmployee(null)}
                  disabled={offboarding}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-danger" disabled={offboarding || !departureReason.trim()}>
                  {offboarding ? "Recording..." : "Record departure"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">Employee Management</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View employee profiles, manage salary, and retain a record of departures.
          </p>
        </div>
        <Link to="/dashboard/add_employee" className="btn-success text-sm">Add Employee</Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          className="input-field min-w-56 flex-1"
          placeholder="Search name or email..."
          value={search}
          onChange={(event) => {
            setPage(0);
            setSearch(event.target.value);
          }}
        />
        <select
          className="input-field w-auto min-w-40"
          value={employmentFilter}
          onChange={(event) => {
            setPage(0);
            setEmploymentFilter(event.target.value);
          }}
          aria-label="Filter employee status"
        >
          <option value="active">Active employees</option>
          <option value="departed">Departed employees</option>
          <option value="all">All employees</option>
        </select>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

      <div className="overflow-x-auto card">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Salary</th>
              <th className="px-4 py-3">Department / Position</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading employees...</td></tr>
            ) : employees.length ? employees.map((employee) => (
              <tr key={employee.id} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={employee.image ? `${apiBaseUrl}/images/${employee.image}` : profile}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{employee.full_name}</p>
                      <p className="text-xs text-gray-500">#{employee.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{employee.email}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  {new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(Number(employee.salary) || 0)}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  <span>{employee.department_name || "No department"}</span>
                  <span className="block text-xs text-gray-500">{employee.position_name || "No position assigned"}</span>
                  <span className="block text-xs text-gray-500">{employee.category_name || "No category"}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs ${
                    employee.employment_status === "departed"
                      ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                      : employee.approval_status === "approved"
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                        : employee.approval_status === "rejected"
                          ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200"
                  }`}>
                    {employee.employment_status === "departed" ? "Departed" : employee.approval_status || "Pending"}
                  </span>
                  {employee.departure_reason && (
                    <p className="mt-1 max-w-48 truncate text-xs text-gray-500" title={employee.departure_reason}>
                      Reason: {employee.departure_reason}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Link to={`/employee_detail/${employee.id}`} className="mr-2 inline-block rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-200">View</Link>
                  <Link to={`/dashboard/edit_employee/${employee.id}`} className="mr-2 inline-block rounded bg-cyan-100 px-2 py-1 text-xs font-medium text-cyan-700 dark:bg-cyan-900 dark:text-cyan-200">Edit</Link>
                  <Link to="/dashboard/salary" className="mr-2 inline-block rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200">Salary</Link>
                  {employee.employment_status !== "departed" && (
                    <button
                      type="button"
                      onClick={() => openOffboarding(employee)}
                      className="inline-block rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900 dark:text-red-200"
                    >
                      Record departure
                    </button>
                  )}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No employees found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
        <span>{total ? `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, total)} of ${total}` : "0 employees"}</span>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary px-3 py-1" onClick={() => setPage((current) => Math.max(current - 1, 0))} disabled={page === 0 || loading}>
            Previous
          </button>
          <button type="button" className="btn-secondary px-3 py-1" onClick={() => setPage((current) => current + 1)} disabled={page + 1 >= totalPages || loading}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Employee;
