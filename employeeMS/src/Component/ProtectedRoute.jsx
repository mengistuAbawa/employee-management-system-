import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, requiredRole }) => {
  const isAuthenticated =
    localStorage.getItem("valid") === "true" &&
    localStorage.getItem("role") === requiredRole;

  if (!isAuthenticated) {
    return (
      <Navigate
        to={requiredRole === "employee" ? "/employee_login" : "/adminlogin"}
        replace
      />
    );
  }

  return children;
};

export default ProtectedRoute;
