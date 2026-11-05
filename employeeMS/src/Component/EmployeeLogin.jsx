import React, { useState, useEffect } from "react";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

const EmployeeLogin = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [values, setValues] = useState({
    email: "",
    password: "",
    full_name: "",
    address: "",
    category_id: "",
    department_id: "",
  });
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (!isRegister) return;

    Promise.all([
      axios.get(`${apiBaseUrl}/category`, { withCredentials: true }),
      axios.get(`${apiBaseUrl}/auth/department`, { withCredentials: true }),
    ])
      .then(([categoryResponse, departmentResponse]) => {
        if (categoryResponse.data.Status) setCategories(categoryResponse.data.Result || []);
        if (departmentResponse.data.Status) setDepartments(departmentResponse.data.Result || []);
      })
      .catch((err) => console.log(err));
  }, [isRegister]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    try {
      if (isRegister) {
        if (
          !values.full_name ||
          !values.email ||
          !values.password ||
          !values.category_id ||
          !values.department_id
        ) {
          setError("Name, email, password, category, and department are required");
          return;
        }

        const result = await axios.post(
          `${apiBaseUrl}/employee/register`,
          values,
          { withCredentials: true }
        );

        if (result.data.Status) {
          setIsRegister(false);
          setError(result.data.Message);
          setValues({ email: "", password: "", full_name: "", address: "", category_id: "", department_id: "" });
        } else {
          setError(result.data.Error);
        }
        return;
      }

      const result = await axios.post(
        `${apiBaseUrl}/employee/employee_login`,
        values,
        { withCredentials: true }
      );

      if (result.data.loginStatus) {
        localStorage.setItem("valid", "true");
        localStorage.setItem("role", "employee");
        localStorage.setItem("employeeId", result.data.id);
        navigate("/employee/dashboard");
      } else {
        setError(result.data.Error);
      }
    } catch (err) {
      console.log(err);
      setError(
        err.response?.data?.Error || "Connection failed. Ensure your backend server is running."
      );
    }
  };

  return (
    <div className="flex w-full items-center justify-center py-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl transition-colors dark:bg-gray-800 sm:p-6">
        <h2 className="mb-5 text-center text-xl font-bold text-gray-800 dark:text-white">
          {isRegister ? "Create Employee Account" : "Employee Login"}
        </h2>

        {error && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${error.includes("successful") || error.includes("created") ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Full Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter your full name"
                  required={isRegister}
                  onChange={(e) => setValues({ ...values, full_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Category</label>
                <select
                  className="input-field"
                  required={isRegister}
                  onChange={(e) => setValues({ ...values, category_id: e.target.value })}
                  value={values.category_id}
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.ID ?? cat.id} value={cat.ID ?? cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Department</label>
                <select
                  className="input-field"
                  required={isRegister}
                  onChange={(e) => setValues({ ...values, department_id: e.target.value })}
                  value={values.department_id}
                >
                  <option value="">Select Department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Address</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter address"
                  onChange={(e) => setValues({ ...values, address: e.target.value })}
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
            <input
              type="email"
              className="input-field"
              placeholder="Enter your email"
              required
              onChange={(e) => setValues({ ...values, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={isRegister ? "new-password" : "current-password"}
                minLength={isRegister ? 12 : undefined}
                className="input-field pr-11"
                placeholder="Enter password"
                required
                value={values.password}
                onChange={(e) => setValues({ ...values, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-gray-500 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-gray-300 dark:hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="w-full btn-success py-2.5 font-semibold">
            {isRegister ? "Create Account" : "Log In"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setShowPassword(false);
              setError(null);
            }}
            className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
          >
            {isRegister ? "Log In" : "Create Account"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default EmployeeLogin;
