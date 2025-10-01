import React, { useState } from 'react';
import axios from 'axios';

function RegisterPage() {
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', role: 'student', enrollmentId: '', employeeId: '', department: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      email: formData.email, password: formData.password, full_name: formData.fullName, role: formData.role,
      enrollment_id: formData.role === 'student' ? formData.enrollmentId : null,
      employee_id: formData.role === 'teacher' ? formData.employeeId : null,
      department: formData.role === 'teacher' ? formData.department : null,
    };
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/register`, payload);
      setMessage(response.data.message);
    } catch (err) { setError(err.response?.data?.detail || 'Registration failed.'); }
  };
  
  if (message) {
    return (
      <div className="text-center p-4">
        <h3 className="text-2xl font-bold text-spark-green">Success!</h3>
        <p className="text-gray-300 mt-2">{message}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-4">
      <h2 className="text-3xl font-bold text-center text-white mb-6">Create an Account</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="fullName" type="text" placeholder="Full Name" onChange={handleChange} required className="w-full p-3 bg-dark-card border border-gray-700 rounded-lg text-white focus:outline-none focus:border-spark-green" />
        <input name="email" type="email" placeholder="Email Address" onChange={handleChange} required className="w-full p-3 bg-dark-card border border-gray-700 rounded-lg text-white focus:outline-none focus:border-spark-green" />
        <input name="password" type="password" placeholder="Password" onChange={handleChange} required className="w-full p-3 bg-dark-card border border-gray-700 rounded-lg text-white focus:outline-none focus:border-spark-green" />
        
        <select name="role" value={formData.role} onChange={handleChange} className="w-full p-3 bg-dark-card border border-gray-700 rounded-lg text-white focus:outline-none focus:border-spark-green appearance-none">
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>

        {formData.role === 'student' && <input name="enrollmentId" type="text" placeholder="Enrollment ID" onChange={handleChange} required className="w-full p-3 bg-dark-card border border-gray-700 rounded-lg text-white focus:outline-none focus:border-spark-green" />}
        {formData.role === 'teacher' && (
          <>
            <input name="employeeId" type="text" placeholder="Employee ID" onChange={handleChange} required className="w-full p-3 bg-dark-card border border-gray-700 rounded-lg text-white focus:outline-none focus:border-spark-green" />
            <input name="department" type="text" placeholder="Department" onChange={handleChange} required className="w-full p-3 bg-dark-card border border-gray-700 rounded-lg text-white focus:outline-none focus:border-spark-green" />
          </>
        )}

        <button type="submit" className="w-full p-3 bg-spark-green text-white font-bold rounded-lg hover:bg-green-500 transition-colors">Register</button>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </form>
    </div>
  );
}
export default RegisterPage;