import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  getSalesAnalytics,
  getSalesTrend,
  getRestockRecommendations,
} from "../services/api";

const GROUP_OPTIONS = [
  { value: "category", label: "By category" },
  { value: "region", label: "By region" },
  { value: "salesperson", label: "By salesperson" },
  { value: "product", label: "By product (SKU)" },
];

export default function Analytics() {
  const [groupBy, setGroupBy] = useState("category");
  const [breakdown, setBreakdown] = useState([]);
  const [trend, setTrend] = useState([]);
  const [restock, setRestock] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatic();
  }, []);

  useEffect(() => {
    loadBreakdown(groupBy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy]);

  async function loadStatic() {
    setLoading(true);
    setError("");
    try {
      const [trendData, restockData] = await Promise.all([
        getSalesTrend(),
        getRestockRecommendations(),
      ]);
      setTrend(trendData);
      setRestock(restockData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadBreakdown(group) {
    try {
      setBreakdown(await getSalesAnalytics(group));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Insights</div>
          <h2>Analytics</h2>
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <div className="card">
        <div className="page-header" style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Units sold</h3>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} style={{ maxWidth: 220 }}>
            {GROUP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {breakdown.length === 0 ? (
          <div className="empty-state">No sales data yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={breakdown}>
              <CartesianGrid strokeDasharray="4 4" stroke="var(--line)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="total_quantity" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <h3>Daily sales trend</h3>
        {trend.length === 0 ? (
          <div className="empty-state">No sales history yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="4 4" stroke="var(--line)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="total_quantity"
                stroke="var(--stock-green)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <h3>Restock recommendations</h3>
        <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: 12 }}>
          Based on average daily sales and a 7-day supplier lead time. Products
          are sorted by how urgently they need restocking.
        </p>
        {loading ? (
          <p>Loading…</p>
        ) : restock.length === 0 ? (
          <div className="empty-state">No products to forecast yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th>Current stock</th>
                <th>Reorder at</th>
                <th>Avg daily sales</th>
                <th>Recommended reorder qty</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {restock.map((r) => (
                <tr key={r.sku}>
                  <td><span className="sku-badge">{r.sku}</span></td>
                  <td>{r.name}</td>
                  <td className="num">{r.current_stock}</td>
                  <td className="num">{r.reorder_level}</td>
                  <td className="num">{r.avg_daily_sales}</td>
                  <td className="num">{r.recommended_reorder_qty}</td>
                  <td>
                    {r.needs_restock && (
                      <span style={{ color: "var(--stock-red)", fontSize: "0.82rem" }}>
                        ● restock now
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
