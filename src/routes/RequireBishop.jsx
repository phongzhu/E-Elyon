import React from "react";
import { Navigate } from "react-router-dom";

export default function RequireBishop({ children }) {
  const userRole = (localStorage.getItem("userRole") || "").toLowerCase();
  if (userRole !== "bishop") {
    return <Navigate to="/login" replace />;
  }
  return children;
}
