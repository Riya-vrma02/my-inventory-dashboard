import React, { useState } from 'react';
import Login from './Login';
import Signup from './Signup';
import './AuthPage.css';

export default function AuthPage({ setAuth }) {
  const [showLogin, setShowLogin] = useState(true);

  return (
    <div className="auth-page">
      <div className="auth-toggle">
        <button
          onClick={() => setShowLogin(true)}
          className={showLogin ? 'active' : ''}
        >
          Login
        </button>
        <button
          onClick={() => setShowLogin(false)}
          className={!showLogin ? 'active' : ''}
        >
          Signup
        </button>
      </div>

      <div className="auth-form">
        {showLogin ? <Login setAuth={setAuth} /> : <Signup />}
      </div>
    </div>
  );
}

