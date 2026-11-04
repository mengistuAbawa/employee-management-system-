import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { LayoutDashboard, CalendarOff, Wallet, Clock, Camera } from "lucide-react";

const ModalOverlay = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div className="card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};


const EmployeeDashboardHome = () => {
  const [employee, setEmployee] = useState(null);
  const [stats, setStats] = useState({
    totalLeaves: 0,
    pendingLeaves: 0,
    approvedLeaves: 0,
    salary: 0,
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showEmployeeEdit, setShowEmployeeEdit] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", email: "" });
  const [savingEmployeeProfile, setSavingEmployeeProfile] = useState(false);
  const fileInputRef = useRef(null);

  const employeeId = localStorage.getItem("employeeId");

  useEffect(() => {
    if (!employeeId) return;

    axios.get(`http://localhost:3000/employee/detail/${employeeId}`, { withCredentials: true })
      .then((res) => {
        if (res.data?.Status) setEmployee(res.data.Result);
      })
      .catch((err) => console.error(err));

    axios.get(`http://localhost:3000/employee/leaves/${employeeId}`, { withCredentials: true })
      .then((res) => {
        if (res.data?.Status) {
          const leaves = res.data.Result || [];
          const pending = leaves.filter((l) => l.status === "pending").length;
          const approved = leaves.filter((l) => l.status === "approved").length;
          setStats((prev) => ({ ...prev, totalLeaves: leaves.length, pendingLeaves: pending, approvedLeaves: approved }));
        }
      })
      .catch((err) => console.error(err));

    axios.get(`http://localhost:3000/employee/salary/${employeeId}`, { withCredentials: true })
      .then((res) => {
        if (res.data?.Status) setStats((prev) => ({ ...prev, salary: res.data.Salary || 0 }));
      })
      .catch((err) => console.error(err));
  }, [employeeId]);

  const cards = [
    { label: "Total Leaves", value: stats.totalLeaves, icon: <LayoutDashboard size={24} />, color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200" },
    { label: "Pending Leaves", value: stats.pendingLeaves, icon: <Clock size={24} />, color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200" },
    { label: "Approved Leaves", value: stats.approvedLeaves, icon: <CalendarOff size={24} />, color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200" },
    { label: "Salary", value: `$${stats.salary}`, icon: <Wallet size={24} />, color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200" },
  ];

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      setMessage({ type: "", text: "" });
    }
  };

  // Handle image upload
  const handleImageUpload = async () => {
    if (!selectedImage || !employeeId) return;

    setUploading(true);
    setMessage({ type: "", text: "" });

    const formData = new FormData();
    formData.append("image", selectedImage);

    try {
      const res = await axios.put(
        `http://localhost:3000/employee/update_profile_image/${employeeId}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        }
      );

      if (res.data.Status) {
        setMessage({ type: "success", text: res.data.Message });
        // Update employee state with new image
        setEmployee((prev) => ({ ...prev, image: res.data.image }));
        setSelectedImage(null);
        setImagePreview(null);
      } else {
        setMessage({ type: "error", text: res.data.Error || "Failed to update image" });
      }
    } catch (err) {
      console.error("Upload error:", err);
      setMessage({ type: "error", text: "Error uploading image" });
    } finally {
      setUploading(false);
    }
  };

  // Trigger file input click
  const handleEmployeeSave = async () => {
    if (!employeeId) return;
    setSavingEmployeeProfile(true);
    try {
      const res = await axios.put(
        `http://localhost:3000/employee/update/${employeeId}`,
        { full_name: editForm.full_name, email: editForm.email },
        { withCredentials: true }
      );


      if (res.data?.Status) {
        setShowEmployeeEdit(false);
        // refresh employee details
        const detailRes = await axios.get(`http://localhost:3000/employee/detail/${employeeId}`, { withCredentials: true });
        if (detailRes.data?.Status) setEmployee(detailRes.data.Result);
      } else {
        setMessage({ type: "error", text: res.data?.Error || "Failed to update profile" });
      }
    } catch (e) {
      console.error(e);
      setMessage({ type: "error", text: "Failed to update profile" });
    } finally {
      setSavingEmployeeProfile(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <h4 className="text-xl font-bold text-gray-800 dark:text-white">Welcome, {employee?.full_name || "Employee"}!</h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="card flex items-center gap-4">
            <div className={`p-3 rounded-lg ${c.color}`}>{c.icon}</div>
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">{c.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h5 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Profile Overview</h5>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Image Section */}
          <div className="relative flex-shrink-0">
            <img
              src={
                imagePreview
                  ? imagePreview
                  : employee?.image
                    ? `http://localhost:3000/images/${employee.image}`
                    : "http://localhost:3000/images/default.png"
              }
              alt="employee"
              className="w-20 h-20 rounded-full object-cover border-2 border-blue-500"
            />
            {/* Camera overlay button */}
            <button
              onClick={triggerFileInput}
              className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full hover:bg-blue-700 transition-colors"
              title="Change Image"
            >
              <Camera size={16} />
            </button>
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Info Section */}
          <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300 relative">
            <div className="group inline-block">
              <p><strong>Name:</strong> {employee?.full_name || "N/A"}</p>
              <p><strong>Email:</strong> {employee?.email || "N/A"}</p>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  className="mt-1 inline-block px-2 py-1 text-xs font-semibold rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-200"
                  onClick={() => {
                    // handled by modal below
                    setShowEmployeeEdit(true);
                    setEditForm({ full_name: employee?.full_name || "", email: employee?.email || "" });
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
            <p><strong>Address:</strong> {employee?.address || "N/A"}</p>
            <p><strong>Category ID:</strong> {employee?.category_id || "N/A"}</p>
            <p><strong>Department:</strong> {employee?.department_name || "Unassigned"}</p>

            {/* Action Buttons */}
          </div>

          <div className="flex flex-col gap-2 ml-auto">
            {selectedImage && (
              <button
                onClick={handleImageUpload}
                disabled={uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors text-sm font-medium"
              >
                {uploading ? "Updating..." : "Update"}
              </button>
            )}
            {message.text && (
              <p className={`text-sm ${message.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {message.text}
              </p>
            )}
          </div>
        </div>
      </div>

      <ModalOverlay open={showEmployeeEdit} onClose={() => setShowEmployeeEdit(false)}>
        <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Edit Profile</h4>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleEmployeeSave();
          }}
          className="space-y-3"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={editForm.full_name}
              onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))}
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
            <input
              type="email"
              required
              value={editForm.email}
              onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
              className="input-field w-full"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowEmployeeEdit(false)}
              className="btn-primary flex-1 bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100"
            >
              Cancel
            </button>

            <button type="submit" className="btn-primary flex-1" disabled={savingEmployeeProfile}>
              {savingEmployeeProfile ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </ModalOverlay>
    </div>
  );
};

export default EmployeeDashboardHome;
