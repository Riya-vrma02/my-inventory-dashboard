// src/services/api.js  (axios-only version)
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// 1️⃣  single axios instance
const api = axios.create({
  baseURL: `${API_URL}/api`,
});

//  attach token automatically
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if(token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, error => Promise.reject(error));
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);
// helper to keep the same throw-on-error behaviour
const request = async (method, url, data) => {
  try {
    const { data: res } = await api({ method, url, data });
    return res;
  } catch (err) {
    // bubble up the server JSON error or generic text
    throw new Error(
      err?.response?.data?.msg ||
      err?.response?.data?.error ||
      err.message ||
      'Unknown API error'
    );
  }
};

// 4️⃣  AUTH
export const login  = (data) => request('POST', '/login',  data);
export const signup = (data) => request('POST', '/signup', data);

// 5️⃣  PRODUCTS
export const getProducts = async () => {
  const response = await axios.get('/api/products');
  return response.data;
};
export const addProduct     = (d)  => request('POST', '/products', d);
export const updateProduct  = (id, d) => request('PUT', `/products/${id}`, d);
export const deleteProduct  = (sku) => request('DELETE', `/products/${encodeURIComponent(sku)}`);

// 6️⃣  SALES
export const getSales = () =>
  api.get('/sales', { params: { subject: 'sales' } });
export const addSale = (d) => request('POST', '/sales', { ...d, subject: 'sale' });
export const deleteSale = (id) => request('DELETE', `/sales/${id}`);

// 7️⃣  FORECASTS
export const getForecasts = () =>
  api.get('/forecasts', { params: { subject: 'forecast' } });
export const addForecast = (d) => request('POST', '/forecasts', { ...d, subject: 'forecast' });
export const predict      = (dates) => request('POST', '/forecast', { dates });

// 8️⃣  DEFECTS
export const getDefectiveProducts = () => request('GET', '/defects');
export const reportDefectiveProduct = (d) => request('POST', '/defects', d);

// 9️⃣  RESTOCK
export const createRestockOrder = (o) => request('POST', '/restock-orders', o);

// 🔟  SUPPLIERS  (declared **before** export)
export const getSuppliers = () => api.get('/suppliers').then(r => r.data);
export const addSupplier    = (d)  => request('POST','/suppliers', d).then(r => r.data);
export const deleteSupplier = (id) => request('DELETE',`/suppliers/${id}`).then(r => r.data);
// ✅ utilities
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('authToken');
  sessionStorage.removeItem('authToken');
};
export const isAuthenticated = () => !!localStorage.getItem('token');