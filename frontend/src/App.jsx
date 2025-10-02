import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from './supabaseClient';
import './index.css';
import Dashboard from './Dashboard';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const apiURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const response = await axios.post(`${apiURL}/auth/magic-link`, { 
        email: email,
        user_id: userId,
        role: role
      });
      setMessage(response.data.message);
    } catch (err) { 
      setError(err.response?.data?.detail || 'Failed to send link.'); 
    }
  };

  return (
    <div className="w-full max-w-md">
      <h2 className="text-3xl font-bold text-center text-white mb-2">
        {role === 'student' ? 'Student Login' : 'Teacher Login'}
      </h2>
      <p className="text-center text-gray-400 mb-8">Enter your details to receive a login link.</p>
      
      {message ? (
        <div className="text-center p-4 bg-dark-card rounded-lg">
          <p className="font-bold text-spark-green">{message}</p>
        </div>
      ) : (
        <form onSubmit={handleMagicLink} className="space-y-6">
           <select 
            value={role} 
            onChange={(e) => setRole(e.target.value)}
            className="w-full p-3 bg-dark-card border border-gray-700 rounded-lg text-white focus:outline-none focus:border-spark-green appearance-none"
          >
            <option value="student">I am a Student</option>
            <option value="teacher">I am a Teacher</option>
          </select>
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            className="w-full p-3 bg-dark-card border border-gray-700 rounded-lg text-white focus:outline-none focus:border-spark-green"
            required 
          />
          <input 
            type="text" 
            placeholder={role === 'student' ? "Roll Number" : "Employee ID"} 
            value={userId} 
            onChange={(e) => setUserId(e.target.value)} 
            className="w-full p-3 bg-dark-card border border-gray-700 rounded-lg text-white focus:outline-none focus:border-spark-green"
            required 
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button type="submit" className="w-full p-3 bg-spark-green text-white font-bold rounded-lg hover:bg-green-500 transition-colors">
            Send Login Link
          </button>
        </form>
      )}
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="bg-dark-bg min-h-screen flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="bg-dark-bg min-h-screen flex items-center justify-center">
      {session ? <Dashboard session={session} /> : <LoginPage />}
    </div>
  );
}
export default App;