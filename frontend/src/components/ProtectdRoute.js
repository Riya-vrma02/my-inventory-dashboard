import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './services/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { auth } = useAuth();
  if (!auth.token) return <Navigate to="/login" />;
  if (!allowedRoles.includes(auth.role)) return <Navigate to="/" />;
  return <Outlet />;
};

export default ProtectedRoute;
