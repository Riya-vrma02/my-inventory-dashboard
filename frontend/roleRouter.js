import { Navigate } from 'react-router-dom';

export default function RoleRouter() {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  const payload = JSON.parse(atob(token.split('.')[1]));
  const role = payload.identity?.role;

  switch (role) {
    case 'admin':   return <Navigate to="/admin" replace />;
    case 'sales':   return <Navigate to="/sales-dash" replace />;
    case 'vendor':  return <Navigate to="/vendor" replace />;
    default:        return <Navigate to="/login" replace />;
  }
}