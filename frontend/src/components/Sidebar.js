// src/components/Sidebar.js
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './Sidebar.css';

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/pages/Login");
  };

  return (
    <aside className="sidebar">
      <h2>FMCG Dashboard</h2>
      <nav>
        <ul>
          <li><NavLink to="/dashboard" className="nav-link">Dashboard</NavLink></li>
          <li><NavLink to="/products" className="nav-link">Products</NavLink></li>
          <li><NavLink to="/sales" className="nav-link">Sales</NavLink></li>
          <li><NavLink to="/forecast" className="nav-link">Forecast</NavLink></li>
          <li><NavLink to="/charts" className="nav-link">Charts</NavLink></li>
          <li><button className="logout-btn" onClick={handleLogout}>Logout</button></li>
        </ul>
      </nav>
    </aside>
  );
}
