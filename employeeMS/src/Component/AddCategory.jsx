import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const AddCategory = () => {
  const [category, setCategory] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    axios
      .post("http://localhost:3000/add_category", { category }, { withCredentials: true })
      .then((result) => {
        if (result.data.Status) navigate("/dashboard/category");
        else alert(result.data.Error);
      })
      .catch((err) => console.log(err));
  };

  return (
    <div className="flex justify-center items-start pt-10">
      <div className="card w-full max-w-md">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white text-center mb-6">Add Category</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Category Name</label>
            <input
              type="text"
              className="input-field"
              placeholder="Enter Category (e.g. IT, Sales)"
              required
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-success w-full">Add Category</button>
        </form>
      </div>
    </div>
  );
};

export default AddCategory;

