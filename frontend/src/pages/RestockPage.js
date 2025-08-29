// src/pages/RestockPage.js
import React, { useEffect, useState } from 'react';
import { getProducts, getForecasts } from '../services/api';
import './RestockPage.css'; // optional styling

const RestockPage = () => {
  const [restockItems, setRestockItems] = useState([]);

  useEffect(() => {
    Promise.all([getProducts(), getForecasts()])
      .then(([products, forecasts]) => {
        const restocks = forecasts
          .map(f => {
            const p = products.find(pr => pr.id === f.product_id);
            if (!p) return null;
            const needed = Math.max(0, f.predicted_quantity - p.quantity);
            return needed
              ? {
                  id: p.id,
                  name: p.name,
                  sku: p.sku,
                  current: p.quantity,
                  forecast: f.predicted_quantity,
                  needed
                }
              : null;
          })
          .filter(Boolean);
        setRestockItems(restocks);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="restock-container">
        <h2>Restocking Products</h2>
        <table className="restock-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Current Stock</th>
              <th>Forecast</th>
              <th>Suggested Restock</th>
            </tr>
          </thead>
          <tbody>
            {restockItems.map(item => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.sku}</td>
                <td>{item.current}</td>
                <td>{item.predicted}</td>
                <td>{item.needed}</td>
              </tr>
            ))}
          </tbody>
        </table>
    </div>
  );
};

export default RestockPage;
