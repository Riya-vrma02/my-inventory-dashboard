import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts } from '../services/api';
import './SalesTracking.css';
import './addsale.css';

const SalesDashboard = () => {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [selectedProductSku, setSelectedProductSku] = useState('');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
    fetchSales();
  }, []);

  async function fetchProducts() {
    try {
      const data = await getProducts();
      if (Array.isArray(data)) setProducts(data);
      else {
        console.error('Unexpected products format:', data);
        setProducts([]);
      }
    } catch (e) {
      console.error('Failed to load products:', e);
      setProducts([]);
    }
  }

  async function fetchSales() {
    try {
      const res = await fetch('http://localhost:5001/api/sales?subject=sale', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setSales(data);
      else if (Array.isArray(data.sales)) setSales(data.sales);
      else {
        console.error('Unexpected sales response format:', data);
        setSales([]);
      }
    } catch (error) {
      console.error('Fetch sales error:', error);
      setSales([]);
    }
  }

  const handleAddSale = async (e) => {
    e.preventDefault();

    if (!selectedProductSku || !quantity || !date) {
      alert('Please fill out all fields');
      return;
    }

    const qtyNum = parseInt(quantity, 10);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert('Quantity must be a positive number');
      return;
    }

    const payload = {
      sku: selectedProductSku,
      quantity_sold: qtyNum,
      date,
      subject: 'sale',
    };

    try {
      const res = await fetch('http://localhost:5001/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      if (!res.ok) {
        console.error('Failed to add sale:', res.status, text);
        alert(`Error adding sale: ${text || res.status}`);
        return;
      }

      alert('Sale added successfully!');
      setSelectedProductSku('');
      setQuantity('');
      setDate('');
      fetchSales();

    } catch (err) {
      console.error('Server error adding sale:', err);
      alert('Server error while adding sale.');
    }
  };

  const handleDeleteSale = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sale?')) return;

    try {
      const res = await fetch(`http://localhost:5001/api/sales/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (res.ok) {
        setSales((prev) => prev.filter((sale) => sale.id !== id));
        alert('Sale deleted successfully.');
      } else {
        alert('Failed to delete sale.');
      }
    } catch (err) {
      console.error('Error deleting sale:', err);
      alert('Error deleting sale.');
    }
  };

  return (
    <div className="sale-container">
      <h2>Sales Dashboard</h2>

      <div className="add-sale">
        <h3>Add New Sale</h3>
        <form onSubmit={handleAddSale} className="sale-form">
          <select
            value={selectedProductSku}
            onChange={(e) => setSelectedProductSku(e.target.value)}
            required
          >
            <option value="">Select Product</option>
            {products.map((prod) => (
              <option key={prod.sku} value={prod.sku}>
                {prod.name} ({prod.sku})
              </option>
            ))}
          </select>

          <input
            type="number"
            min="1"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <button type="submit">Add Sale</button>
        </form>
      </div>

      <div className="sales-list">
        <h3>All Sales</h3>
        <table className="sales-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product Name</th>
              <th>Quantity Sold</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sales.length > 0 ? (
              sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{sale.sku || 'N/A'}</td>
                  <td>{sale.product_name || 'Unknown'}</td>
                  <td>{sale.quantity_sold}</td>
                  <td>{sale.date ? new Date(sale.date).toLocaleDateString() : ''}</td>
                  <td>
                    <button onClick={() => handleDeleteSale(sale.id)} title="Delete Sale">
                      🗑 Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5">No sales found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesDashboard;
