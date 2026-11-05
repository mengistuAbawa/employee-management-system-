import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

const EditEmployee = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [employee, setEmployee] = useState({
    full_name: "",
    email: "",
    salary: "",
    address: "",
    category_id: "",
    department_id: "",
    position_id: "",
  });

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const [categoryResponse, departmentResponse, employeeResponse] = await Promise.all([
          axios.get(`${apiBaseUrl}/category`, { withCredentials: true }),
          axios.get(`${apiBaseUrl}/auth/department`, { withCredentials: true }),
          axios.get(`${apiBaseUrl}/employee/${id}`, { withCredentials: true }),
        ]);
        if (!categoryResponse.data?.Status || !departmentResponse.data?.Status || !employeeResponse.data?.Status) {
          throw new Error(
            categoryResponse.data?.Error ||
            departmentResponse.data?.Error ||
            employeeResponse.data?.Error ||
            "Could not load employee details.",
          );
        }
        const data = employeeResponse.data.Result?.[0];
        if (!data) throw new Error("Employee not found.");
        if (!active) return;
        setCategories(categoryResponse.data.Result || []);
        setDepartments(departmentResponse.data.Result || []);
        setEmployee({
          full_name: data.full_name || "",
          email: data.email || "",
          address: data.address || "",
          salary: data.salary ?? "",
          category_id: data.category_id ?? "",
          department_id: data.department_id ?? "",
          position_id: data.position_id ?? "",
        });
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.Error || requestError.message || "Could not load employee details.");
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!employee.department_id) {
      setPositions([]);
      return undefined;
    }

    let active = true;
    setLoadingPositions(true);
    axios.get(`${apiBaseUrl}/positions`, {
      params: { department_id: employee.department_id },
      withCredentials: true,
    })
      .then((response) => {
        if (!response.data?.Status) throw new Error(response.data?.Error || "Could not load positions.");
        if (active) setPositions(response.data.Result || []);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.Error || requestError.message || "Could not load positions.");
      })
      .finally(() => {
        if (active) setLoadingPositions(false);
      });
    return () => { active = false; };
  }, [employee.department_id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await axios.put(
        `${apiBaseUrl}/edit_employee/${id}`,
        {
          full_name: employee.full_name,
          email: employee.email,
          salary: employee.salary,
          address: employee.address,
          category_id: employee.category_id,
          department_id: employee.department_id,
          position_id: employee.position_id || null,
        },
        { withCredentials: true },
      );
      if (!response.data?.Status) throw new Error(response.data?.Error || "Could not update employee.");
      navigate("/dashboard/employee");
    } catch (requestError) {
      setError(requestError.response?.data?.Error || requestError.message || "Could not update employee.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p role="status" className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Loading employee details…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card">
        <h1 className="mb-6 text-center text-xl font-bold text-gray-900 dark:text-white">Edit employee profile</h1>
        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Full name
              <input type="text" className="input-field mt-1 w-full" value={employee.full_name} required maxLength={255} onChange={(event) => setEmployee((current) => ({ ...current, full_name: event.target.value }))} />
            </label>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Email
              <input type="email" className="input-field mt-1 w-full" value={employee.email} required maxLength={255} onChange={(event) => setEmployee((current) => ({ ...current, email: event.target.value }))} />
            </label>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Salary
              <input type="number" min="0" step="0.01" className="input-field mt-1 w-full" value={employee.salary} required onChange={(event) => setEmployee((current) => ({ ...current, salary: event.target.value }))} />
            </label>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Address
              <input type="text" className="input-field mt-1 w-full" value={employee.address} onChange={(event) => setEmployee((current) => ({ ...current, address: event.target.value }))} />
            </label>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Category
              <select className="input-field mt-1 w-full" value={employee.category_id} required onChange={(event) => setEmployee((current) => ({ ...current, category_id: event.target.value }))}>
                <option value="">Select category</option>
                {categories.map((category) => {
                  const categoryId = category.id ?? category.ID;
                  return <option key={categoryId} value={categoryId}>{category.name}</option>;
                })}
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Department
              <select
                className="input-field mt-1 w-full"
                value={employee.department_id}
                required
                onChange={(event) => setEmployee((current) => ({
                  ...current,
                  department_id: event.target.value,
                  position_id: "",
                }))}
              >
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>{department.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 sm:col-span-2">
              Position <span className="font-normal text-gray-500">(optional)</span>
              <select
                className="input-field mt-1 w-full"
                value={employee.position_id}
                disabled={!employee.department_id || loadingPositions}
                onChange={(event) => setEmployee((current) => ({ ...current, position_id: event.target.value }))}
              >
                <option value="">{loadingPositions ? "Loading positions…" : "No position assigned"}</option>
                {positions.map((position) => (
                  <option
                    key={position.id}
                    value={position.id}
                    disabled={!position.is_active && String(position.id) !== String(employee.position_id)}
                  >
                    {position.title}{position.is_active ? "" : " (inactive)"}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => navigate("/dashboard/employee")} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-success" disabled={saving || loadingPositions}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEmployee;
