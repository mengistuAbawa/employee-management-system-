import React, { useState, useEffect } from "react";
import axios from "axios";
import profile from "./Image/profile.jpg";

const Profile = () => {
  const [admin, setAdmin] = useState({ full_name: "", email: "", image: null });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = () => {
    axios
      .get("http://localhost:3000/auth/dashboard/admin-profile", { withCredentials: true })
      .then((res) => {
        console.log("Profile response:", res.data);
        if (res.data.Status) {
          setAdmin({
            full_name: res.data.full_name || "Admin",
            email: res.data.email || "",
            image: res.data.image || null
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await axios.put(
        "http://localhost:3000/auth/update_profile_image",
        formData,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data"
          },
        }
      );

      console.log("Upload response:", res.data);

      if (res.data.Status) {
        setAdmin(prev => ({ ...prev, image: res.data.image }));
        setPreviewImage(null);
        alert("Profile image updated successfully!");
        fetchProfile();
      } else {
        alert("Error: " + (res.data.Error || "Unknown error"));
      }
    } catch (err) {
      console.error("Upload error:", err);
      const errorMsg = err.response?.data?.Error || err.message || "Unknown error";
      alert("Failed to upload image: " + errorMsg);
    } finally {
      setUploading(false);
    }
  };

  // Determine which image to display
  const displayImage = previewImage || (admin.image 
    ? `http://localhost:3000/images/${admin.image}` 
    : profile);

  if (loading) return <div className="text-center mt-10 text-gray-600 dark:text-gray-300">Loading...</div>;

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
              onChange={(e) => {
                handleImageChange(e);
                handleImageUpload(e);
              }}
              disabled={uploading}
            />
          </label>
        </div>
        {uploading && <p className="text-sm text-blue-500 mb-2">Uploading...</p>}
        <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{admin.full_name}</h5>
        <p className="text-gray-500 dark:text-gray-400">{admin.email}</p>
      </div>
    </div>
  );
};

export default Profile;
