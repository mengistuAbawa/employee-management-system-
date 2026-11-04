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
    department_id: "",
    image: null,
  });

  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const navigate = useNavigate();

  // Fetch categories from the server on component mount
  useEffect(() => {
    Promise.all([
      axios.get("http://localhost:3000/category", { withCredentials: true }),
      axios.get("http://localhost:3000/auth/department", { withCredentials: true }),
    ])
      .then(([categoryResult, departmentResult]) => {
        if (categoryResult.data.Status) {
          setCategories(categoryResult.data.Result || []);
        } else {
          alert(categoryResult.data.Error || "Failed to load categories");
        }
        if (departmentResult.data.Status) {
          setDepartments(departmentResult.data.Result || []);
        } else {
          alert(departmentResult.data.Error || "Failed to load departments");
        }
      })
      .catch((err) => {
        console.error("Error fetching employee options:", err);
        alert("Server error while fetching employee options");
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Create FormData for multipart/form-data submission (required for images)
    const formData = new FormData();
    formData.append("full_name", employee.full_name);
    formData.append("email", employee.email);
    formData.append("password", employee.password);
    formData.append("salary", employee.salary);
    formData.append("address", employee.address);
    formData.append("category_id", employee.category_id);
    formData.append("department_id", employee.department_id);
    if (employee.image) {
      formData.append("image", employee.image);
    }

    try {
      const result = await axios.post(
        "http://localhost:3000/add_employee",
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (result.data.Status) {
        navigate("/dashboard/employee");
      } else {
        alert(result.data.Error);
      }
    } catch (err) {
      console.error("Form submission error:", err);
      alert("An error occurred while adding the employee");
    }
  };

  return (
    <div className="flex justify-center items-start pt-4">
      <div className="card w-full max-w-xl p-6 bg-white dark:bg-gray-800 rounded shadow-md">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white text-center mb-6">
          Add Employee
        </h3>

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
              onChange={(e) => setEmployee({ ...employee, department_id: e.target.value })}
            >
              <option value="">Select Department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Image
            </label>
            <input
              type="file"
              className="input-field w-full border rounded p-2"
              onChange={(e) => setEmployee({ ...employee, image: e.target.files[0] })}
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 transition"
          >
            Add Employee
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddEmployee;