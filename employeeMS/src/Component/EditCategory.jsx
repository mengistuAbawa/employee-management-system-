import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

const EditCategory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState({ name: "" });

  useEffect(() => {
    axios
      .get(`http://localhost:3000/category/${id}`, { withCredentials: true })
      .then((result) => {
        if (result.data.Status) setCategory({ name: result.data.Result[0].name });
        else alert(result.data.Error);
      })
      .catch((err) => console.log(err));
  }, [id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    axios
      .put(`http://localhost:3000/edit_category/${id}`, { name: category.name }, { withCredentials: true })
      .then((result) => {
        if (result.data.Status) navigate("/dashboard/category");
        else alert(result.data.Error);
      })
      .catch((err) => console.log(err));
  };

  return (
    <div className="flex justify-center items-start pt-10">
      <div className="card w-full max-w-md">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white text-center mb-6">Edit Category</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Category Name</label>
            <input type="text" className="input-field" value={category.name} onChange={(e) => setCategory({ name: e.target.value })} required />
          </div>
          <button type="submit" className="btn-primary w-full">Update Category</button>
        </form>
      </div>
    </div>
  );
};

export default EditCategory;

