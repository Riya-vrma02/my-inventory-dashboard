import React, { useEffect, useState } from "react";
import { getProducts, addProduct, deleteProduct, getSuppliers } from "../services/api";
import { useAuth } from "../services/AuthContext";

const emptyForm = {
  sku: "",
  name: "",
  category: "",
  quantity: "",
  price: "",
  reorder_level: "20",
  supplier_id: "",
};

export default function Products() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingSku, setDeletingSku] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [productsData, suppliersData] = await Promise.all([
        getProducts(),
        getSuppliers(),
      ]);
      setProducts(productsData);
      setSuppliers(suppliersData);
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

    if (!form.sku.trim() || !form.name.trim() || form.quantity === "" || form.price === "") {
      setError("SKU, name, quantity and price are all required.");
      return;
    }

    setSubmitting(true);
    try {
      await addProduct({
        sku: form.sku.trim(),
        name: form.name.trim(),
        category: form.category.trim() || "General",
        quantity: Number(form.quantity),
        price: Number(form.price),
        reorder_level: Number(form.reorder_level || 20),
        supplier_id: form.supplier_id || null,
      });
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(sku) {
    if (!window.confirm(`Delete product ${sku}?`)) return;
    setDeletingSku(sku);
    try {
      await deleteProduct(sku);
      setProducts((prev) => prev.filter((p) => p.sku !== sku));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingSku(null);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Inventory</div>
          <h2>Products</h2>
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <div className="card">
        <h3>Add a product</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="field">
              <label>SKU</label>
              <input name="sku" value={form.sku} onChange={handleChange} placeholder="A107" />
            </div>
            <div className="field">
              <label>Name</label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="Tea Powder" />
            </div>
            <div className="field">
              <label>Category</label>
              <input
                name="category"
                value={form.category}
                onChange={handleChange}
                placeholder="Beverages"
              />
            </div>
            <div className="field">
              <label>Quantity</label>
              <input
                type="number"
                min="0"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
              />
            </div>
            <div className="field">
              <label>Price (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                name="price"
                value={form.price}
                onChange={handleChange}
              />
            </div>
            <div className="field">
              <label>Reorder level</label>
              <input
                type="number"
                min="0"
                name="reorder_level"
                value={form.reorder_level}
                onChange={handleChange}
              />
            </div>
            <div className="field">
              <label>Supplier</label>
              <select name="supplier_id" value={form.supplier_id} onChange={handleChange}>
                <option value="">None</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn" type="submit" disabled={submitting}>
              {submitting ? "Adding…" : "Add product"}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>All products</h3>
        {loading ? (
          <p>Loading…</p>
        ) : products.length === 0 ? (
          <div className="empty-state">No products yet. Add your first one above.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Reorder at</th>
                <th>Price (₹)</th>
                <th>Supplier</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.sku}>
                  <td><span className="sku-badge">{p.sku}</span></td>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td className="num">
                    {p.quantity}
                    {p.low_stock && (
                      <span style={{ color: "var(--stock-red)", marginLeft: 8, fontSize: "0.8rem" }}>
                        ● low
                      </span>
                    )}
                  </td>
                  <td className="num">{p.reorder_level}</td>
                  <td className="num">{p.price}</td>
                  <td>{p.supplier_name || "—"}</td>
                  {isAdmin && (
                    <td>
                      <button
                        className="btn-danger"
                        onClick={() => handleDelete(p.sku)}
                        disabled={deletingSku === p.sku}
                      >
                        {deletingSku === p.sku ? "Deleting…" : "Delete"}
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
