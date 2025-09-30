import React, { useState } from 'react';
import axios from 'axios';
import './App.css';
import Dashboard from './Dashboard';
import RegisterPage from './RegisterPage';

function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // The line below is the only change in this component
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, { email, password });
      localStorage.setItem('authToken', response.data.access_token);
      onLoginSuccess();
    } catch (err) { setError('Login failed. Please check your credentials.'); }
  };

  return (
    <div className="login-container">
      <h2>Login to Your Dashboard</h2>
      <form onSubmit={handleLogin}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="error-message">{error}</p>}
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('authToken'));
  const [showRegister, setShowRegister] = useState(false);

  if (isLoggedIn) return <Dashboard />;

  if (showRegister) {
    return (
      <div className="App">
        <RegisterPage />
        <button onClick={() => setShowRegister(false)}>Back to Login</button>
      </div>
    );
  }

  return (
    <div className="App">
      <LoginPage onLoginSuccess={() => setIsLoggedIn(true)} />
      <p>Don't have an account?</p>
      <button onClick={() => setShowRegister(true)}>Register Here</button>
    </div>
  );
}
export default App;