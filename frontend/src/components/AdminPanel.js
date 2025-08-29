import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminPanel.css';

function AdminPanel() {
 const [users, setUsers] = useState([]);
 const [products, setProducts] = useState([]);
 const [sales, setSales] = useState([]);
 const [error, setError] = useState(null);

 useEffect(() => {
 axios.get('/api/users')
 .then(response => {
 setUsers(response.data);
 })
 .catch(error => {
 console.error(error);
 });

 axios.get('/api/products')
 .then(response => {
 setProducts(response.data);
 })
 .catch(error => {
 console.error(error);
 });

 axios.get('/api/sales')
 .then(response => {
 setSales(response.data);
 })
 .catch(error => {
 console.error(error);
 });
 }, []);

 const handleDeleteUser = (id) => {
 axios.delete(`/api/users/${id}`)
 .then(response => {
 setUsers(users.filter(user => user.id !== id));
 })
 .catch(error => {
 console.error(error);
 });
 };

 const handleDeleteProduct = (id) => {
 axios.delete(`/api/products/${id}`)
 .then(response => {
 setProducts(products.filter(product => product.id !== id));
 })
 .catch(error => {
 console.error(error);
 });
 };

 const handleDeleteSale = (id) => {
 axios.delete(`/api/sales/${id}`)
 .then(response => {
 setSales(sales.filter(sale => sale.id !== id));
 })
 .catch(error => {
 console.error(error);
 });
 };

 return (
 <div className="admin-panel">
 <h1>Admin Panel</h1>
 <div className="users">
 <h2>Users</h2>
 <table>
 <thead>
 <tr>
 <th>ID</th>
 <th>Username</th>
 <th>Role</th>
 <th>Actions</th>
 </tr>
 </thead>
 <tbody>
 {users.map(user => (
 <tr key={user.id}>
 <td>{user.id}</td>
 <td>{user.username}</td>
 <td>{user.role}</td>
 <td>
 <button onClick={() => handleDeleteUser(user.id)}>Delete</button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <div className="products">
 <h2>Products</h2>
 <table>
 <thead>
 <tr>
 <th>ID</th>
 <th>Name</th>
 <th>Quantity</th>
 <th>Actions</th>
 </tr>
 </thead>
 <tbody>
 {products.map(product => (
 <tr key={product.id}>
 <td>{product.id}</td>
 <td>{product.name}</td>
 <td>{product.quantity}</td>
 <td>
 <button onClick={() => handleDeleteProduct(product.id)}>Delete</button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <div className="sales">
 <h2>Sales</h2>
 <table>
 <thead>
 <tr>
 <th>ID</th>
 <th>Date</th>
 <th>Amount</th>
 <th>Actions</th>
 </tr>
 </thead>
 <tbody>
 {sales.map(sale => (
 <tr key={sale.id}>
 <td>{sale.id}</td>
 <td>{sale.date}</td>
 <td>{sale.amount}</td>
 <td>
 <button onClick={() => handleDeleteSale(sale.id)}>Delete</button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 );
}

export default AdminPanel;
