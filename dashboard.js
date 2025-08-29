import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import ProductList from './pages/ProductList';
import SalesTracking from './pages/SalesTracking';
import Forecast from './pages/Forecast';
import Charts from './components/Charts';
import AdminPanel from './components/AdminPanel';
import { jwtDecode } from 'jwt-decode';
import './App.css';

// 🔐 Protected Route Wrapper
function PrivateRoute({ isAuthenticated, children }) {
  return isAuthenticated ? children : <Navigate to="/dashboard" />;
}

function App() {
  const [role, setRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setRole(decoded?.identity?.role); // 👈 safer
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
        localStorage.removeItem("token");
      }
    }
  }, []);

  return (
    <>
      <div className="app-layout">
        {isAuthenticated && <Sidebar />}
        <div className="main-content">
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={<Login setAuth={setIsAuthenticated} />} />
            <Route path="/signup" element={<Signup />} />

            {/* Redirect root to dashboard if logged in */}
            <Route path="/" element={<Navigate to="/dashboard" />} />

            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <PrivateRoute isAuthenticated={isAuthenticated}>
                <Dashboard />
              </PrivateRoute>
            } />
            <Route path="/products" element={
              <PrivateRoute isAuthenticated={isAuthenticated}>
                <ProductList />
              </PrivateRoute>
            } />
            <Route path="/sales" element={
              <PrivateRoute isAuthenticated={isAuthenticated}>
                <SalesTracking />
              </PrivateRoute>
            } />
            <Route path="/forecast" element={
              <PrivateRoute isAuthenticated={isAuthenticated}>
                <Forecast />
              </PrivateRoute>
            } />
            <Route path="/charts" element={
              <PrivateRoute isAuthenticated={isAuthenticated}>
                <Charts />
              </PrivateRoute>
            } />

            {/* Admin Only Route */}
            <Route path="/admin" element={
              role === "admin" ? <AdminPanel /> : <Navigate to="/unauthorized" />
            } />

            {/* Unauthorized */}
            <Route path="/unauthorized" element={
              <div className="p-4 text-red-600 text-xl">Unauthorized Access</div>
            } />

            {/* Catch-all 404 */}
            <Route path="*" element={
              <div className="p-4 text-gray-700">404 - Page Not Found</div>
            } />
          </Routes>
        </div>
      </div>
    </>
  );
}

export default App;
