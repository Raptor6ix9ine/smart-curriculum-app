import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Html5QrcodeScanner } from 'html5-qrcode';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// --- NEW: Component to show low attendance warnings ---
function AttendanceWarnings({ api }) {
    const [warnings, setWarnings] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchWarnings = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await api.get('/api/warnings/low-attendance');
            setWarnings(response.data);
        } catch (err) {
            setError('Failed to fetch attendance warnings.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-8">
            <h2 className="text-xl font-bold text-white mb-4">Attendance Warnings</h2>
            <div className="bg-dark-card p-6 rounded-xl">
                <button 
                    onClick={fetchWarnings} 
                    disabled={isLoading}
                    className="w-full p-3 bg-yellow-500 text-white font-bold rounded-lg hover:bg-yellow-600 transition-colors disabled:bg-gray-500"
                >
                    {isLoading ? 'Checking...' : 'Check for Students with Low Attendance (< 5)'}
                </button>
                {error && <p className="text-red-500 mt-4">{error}</p>}
                <div className="mt-4 space-y-2">
                    {warnings.length > 0 ? (
                        warnings.map(student => (
                            <div key={student.student_id} className="p-3 bg-gray-800 rounded-lg flex justify-between">
                                <div>
                                    <p className="font-bold text-white">{student.full_name}</p>
                                    <p className="text-sm text-gray-400">Roll No: {student.roll_number}</p>
                                </div>
                                <p className="font-bold text-red-500">Present: {student.attendance_count}</p>
                            </div>
                        ))
                    ) : (
                        !isLoading && warnings.length === 0 && <p className="text-gray-500 text-center pt-4">No students with low attendance found.</p>
                    )}
                </div>
            </div>
        </div>
    );
}


function TeacherDashboard({ user, schedule, api }) {
    const [qrCodeUrl, setQrCodeUrl] = useState(null);
    const generateQr = async (scheduleId) => {
        try {
            const response = await api.post('/api/attendance/generate-qr', { schedule_id: scheduleId }, { responseType: 'blob' });
            setQrCodeUrl(URL.createObjectURL(response.data));
        } catch (error) { alert("Error generating QR Code."); }
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
                        <button onClick={() => generateQr(item.schedule_id)} className="px-4 py-2 bg-spark-green text-white font-bold rounded-lg hover:bg-green-500">Generate QR</button>
                    </div>
                )) : <p className="text-gray-400">No classes scheduled.</p>}
            </div>
            {qrCodeUrl && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-dark-card p-8 rounded-lg text-center">
                        <h3 className="text-2xl font-bold text-white mb-4">Scan for Attendance</h3>
                        <img src={qrCodeUrl} alt="Attendance QR Code" className="bg-white p-2 rounded-lg"/>
                        <button onClick={() => setQrCodeUrl(null)} className="mt-6 px-6 py-2 bg-gray-600 text-white rounded-lg">Close</button>
                    </div>
                </div>
            )}
            {/* Add the new component to the teacher's view */}
            <AttendanceWarnings api={api} />
        </div>
    );
}

function StudentDashboard({ user, schedule, api }) {
    const [showScanner, setShowScanner] = useState(false);
    useEffect(() => {
        if (!showScanner) return;
        let scanner;
        try {
            scanner = new Html5QrcodeScanner('qr-reader',{ fps: 10, qrbox: { width: 250, height: 250 } },false);
            const onScanSuccess = (decodedText) => {
                scanner.clear().catch(()=>{});
                setShowScanner(false);
                handleScanResult(decodedText);
            };
            scanner.render(onScanSuccess, ()=>{});
        } catch (error) { console.error("QR Scanner initialization failed", error); }
        return () => { if(document.getElementById('qr-reader')) scanner.clear().catch(()=>{}); };
    }, [showScanner]);

    const handleScanResult = async (token) => {
        try {
            const response = await api.post('/api/attendance/mark', { token });
            alert(response.data.message);
        } catch (err) { alert(err.response?.data?.detail || "Failed."); }
    };

    return (
        <div>
             <h2 className="text-xl font-bold text-white mb-4">Your Schedule</h2>
             <div className="bg-dark-card p-6 rounded-xl">
                {schedule.length > 0 ? schedule.map((item) => (
                    <div key={item.schedule_id} className="p-3 border-b border-gray-700">
                        <p className="font-bold text-white">{item.course_name}</p>
                        <p className="text-gray-400 text-sm">{item.start_time} - {item.end_time}</p>
                        <p className="text-gray-500 text-xs">Taught by {item.teacher_name}</p>
                    </div>
                )) : <p className="text-gray-400">No classes scheduled.</p>}
            </div>
            <div className="mt-8 text-center">
                <button onClick={() => setShowScanner(true)} className="px-6 py-3 bg-spark-green text-white font-bold rounded-lg hover:bg-green-500">Scan QR</button>
            </div>
            {showScanner && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-dark-card p-8 rounded-lg w-full max-w-md">
                        <h3 className="text-2xl font-bold text-white mb-4 text-center">Point Camera at QR Code</h3>
                        <div id="qr-reader" className="w-full"></div>
                        <button onClick={() => setShowScanner(false)} className="mt-6 w-full px-6 py-2 bg-gray-600 rounded-lg">Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function Dashboard({ onLogout }) {
    const [user, setUser] = useState(null);
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [api, setApi] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            setError('No auth token found.'); setLoading(false);
            return;
        }

        const axiosInstance = axios.create({ baseURL: API_URL, headers: { 'Authorization': `Bearer ${token}` } });
        setApi(axiosInstance);

        const fetchData = async () => {
            try {
                const [userResponse, scheduleResponse] = await Promise.all([
                    axiosInstance.get('/api/users/me'),
                    axiosInstance.get('/api/schedules/my-day')
                ]);
                setUser(userResponse.data);
                setSchedule(scheduleResponse.data);
            } catch (err) {
                setError('Failed to fetch data.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="bg-dark-bg min-h-screen flex items-center justify-center text-white">Loading...</div>;
    if (error) return <div className="bg-dark-bg min-h-screen flex items-center justify-center text-red-500">{error}</div>;
    
    if (!user || !api) return <div className="bg-dark-bg min-h-screen flex items-center justify-center text-white">Initializing...</div>;

    return (
        <div className="bg-dark-bg min-h-screen text-gray-200 font-sans p-4">
            <div className="max-w-4xl mx-auto">
                <header className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-spark-cyan text-lg">{user.full_name}</h1>
                        <p className="text-gray-400 capitalize">{user.role} Dashboard</p>
                    </div>
                    <button onClick={onLogout} className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white">Logout</button>
                </header>
                {user.role === 'teacher' && <TeacherDashboard user={user} schedule={schedule} api={api} />}
                {user.role === 'student' && <StudentDashboard user={user} schedule={schedule} api={api} />}
            </div>
        </div>
    );
}
export default Dashboard;