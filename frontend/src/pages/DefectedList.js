import React, { useEffect, useState } from 'react';
import { getDefectiveProducts,reportDefectiveProduct,getProducts} from '../services/api';
import './Defectedlist.css';

const DefectiveProducts = () => {
  const [defects, setDefects] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    sku: '',
    name: '',
    quantity: '',
    reason: '',
    date: '',
  });

  useEffect(() => {
    getDefectiveProducts().then(setDefects).catch(console.error);
    
    getProducts()
      .then((data) => {
        console.log('Products fetched:', data);  // Debug log
        if (Array.isArray(data)) {
          setProducts(data);
        } else {
          console.error('Unexpected products response format:', data);
          setProducts([]);
        }
      })
      .catch(error => {
        console.error('Error fetching products:', error);
        setProducts([]);
      });
  }, []);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.sku || !form.quantity || !form.reason || !form.date) {
      alert('All fields are required');
      return;
    }
    const payload = {
      sku: String(form.sku).trim(),
      name: String(form.name).trim(),
      quantity: Number(form.quantity),
      reason: String(form.reason).trim(),
      date_reported: form.date,
      subject: "defect"
    };

    try {
      await reportDefectiveProduct(payload);
      alert('Reported successfully');
      setForm({ sku: '', quantity: '', reason: '', date: '' });
      getDefectiveProducts().then(setDefects);
    } catch (err) {
      console.error('Error reporting defect:', err.response?.data || err.message);
      alert('Failed to report defect');
    }
  };

  return (
    <div className="defect-page">
      <h2>Defective Products</h2>

      <form onSubmit={handleSubmit} className="defect-form">
        <select
          value={form.sku}
          onChange={(e) => {
            const p = products.find(pr => pr.sku === e.target.value);
            setForm({
              ...form,
              sku: e.target.value,
              name: p ? p.name : ''
            });
          }}
          required
        >
          <option value="">Select Product</option>
          {products.map((p) => (
            <option key={p.sku} value={p.sku}>
              {p.name} ({p.sku})
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Quantity"
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          required
        />

        <input
          type="text"
          placeholder="Reason"
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          required
        />

        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          required
        />

        <button type="submit">Report Defect</button>
      </form>

      <h3>Reported Defective Items</h3>
      <table className="defect-table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Qty</th>
            <th>Reason</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {defects.map((d, i) => (
            <tr key={i}>
              <td>{d.sku}</td>
              <td>{d.quantity}</td>
              <td>{d.reason}</td>
              <td>{new Date(d.date_reported || d.date).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DefectiveProducts;
