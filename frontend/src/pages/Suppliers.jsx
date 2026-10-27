import React, { useEffect, useState } from "react";
import { getSuppliers, addSupplier, deleteSupplier } from "../services/api";
import { useAuth } from "../services/AuthContext";

const emptyForm = { name: "", contact: "", email: "" };

export default function Suppliers() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setSuppliers(await getSuppliers());
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
    if (!form.name.trim()) {
      setError("Supplier name is required.");
      return;
    }
    setSubmitting(true);
    try {
      await addSupplier(form);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this supplier? Their products will also be removed.")) return;
    setDeletingId(id);
    try {
      await deleteSupplier(id);
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Vendors</div>
          <h2>Suppliers</h2>
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <div className="card">
        <h3>Add a supplier</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="field">
              <label>Name</label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="Ganesh Traders" />
            </div>
            <div className="field">
              <label>Contact</label>
              <input name="contact" value={form.contact} onChange={handleChange} placeholder="9876500000" />
            </div>
            <div className="field">
              <label>Email</label>
              <input name="email" value={form.email} onChange={handleChange} placeholder="contact@vendor.com" />
            </div>
            <button className="btn" type="submit" disabled={submitting}>
              {submitting ? "Adding…" : "Add supplier"}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>All suppliers</h3>
        {loading ? (
          <p>Loading…</p>
        ) : suppliers.length === 0 ? (
          <div className="empty-state">No suppliers yet. Add your first one above.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Email</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td className="num">{s.contact || "—"}</td>
                  <td>{s.email || "—"}</td>
                  {isAdmin && (
                    <td>
                      <button
                        className="btn-danger"
                        onClick={() => handleDelete(s.id)}
                        disabled={deletingId === s.id}
                      >
                        {deletingId === s.id ? "Deleting…" : "Delete"}
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
