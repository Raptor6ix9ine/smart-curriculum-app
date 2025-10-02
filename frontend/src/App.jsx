import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './index.css';
import Dashboard from './Dashboard';

// --- Initialize Supabase Client ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Login Page Components (No Changes Here) ---
function RoleSelectionPage({ onSelectRole }) {
  // ... (This component code is the same as before)
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold text-white mb-8">Welcome to Smart Curriculum</h1>
      <p className="text-lg text-gray-400 mb-8">Please select your role to continue.</p>
      <div className="space-y-4">
        <button onClick={() => onSelectRole('student')} className="w-full max-w-xs p-4 bg-dark-card border border-gray-700 rounded-lg text-white font-bold hover:border-spark-green transition-colors">
          I am a Student
        </button>
        <button onClick={() => onSelectRole('teacher')} className="w-full max-w-xs p-4 bg-dark-card border border-gray-700 rounded-lg text-white font-bold hover:border-spark-green transition-colors">
          I am a Teacher
        </button>
      </div>
    </div>
  );
}

function LoginPage({ role, onBack }) {
  // ... (This component code is the same as before)
  const [userId, setUserId] = useState('');

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) console.error('Error logging in with Google:', error);
  };

  return (
    <div className="w-full max-w-md text-center">
      <h2 className="text-3xl font-bold text-white mb-6">
        {role === 'student' ? 'Student Login' : 'Teacher Login'}
      </h2>
      <div className="space-y-4">
        <input 
          type="text" 
          placeholder={role === 'student' ? "Enter Your Roll Number" : "Enter Your Employee ID"} 
          value={userId} 
          onChange={(e) => setUserId(e.target.value)} 
          className="w-full p-3 bg-dark-card border border-gray-700 rounded-lg text-white focus:outline-none focus:border-spark-green"
          required 
        />
        <button onClick={handleGoogleLogin} className="w-full p-4 bg-dark-card border border-gray-700 rounded-lg text-white font-bold hover:border-spark-green transition-colors flex items-center justify-center gap-4">
          <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google logo" className="w-6 h-6"/>
          Sign in with Google
        </button>
      </div>
      <button onClick={onBack} className="mt-6 text-gray-400 hover:text-white transition-colors">
        Go Back
      </button>
    </div>
  );
}

// --- The Main App Component ---
function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true); // <-- NEW LOADING STATE

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false); // <-- Set loading to false after the first check
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);
  
  // -- NEW RENDERING LOGIC ---
  // 1. If we are still loading the session, show a loading message
  if (loading) {
    return <div className="bg-dark-bg min-h-screen flex items-center justify-center text-white">Loading...</div>;
  }

  // 2. If there IS a session, show the Dashboard
  if (session) {
    return <Dashboard />;
  }
  
  // 3. If there is NO session and NO role selected, show Role Selection
  if (!userRole) {
    return (
      <div className="bg-dark-bg min-h-screen flex items-center justify-center">
        <RoleSelectionPage onSelectRole={setUserRole} />
      </div>
    );
  }

  // 4. If there is NO session but a role IS selected, show the Login Page
  return (
    <div className="bg-dark-bg min-h-screen flex items-center justify-center">
      <LoginPage role={userRole} onBack={() => setUserRole(null)} />
    </div>
  );
}

export default App;