import React, { useState } from 'react';
import axios from 'axios';
import './Signup.css'; // Reuse Login styles
import { useNavigate, Link } from 'react-router-dom';

function Signup() {
  const [username, setUsername] = useState('');
  const [email, setemail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const res = await axios.post('http://localhost:5001/api/signup', {
        username,
        email,
        password,
        role
      });

      if (res.status === 201) {
        navigate('/login');
      } else {
        setError(res.data.msg || 'Signup failed');
      }
    } catch (err) {
      setError(err.response?.data?.msg || 'Server error');
    }
  };

  return (
    <div className="login-container">
      <h2>Signup</h2>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setemail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <input
        type="password"
        placeholder="Confirm Password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      <select className="rolebtn" value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="">Select Role</option>
        <option value="admin">Admin</option>
        <option value="sales">Salesperson</option>
        <option value="inventory">Vendor</option>
      </select>
      <button onClick={handleSignup}>Signup</button>
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
      <p className="login-link">
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  );
}

export default Signup;
