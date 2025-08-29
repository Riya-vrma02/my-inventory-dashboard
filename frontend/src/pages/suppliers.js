import React, { useEffect, useState } from 'react';
import './supplier.css';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState({ name: '', contact: '', email: '' });

  // Fetch suppliers from backend on mount
  useEffect(() => {
    fetch('http://localhost:5001/api/suppliers')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setSuppliers(data);
        else setSuppliers([]);
      })
      .catch(console.error);
  }, []);

  /* HANDLE INPUT CHANGE */
  const handleChange = e =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleAdd = () => {
    if (!form.name.trim()) return alert('Name is required');

    const payload = {
      name: form.name.trim(),
      contact: form.contact ? Number(form.contact) : null,
      email: form.email.trim() || null,
      subject: "supplier"
    };

    const token = localStorage.getItem('token');  // get JWT from localStorage

    fetch('http://localhost:5001/api/suppliers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,  // Add this line
      },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || 'Failed to add supplier');
        }
        return res.json();
      })
      .then(newSupplier => {
        setSuppliers((prev) => [...prev, newSupplier]);
        setForm({ name: '', contact: '', email: '' });
      })
      .catch(err => {
        alert('Error adding supplier: ' + err.message);
        console.error('Add supplier error:', err);
      });
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this supplier?')) return;
    setSuppliers(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="suppliers-container">
      <h1>Supplier Management</h1>

      {/* ADD FORM */}
      <div className="add-form">
        <input name="name" placeholder="Supplier Name" value={form.name} onChange={handleChange} />
        <input name="contact" placeholder="Contact" value={form.contact} onChange={handleChange} />
        <input name="email" placeholder="Email" value={form.email} onChange={handleChange} />
        <button onClick={handleAdd}>Add Supplier</button>
      </div>

      {/* TABLE */}
      <table className="supplier-table">
        <thead>
          <tr><th>Name</th><th>Contact</th><th>Email</th><th>Action</th></tr>
        </thead>
        <tbody>
          {suppliers.map(s => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.contact ?? '-'}</td>
              <td>{s.email ?? '-'}</td>
              <td>
                <button className="delete-btn" onClick={() => handleDelete(s.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Suppliers;
