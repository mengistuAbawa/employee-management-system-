import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const EditEmployee = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employee, setEmployee] = useState({
    full_name: "",
    email: "",
    salary: "",
    address: "",
    category_id: "",
    department_id: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const categoryRes = await axios.get("http://localhost:3000/auth/category", { withCredentials: true });
        if (categoryRes.data.Status) setCategory(categoryRes.data.Result);
        const departmentRes = await axios.get("http://localhost:3000/auth/department", { withCredentials: true });
        if (departmentRes.data.Status) setDepartments(departmentRes.data.Result);

        const employeeRes = await axios.get(`http://localhost:3000/auth/employee/${id}`, { withCredentials: true });
        if (employeeRes.data.Status) {
          const data = employeeRes.data.Result[0];
          setEmployee({
            full_name: data.full_name,
            email: data.email,
            address: data.address,
            salary: data.salary,
            category_id: data.category_id,
            department_id: data.department_id || "",
          });
        }
      } catch (err) {
        console.log(err);
      }
    };

    fetchData();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await axios.put(
        `http://localhost:3000/edit_employee/${id}`,
        {
          full_name: employee.full_name,
          email: employee.email,
          salary: employee.salary,
          address: employee.address,
          category_id: employee.category_id,
          department_id: employee.department_id,
        },
        { withCredentials: true }
      );

      if (result.data.Status) navigate("/dashboard/employee");
      else alert(result.data.Error);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="flex justify-center items-start pt-4">
      <div className="card w-full max-w-xl">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white text-center mb-6">Edit Employee</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Full Name</label>
            <input type="text" className="input-field" placeholder="Enter Full Name" value={employee.full_name} required onChange={(e) => setEmployee({ ...employee, full_name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
            <input type="email" className="input-field" placeholder="Enter Email" value={employee.email} required onChange={(e) => setEmployee({ ...employee, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Salary</label>
            <input type="number" className="input-field" placeholder="Enter Salary" value={employee.salary} required onChange={(e) => setEmployee({ ...employee, salary: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Address</label>
            <input type="text" className="input-field" placeholder="Enter Address" value={employee.address} onChange={(e) => setEmployee({ ...employee, address: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Category</label>
            <select className="input-field" value={employee.category_id} required onChange={(e) => setEmployee({ ...employee, category_id: e.target.value })}>
              <option value="">Select Category</option>
              {category.map((c) => (
                <option key={c.ID ?? c.id} value={c.ID ?? c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Department</label>
            <select className="input-field" value={employee.department_id} required onChange={(e) => setEmployee({ ...employee, department_id: e.target.value })}>
              <option value="">Select Department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-success w-full">Update Employee</button>
        </form>
      </div>
    </div>
  );
};

export default EditEmployee;
