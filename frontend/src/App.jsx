import React, { useState, useEffect, useDataState } from 'react';
import axios from 'axios';
import './index.css';
import Dashboard from './Dashboard';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// --- REGISTRATION COMPONENT ---
function RegisterPage({ onSwitchToLogin }) {
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', role: 'student', rollNumber: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // State for custom dropdown

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleRoleSelect = (roleValue) => {
    setFormData({ ...formData, role: roleValue });
    setIsDropdownOpen(false); // Close dropdown after selection
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      const payload = {
        email: formData.email, password: formData.password, full_name: formData.fullName, role: formData.role,
        roll_number: formData.role === 'student' ? formData.rollNumber : null,
        employee_id: formData.role === 'teacher' ? formData.rollNumber : null,
      };
      const response = await axios.post(`${API_URL}/auth/register`, payload);
      setMessage(response.data.message + " Please log in.");
    } catch (err) { setError(err.response?.data?.detail || 'Registration failed.'); }
  };
  
  if (message) {
    return (
      <div className="text-center p-4">
        <h3 className="text-2xl font-bold text-spark-green">Success!</h3>
        <p className="text-gray-300 mt-2">{message}</p>
        <button onClick={onSwitchToLogin} className="mt-4 px-6 py-2 bg-spark-green text-white font-bold rounded-full">Go to Login</button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-4">
      <h2 className="text-3xl font-bold text-center text-white mb-6">Create an Account</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="fullName" type="text" placeholder="Full Name" onChange={handleChange} required className="w-full p-3 bg-dark-card border border-gray-700 rounded-lg text-white focus:outline-none focus:border-spark-green" />
        <input name="email" type="email" placeholder="Email" onChange={handleChange} required className="w-full p-3 bg-dark-card border border-gray-700 rounded-lg text-white focus:outline-none focus:border-spark-green" />
        <input name="password" type="password" placeholder="Password" onChange={handleChange} required className="w-full p-3 bg-dark-card border border-gray-700 rounded-lg text-white focus:outline-none focus:border-spark-green" />
        
        {/* --- NEW CUSTOM DROPDOWN --- */}
        <div className="relative">
          <label className="text-spark-green text-sm absolute -top-3 left-3 bg-dark-bg px-1">Role</label>
          <div
            className="w-full p-3 bg-dark-card border border-spark-green rounded-lg text-white flex justify-between items-center cursor-pointer"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            {formData.role === 'student' ? "I am a Student" : "I am a Teacher"}
            <svg className={`w-4 h-4 transform transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
          {isDropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-dark-card border border-spark-green rounded-lg shadow-lg">
              <div
                className="p-3 text-white hover:bg-gray-700 cursor-pointer border-b border-gray-700"
                onClick={() => handleRoleSelect('student')}
              >
                I am a Student
              </div>
              <div
                className="p-3 text-white hover:bg-gray-700 cursor-pointer"
                onClick={() => handleRoleSelect('teacher')}
              >
                I am a Teacher
              </div>
            </div>
          )}
        </div>

        <input name="rollNumber" type="text" placeholder={formData.role === 'student' ? "Roll Number" : "Employee ID"} onChange={handleChange} required className="w-full p-3 bg-dark-card border border-gray-700 rounded-lg text-white focus:outline-none focus:border-spark-green" />
        
        <button type="submit" className="w-full p-3 bg-spark-green text-white font-bold rounded-lg hover:bg-green-500 transition-colors">Register</button>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </form>
    </div>
  );
}

// --- LOGIN COMPONENT ---
function LoginPage({ onLoginSuccess, onSwitchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { access_token } = response.data.session;
      if (access_token) {
        localStorage.setItem('authToken', access_token);
        onLoginSuccess();
      } else { throw new Error("No token found"); }
    } catch (err) { setError('Login failed. Please check your credentials.'); }
  };

  return (
    <div className="w-full max-w-md">
      <h2 className="text-4xl font-bold text-center text-white mb-8">Login</h2>
      <form onSubmit={handleLogin} className="space-y-6">
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 bg-dark-card border border-gray-700 rounded-lg text-white focus:outline-none focus:border-spark-green" required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-dark-card border border-gray-700 rounded-lg text-white focus:outline-none focus:border-spark-green" required />
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <button type="submit" className="w-full p-3 bg-spark-green text-white font-bold rounded-lg hover:bg-green-500 transition-colors">Login</button>
      </form>
      <div className="text-center mt-6">
        <p className="text-gray-400">Don't have an account?</p>
        {/* --- NEW BUTTON STYLE --- */}
        <button 
          onClick={onSwitchToRegister} 
          className="mt-2 px-6 py-2 border-2 border-spark-green text-spark-green font-bold rounded-full hover:bg-spark-green hover:text-white transition-colors flex items-center justify-center mx-auto"
        >
          Register Here
        </button>
      </div>
    </div>
  );
}

// --- MAIN APP COMPONENT ---
function App() {
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [showLogin, setShowLogin] = useState(true);

  const handleLoginSuccess = () => {
    setToken(localStorage.getItem('authToken'));
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
  };
  
  if (token) {
    return <Dashboard onLogout={handleLogout} />;
  }

  return (
    <div className="bg-dark-bg min-h-screen flex flex-col items-center justify-center">
      {showLogin ? (
        <LoginPage onLoginSuccess={handleLoginSuccess} onSwitchToRegister={() => setShowLogin(false)} />
      ) : (
        <RegisterPage onSwitchToLogin={() => setShowLogin(true)} />
      )}
    </div>
  );
}
export default App;