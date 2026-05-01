import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../ThemeContext";

const EmployeeLogin = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [values, setValues] = useState({
    email: "",
    password: "",
    full_name: "",
    salary: "",
    address: "",
    category_id: "",
  });
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (isRegister) {
      axios
        .get("http://localhost:3000/auth/category", { withCredentials: true })
        .then((res) => {
          if (res.data.Status) {
            setCategories(res.data.Result || []);
          }
        })
        .catch((err) => console.log(err));
    }
  }, [isRegister]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setError(null);

    if (isRegister) {
      if (!values.full_name || !values.email || !values.password || !values.category_id) {
        setError("All fields except salary/address are required");
        return;
      }
      axios
        .post("http://localhost:3000/employee/register", values, {
          withCredentials: true,
        })
        .then((result) => {
          if (result.data.Status) {
            setIsRegister(false);
            setError(result.data.Message);
            setValues({ email: "", password: "", full_name: "", salary: "", address: "", category_id: "" });
          } else {
            setError(result.data.Error);
          }
        })
        .catch((err) => {
          console.log(err);
          setError("An error occurred. Please try again.");
        });
} else {
      axios
        .post("http://localhost:3000/employee/employee_login", values, {
          withCredentials: true,
        })
        .then((result) => {
          if (result.data.loginStatus) {
            localStorage.setItem("valid", "true");
            localStorage.setItem("employeeId", result.data.id);
            navigate("/employee/dashboard");
          } else {
            setError(result.data.Error);
          }
        })
        .catch((err) => {
          console.log(err);
          setError("An error occurred. Please try again.");
        });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-300 dark:from-gray-900 dark:to-gray-800 transition-colors">
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
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Salary</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="Enter salary"
                  onChange={(e) => setValues({ ...values, salary: e.target.value })}
                />
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
            <input
              type="password"
              className="input-field"
              placeholder="Enter password"
              required
              onChange={(e) => setValues({ ...values, password: e.target.value })}
            />
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

