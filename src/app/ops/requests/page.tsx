'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
    Bell,
    CheckCircle,
    Clock,
    XCircle,
    Filter,
    MoreHorizontal,
    Wrench,
    Utensils,
    DollarSign,
    Package,
    RefreshCcw
} from 'lucide-react';

interface ServiceRequest {
    id: number;
    type: string;
    item_name: string;
    quantity: number;
    description: string;
    status: string;
    room_number: string;
    guest_name: string;
    created_at: string;
    booking_id?: number;
}

export default function ServiceRequestsPage() {
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await api.get('/ops/requests');
            if (res.data.success) {
                setRequests(res.data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: number, newStatus: string) => {
        try {
            await api.put(`/ops/requests/${id}/status`, { status: newStatus });
            // Optimistic update
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
        } catch (error) {
            alert("Failed to update status");
            fetchRequests();
        }
    };

    const handleBill = async (req: ServiceRequest) => {
        if (!req.booking_id) return alert("No associated booking to charge.");
        const amount = prompt(`Enter Charge Amount for ${req.item_name}:`);
        if (!amount || isNaN(parseFloat(amount))) return;

        try {
            await api.post(`/finance/folios/booking/${req.booking_id}/charge`, {
                category: req.type === 'fnb' ? 'fnb' : 'misc',
                amount: parseFloat(amount),
                description: `Service Request: ${req.item_name} (x${req.quantity})`
            });
            alert('Charge added to Folio!');
            if (req.status !== 'completed' && confirm("Mark request as Completed?")) {
                handleStatusUpdate(req.id, 'completed');
            }
        } catch (error) {
            alert('Failed to add charge');
            console.error(error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'completed': return 'bg-green-100 text-green-800 border-green-200';
            case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
            default: return 'bg-gray-50';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'maintenance': return <Wrench size={16} />;
            case 'fnb': return <Utensils size={16} />;
            case 'amenity': return <Package size={16} />;
            default: return <Bell size={16} />;
        }
    };

    const filteredRequests = requests.filter(r => filterStatus === 'all' || r.status === filterStatus);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Service Requests</h1>
                    <p className="text-sm text-gray-500">Manage guest requests and maintenance tickets</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchRequests} className="p-2 bg-white rounded-lg border shadow-sm hover:bg-gray-50 transition-colors" title="Refresh">
                        <RefreshCcw size={20} className="text-gray-500" />
                    </button>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="bg-white border rounded-lg px-4 py-2 text-sm shadow-sm"
                    >
                        <option value="all">All Requests</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20 text-gray-500">Loading requests...</div>
            ) : filteredRequests.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border shadow-sm">
                    <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <Bell className="text-gray-400" />
                    </div>
                    <h3 className="font-medium text-gray-900">No requests found</h3>
                    <p className="text-sm text-gray-500">There are no active service requests matching your filter.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredRequests.map(req => (
                        <div key={req.id} className="bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center hover:shadow-md transition-shadow">
                            {/* Icon Type */}
                            <div className={`p-3 rounded-full shrink-0 ${req.type === 'maintenance' ? 'bg-orange-100 text-orange-600' :
                                req.type === 'fnb' ? 'bg-red-100 text-red-600' :
                                    'bg-purple-100 text-purple-600'
                                }`}>
                                {getTypeIcon(req.type)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-gray-900 line-clamp-1">{req.item_name} {req.quantity > 1 && `(x${req.quantity})`}</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(req.status)}`}>
                                        {req.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-600 flex items-center gap-4">
                                    <span className="font-medium text-gray-900">Room {req.room_number || 'N/A'}</span>
                                    <span>&bull;</span>
                                    <span className="truncate">{req.guest_name || 'Staff Request'}</span>
                                    <span>&bull;</span>
                                    <span className="text-gray-400 text-xs flex items-center gap-1">
                                        <Clock size={12} /> {new Date(req.created_at).toLocaleString()}
                                    </span>
                                </div>
                                {req.description && (
                                    <div className="text-sm text-gray-500 mt-1 italic line-clamp-1">"{req.description}"</div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 shrink-0 md:ml-auto">
                                {req.status === 'pending' && (
                                    <button
                                        onClick={() => handleStatusUpdate(req.id, 'in_progress')}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Accept
                                    </button>
                                )}
                                {(req.status === 'pending' || req.status === 'in_progress') && (
                                    <button
                                        onClick={() => handleStatusUpdate(req.id, 'completed')}
                                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                                    >
                                        <CheckCircle size={14} /> Done
                                    </button>
                                )}
                                {req.booking_id && req.status !== 'cancelled' && req.status !== 'completed' && (
                                    <button
                                        onClick={() => handleBill(req)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                                        title="Add Charge to Folio"
                                    >
                                        <DollarSign size={14} /> Bill
                                    </button>
                                )}
                                <div className="relative group">
                                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                                        <MoreHorizontal size={18} />
                                    </button>
                                    <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 w-32 hidden group-hover:block z-10">
                                        {req.status !== 'cancelled' && (
                                            <button
                                                onClick={() => handleStatusUpdate(req.id, 'cancelled')}
                                                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
