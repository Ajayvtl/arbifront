'use client';

import { useState, useEffect } from "react";
import api from "@/lib/api";
import KanbanBoard from "@/components/kanban/KanbanBoard";
import { Plus, Coffee, Wrench, Car, Ticket, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function ConciergePage() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // New Request Form
    const [formData, setFormData] = useState({
        request_type: 'housekeeping',
        item_name: '',
        room_id: '', // Optional - select from list if needed, or manual input
        description: '',
        priority: 'normal'
    });

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await api.get('/ops/requests');
            setRequests(res.data.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load requests");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id: number, newStatus: string) => {
        // Optimistic UI
        const oldRequests = [...requests];
        const updated = requests.map((r: any) => r.id === id ? { ...r, status: newStatus } : r);
        setRequests(updated as any);

        try {
            await api.put(`/ops/requests/${id}/status`, { status: newStatus });
            toast.success("Status Updated");
        } catch (error) {
            setRequests(oldRequests as any); // Revert
            toast.error("Update failed");
        }
    };

    const createRequest = async (e: any) => {
        e.preventDefault();
        try {
            // For V1, we assume room_id is passed as ID or null.
            await api.post('/ops/requests', formData);
            setShowModal(false);
            setFormData({ ...formData, item_name: '', description: '' });
            fetchRequests();
            toast.success("Request Created");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed");
        }
    };

    const REQUEST_TYPES = [
        { id: 'housekeeping', icon: <Coffee size={18} />, label: 'Housekeeping' },
        { id: 'food_bar', icon: <Coffee size={18} />, label: 'Food & Bar' },
        { id: 'maintenance', icon: <Wrench size={18} />, label: 'Maintenance' },
        { id: 'transport', icon: <Car size={18} />, label: 'Transport / Cab' },
        { id: 'experience', icon: <Ticket size={18} />, label: 'Events / Experiences' },
        { id: 'complaint', icon: <AlertCircle size={18} />, label: 'Complaint' },
    ];

    if (loading) return <div className="p-10 dark:text-white">Loading Operations Board...</div>;

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col p-6 space-y-6">
            <header className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Concierge & Operations</h1>
                    <p className="text-slate-500 dark:text-slate-400">Manage guest requests, transport, F&B, and maintenance tickets.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all font-medium"
                >
                    <Plus size={18} />
                    New Request
                </button>
            </header>

            {/* Kanban Container */}
            <div className="flex-1 overflow-x-auto min-w-full">
                <KanbanBoard initialData={requests} onStatusChange={handleStatusChange} />
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border dark:border-slate-700">
                        <div className="bg-emerald-600 p-4 text-white flex justify-between items-center">
                            <h3 className="font-bold">New Service Request</h3>
                            <button onClick={() => setShowModal(false)} className="hover:bg-emerald-700 p-1 rounded">✕</button>
                        </div>
                        <form onSubmit={createRequest} className="p-6 space-y-4">

                            {/* Type Selection */}
                            <div className="grid grid-cols-3 gap-2">
                                {REQUEST_TYPES.map(type => (
                                    <div
                                        key={type.id}
                                        onClick={() => setFormData({ ...formData, request_type: type.id })}
                                        className={`
                                            cursor-pointer border rounded-lg p-3 flex flex-col items-center gap-2 transition
                                            ${formData.request_type === type.id
                                                ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-bold'
                                                : 'hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700'
                                            }
                                        `}
                                    >
                                        {type.icon}
                                        <span className="text-xs text-center">{type.label}</span>
                                    </div>
                                ))}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-slate-300">Item / Service Name</label>
                                <input
                                    className="w-full border dark:border-slate-700 rounded p-2 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800 dark:text-white"
                                    placeholder={
                                        formData.request_type === 'transport' ? "Airport Pickup for 2 Pax" :
                                            formData.request_type === 'food_bar' ? "2x Club Sandwich, 1 Coke" :
                                                "Extra Towels"
                                    }
                                    required
                                    value={formData.item_name}
                                    onChange={e => setFormData({ ...formData, item_name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Room ID (Optional)</label>
                                    <input
                                        type="number"
                                        className="w-full border dark:border-slate-700 rounded p-2 dark:bg-slate-800 dark:text-white"
                                        placeholder="e.g. 10"
                                        value={formData.room_id}
                                        onChange={e => setFormData({ ...formData, room_id: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Priority</label>
                                    <select
                                        className="w-full border dark:border-slate-700 rounded p-2 dark:bg-slate-800 dark:text-white"
                                        value={formData.priority}
                                        onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                    >
                                        <option value="low">Low</option>
                                        <option value="normal">Normal</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-slate-300">Details</label>
                                <textarea
                                    className="w-full border dark:border-slate-700 rounded p-2 h-24 dark:bg-slate-800 dark:text-white"
                                    placeholder="Add specific instructions..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-500/20">
                                Create Ticket
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
