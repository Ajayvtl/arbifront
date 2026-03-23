"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { canManageHr, hasAnyPermission } from '@/lib/permissions';
import toast from 'react-hot-toast';
import { ClockIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline';
// import { Chart } from "react-google-charts"; // Removed to avoid build error, using placeholder

export default function AttendancePage() {
    const { user } = useAuth();
    const canViewTeamAttendance = hasAnyPermission(user, ['attendance.manage', 'hr.manage', 'hr.manage_staff']);
    const isManager = canViewTeamAttendance;
    const [activeTab, setActiveTab] = useState('my_attendance');
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<any>(null); // Clocked In/Out status of today

    // Fetch My Data
    const fetchMyData = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/hr/attendance/my-history');
            setAttendance(data.data);

            // Check today's status
            const today = new Date().toISOString().split('T')[0];
            const todayRecord = data.data.find((r: any) => r.date.startsWith(today));
            setStatus(todayRecord);
        } catch (error) {
            toast.error('Failed to load attendance');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'my_attendance') fetchMyData();
    }, [activeTab]);

    const handleClockIn = async () => {
        try {
            await api.post('/hr/attendance/clock-in');
            toast.success('Clocked In!');
            fetchMyData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to clock in');
        }
    };

    const handleClockOut = async () => {
        try {
            await api.post('/hr/attendance/clock-out');
            toast.success('Clocked Out!');
            fetchMyData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to clock out');
        }
    };

    return (
        <div className="p-8 space-y-6">
            <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                <ClockIcon className="w-8 h-8 text-emerald-500" /> Attendance
            </h1>

            {/* Widget: Clock In/Out */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 max-w-md">
                <h2 className="text-lg font-semibold mb-4 dark:text-white">Today's Status</h2>
                <div className="flex flex-col items-center gap-4">
                    <div className="text-4xl font-mono text-gray-700 dark:text-gray-200">
                        {new Date().toLocaleTimeString()}
                    </div>

                    {status && status.clock_in && !status.clock_out ? (
                        <button onClick={handleClockOut} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-red-500/20">
                            Clocked Out
                        </button>
                    ) : (
                        <button
                            onClick={handleClockIn}
                            disabled={!!(status?.clock_in && status?.clock_out)}
                            className={`w-full font-bold py-3 px-6 rounded-lg transition-all shadow-lg 
                            ${status?.clock_out
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'}`}
                        >
                            {status?.clock_out ? 'Day Completed' : 'Clock In'}
                        </button>
                    )}

                    {status && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            Clocked In at: {new Date(status.clock_in).toLocaleTimeString()}
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('my_attendance')}
                        className={`pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'my_attendance' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        My History
                    </button>
                    {isManager && (
                        <button
                            onClick={() => setActiveTab('team_attendance')}
                            className={`pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'team_attendance' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Team Attendance (Gantt)
                        </button>
                    )}
                </nav>
            </div>

            {/* Content */}
            {activeTab === 'my_attendance' && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                        <thead className="bg-gray-50 dark:bg-slate-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">In</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Out</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                            {attendance.map((record: any) => (
                                <tr key={record.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                        {new Date(record.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {record.clock_in ? new Date(record.clock_in).toLocaleTimeString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {record.clock_out ? new Date(record.clock_out).toLocaleTimeString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                            {record.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'team_attendance' && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow overflow-hidden">
                    <h2 className="text-lg font-bold mb-4 dark:text-white">Daily Attendance Log</h2>
                    <TeamAttendanceView />
                </div>
            )}
        </div>
    );
}

// ... (Top of file stays same)
import { PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline'; // Add icons

function TeamAttendanceView() {
    const [logs, setLogs] = useState([]);
    const [editingLog, setEditingLog] = useState<any>(null); // For Modal
    const [editForm, setEditForm] = useState({
        clockIn: '',
        clockOut: '',
        status: 'present'
    });

    const toInputDateTime = (value: string | null | undefined) => {
        if (!value) return '';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '';
        return d.toISOString().slice(0, 16);
    };

    const toApiDateTime = (value: string | null | undefined) => {
        if (!value) return null;
        const normalized = value.includes('T') ? value.replace('T', ' ') : value;
        return normalized.length === 16 ? `${normalized}:00` : normalized;
    };

    const fetchAll = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data } = await api.get(`/hr/attendance/all?date=${today}`); // Improvements: Add Date Picker here
            setLogs(data.data);
        } catch (e) {
            toast.error('Failed to load team data');
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const openEditModal = (log: any) => {
        setEditingLog(log);
        setEditForm({
            clockIn: toInputDateTime(log.clock_in),
            clockOut: toInputDateTime(log.clock_out),
            status: log.status || 'present'
        });
    };

    const handleForceLogout = async (log: any) => {
        const attendanceId = log?.attendance_id || log?.id;
        if (!attendanceId) return;
        if (!confirm(`Force logout for ${log.user_name || `User #${log.user_id}`}?`)) return;
        try {
            await api.put(`/hr/attendance/${attendanceId}`, {
                clockIn: log.clock_in,
                clockOut: toApiDateTime(new Date().toISOString().slice(0, 16)),
                status: log.status || 'present'
            });
            toast.success('User logged out successfully');
            fetchAll();
        } catch (error) {
            toast.error('Failed to logout user');
        }
    };

    const handleSave = async (e: any) => {
        e.preventDefault();
        try {
            const payload = {
                clockIn: toApiDateTime(editForm.clockIn),
                clockOut: toApiDateTime(editForm.clockOut),
                status: editForm.status
            };

            await api.put(`/hr/attendance/${editingLog.attendance_id || editingLog.id}`, payload);
            toast.success('Attendance updated');
            setEditingLog(null);
            fetchAll();
        } catch (error) {
            toast.error('Update failed');
        }
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                {/* ... (Header same) ... */}
                <thead className="bg-gray-50 dark:bg-slate-900">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock In</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock Out</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                    {logs.length === 0 ? (
                        <tr><td colSpan={6} className="p-4 text-center text-gray-500">No records today.</td></tr>
                    ) : (
                        logs.map((log: any) => (
                            <tr key={log.attendance_id || log.id || `${log.user_id}-${log.date}`}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {log.user_name || log.name || 'Unknown Employee'}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        User #{log.user_id}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(log.date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.clock_in ? new Date(log.clock_in).toLocaleTimeString() : '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.clock_out ? new Date(log.clock_out).toLocaleTimeString() : '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${log.status === 'present' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {log.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {!!(log.attendance_id || log.id) && (
                                            <button
                                                onClick={() => openEditModal(log)}
                                                className="text-blue-500 hover:text-blue-700"
                                                title="Edit attendance"
                                            >
                                                <PencilSquareIcon className="w-5 h-5" />
                                            </button>
                                        )}
                                        {!!(log.attendance_id || log.id) && log.clock_in && !log.clock_out && (
                                            <button
                                                onClick={() => handleForceLogout(log)}
                                                className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200"
                                                title="Force logout user"
                                            >
                                                Logout
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* Edit Modal */}
            {editingLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold dark:text-white">Edit Attendance</h3>
                            <button onClick={() => setEditingLog(null)}><XMarkIcon className="w-6 h-6 text-gray-500" /></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Clock In</label>
                                <input
                                    type="datetime-local"
                                    value={editForm.clockIn}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, clockIn: e.target.value }))}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Clock Out</label>
                                <input
                                    type="datetime-local"
                                    value={editForm.clockOut}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, clockOut: e.target.value }))}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Status</label>
                                <select
                                    value={editForm.status}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="present">Present</option>
                                    <option value="late">Late</option>
                                    <option value="absent">Absent</option>
                                    <option value="half-day">Half Day</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                {editingLog.clock_in && !editingLog.clock_out && (
                                    <button
                                        type="button"
                                        onClick={() => setEditForm(prev => ({ ...prev, clockOut: new Date().toISOString().slice(0, 16) }))}
                                        className="px-4 py-2 bg-amber-100 text-amber-800 rounded hover:bg-amber-200"
                                    >
                                        Logout Now
                                    </button>
                                )}
                                <button type="button" onClick={() => setEditingLog(null)} className="px-4 py-2 text-gray-500">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
