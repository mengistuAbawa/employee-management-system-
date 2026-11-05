import React, { useState } from "react";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

const Login = () => {
  const [values, setValues] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    setError(null);
    axios
      .post(`${apiBaseUrl}/adminlogin`, values, { withCredentials: true })
      .then((result) => {
        if (result.data.loginStatus) {
          localStorage.removeItem("valid");
          localStorage.removeItem("role");
          localStorage.removeItem("employeeId");
          navigate("/dashboard");
        } else {
          setError(result.data.Error || "Invalid credentials.");
        }
      })
      .catch((err) => {
        console.error("Login Error Context:", err);
        setError(err.response?.data?.Error || "Connection failed. Ensure your backend server is running.");
      });
  };

  return (
    <div className="flex w-full items-center justify-center py-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl transition-colors dark:bg-gray-800 sm:p-6">
        <h2 className="mb-2 text-center text-xl font-bold text-gray-800 dark:text-white">Administrator sign in</h2>
        {error && (
          <div role="alert" className={`mb-4 rounded-lg p-3 text-sm ${
            error.includes("created") || error.includes("successful")
              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
              : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
          }`}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="admin-email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Email</label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Enter your email"
              required
              value={values.email}
              onChange={(event) => setValues({ ...values, email: event.target.value })}
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Password</label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="w-full rounded-md border border-gray-300 px-3 py-2 pr-11 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Enter password"
                required
                value={values.password}
                onChange={(event) => setValues({ ...values, password: event.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-gray-500 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-300 dark:hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" className="w-full rounded-lg bg-blue-600 py-2.5 font-semibold text-white shadow-md transition-colors hover:bg-blue-700">
            Log In
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
