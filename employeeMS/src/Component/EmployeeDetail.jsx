import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import profile from "./Image/profile.jpg";

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

const EmployeeDetail = () => {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { id } = useParams();

  useEffect(() => {
    let active = true;
    const fetchEmployee = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await axios.get(`${apiBaseUrl}/employee/${id}`, { withCredentials: true });
        if (!response.data?.Status) {
          throw new Error(response.data?.Error || "Could not load employee profile.");
        }
        if (active) setEmployee(response.data.Result?.[0] || null);
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.Error || requestError.message || "Could not load employee profile.");
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchEmployee();
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return <p role="status" className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Loading employee profile…</p>;
  }

  if (error || !employee) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error || "Employee profile not found."}</p>
        <Link to="/dashboard/employee" className="inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">Back to employees</Link>
      </div>
    );
  }

  const employmentStatus = employee.employment_status === "departed" ? "Departed" : employee.approval_status || "Pending";
  const statusClass = employee.employment_status === "departed"
    ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
    : employee.approval_status === "approved"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      : employee.approval_status === "rejected"
        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/dashboard/employee" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">← Back to employees</Link>
        <Link to={`/dashboard/edit_employee/${employee.id}`} className="btn-primary text-sm">Edit employee</Link>
      </div>

      <section className="card">
        <div className="flex flex-col items-center gap-5 border-b border-gray-100 pb-6 dark:border-gray-700 sm:flex-row">
          <img
            src={employee.image ? `${apiBaseUrl}/images/${employee.image}` : profile}
            alt={`${employee.full_name} profile`}
            className="h-24 w-24 rounded-full border-4 border-blue-100 object-cover dark:border-blue-900"
          />
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{employee.full_name}</h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">{employee.position_name || "No position assigned"} · {employee.department_name || "No department"}</p>
            <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass}`}>{employmentStatus}</span>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 pt-6 sm:grid-cols-2">
          {[
            ["Employee ID", `#${employee.id}`],
            ["Email", employee.email || "—"],
            ["Category", employee.category_name || "Unassigned"],
            ["Department", employee.department_name || "Unassigned"],
            ["Position", employee.position_name || "Unassigned"],
            ["Salary", new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(Number(employee.salary) || 0)],
            ["Address", employee.address || "Not provided"],
            ["Profile created", employee.created_at ? new Date(employee.created_at).toLocaleDateString() : "—"],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</dt>
              <dd className="mt-1 break-words text-sm font-medium text-gray-900 dark:text-gray-100">{value}</dd>
            </div>
          ))}
        </dl>

        {employee.departure_reason && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">Departure reason</p>
            <p className="mt-1 whitespace-pre-line text-sm text-amber-900 dark:text-amber-200">{employee.departure_reason}</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default EmployeeDetail;
