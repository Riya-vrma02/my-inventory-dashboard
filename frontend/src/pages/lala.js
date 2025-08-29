// YE ABI DASHBOARD VALA H
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // ✅ Add this line
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SalesChart from '../components/SalesChart'; // ✅ Import the new chart
import { getProducts, getSales, getForecasts } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const navigate = useNavigate(); // ✅ initialize navigator

  useEffect(() => {
    Promise.all([getProducts(), getSales(), getForecasts()])
      .then(([p, s, f]) => {
        setProducts(p);

        // ✅ Grouped and summed sales per date
        const groupedSales = {};
        s.forEach(item => {
          const date = new Date(item.date).toISOString().slice(0, 10);
          const qty = item.quantity_sold || 0;
          const revenue = qty * 10; // Replace with real logic if needed
          if (!groupedSales[date]) {
            groupedSales[date] = { date, sales: qty, revenue };
          } else {
            groupedSales[date].sales += qty;
            groupedSales[date].revenue += revenue;
          }
        });
        setSales(Object.values(groupedSales).sort((a, b) => a.date.localeCompare(b.date)));

        // ✅ Forecasts
        setForecasts(
          Array.isArray(f) ? f.map(i => i.predicted_quantity || 0) : []
        );
      })
      .catch(console.error);
  }, []);

  const totalStock = products.reduce((a, b) => a + (b.quantity || 0), 0);
  const lowStockCount = products.filter(p => p.quantity < 100).length;
  const forecastSum = forecasts.reduce((a, b) => a + b, 0);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>FMCG Dashboard</h1>
        <div className="admin-box">Admin</div>
      </header>

      <div className="dashboard-grid">
        {/* Stock Level */}
        <div className="card">
          <h3>Stock Levels</h3>
          <p className="big-number">{totalStock.toLocaleString()}</p>
          <div className="progress-bar">
            <div style={{ width: `${Math.min(totalStock / 1000, 100)}%` }} />
          </div>
        </div>

        {/* Sales Chart */}
        <div className="card chart-card" onClick={() => navigate('/charts')}>
          <h3>Sales Analytics</h3>
          <SalesChart />
        </div>

        {/* Products Table */}
        <div className="card">
          <div className="card-header">
            <h3>Products</h3>
            <button className="add-btn" onClick={() => navigate('/products')}>Add Products</button> 
          </div>
          <table className="product-table">
            <thead>
              <tr><th>Name</th><th>SKU</th><th>Stock</th></tr>
            </thead>
            <tbody>
              {products.slice(0, 4).map(p => (
                <tr key={p.id}>
                  <td>{p.name}</td><td>{p.sku}</td><td>{p.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Forecast Summary */}
        <div className="card">
          <h3>Forecast</h3>
          <p className="big-number">{forecastSum.toLocaleString()}</p>
          <p>Next month forecast</p>
          <button className="view-btn" onClick={() => navigate('/forecast')}>View Details</button> 
          
        </div>

        {/* Predictive Restocking */}
        <div className="card">
          <h3>Predictive Restocking</h3>
          <p>Restocking recommended for {forecasts.length} products</p>
          <button className="view-btn">VIEW</button>
        </div>

        {/* Users */}
        <div className="card">
          <h3>Users</h3>
          <ul>
            <li>Admin</li>
            <li>Staff</li>
          </ul>
        </div>

        {/* Low Stock Alert */}
        <div className="card alert-card">
          <h3>Low Stock</h3>
          <p className="big-number">{lowStockCount}</p>
          <p>{lowStockCount} products low on stock</p>
        </div>
        <div className="card red-alert">
          <p>⚠️ <strong>Low Stock Alert</strong></p>
          <span>{lowStockCount}</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
