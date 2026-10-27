import React, { useEffect, useRef, useState } from "react";
import { getSales, addSale, deleteSale, getProducts, uploadSalesCsv } from "../services/api";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = {
  sku: "",
  quantity_sold: "",
  sale_date: todayIso(),
  region: "",
  salesperson: "",
};

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [salesData, productsData] = await Promise.all([getSales(), getProducts()]);
      setSales(salesData);
      setProducts(productsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!form.sku || !form.quantity_sold) {
      setError("Please select a product and enter a quantity.");
      return;
    }
    const qty = Number(form.quantity_sold);
    if (!Number.isInteger(qty) || qty <= 0) {
      setError("Quantity sold must be a positive whole number.");
      return;
    }

    setSubmitting(true);
    try {
      await addSale({
        sku: form.sku,
        quantity_sold: qty,
        sale_date: form.sale_date,
        region: form.region.trim() || undefined,
        salesperson: form.salesperson.trim() || undefined,
      });
      setForm({ ...emptyForm, sale_date: todayIso() });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this sale?")) return;
    setDeletingId(id);
    try {
      await deleteSale(id);
      setSales((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setNotice("");
    setUploading(true);
    try {
      const result = await uploadSalesCsv(file);
      setNotice(result.message);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Ledger</div>
          <h2>Sales</h2>
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}
      {notice && (
        <div className="auth-error" style={{ background: "#eaf3ee", color: "var(--stock-green)", borderColor: "#cfe6da" }}>
          {notice}
        </div>
      )}

      <div className="card">
        <h3>Record a sale</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="field">
              <label>Product</label>
              <select name="sku" value={form.sku} onChange={handleChange}>
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.sku} value={p.sku}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Quantity sold</label>
              <input
                type="number"
                min="1"
                name="quantity_sold"
                value={form.quantity_sold}
                onChange={handleChange}
              />
            </div>
            <div className="field">
              <label>Date</label>
              <input
                type="date"
                name="sale_date"
                value={form.sale_date}
                onChange={handleChange}
              />
            </div>
            <div className="field">
              <label>Region</label>
              <input
                name="region"
                value={form.region}
                onChange={handleChange}
                placeholder="North"
              />
            </div>
            <div className="field">
              <label>Salesperson</label>
              <input
                name="salesperson"
                value={form.salesperson}
                onChange={handleChange}
                placeholder="Anita"
              />
            </div>
            <button className="btn" type="submit" disabled={submitting}>
              {submitting ? "Recording…" : "Add sale"}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Bulk import from CSV</h3>
        <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: 12 }}>
          Columns: <code>sku, quantity_sold, sale_date, region, salesperson</code> — only
          <code> sku</code> and <code>quantity_sold</code> are required, the rest are optional.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={uploading}
        />
        {uploading && <span style={{ marginLeft: 10, color: "var(--muted)" }}>Uploading…</span>}
      </div>

      <div className="card">
        <h3>All sales</h3>
        {loading ? (
          <p>Loading…</p>
        ) : sales.length === 0 ? (
          <div className="empty-state">No sales recorded yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th>Qty sold</th>
                <th>Date</th>
                <th>Region</th>
                <th>Salesperson</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id}>
                  <td><span className="sku-badge">{s.sku}</span></td>
                  <td>{s.product_name}</td>
                  <td className="num">{s.quantity_sold}</td>
                  <td className="num">{s.sale_date}</td>
                  <td>{s.region}</td>
                  <td>{s.salesperson}</td>
                  <td>
                    <button
                      className="btn-danger"
                      onClick={() => handleDelete(s.id)}
                      disabled={deletingId === s.id}
                    >
                      {deletingId === s.id ? "Deleting…" : "Delete"}
                    </button>
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
