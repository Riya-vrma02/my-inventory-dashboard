import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../services/authContext';
import { login } from '../services/api';
import './Login.css';

export default function Login({ setAuth }) {
  const [email, setEmail] = useState('');
  const auth = useAuth();
  const [password, setPassword] = useState('');
  const navigate = useNavigate(); // ✅ correct import

  const handle = async () => {
    try {
      const { access_token, role } = await login({ email, password });
      localStorage.setItem('token', access_token);
      setAuth(true);
      navigate('/admin');

      switch (role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'sales':
          navigate('/sales-dash');
          break;

        default:
          navigate('/dashboard');
      }
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handle}>Login</button>

      <p style={{ marginTop: '10px' }}>
        Don't have an account?{' '}
        <Link to="/signup" style={{ textDecoration: 'underline', color: 'purple' }}>
          Signup here
        </Link>
      </p>
    </div>
  );
}