import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

const AddEmployee = () => {
  const [employee, setEmployee] = useState({
    full_name: "",
    email: "",
    password: "",
    salary: "",
    address: "",
    category_id: "",
    department_id: "",
    position_id: "",
    image: null,
  });

  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const fetchOptions = async () => {
      try {
        const [categoryResponse, departmentResponse] = await Promise.all([
          axios.get(`${apiBaseUrl}/category`, { withCredentials: true }),
          axios.get(`${apiBaseUrl}/auth/department`, { withCredentials: true }),
        ]);
        if (!categoryResponse.data?.Status || !departmentResponse.data?.Status) {
          throw new Error(categoryResponse.data?.Error || departmentResponse.data?.Error || "Could not load employee options.");
        }
        if (active) {
          setCategories(categoryResponse.data.Result || []);
          setDepartments(departmentResponse.data.Result || []);
        }
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.Error || requestError.message || "Could not load employee options.");
      } finally {
        if (active) setLoadingOptions(false);
      }
    };
    fetchOptions();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!employee.department_id) {
      setPositions([]);
      return undefined;
    }

    let active = true;
    setLoadingPositions(true);
    axios.get(`${apiBaseUrl}/positions`, {
      params: { department_id: employee.department_id, active: true },
      withCredentials: true,
    })
      .then((response) => {
        if (!response.data?.Status) throw new Error(response.data?.Error || "Could not load positions.");
        if (active) {
          setPositions(response.data.Result || []);
          setError("");
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.Error || requestError.message || "Could not load positions.");
      })
      .finally(() => {
        if (active) setLoadingPositions(false);
      });
    return () => { active = false; };
  }, [employee.department_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const formData = new FormData();
    formData.append("full_name", employee.full_name);
    formData.append("email", employee.email);
    formData.append("password", employee.password);
    formData.append("salary", employee.salary);
    formData.append("address", employee.address);
    formData.append("category_id", employee.category_id);
    formData.append("department_id", employee.department_id);
    formData.append("position_id", employee.position_id);
    if (employee.image) {
      formData.append("image", employee.image);
    }

    try {
      const result = await axios.post(
        `${apiBaseUrl}/add_employee`,
        formData,
        {
          withCredentials: true,
        }
      );

      if (result.data.Status) {
        navigate("/dashboard/employee");
      } else {
        setError(result.data.Error || "Could not add employee.");
      }
    } catch (err) {
      setError(err.response?.data?.Error || "Could not add employee.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex justify-center items-start pt-4">
      <div className="card w-full max-w-xl p-6 bg-white dark:bg-gray-800 rounded shadow-md">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white text-center mb-6">
          Add Employee
        </h3>
        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        {loadingOptions && <p role="status" className="mb-4 text-sm text-gray-500 dark:text-gray-400">Loading categories and departments…</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Full Name
            </label>
            <input
              type="text"
              className="input-field w-full border rounded p-2"
              placeholder="Enter Full Name"
              value={employee.full_name}
              required
              onChange={(e) => setEmployee({ ...employee, full_name: e.target.value })}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Email
            </label>
            <input
              type="email"
              className="input-field w-full border rounded p-2"
              placeholder="Enter Email"
              value={employee.email}
              required
              onChange={(e) => setEmployee({ ...employee, email: e.target.value })}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={72}
              className="input-field w-full border rounded p-2"
              placeholder="Enter Password"
              value={employee.password}
              required
              onChange={(e) => setEmployee({ ...employee, password: e.target.value })}
            />
          </div>

          {/* Salary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Salary
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input-field w-full border rounded p-2"
              placeholder="Enter Salary"
              value={employee.salary}
              required
              onChange={(e) => setEmployee({ ...employee, salary: e.target.value })}
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Address
            </label>
            <input
              type="text"
              className="input-field w-full border rounded p-2"
              placeholder="Enter Address"
              value={employee.address}
              required
              onChange={(e) => setEmployee({ ...employee, address: e.target.value })}
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Category
            </label>
            <select
              className="input-field w-full border rounded p-2"
              value={employee.category_id}
              required
              onChange={(e) => setEmployee({ ...employee, category_id: e.target.value })}
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id || c.ID} value={c.id || c.ID}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Department
            </label>
            <select
              className="input-field w-full border rounded p-2"
              value={employee.department_id}
              required
              onChange={(e) => setEmployee((current) => ({
                ...current,
                department_id: e.target.value,
                position_id: "",
              }))}
            >
              <option value="">Select Department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Position <span className="text-gray-500">(optional)</span>
            </label>
            <select
              className="input-field w-full border rounded p-2"
              value={employee.position_id}
              disabled={!employee.department_id || loadingPositions}
              onChange={(e) => setEmployee((current) => ({ ...current, position_id: e.target.value }))}
            >
              <option value="">{loadingPositions ? "Loading positions…" : "Select Position"}</option>
              {positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.title}{position.department_id ? "" : " (organization-wide)"}
                </option>
              ))}
            </select>
            {!loadingPositions && employee.department_id && positions.length === 0 && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">No active positions are configured for this department.</p>
            )}
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Image
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="input-field w-full border rounded p-2"
              onChange={(e) => setEmployee({ ...employee, image: e.target.files[0] })}
            />
          </div>

          <button 
            type="submit" 
            disabled={saving || loadingOptions || loadingPositions}
            className="btn-primary w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 transition"
          >
            {saving ? "Adding employee…" : "Add Employee"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddEmployee;