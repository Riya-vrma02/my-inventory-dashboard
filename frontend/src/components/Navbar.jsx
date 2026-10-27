import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../services/AuthContext";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  function handleLogout() {
    signOut();
    navigate("/login");
  }

  return (
    <header className="top-nav">
      <div className="brand">
        <span className="brand-mark">Stockbook</span>
        <span className="brand-tag">Inventory Ledger</span>
      </div>
      <nav className="nav-links">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
          Dashboard
        </NavLink>
        <NavLink to="/products" className={({ isActive }) => (isActive ? "active" : "")}>
          Products
        </NavLink>
        <NavLink to="/suppliers" className={({ isActive }) => (isActive ? "active" : "")}>
          Suppliers
        </NavLink>
        <NavLink to="/sales" className={({ isActive }) => (isActive ? "active" : "")}>
          Sales
        </NavLink>
        <NavLink to="/analytics" className={({ isActive }) => (isActive ? "active" : "")}>
          Analytics
        </NavLink>
        <NavLink to="/purchase-orders" className={({ isActive }) => (isActive ? "active" : "")}>
          Purchase Orders
        </NavLink>
        <button className="linklike logout" onClick={handleLogout}>
          Log out ({user.username})
        </button>
      </nav>
    </header>
  );
}
