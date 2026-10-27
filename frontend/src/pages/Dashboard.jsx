import React, { useEffect, useState } from "react";
import { getSummary } from "../services/api";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getSummary()
      .then(setSummary)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Overview</div>
          <h2>Dashboard</h2>
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      {summary && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">{summary.total_products}</div>
            <div className="stat-label">Products tracked</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{summary.total_stock}</div>
            <div className="stat-label">Units in stock</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{summary.total_sales}</div>
            <div className="stat-label">Sales recorded</div>
          </div>
          <div className={`stat-card ${summary.low_stock_count > 0 ? "warn" : ""}`}>
            <div className="stat-value">{summary.low_stock_count}</div>
            <div className="stat-label">Low stock (at/below reorder level)</div>
          </div>
        </div>
      )}

      <div className="card">
        <h3>Getting around</h3>
        <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          Use <strong>Products</strong> to manage SKUs, categories and stock
          levels, <strong>Suppliers</strong> and <strong>Purchase Orders</strong>{" "}
          to track who you order from and what's on the way, and{" "}
          <strong>Sales</strong> to log units sold (one at a time, or in bulk
          via CSV) — stock is deducted automatically. Check{" "}
          <strong>Analytics</strong> for sales trends and restock forecasts.
        </p>
      </div>
    </div>
  );
}
