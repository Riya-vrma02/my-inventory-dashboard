// Import from React and routing
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SalesChart from './SalesChart';
import './Dashboard.css';
import ProductList from '../pages/ProductList';
import { getProducts, getSales, getForecasts, getDefectiveProducts, addSale, deleteSale } from '../services/api';
import AdminSidebar from './adminsidebar';

const AdminDashboard = () => {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [forecasts, setForecasts] = useState([]);
  const [defectiveProducts, setDefectiveProducts] = useState([]);
  const navigate = useNavigate();
  const [active, setActive] = useState(null);
  useEffect(() => {
    // Fetch all data when dashboard loads or route changes (including after product addition)
    Promise.all([
      getProducts(),
      getSales(),
      getForecasts(),
      getDefectiveProducts()
    ])
      .then(([p, s, f, d]) => {
        setProducts(p);
        setDefectiveProducts(d);

        const groupedSales = {};
        s.forEach(item => {
          const date = new Date(item.date).toISOString().slice(0, 10);
          const qty = item.quantity_sold || 0;
          const revenue = qty * 10;
          if (!groupedSales[date]) {
            groupedSales[date] = { date, sales: qty, revenue };
          } else {
            groupedSales[date].sales += qty;
            groupedSales[date].revenue += revenue;
          }
        });
        setSales(Object.values(groupedSales).sort((a, b) => a.date.localeCompare(b.date)));

        setForecasts(Array.isArray(f) ? f.map(i => i.predicted_quantity || 0) : []);
      })
      .catch(console.error);
  }); 
  useEffect(() => {
  const mockProducts = [
    { sku: 'A101', name: 'Amul butter', quantity: 90, price: 30 },
    { sku: 'A102', name: 'Maggie', quantity: 150, price: 15 },
    { sku: 'A103', name: 'Milk', quantity: 75, price: 35 },
  ];
  setProducts(mockProducts);
}, []);
  const totalDefectQuantity = defectiveProducts.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalStock = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const lowStockCount = products.filter(p => p.quantity < 100).length;
  const totalProducts = products.length;          // <- distinct products
  const totalUnits    = products.reduce((sum, p) => sum + p.qty, 0);
  const handleAddSale = () => {
    alert("Redirecting to add sale form...");
    navigate('/sales');
  };
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login"); // fixed the path (not /pages/Login)
  };
  const handleDeleteSale = (saleId) => {
    if (window.confirm("Are you sure you want to delete this sale?")) {
      fetch(`http://localhost:5001/api/sales/${saleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      .then(res => {
        if (res.ok) {
          setSales(prevSales => prevSales.filter(s => s.id !== saleId));
          alert("Sale deleted successfully.");
        } else {
          alert("Failed to delete sale.");
        }
      })
      .catch(err => {
        console.error(err);
        alert("Error deleting sale.");
      });
    }
  };


  return (
    <div className="admin-layout">
      
      <div className="dashboard-container">
      <div className="dashboard-scroll">
      <div className="dashboard">
        <header className="dashboard-header">
          <h1>FMCG Dashboard</h1>
          <div className="admin-box">Admin</div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
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

          {/* Products */}
          <div className="card">
            <div className="card-header">
              <h3>Products</h3>
              <button className="add-btn" onClick={ () => navigate('/products')} > Add Products</button>
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

          {/* sales overview*/}
          <div className="card">
            <h3>Sales Overview</h3>
            <p className="big-number">{sales.reduce((a, b) => a + b.sales, 0)}</p>
            <p>Total Units Sold</p>
            <button className="view-btn" onClick={() => navigate('/SalesDashboard')}>View All</button>
          </div>

          
          {/* ✅ Defective Products */}
          <div className="card red-alert">
            <div className="card-header">
              <h3>Defective Products</h3>
              <button className="add-btn" onClick={() => navigate('/defects')}>View All</button>
            </div>
            <p className="big-number">{totalDefectQuantity}</p>
            <ul>
              {defectiveProducts.slice(0, 3).map(d => (
                <li key={d.id}>{d.name} - {d.sku}</li>
              ))}
            </ul>
          </div>

          {/* Predictive Restocking */}
          <div className="card">
            <h3>Predictive Restocking</h3>
            <p>Restocking recommended for {forecasts.length} products</p>
            <button className="view-btn" onClick={() => navigate('/restock')}>VIEW</button>
          </div>

          {/* Suppliers Management */}
          <div className="card">
            <div className="card-header">
              <h3>Suppliers</h3>
              <button className="add-btn" onClick={() => navigate('/suppliers')}>
                Manage
              </button>
            </div>
            <p className="big-number">
              {products
                .map(p => p.supplier || 'Unknown')
                .filter((v, i, a) => a.indexOf(v) === i).length}
            </p>
            <p>Active suppliers</p>
          </div>
          {/* Low Stock Alerts */}
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

        </div>
        <div className="welcome-banner">
        <h2>Welcome back, Admin! 🎉</h2>
        <p>Here’s your inventory and sales overview for today.</p>
      </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
