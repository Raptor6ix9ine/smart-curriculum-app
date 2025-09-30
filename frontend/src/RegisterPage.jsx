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
      // The line below is the only change in this component
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/register`, payload);
      setMessage(response.data.message);
    } catch (err) { setError(err.response?.data?.detail || 'Registration failed.'); }
  };

  return (
    <div className="register-container">
      <h2>Register a New Account</h2>
      <form onSubmit={handleSubmit}>
        <input name="fullName" type="text" placeholder="Full Name" onChange={handleChange} required />
        <input name="email" type="email" placeholder="Email Address" onChange={handleChange} required />
        <input name="password" type="password" placeholder="Password" onChange={handleChange} required />
        <select name="role" value={formData.role} onChange={handleChange}>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>
        {formData.role === 'student' && <input name="enrollmentId" type="text" placeholder="Enrollment ID" onChange={handleChange} required />}
        {formData.role === 'teacher' && (
          <>
            <input name="employeeId" type="text" placeholder="Employee ID" onChange={handleChange} required />
            <input name="department" type="text" placeholder="Department" onChange={handleChange} required />
          </>
        )}
        <button type="submit">Register</button>
      </form>
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}
export default RegisterPage;