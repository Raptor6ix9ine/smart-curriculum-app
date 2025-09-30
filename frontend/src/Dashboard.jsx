import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Dashboard() {
    const [user, setUser] = useState(null);
    const [schedule, setSchedule] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('authToken');
            if (!token) { setError('No authentication token found. Please login.'); return; }
            
            const api = axios.create({ 
                baseURL: import.meta.env.VITE_API_URL, 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            
            try {
                const [userResponse, scheduleResponse] = await Promise.all([api.get('/api/users/me'), api.get('/api/schedules/my-day')]);
                setUser(userResponse.data);
                setSchedule(scheduleResponse.data);
            } catch (err) { setError('Failed to fetch data. Your session may have expired.'); }
        };
        fetchData();
    }, []);

    // This is the corrected line
    if (error) return <div className="error-message">{error}</div>;
    if (!user) return <div>Loading your dashboard...</div>;

    return (
        <div className="dashboard-container">
            <h1>Welcome, {user.full_name}!</h1>
            <p>Your Role: <strong>{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</strong></p>
            <h2>Your Schedule for Today</h2>
            {schedule.length > 0 ? (
                <table>
                    <thead><tr><th>Course</th><th>Time</th><th>Professor</th></tr></thead>
                    <tbody>
                        {schedule.map((item, index) => (
                            <tr key={index}>
                                <td>{item.course_name}</td>
                                <td>{item.start_time} - {item.end_time}</td>
                                <td>{item.teacher_name}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (<p>You have no classes scheduled for today.</p>)}
        </div>
    );
}
export default Dashboard;