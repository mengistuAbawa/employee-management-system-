import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../ThemeContext";

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState("admin"); // 'admin' or 'employee'
  const [values, setValues] = useState({
    email: "",
    password: "",
    full_name: "",
  });
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = (event) => {
    event.preventDefault();
    setError(null);

    if (isRegister) {
      if (!values.full_name || !values.email || !values.password) {
        setError("All fields are required");
        return;
      }

      axios
        .post("http://localhost:3000/add_admin", values, { withCredentials: true })
        .then((result) => {
          if (result.data.Status) {
            setIsRegister(false);
            setError("Account created! Please log in.");
            setValues({ email: "", password: "", full_name: "" });
          } else {
            setError(result.data.Error || "Registration failed.");
          }
        })
        .catch((err) => {
          console.error("Registration Error Context:", err);
          setError(
            err.response?.data?.Error ||
              "Connection failed. Ensure your backend server is running."
          );
        });
    } else {
      // Dynamically target either admin or employee login endpoint
      const endpoint = role === "admin" 
        ? "http://localhost:3000/adminlogin" 
        : "http://localhost:3000/employee/employee_login";

      axios
        .post(endpoint, values, { withCredentials: true })
        .then((result) => {
          if (result.data.loginStatus) {
            localStorage.setItem("valid", "true");
            localStorage.setItem("role", role);
            
            if (role === "admin") {
              localStorage.removeItem("employeeId");
              navigate("/dashboard");
            } else {
              localStorage.setItem("employeeId", result.data.id);
              navigate("/employee/dashboard");
            }
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
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-300 dark:from-gray-900 dark:to-gray-800 transition-colors">
      <div className="absolute top-4 right-4">
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
          {isRegister ? "Create Admin Account" : `${role === "admin" ? "Admin" : "Employee"} Login`}
        </h2>

        {/* Role Selector Toggles (Hidden when Registering since we only register Admins here) */}
        {!isRegister && (
          <div className="flex justify-center gap-4 mb-6 mt-2">
            <button
              type="button"
              onClick={() => { setRole("admin"); setError(null); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                role === "admin" 
                  ? "bg-blue-600 text-white shadow-md" 
                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => { setRole("employee"); setError(null); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                role === "employee" 
                  ? "bg-blue-600 text-white shadow-md" 
                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              Employee
            </button>
          </div>
        )}

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
          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Full Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter your full name"
                required={isRegister}
                value={values.full_name}
                onChange={(e) => setValues({ ...values, full_name: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
            <input
              type="email"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter password"
              required
              value={values.password}
              onChange={(e) => setValues({ ...values, password: e.target.value })}
            />
          </div>

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold shadow-md transition-colors">
            {isRegister ? "Create Account" : "Log In"}
          </button>
        </form>

        {/* Only allow registration toggle if role is set to Admin */}
        {role === "admin" && (
          <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
            {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
            >
              {isRegister ? "Log In" : "Create Account"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default Login;