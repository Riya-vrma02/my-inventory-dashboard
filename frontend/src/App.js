import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import React, { useState } from 'react';
import AdminLayout from './components/adminLayout';
import AdminDashboard from './components/Dashboardadmin';
import SalespersonDashboard from './components/Dashboardsalesperson';
import ProductList from './pages/ProductList';
import SalesTracking from './pages/SalesList';
import Forecast from './pages/Forecast';
import Charts from './components/Charts';
import RestockPage from './pages/RestockPage';
import SalesList from './pages/SalesList';
import SalesDashboard from './pages/SalesDashboard';
import Suppliers from './pages/suppliers';
import Signup from './pages/Signup';
import DefectiveProducts from './pages/DefectedList';
import ProductView from './pages/productsview';
import Login from './pages/Login';
import './App.css';

function App() {
  const token = localStorage.getItem('token');
  let role = null;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      role = payload?.identity?.role?.toLowerCase() || null;
    } catch {
      /* invalid token → treat as not logged in */
    }
  }

  const [auth, setAuth] = useState(!!token);

  const location = useLocation();
  const isAuthPage = ['/login', '/signup'].includes(location.pathname);

  if (!auth && !isAuthPage) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="App">
      {isAuthPage ? (
        <Routes>
          <Route path="/login"  element={<Login setAuth={setAuth} />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*"       element={<Navigate to="/login" />} />
        </Routes>
      ) : (
        <AdminLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/admin" />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/salesperson" element={<SalespersonDashboard /> } />
            <Route path="/products" element={<ProductList />} />
            <Route path="/productsview" element={<ProductView />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/sales" element={<SalesTracking />} />
            <Route path="/saleslist" element={<SalesList />} />
            <Route path="/salesdashboard" element={<SalesDashboard />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/defects" element={<DefectiveProducts />} />
            <Route path="/restock" element={<RestockPage />} />
            <Route path="/charts" element={<Charts />} />
            <Route path="*" element={<h1>404 Not Found</h1>} />
          </Routes>
        </AdminLayout>
      )}
    </div>
  );
}

export default App;