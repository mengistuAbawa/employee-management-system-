import React, { useState, useEffect } from "react";
import axios from "axios";
import profile from "./Image/profile.jpg";

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

const Profile = () => {
  const [admin, setAdmin] = useState({ id: null, full_name: "", email: "", image: null });
  const [showAdminEdit, setShowAdminEdit] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", email: "" });

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [imageError, setImageError] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = () => {
    axios
      .get(`${apiBaseUrl}/dashboard/admin-profile`, { withCredentials: true })
      .then((res) => {
        if (res.data.Status) {
          setAdmin({
            id: res.data.id ?? null,
            full_name: res.data.full_name || "Admin",
            email: res.data.email || "",
            image: res.data.image || null,
          });
        } else {
          console.error("Error fetching profile:", res.data.Error);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch profile:", err);
      })
      .finally(() => setLoading(false));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setImageError("Choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError("Image must be 5 MB or smaller.");
      return;
    }

    setUploading(true);
    setImageError("");
    const formData = new FormData();
    formData.append("image", file);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewImage(reader.result);
    reader.readAsDataURL(file);
    try {
      const res = await axios.put(
        `${apiBaseUrl}/update_profile_image`,
        formData,
        {
          withCredentials: true,
        }
      );
      if (res.data.Status) {
        setAdmin(prev => ({ ...prev, image: res.data.image }));
        setPreviewImage(null);
        fetchProfile();
      } else {
        setImageError(res.data.Error || "Could not update profile image.");
        setPreviewImage(null);
      }
    } catch (err) {
      setImageError(err.response?.data?.Error || "Could not update profile image.");
      setPreviewImage(null);
    } finally {
      setUploading(false);
    }
  };

  // Determine which image to display
  const displayImage = previewImage || (admin.image
    ? `${apiBaseUrl}/images/${admin.image}`
    : profile);

  if (loading) return <div className="text-center mt-10 text-gray-600 dark:text-gray-300">Loading...</div>;

  const handleAdminSave = async () => {
    if (!admin.id) {
      alert("Admin id not found");
      return;
    }

    try {
      const res = await axios.put(
        `${apiBaseUrl}/dashboard/admin-profile`,
        { full_name: editForm.full_name, email: editForm.email },
        { withCredentials: true }
      );

      if (res.data?.Status) {
        setShowAdminEdit(false);
        fetchProfile();
      } else {
        alert("Error: " + (res.data?.Error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update profile");
    }
  };

  return (
    <div className="flex justify-center">
      <div className="card w-full max-w-md text-center">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Profile</h3>
        <div className="mb-4 flex justify-center relative">
          <img 
            src={displayImage} 
            alt="Profile" 
            className="w-24 h-24 rounded-full object-cover border-4 border-blue-500" 
          />
          <label className="absolute bottom-0 right-0 bg-blue-500 text-white p-1 rounded-full cursor-pointer hover:bg-blue-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageUpload}
              disabled={uploading}
            />
          </label>
          <label className="absolute bottom-0 left-[calc(50%-3.25rem)] translate-y-2 bg-gray-800 text-white px-2 py-1 rounded-full cursor-pointer hover:bg-gray-700 transition-colors text-xs">
            Camera
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImageUpload}
              disabled={uploading}
            />
          </label>
        </div>
        {uploading && <p className="text-sm text-blue-500 mb-2">Uploading...</p>}
        {imageError && <p role="alert" className="mb-2 text-sm text-red-600 dark:text-red-400">{imageError}</p>}

        <div className="relative group mt-2">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{admin.full_name}</h5>
          <p className="text-gray-500 dark:text-gray-400">{admin.email}</p>

          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-9 right-0">
            <button
              type="button"
              onClick={() => {
                setEditForm({ full_name: admin.full_name || "", email: admin.email || "" });
                setShowAdminEdit(true);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-md"
            >
              Edit
            </button>
          </div>
        </div>

      </div>

      {showAdminEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowAdminEdit(false)}
        >
          <div className="card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
              Edit Profile
            </h4>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAdminSave();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  className="input-field w-full"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  className="input-field w-full"
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminEdit(false)}
                  className="btn-primary flex-1 bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;
