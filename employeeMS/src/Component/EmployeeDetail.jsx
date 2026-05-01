import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

const EmployeeDetail = () => {
  const [employee, setEmployee] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get(`http://localhost:3000/employee/detail/${id}`, { withCredentials: true })
      .then((result) => {
        const data = result.data;
        if (data && data.Status) setEmployee(data.Result || null);
        else setEmployee(null);
      })
      .catch((err) => console.log(err));
  }, [id]);

  const handleLogout = () => {
    axios
      .get("http://localhost:3000/employee/logout", { withCredentials: true })
      .then((result) => {
        if (result.data.Status) {
          localStorage.removeItem("valid");
          navigate("/");
        }
      })
      .catch((err) => console.log(err));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 transition-colors">
      <div className="max-w-2xl mx-auto card space-y-4">
        <h4 className="text-xl font-bold text-gray-800 dark:text-white text-center">Employee Management System</h4>
        <hr className="border-gray-200 dark:border-gray-700" />
        {employee ? (
          <>
            <div className="flex justify-center">
              <img
                src={employee.image ? `http://localhost:3000/images/${employee.image}` : "http://localhost:3000/images/default.png"}
                alt="employee"
                className="w-32 h-32 rounded-full object-cover border-4 border-blue-500"
              />
            </div>
            <div className="space-y-2 text-gray-800 dark:text-gray-200">
              <p><strong>Name:</strong> {employee.full_name}</p>
              <p><strong>Email:</strong> {employee.email}</p>
              <p><strong>Salary:</strong> ${employee.salary}</p>
              <p><strong>Address:</strong> {employee.address}</p>
              <p><strong>Status:</strong> <span className="capitalize">{employee.approval_status || "N/A"}</span></p>
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 py-6">Loading employee record...</div>
        )}
        <hr className="border-gray-200 dark:border-gray-700" />
        <button onClick={handleLogout} className="btn-danger w-full">Logout</button>
      </div>
    </div>
  );
};

export default EmployeeDetail;

