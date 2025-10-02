import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; // <-- CHANGE HERE
import './index.css';
import Dashboard from './Dashboard';

// --- Component for Step 1: Role Selection ---
function RoleSelectionPage({ onSelectRole }) {
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

// --- Component for Step 2: ID Entry and Google Login ---
function LoginPage({ role, onBack }) {
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);
  
  if (session) {
    return <Dashboard />;
  }

  if (!userRole) {
    return (
      <div className="bg-dark-bg min-h-screen flex items-center justify-center">
        <RoleSelectionPage onSelectRole={setUserRole} />
      </div>
    );
  }

  return (
    <div className="bg-dark-bg min-h-screen flex items-center justify-center">
      <LoginPage role={userRole} onBack={() => setUserRole(null)} />
    </div>
  );
}
export default App;