import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import SalesChart from './SalesChart';

const StaffDashboard = () => {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [forecasts, setForecasts] = useState([]);

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const safeFetch = (url) =>
    fetch(url, { headers: authHeaders })
      .then((r) => r.json())
      .then((data) => (Array.isArray(data) ? data : []))
      .catch(() => []);

  useEffect(() => {
    Promise.all([
      safeFetch('http://localhost:5001/api/products'),
      safeFetch('http://localhost:5001/api/sales'),
      safeFetch('http://localhost:5001/api/forecasts'),
    ]).then(([p, s, f]) => {
      setProducts(p || []);
      setSales(s || []);
      setForecasts(f || []);
    });
  }, []);
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login"); // fixed the path (not /pages/Login)
  };
  const totalStock = products.reduce((a, b) => a + (parseInt(b.quantity) || 0), 0);
  const lowStockCnt = products.filter((p) => p.quantity < 100).length;
  const totalSold = sales.reduce((a, s) => a + (s.quantity_sold || 0), 0);
  const outofStockCnt = products.filter((p) => p.quantity === 0).length;
  return (
    <div className="admin-layout">
      <div className="dashboard-container">
        <div className="dashboard-scroll">
          <div className="dashboard">
            <header className="dashboard-header">
              <h1>Staff Dashboard</h1>
              <div className="admin-box">Staff</div>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </header>

            <div className="dashboard-grid">
              {/* 1. Stock Level */}
              <div className="card">
                <h3>Stock Levels</h3>
                <p className="big-number">{totalStock.toLocaleString()}</p>
                <div className="progress-bar">
                  <div style={{ width: `${Math.min(totalStock / 1000, 100)}%` }} />
                </div>
              </div>

              {/* 2. Products mini-table */}
              <div className="card product-card">
                <div className="card-header">
                  <h3>Recent Products</h3>
                  <button className="add-btn" onClick={() => navigate('/productsview')}>
                    View All
                  </button>
                </div>
              <table className="product-table">
                <thead>
                  <tr><th>Name</th><th>Stock</th><th>Price (₹)</th></tr>
                </thead>
                <tbody>
                  {products.length ? (
                    products.map(p => (
                      <tr key={p.sku}>
                        <td>{p.name}</td>
                        <td>{p.quantity}</td>
                        <td>₹{p.price}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="3">No products found.</td></tr>
                  )}
                </tbody>
                </table>
                </div>
                {/* 3. Sales Chart */}
              <div className="card chart-card" onClick={() => navigate('/charts')}>
                <h3>Sales Analytics</h3>
                <SalesChart />
              </div>
              {/* 4. Sales Volume */}
              <div className="card">
                <h3>Sales Volume</h3>
                <p className="big-number">{totalSold.toLocaleString()}</p>
                <button className="view-btn" onClick={() => navigate('/SalesDashboard')}>
                  View All
                </button>
              </div>

              {/* 5. Stock Analytics */}
              <div className="card">
                <h3>Stock Analytics</h3>
                <p>Out of Stock Items: <strong>{outofStockCnt}</strong></p>
                <p>Total Products: <strong>{products.length}</strong></p>
              </div>

              {/* 6. Restock Forecast */}
              <div className="card">
                <h3>Restock Forecast</h3>
                <p>{forecasts.length} products need attention</p>
                <button className="view-btn" onClick={() => navigate('/restock')}>
                  View Forecast
                </button>
              </div>

              {/* 7. Low Stock Alert */}
              <div className="card alert-card">
                <h3>Low Stock</h3>
                <p className="big-number">{lowStockCnt}</p>
                <p>{lowStockCnt} products low on stock</p>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ Welcome Note */}
        <div className="welcome-banner">
          <h2>Welcome back, Staff! 👋</h2>
          <p>Here’s your inventory and sales overview for today.</p>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
