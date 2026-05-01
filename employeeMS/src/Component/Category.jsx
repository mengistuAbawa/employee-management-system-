import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const Category = () => {
  const [category, setCategory] = useState([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = () => {
    axios
      .get("http://localhost:3000/auth/category", { withCredentials: true })
      .then((result) => {
        if (result.data.Status) setCategory(result.data.Result);
        else alert(result.data.Error);
      })
      .catch((err) => console.log(err));
  };

  const handleDelete = (ID) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      axios
        .delete(`http://localhost:3000/auth/delete_category/${ID}`, { withCredentials: true })
        .then((res) => {
          if (res.data.Status) fetchCategories();
          else alert(res.data.Error);
        })
        .catch((err) => console.log(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Category List</h3>
        <Link to="/dashboard/add_category" className="btn-success text-sm">Add Category</Link>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 rounded-l-lg">ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3 rounded-r-lg text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {category.map((c) => (
              <tr key={c.ID} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3">{c.ID}</td>
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{c.name}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                  <Link to={`/dashboard/edit_category/${c.ID}`} className="inline-block px-2 py-1 text-xs font-medium rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-200 hover:bg-cyan-200 dark:hover:bg-cyan-800">Edit</Link>
                  <button onClick={() => handleDelete(c.ID)} className="inline-block px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Category;

