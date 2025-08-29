import React, { useEffect, useState } from 'react';
import { getProducts, addProduct } from '../services/api';
import './ProductManagement.css';

function ProductList() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    sku: '',
    name: '',
    quantity: '',
    price: '',
    date: ''
  });

  useEffect(() => {
    loadProducts();
  }, []);

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
      
      // Redirect to login if authentication error
      if (errorMessage.includes('Authentication required')) {
        // Redirect to login page or show login modal
        window.location.href = '/login'; // Adjust path as needed
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: String(value) }));
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
      <table className="product-table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Name</th>
            <th>Quantity</th>
            <th>Price (₹)</th>
            <th>Date Added</th>
          </tr>
        </thead>
        <tbody>
          {products.length ? (
            products.map(p => (
              <tr key={p.id || p.sku}>
                <td>{String(p.sku || '')}</td>
                <td>{String(p.name || '')}</td>
                <td>{String(p.quantity || 0)}</td>
                <td>{String(p.price || 0)}</td>
                <td>
                  {p.date_added ? 
                    new Date(p.date_added).toLocaleDateString('en-GB') : 
                    'N/A'
                  }
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
