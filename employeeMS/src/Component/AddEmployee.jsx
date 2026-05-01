import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const AddEmployee = () => {
  const [employee, setEmployee] = useState({
    full_name: "",
    email: "",
    password: "",
    salary: "",
    address: "",
    category_id: "",
    image: null,
  });
  const [category, setCategory] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get("http://localhost:3000/auth/category", { withCredentials: true })
      .then((result) => {
        if (result.data.Status) setCategory(result.data.Result);
        else alert(result.data.Error);
      })
      .catch((err) => console.log(err));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("full_name", employee.full_name);
    formData.append("email", employee.email);
    formData.append("password", employee.password);
    formData.append("salary", employee.salary);
    formData.append("address", employee.address);
    formData.append("image", employee.image);
    formData.append("category_id", employee.category_id);

    axios
      .post("http://localhost:3000/auth/add_employee", formData, { withCredentials: true })
      .then((result) => {
        if (result.data.Status) navigate("/dashboard/employee");
        else alert(result.data.Error);
      })
      .catch((err) => console.log(err));
  };

  return (
    <div className="flex justify-center items-start pt-4">
      <div className="card w-full max-w-xl">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white text-center mb-6">Add Employee</h3>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Password</label>
            <input type="password" className="input-field" placeholder="Enter Password" value={employee.password} required onChange={(e) => setEmployee({ ...employee, password: e.target.value })} />
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Image</label>
            <input type="file" className="input-field" onChange={(e) => setEmployee({ ...employee, image: e.target.files[0] })} />
          </div>
          <button type="submit" className="btn-primary w-full">Add Employee</button>
        </form>
      </div>
    </div>
  );
};

export default AddEmployee;

