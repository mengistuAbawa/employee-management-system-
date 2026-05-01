import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const getStatusBadge = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "approved") return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200">Approved</span>;
  if (s === "rejected") return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200">Rejected</span>;
  return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200">Pending</span>;
};

const Employee = () => {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [loggingIn, setLoggingIn] = useState(null);
  const [loginPassword, setLoginPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = () => {
    axios
      .get("http://localhost:3000/auth/employee", { withCredentials: true })
      .then((result) => {
        if (result.data.Status) {
          setEmployees(result.data.Result);
        } else {
          alert(result.data.Error);
        }
      })
      .catch((err) => console.log(err));
  };

  const handleLogin = (employee) => {
    setLoggingIn(employee.id);
    setLoginPassword("");
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!loginPassword) {
      alert("Please enter password");
      return;
    }
    axios
      .post("http://localhost:3000/employee/employee_login", { email: employees.find(e => e.id === loggingIn)?.email, password: loginPassword }, { withCredentials: true })
      .then((result) => {
        if (result.data.loginStatus) {
          localStorage.setItem("valid", "true");
          localStorage.setItem("employeeId", result.data.id);
          setLoggingIn(null);
          navigate("/employee/dashboard");
        } else {
          alert(result.data.Error || "Invalid password");
        }
      })
      .catch((err) => {
        console.log(err);
        alert("Login failed");
      });
  };

  const handleCancelLogin = () => {
    setLoggingIn(null);
    setLoginPassword("");
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      axios
        .delete(`http://localhost:3000/auth/delete_employee/${id}`, { withCredentials: true })
        .then((res) => {
          if (res.data.Status) {
            fetchEmployees();
          } else {
            alert(res.data.Error);
          }
        })
        .catch((err) => console.log(err));
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const filteredEmployees = employees.filter((e) =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase())
  );

return (
    <div className="space-y-4">
      {loggingIn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Enter Password to Login</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Logging in as: {employees.find(e => e.id === loggingIn)?.full_name}</p>
            <form onSubmit={handleLoginSubmit}>
              <input
                type="password"
                className="input-field w-full mb-4"
                placeholder="Enter password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 btn-success">Login</button>
                <button type="button" onClick={handleCancelLogin} className="flex-1 btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Employee List</h3>
        <div className="flex items-center gap-3">
          <input
            type="text"
            className="input-field w-64"
            placeholder="Search by name or email..."
            value={search}
            onChange={handleSearch}
          />
          <Link to="/dashboard/add_employee" className="btn-success text-sm">Add Employee</Link>
        </div>
      </div>

      <div className="overflow-x-auto card">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 rounded-l-lg">Name</th>
              <th className="px-4 py-3">Image</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Salary</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 rounded-r-lg text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((e) => (
              <tr key={e.id} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{e.full_name}</td>
                <td className="px-4 py-3">
                  <img
                    src={`http://localhost:3000/images/${e.image}`}
                    alt={e.full_name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{e.email}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{e.salary}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{e.address}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{e.category_name}</td>
                <td className="px-4 py-3">{getStatusBadge(e.approval_status)}</td>
<td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                  <Link to={`/dashboard/edit_employee/${e.id}`} className="inline-block px-2 py-1 text-xs font-medium rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-200 hover:bg-cyan-200 dark:hover:bg-cyan-800">Edit</Link>
                  <button onClick={() => handleLogin(e)} className="inline-block px-2 py-1 text-xs font-medium rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200 hover:bg-indigo-200 dark:hover:bg-indigo-800">Login</button>
                  <button onClick={() => handleDelete(e.id)} className="inline-block px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800">Delete</button>
                  <Link to={`/dashboard/add_leave/${e.id}`} className="inline-block px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800">Leave</Link>
                  <Link to={`/dashboard/salary`} className="inline-block px-2 py-1 text-xs font-medium rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-800">Salary</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Employee;

