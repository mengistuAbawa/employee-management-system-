import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../ThemeContext";

const Login = () => {
  const [values, setValues] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = (event) => {
    event.preventDefault();
    setError(null);

    axios
      .post("http://localhost:3000/adminlogin", values, { withCredentials: true })
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
        setError(
          err.response?.data?.Error ||
            "Connection failed. Ensure your backend server is running."
        );
      });
  };

  return (
    <div className="w-full flex items-center justify-center py-8">
      <div className="hidden">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-white dark:bg-gray-700 shadow-md text-gray-800 dark:text-yellow-300 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          )}
        </button>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 transition-colors">
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-2">
          Administrator sign in
        </h2>

        {error && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            error.includes("created") || error.includes("successful")
              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
              : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
          }`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
            <input
              type="email"
              autoComplete="username"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter your email"
              required
              value={values.email}
              onChange={(e) => setValues({ ...values, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter password"
              required
              value={values.password}
              onChange={(e) => setValues({ ...values, password: e.target.value })}
            />
          </div>

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold shadow-md transition-colors">
            Log In
          </button>
        </form>

      </div>
    </div>
  );
};

export default Login;