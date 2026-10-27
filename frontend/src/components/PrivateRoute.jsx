import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../services/AuthContext";

export default function PrivateRoute({ children }) {
  const { user, ready } = useAuth();

  if (!ready) {
    return <div className="page">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
