import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Html5Qrcode } from 'html5-qrcode';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

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
            <AttendanceWarnings api={api} />
        </div>
    );
}

function StudentDashboard({ user, schedule, api }) {
    const [showScanner, setShowScanner] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    const fetchSuggestions = async () => {
        setLoadingSuggestions(true);
        try {
            const response = await api.get('/api/suggestions');
            setSuggestions(response.data);
        } catch (error) { console.error("Failed to fetch suggestions", error); }
        finally { setLoadingSuggestions(false); }
    };

    const updateTaskStatus = async (studentTaskId, newStatus) => {
        try {
            await api.post(`/api/student-tasks/${studentTaskId}`, { status: newStatus });
            setSuggestions(currentSuggestions => 
                currentSuggestions.filter(task => task.student_task_id !== studentTaskId)
            );
        } catch (error) { alert("Failed to update task status."); }
    };

    useEffect(() => {
        if (!showScanner) return;
        const html5QrCode = new Html5Qrcode('qr-reader');
        const qrCodeSuccessCallback = (decodedText) => {
            handleScanResult(decodedText);
            html5QrCode.stop().catch(err => {});
            setShowScanner(false);
        };
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        const startScanner = async () => {
            try {
                const cameras = await Html5Qrcode.getCameras();
                if (cameras && cameras.length) {
                    let cameraId = cameras[0].id;
                    const backCamera = cameras.find(c => c.label.toLowerCase().includes('back'));
                    if (backCamera) { cameraId = backCamera.id; }
                    else if (cameras.length > 1) { cameraId = cameras[cameras.length - 1].id; }
                    await html5QrCode.start(cameraId, config, qrCodeSuccessCallback);
                }
            } catch (err) { console.error("Error starting camera:", err); }
        };
        startScanner();
        return () => { html5QrCode.stop().catch(err => {}); };
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
            <section className="mt-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Suggested Activities</h2>
                    <button onClick={fetchSuggestions} disabled={loadingSuggestions} className="px-4 py-1 text-sm bg-gray-600 rounded-full hover:bg-gray-500 disabled:opacity-50">
                        {loadingSuggestions ? 'Loading...' : 'Get New Suggestions'}
                    </button>
                </div>
                <div className="bg-dark-card p-6 rounded-xl space-y-4">
                    {suggestions.length > 0 ? (
                        suggestions.map(task => (
                            <div key={task.student_task_id} className="bg-gray-800 p-4 rounded-lg">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-white">{task.title}</p>
                                        <p className="text-sm text-gray-400">{task.description}</p>
                                    </div>
                                    <span className="text-xs text-spark-cyan bg-cyan-900/50 px-2 py-1 rounded-full">{task.category}</span>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button onClick={() => updateTaskStatus(task.student_task_id, 'done')} className="px-3 py-1 text-sm bg-green-500 rounded-md hover:bg-green-600">Done</button>
                                    <button onClick={() => updateTaskStatus(task.student_task_id, 'skipped')} className="px-3 py-1 text-sm bg-gray-600 rounded-md hover:bg-gray-500">Skip</button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 text-center">Click "Get New Suggestions" to fill your free time!</p>
                    )}
                </div>
             </section>
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
    
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            setError('No auth token found.'); setLoading(false);
            return;
        }

        const api = axios.create({
            baseURL: API_URL,
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const fetchData = async () => {
            try {
                const [userResponse, scheduleResponse] = await Promise.all([
                    api.get('/api/users/me'),
                    api.get('/api/schedules/my-day')
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
    
    if (!user) return <div className="bg-dark-bg min-h-screen flex items-center justify-center text-white">Initializing...</div>;

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
                {user.role === 'teacher' && <TeacherDashboard user={user} schedule={schedule} api={axios.create({ baseURL: API_URL, headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }})} />}
                {user.role === 'student' && <StudentDashboard user={user} schedule={schedule} api={axios.create({ baseURL: API_URL, headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }})} />}
            </div>
        </div>
    );
}
export default Dashboard;