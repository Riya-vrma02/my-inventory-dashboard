import React, { useEffect, useState } from 'react';
import { getForecasts, getProducts, createRestockOrder } from '../services/api';
import { downloadForecastCSV } from '../services/forecastService';
import './Forecast.css';

function Forecast() {
  const [forecasts, setForecasts] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restockingList, setRestockingList] = useState([]);

  useEffect(() => {
    Promise.all([getForecasts(), getProducts()])
      .then(([forecastData, productData]) => {
        setForecasts(forecastData || []);
        setProducts(productData || []);
      })
      .catch(() => alert('Failed to load forecasts or products'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const filtered = forecasts
      .map(f => {
        const product = products.find(p => p.id === f.product_id);
        if (!product) return null;

        const deficit = f.predicted_quantity - product.quantity;
        return deficit > 0
          ? {
              name: product.name,
              sku: product.sku,
              product_id: product.id,
              current_stock: product.quantity,
              predicted: f.predicted_quantity,
              restock_needed: deficit
            }
          : null;
      })
      .filter(Boolean);

    setRestockingList(filtered);
  }, [forecasts, products]);

  // ✅ Auto-Restock Button Handler
  const handleAutoRestock = async () => {
    try {
      for (const item of restockingList) {
        await createRestockOrder({
          product_id: item.product_id,
          quantity: item.restock_needed,
          reason: 'Predicted demand exceeds current stock'
        });
      }
      alert('Restock orders sent successfully ✅');
    } catch (err) {
      alert('Failed to send restock orders ❌');
    }
  };

  return (
    <div className="forecast-container">
      <h2>📈 Predictive Restocking</h2>

      <div className="forecast-form">
        <button onClick={downloadForecastCSV}>📥 Export CSV</button>
        {restockingList.length > 0 && (
          <button onClick={handleAutoRestock} className="restock-btn">
            🚚 Auto Send Restock Orders
          </button>
        )}
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : restockingList.length === 0 ? (
        <p>All stock levels meet forecasted demand ✅</p>
      ) : (
        <table className="forecast-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>SKU</th>
              <th>Current Stock</th>
              <th>Predicted Demand</th>
              <th>Restock Needed</th>
            </tr>
          </thead>
          <tbody>
            {restockingList.map((item, index) => (
              <tr key={index}>
                <td>{item.name}</td>
                <td>{item.sku}</td>
                <td>{item.current_stock}</td>
                <td>{item.predicted}</td>
                <td style={{ color: 'red' }}>{item.restock_needed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Forecast;
