import React, { useEffect, useState } from 'react';
import './SalesTracking.css';

const SalesList = () => {
  const [sales, setSales] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5001/api/sales', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        // Check if response is wrapped
        if (Array.isArray(data)) {
          setSales(data);
        } else if (Array.isArray(data.sales)) {
          setSales(data.sales);
        } else {
          console.error('Unexpected response format:', data);
          setSales([]);
        }
      })
      .catch(console.error);
  }, []);
  
  const getToken = () => localStorage.getItem('token');

  const handleDelete = (saleId) => {
    if (!window.confirm('Are you sure you want to delete this sale?')) return;

    fetch(`http://localhost:5001/api/sales/${saleId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => {
        if (res.ok) {
          setSales(prev => prev.filter(s => s.id !== saleId));
          alert('Sale deleted.');
        } else {
          alert('Failed to delete sale.');
        }
      })
      .catch(err => {
        console.error(err);
        alert('Error deleting sale.');
      });
  };

  return (
    <div className="sales-list">
      <h2>All Sales</h2>
      {/* ❌ Removed Add New Sale Button */}

      <table className="sales-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Product ID</th>
            <th>Quantity Sold</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {sales.map(s => (
            <tr
              key={s.id}
              onClick={() => handleDelete(s.id)}
              style={{ cursor: 'pointer' }}
              title="Click to delete this sale"
            >
              <td>{s.id}</td>
              <td>{s.product_id}</td>
              <td>{s.quantity_sold}</td>
              <td>{new Date(s.date).toLocaleDateString()}</td>
              <td>
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent row click
                    handleDelete(s.id);
                  }}
                >
                  🗑 Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SalesList;
