import React, { useEffect, useState } from "react";
import axios from "axios";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children, requiredRole }) => {
  const [status, setStatus] = useState("checking");
  const location = useLocation();

  useEffect(() => {
    let active = true;
    axios
      .get("http://localhost:3000/verify", { withCredentials: true })
      .then(({ data }) => {
        if (active) setStatus(data.Status && data.role === requiredRole ? "allowed" : "denied");
      })
      .catch(() => {
        if (active) setStatus("denied");
      });

    return () => {
      active = false;
    };
  }, [requiredRole]);

  if (status === "checking") {
    return <div className="p-8 text-center text-slate-600 dark:text-gray-300">Checking your session…</div>;
  }

  if (status === "denied") {
    return (
      <Navigate
        to={requiredRole === "employee" ? "/employee_login" : "/adminlogin"}
        state={{ from: location }}
        replace
      />
    );
  }

  return children;
};

export default ProtectedRoute;
