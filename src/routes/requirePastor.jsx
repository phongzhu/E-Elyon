import React from "react";
import { Navigate } from "react-router-dom";

export default function RequirePastor({ children }) {
  const userRole = (localStorage.getItem("userRole") || "").toLowerCase();
  if (userRole !== "pastor") {
    return <Navigate to="/login" replace />;
  }
  return children;
}
