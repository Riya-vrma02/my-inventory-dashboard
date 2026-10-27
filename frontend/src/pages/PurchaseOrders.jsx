import React, { useEffect, useState } from "react";
import {
  getPurchaseOrders,
  addPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  getSuppliers,
  getProducts,
} from "../services/api";
import { useAuth } from "../services/AuthContext";

const emptyForm = { supplier_id: "", sku: "", quantity: "", unit_cost: "" };

export default function PurchaseOrders() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [ordersData, suppliersData, productsData] = await Promise.all([
        getPurchaseOrders(),
        getSuppliers(),
        getProducts(),
      ]);
      setOrders(ordersData);
      setSuppliers(suppliersData);
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
    if (!form.supplier_id || !form.sku || !form.quantity) {
      setError("Supplier, product and quantity are required.");
      return;
    }
    setSubmitting(true);
    try {
      await addPurchaseOrder({
        supplier_id: Number(form.supplier_id),
        sku: form.sku,
        quantity: Number(form.quantity),
        unit_cost: form.unit_cost ? Number(form.unit_cost) : null,
      });
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id, status) {
    setBusyId(id);
    try {
      await updatePurchaseOrder(id, { status });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this purchase order?")) return;
    setBusyId(id);
    try {
      await deletePurchaseOrder(id);
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Restocking</div>
          <h2>Purchase Orders</h2>
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <div className="card">
        <h3>Order stock from a supplier</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="field">
              <label>Supplier</label>
              <select name="supplier_id" value={form.supplier_id} onChange={handleChange}>
                <option value="">Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
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
              <label>Quantity</label>
              <input
                type="number"
                min="1"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
              />
            </div>
            <div className="field">
              <label>Unit cost (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                name="unit_cost"
                value={form.unit_cost}
                onChange={handleChange}
              />
            </div>
            <button className="btn" type="submit" disabled={submitting}>
              {submitting ? "Placing…" : "Place order"}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>All purchase orders</h3>
        {loading ? (
          <p>Loading…</p>
        ) : orders.length === 0 ? (
          <div className="empty-state">No purchase orders yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Supplier</th>
                <th>SKU</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Unit cost</th>
                <th>Status</th>
                <th>Ordered</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.supplier_name}</td>
                  <td><span className="sku-badge">{o.sku}</span></td>
                  <td>{o.product_name}</td>
                  <td className="num">{o.quantity}</td>
                  <td className="num">{o.unit_cost ?? "—"}</td>
                  <td>
                    <select
                      value={o.status}
                      disabled={busyId === o.id}
                      onChange={(e) => handleStatusChange(o.id, e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="received">Received</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="num">{o.order_date}</td>
                  {isAdmin && (
                    <td>
                      <button
                        className="btn-danger"
                        onClick={() => handleDelete(o.id)}
                        disabled={busyId === o.id}
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
