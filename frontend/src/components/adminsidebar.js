import React from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import './Sidebar.css'; // make sure the CSS file is correctly named and imported

const AdminSidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login"); // fixed the path (not /pages/Login)
  };

  return (
    <div className="sidebar">
      <h2>Admin Panel</h2>
      <ul>
        <li><NavLink to="/admin" className="nav-link">Dashboard</NavLink></li>
        <li><NavLink to="/products" className="nav-link">Products </NavLink></li>
        <li><NavLink to="/defects" className="nav-link">Defective Products</NavLink></li>
        <li><NavLink to="/sales" className="nav-link">Sale</NavLink></li>
        <li><NavLink to="/forecasts" className="nav-link">Forecasts</NavLink></li>
        <li><NavLink to="/charts" className="nav-link">Charts</NavLink></li>
        <li><NavLink to="/restock" className="nav-link">Restocks</NavLink></li>
        <li>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </li>
      </ul>
    </div>
  );
};

export default AdminSidebar;
