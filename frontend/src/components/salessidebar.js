import React from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import './Sidebar.css';
const SalesSidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/pages/Login");
  };
  <div className="sidebar">
    <h2>Salesperson Panel</h2>
    <ul>
      <li><NavLink to="/salesperson/products">Products (See)</NavLink></li>
      <li><NavLink to="/salesperson/sales">Sales (Add)</NavLink></li>
      <li><NavLink to="/salesperson/forecasts">Forecasts</NavLink></li>
      <li><NavLink to="/salesperson/charts">Charts</NavLink></li>
      <li><NavLink to="/salesperson/revenue">Revenue</NavLink></li>
      <li><NavLink to="/salesperson/low-stock">Low Stocks</NavLink></li>
      <li><NavLink to="/salesperson/demands">Demands (Update)</NavLink></li>
      <li><button className="logout-btn" onClick={handleLogout}>Logout</button></li>
    </ul>
  </div>
};

export default SalesSidebar;
