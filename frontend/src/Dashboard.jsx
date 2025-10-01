import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from './App'; // Import the supabase client from App.jsx

// --- Teacher's View ---
function TeacherDashboard({ user, schedule, api }) {
    const [qrCodeUrl, setQrCodeUrl] = useState(null);

    const generateQr = async (scheduleId) => {
        if (!scheduleId) {
            alert("Error: Schedule ID is missing.");
            return;
        }
        try {
            const response = await api.post('/api/attendance/generate-qr', 
                { schedule_id: scheduleId },
                { responseType: 'blob' }
            );
            const imageUrl = URL.createObjectURL(response.data);
            setQrCodeUrl(imageUrl);
        } catch (error) {
            alert("Error generating QR Code.");
        }
    };

    return (
        <div>
            <h2 className="text-xl font-bold text-white mb-4">Your Schedule for Today</h2>
            <div className="bg-dark-card p-6 rounded-xl">
                {schedule.length > 0 ? schedule.map((item) => (
                    <div key={item.schedule_id} className="flex justify-between items-center p-3 border-b border-gray-700">
                        <div>
                            <p className="font-bold text-white">{item.course_name}</p>
                            <p className="text-gray-400 text-sm">{item.start_time} - {item.end_time}</p>
                        </div>
                        <button onClick={() => generateQr(item.schedule_id)} className="px-4 py-2 bg-spark-green text-white font-bold rounded-lg hover:bg-green-500 transition-colors">
                            Generate QR
                        </button>
                    </div>
                )) : <p className="text-gray-400">No classes scheduled for today.</p>}
            </div>
            {qrCodeUrl && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center">
                    <div className="bg-dark-card p-8 rounded-lg text-center">
                        <h3 className="text-2xl font-bold text-white mb-4">Scan for Attendance</h3>
                        <img src={qrCodeUrl} alt="Attendance QR Code" className="bg-white p-2 rounded-lg"/>
                        <button onClick={() => setQrCodeUrl(null)} className="mt-6 px-6 py-2 bg-gray-600 text-white rounded-lg">Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Student's View ---
function StudentDashboard({ user, schedule, api }) {
    const [showScanner, setShowScanner] = useState(false);

    useEffect(() => {
        if (!showScanner) {
            return; // Do nothing if the scanner isn't shown
        }

        const scanner = new Html5QrcodeScanner(
            'qr-reader', // The ID of the div element below
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false // verbose
        );

        const onScanSuccess = (decodedText, decodedResult) => {
            // Stop the scanner and close the modal
            scanner.clear();
            setShowScanner(false);
            
            // Handle the result
            handleScanResult(decodedText);
        };

        const onScanFailure = (error) => {
            // (You can ignore scan failures)
        };

        scanner.render(onScanSuccess, onScanFailure);

        // Cleanup function to stop the scanner when the component unmounts or scanner is hidden
        return () => {
            if (scanner) {
                scanner.clear().catch(err => console.error("Failed to clear scanner", err));
            }
        };
    }, [showScanner]); // This effect runs when `showScanner` changes

    const handleScanResult = async (token) => {
        try {
            const response = await api.post('/api/attendance/mark', { token });
            alert(response.data.message);
        } catch (err) {
            alert(err.response?.data?.detail || "Failed to mark attendance.");
        }
    };

    return (
        <div>
             <h2 className="text-xl font-bold text-white mb-4">Your Schedule for Today</h2>
             <div className="bg-dark-card p-6 rounded-xl">
                {schedule.length > 0 ? schedule.map((item) => (
                    <div key={item.schedule_id} className="p-3 border-b border-gray-700">
                        <p className="font-bold text-white">{item.course_name}</p>
                        <p className="text-gray-400 text-sm">{item.start_time} - {item.end_time}</p>
                        <p className="text-gray-500 text-xs">Taught by {item.teacher_name}</p>
                    </div>
                )) : <p className="text-gray-400">No classes scheduled for today.</p>}
            </div>
            <div className="mt-8 text-center">
                <button onClick={() => setShowScanner(true)} className="px-6 py-3 bg-spark-green text-white font-bold rounded-lg hover:bg-green-500 transition-colors">
                    Scan Attendance QR
                </button>
            </div>
            {showScanner && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center">
                    <div className="bg-dark-card p-8 rounded-lg w-full max-w-md">
                        <h3 className="text-2xl font-bold text-white mb-4 text-center">Point Camera at QR Code</h3>
                        {/* This div is where the scanner will be rendered */}
                        <div id="qr-reader"></div>
                        <button onClick={() => setShowScanner(false)} className="mt-6 w-full px-6 py-2 bg-gray-600 text-white rounded-lg">Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}


// --- Main Dashboard Component ---
function Dashboard() {
    const [user, setUser] = useState(null);
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    useEffect(() => {
        const fetchData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError('No authentication session found. Please login.');
                setLoading(false);
                return;
            }

            const token = session.access_token;
            const api = axios.create({
                baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            try {
                const [userResponse, scheduleResponse] = await Promise.all([
                    api.get('/api/users/me'),
                    api.get('/api/schedules/my-day')
                ]);
                setUser(userResponse.data);
                setSchedule(scheduleResponse.data);
            } catch (err) {
                setError('Failed to fetch data.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        // The onAuthStateChange listener in App.jsx will handle hiding the dashboard
    };

    if (loading) return <div className="bg-dark-bg min-h-screen flex items-center justify-center text-white">Loading Dashboard...</div>;
    if (error) return <div className="bg-dark-bg min-h-screen flex items-center justify-center text-red-500">{error}</div>;

    return (
        <div className="bg-dark-bg min-h-screen text-gray-200 font-sans p-4">
            <div className="max-w-4xl mx-auto">
                <header className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-spark-cyan text-lg">{user.full_name}</h1>
                        <p className="text-gray-400 capitalize">{user.role} Dashboard</p>
                    </div>
                    <button onClick={handleLogout} className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors">
                        Logout
                    </button>
                </header>

                {user.role === 'teacher' && <TeacherDashboard user={user} schedule={schedule} api={axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000', headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` } })} />}
                {user.role === 'student' && <StudentDashboard user={user} schedule={schedule} api={axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000', headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` } })} />}
            </div>
        </div>
    );
}

export default Dashboard;