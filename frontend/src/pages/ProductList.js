import React, { useEffect, useState } from 'react';
import { getProducts, addProduct, deleteProduct } from '../services/api';
import './ProductManagement.css';

function ProductList() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [deletingSku, setDeletingSku] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    sku: '',
    name: '',
    quantity: '',
    price: ''
  });
  
  useEffect(() => {
    loadProducts();
  }, []);
  
  const getToken = () => localStorage.getItem('token');
  const handleDelete = async sku => {
  if (!window.confirm('Delete this product?')) return;
  setDeletingSku(sku);
  try {
    await deleteProduct(sku);
    setProducts(prev => prev.filter(p => p.sku !== sku));
  } catch (err) {
    console.error(err);
    alert('Failed to delete');
  } finally {
    setDeletingSku(null);
  }
};

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError('');
      const productsData = await getProducts();
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (err) {
      console.error('Load products error:', err);
      const errorMessage = String(err?.message || err || 'Failed to load products');
      setError(errorMessage);

      if (errorMessage.includes('Authentication required')) {
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: String(value) }));
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const { sku, name, quantity, price } = form;

    if (!sku.trim() || !name.trim() || !quantity.trim() || !price.trim()) {
      alert('Please fill in all fields.');
      return;
    }

    try {
      await addProduct({
        sku: sku.trim(),
        name: name.trim(),
        quantity: Number(quantity),
        price: parseFloat(price),
        subject: 'product'
      });
      await loadProducts();
      alert('Product added!');
      setForm({ sku: '', name: '', quantity: '', price: '' });
    } catch (err) {
      const res = err?.response;
      console.error('Status:', res?.status);
      console.error('Headers:', res?.headers);
      console.error('Body:', res?.data);   // ← the real message
      alert(
        `Failed to add product\n` +
        JSON.stringify(res?.data || res?.statusText, null, 2)
      );
    }
  };


  return (
    <div className="product-container">
      <h2>Product Inventory</h2>

      {error && (
        <div className="error-container">
          <p className="error">{error}</p>
          {error.includes('Authentication') && (
            <button onClick={() => window.location.href = '/login'}>
              Go to Login
            </button>
          )}
        </div>
      )}

      {loading && <p>Loading...</p>}

      <div className="product-form">
        <input
          type="text"
          name="sku"
          placeholder="SKU"
          value={form.sku}
          onChange={handleChange}
          disabled={loading}
        />
        <input
          type="text"
          name="name"
          placeholder="Name"
          value={form.name}
          onChange={handleChange}
          disabled={loading}
        />
        <input
          type="number"
          name="quantity"
          placeholder="Quantity"
          value={form.quantity}
          onChange={handleChange}
          disabled={loading}
        />
        <input
          type="number"
          name="price"
          placeholder="Price"
          value={form.price}
          onChange={handleChange}
          disabled={loading}
        />
        <button onClick={handleAddProduct} disabled={loading}>
          {loading ? 'Adding...' : 'Add Product'}
        </button>
      </div>

      <table className="product-table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Name</th>
            <th>Quantity</th>
            <th>Price (₹)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.length ? (
            products.map(p => (
              <tr key={p.sku}>
                <td>{String(p.sku || '')}</td>
                <td>{String(p.name || '')}</td>
                <td>{String(p.quantity || 0)}</td>
                <td>{String(p.price || 0)}</td>
                <td>
                  <button
                    onClick={() => handleDelete(p.sku)}
                    disabled={deletingSku === p.sku}
                    className="delete-btn"
                  >
                    {deletingSku === p.sku ? 'Deleting…' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr><td colSpan="5">No products found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ProductList;
