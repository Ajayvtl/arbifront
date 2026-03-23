"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PlusIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { canManageHr } from '@/lib/permissions';

export default function TasksPage() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [staff, setStaff] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState('all'); // all, my, pending, completed
    const [historyTask, setHistoryTask] = useState<any>(null); // For History Modal
    const [historyData, setHistoryData] = useState([]);
    const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assigned_to: '',
        priority: 'medium',
        due_date: ''
    });

    const isManager = canManageHr(user);

    const fetchTasks = async () => {
        try {
            const params: any = {};
            if (filter === 'my' || !isManager) params.assigned_to = user?.id;
            const { data } = await api.get('/hr/tasks/list', { params });
            setTasks(data.data);
        } catch (error) {
            toast.error('Failed to load tasks');
        }
    };

    const fetchStaff = async () => {
        if (!isManager) return;
        try {
            const { data } = await api.get('/hr/employees');
            setStaff(data.data);
        } catch (error) {
            // silent fail or toast
        }
    };

    useEffect(() => {
        fetchTasks();
        if (isManager) fetchStaff();
    }, [filter, isManager]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/hr/tasks/create', formData);
            toast.success('Task Assigned');
            setShowModal(false);
            fetchTasks();
            setFormData({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '' });
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create task');
        }
    };

    const updateStatus = async (id: number, status: string, remarks: string = 'Status updated via Drag & Drop') => {
        try {
            // Optimistic update
            const oldTasks = [...tasks];
            const updatedTasks: any = tasks.map((t: any) => t.id === id ? { ...t, status } : t);
            setTasks(updatedTasks);

            await api.put(`/hr/tasks/${id}/status`, { status, remarks });
            toast.success('Status Updated');
            fetchTasks(); // Refresh for accurate data
        } catch (error) {
            toast.error('Update failed');
            fetchTasks(); // Revert
        }
    };

    const fetchHistory = async (task: any) => {
        setHistoryTask(task);
        try {
            const { data } = await api.get(`/hr/tasks/${task.id}/history`);
            setHistoryData(data.data);
        } catch (error) {
            toast.error('Failed to load history');
        }
    };

    const handleRevert = async (hist: any) => {
        if (!confirm('Revert to this status?')) return;
        await updateStatus(historyTask.id, hist.old_status, `Reverted to status from ${new Date(hist.created_at).toLocaleString()}`);
        fetchHistory(historyTask); // Refresh history
    };

    const onDragStart = (e: React.DragEvent, id: number) => {
        setDraggedTaskId(id);
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const onDrop = (e: React.DragEvent, status: string) => {
        e.preventDefault();
        if (draggedTaskId) {
            updateStatus(draggedTaskId, status);
            setDraggedTaskId(null);
        }
    };

    const inputClass = "w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 dark:bg-slate-700 dark:text-white";

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold dark:text-white">Work Allotment</h1>
                {isManager && (
                    <button onClick={() => setShowModal(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-emerald-700">
                        <PlusIcon className="w-5 h-5 mr-2" /> Assign Task
                    </button>
                )}
            </div>

            {/* Stats / Filters */}
            <div className="flex gap-4 border-b border-gray-200 dark:border-slate-700 pb-4">
                <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded-full text-sm font-medium ${filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>All Tasks</button>
                <button onClick={() => setFilter('my')} className={`px-3 py-1 rounded-full text-sm font-medium ${filter === 'my' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>My Tasks</button>
            </div>

            {/* Kanban-ish Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {['pending', 'in_progress', 'completed'].map(status => (
                    <div
                        key={status}
                        className={`bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl transition-colors ${draggedTaskId ? 'border-2 border-dashed border-gray-200 dark:border-slate-700' : ''}`}
                        onDragOver={onDragOver}
                        onDrop={(e) => onDrop(e, status)}
                    >
                        <h3 className="font-bold text-gray-500 uppercase text-xs mb-4 flex justify-between">
                            {status.replace('_', ' ')}
                            <span className="bg-gray-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-xs">
                                {tasks.filter((t: any) => t.status === status).length}
                            </span>
                        </h3>

                        <div className="space-y-3">
                            {tasks.filter((t: any) => t.status === status).map((task: any) => (
                                <div
                                    key={task.id}
                                    className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700 cursor-move hover:shadow-md transition-shadow"
                                    draggable
                                    onDragStart={(e) => onDragStart(e, task.id)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider 
                                            ${task.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {task.priority}
                                        </span>
                                        {task.due_date && (
                                            <span className="text-xs text-gray-400 flex items-center">
                                                <ClockIcon className="w-3 h-3 mr-1" />
                                                {new Date(task.due_date).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{task.title}</h4>
                                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{task.description}</p>

                                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-slate-700">
                                        <div className="text-xs text-gray-400">
                                            To: <span className="text-gray-600 dark:text-gray-300 font-medium">{task.assigned_to_name}</span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-1">
                                            <button onClick={() => fetchHistory(task)} className="text-xs text-gray-400 hover:text-blue-500">History</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl max-w-md w-full">
                        <h2 className="text-xl font-bold mb-4 dark:text-white">Assign Task</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300">Title</label>
                                <input className={inputClass} required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300">Description</label>
                                <textarea className={inputClass} rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300">Assign To</label>
                                <select className={inputClass} required value={formData.assigned_to} onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}>
                                    <option value="">Select Staff</option>
                                    {staff.map((s: any) => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.role_name})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300">Priority</label>
                                    <select className={inputClass} value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300">Due Date</label>
                                    <input type="date" className={inputClass} value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-500">Cancel</button>
                                <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg">Assign</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* History Modal */}
            {historyTask && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold dark:text-white">Audit Log: {historyTask.title}</h2>
                            <button onClick={() => setHistoryTask(null)} className="text-gray-500">Close</button>
                        </div>
                        <div className="space-y-4">
                            {historyData.map((h: any) => (
                                <div key={h.id} className="border-l-2 border-blue-500 pl-4 py-1">
                                    <p className="text-sm dark:text-gray-300">
                                        <span className="font-bold">{h.changed_by_name}</span> changed
                                        <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-xs mx-1">{h.old_status}</span>
                                        to
                                        <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-xs mx-1">{h.new_status}</span>
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">{new Date(h.created_at).toLocaleString()}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 italic mt-1">"{h.remarks}"</p>
                                    <button onClick={() => handleRevert(h)} className="mt-2 text-xs text-red-500 hover:underline">Revert to this status</button>
                                </div>
                            ))}
                            {historyData.length === 0 && <p className="text-gray-500">No history available.</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
