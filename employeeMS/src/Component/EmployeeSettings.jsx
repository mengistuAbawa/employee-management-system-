import React, { useEffect, useState } from "react";
import axios from "axios";
import { Settings, Save, User, Mail, MapPin, Lock } from "lucide-react";

const EmployeeSettings = () => {
  const [employee, setEmployee] = useState({ full_name: "", email: "", address: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const employeeId = localStorage.getItem("employeeId");

  useEffect(() => {
    if (!employeeId) return;
    axios
      .get(`http://localhost:3000/employee/detail/${employeeId}`, { withCredentials: true })
      .then((res) => {
        if (res.data?.Status) {
          const data = res.data.Result;
          setEmployee({ full_name: data.full_name || "", email: data.email || "", address: data.address || "", password: "" });
        }
      })
      .catch((err) => console.error(err));
  }, [employeeId]);

  const handleChange = (e) => setEmployee({ ...employee, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const payload = { full_name: employee.full_name, email: employee.email, address: employee.address };
      if (employee.password) payload.password = employee.password;

      const res = await axios.put(`http://localhost:3000/employee/update/${employeeId}`, payload, { withCredentials: true });

      if (res.data?.Status) {
        setMessage("Profile updated successfully!");
        setEmployee((prev) => ({ ...prev, password: "" }));
      } else {
        setMessage(res.data.Error || "Update failed.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Error updating profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h4 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
        <Settings size={24} /> Settings
      </h4>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h5 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Update Profile</h5>
          {message && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes("success") ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"}`}>
              {message}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                <User size={16} /> Full Name
              </label>
              <input type="text" name="full_name" className="input-field" value={employee.full_name} onChange={handleChange} required />
            </div>
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                <Mail size={16} /> Email
              </label>
              <input type="email" name="email" className="input-field" value={employee.email} onChange={handleChange} required />
            </div>
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                <MapPin size={16} /> Address
              </label>
              <textarea name="address" className="input-field" rows="2" value={employee.address} onChange={handleChange}></textarea>
            </div>
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                <Lock size={16} /> New Password (leave blank to keep current)
              </label>
              <input type="password" name="password" className="input-field" value={employee.password} onChange={handleChange} placeholder="Enter new password" />
            </div>
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={loading}>
              <Save size={18} /> {loading ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        <div className="card text-center">
          <Settings size={48} className="mx-auto text-blue-500 mb-3" />
          <h6 className="text-lg font-semibold text-gray-800 dark:text-white">Account Settings</h6>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Update your personal information and password here.</p>
        </div>
      </div>
    </div>
  );
};

export default EmployeeSettings;

