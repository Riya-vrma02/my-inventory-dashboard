import React, { useState } from 'react';
import './addsale.css';
export default function AddSaleForm({ products = [], onSuccess }) {
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    fetch('http://localhost:5001/api/sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        product_id: parseInt(productId, 10),
        quantity_sold: parseInt(quantity, 10),
        date
      })
    })
      .then(res => {
        if (!res.ok) throw new Error('Add failed');
        alert('Sale added!');
        onSuccess?.();
      })
      .catch(console.error);
  };

  return (
    <form onSubmit={handleSubmit} className="add-sale-inline">
      <select
        value={productId}
        onChange={e => setProductId(e.target.value)}
        required
      >
        <option value="">-- Select Product --</option>
        {(Array.isArray(products) ? products : []).map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      <input
        type="number"
        placeholder="Qty"
        value={quantity}
        onChange={e => setQuantity(e.target.value)}
        min="1"
        required
      />

      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        required
      />

      <button type="submit">Add</button>
    </form>
  );
}