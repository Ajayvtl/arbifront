"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PlusIcon, CheckIcon, XMarkIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { canManageHr } from '@/lib/permissions';

export default function LeavesPage() {
    const { user } = useAuth();
    const isManager = canManageHr(user);

    // Pagination & Filters
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [total, setTotal] = useState(0);
    const [filters, setFilters] = useState({
        status: '',
        type: '',
        duration_type: '',
        start_date: '',
        end_date: ''
    });

    const [leaves, setLeaves] = useState([]);
    
    // Modals
    const [showModal, setShowModal] = useState(false);
    const [viewLeave, setViewLeave] = useState<any>(null); // For Eye button Read-Only View
    const [editId, setEditId] = useState<number | null>(null);

    const [formData, setFormData] = useState({
        type: 'formal',
        duration_type: 'full_day',
        start_date: '',
        end_date: '',
        start_time: '',
        end_time: '',
        reason: ''
    });

    const fetchLeaves = async () => {
        try {
            const endpoint = isManager ? '/hr/leaves/all' : '/hr/leaves/my';
            const params = new URLSearchParams({
                page: String(page),
                limit: String(limit),
                ...(filters.status && { status: filters.status }),
                ...(filters.type && { type: filters.type }),
                ...(filters.duration_type && { durationType: filters.duration_type }),
                ...(filters.start_date && { startDate: filters.start_date }),
                ...(filters.end_date && { endDate: filters.end_date })
            });

            const { data } = await api.get(`${endpoint}?${params}`);
            
            if (data.data?.leaves) {
                setLeaves(data.data.leaves);
                setTotal(data.data.total);
            } else {
                setLeaves(data.data || []);
                setTotal(data.data?.length || 0);
            }
        } catch (error) {
            toast.error('Failed to fetch leaves');
        }
    };

    useEffect(() => {
        fetchLeaves();
    }, [isManager, page, limit, filters]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = { ...formData };
            if (payload.duration_type === 'multi_day') {
                payload.duration_type = 'full_day'; // Maps securely to DB enum
                payload.start_time = '';
                payload.end_time = '';
            } else {
                payload.end_date = payload.start_date; // Forces single day
            }

            if (editId) {
                await api.put(`/hr/leaves/${editId}`, payload);
                toast.success('Leave Request Corrected');
            } else {
                await api.post('/hr/leaves/apply', payload);
                toast.success('Leave Requested');
            }
            setShowModal(false);
            setEditId(null);
            fetchLeaves();
            setFormData({ type: 'formal', duration_type: 'full_day', start_date: '', end_date: '', start_time: '', end_time: '', reason: '' });
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to submit request');
        }
    };

    const handleAction = async (id: number, status: string) => {
        try {
            await api.put(`/hr/leaves/${id}/status`, { status });
            toast.success(`Leave ${status}`);
            fetchLeaves();
        } catch (error) {
            toast.error('Action failed');
        }
    };

    const handleWorkflowAction = async (leave: any, action: 'approve' | 'reject') => {
        try {
            if (leave.workflow_request_id) {
                await api.post(`/org-workflow/requests/${leave.workflow_request_id}/action`, {
                    action,
                    comments: `Leave ${action}d from HR leaves page`
                });
                toast.success(`Leave ${action}d through workflow`);
            } else {
                await handleAction(leave.id, action === 'approve' ? 'approved' : 'rejected');
                return;
            }
            fetchLeaves();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Workflow action failed');
        }
    };

    const resetFilters = () => {
        setFilters({ status: '', type: '', duration_type: '', start_date: '', end_date: '' });
        setPage(1);
    };

    const inputClass = "w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 dark:bg-slate-700 dark:text-white";
    const filterInputClass = "w-full text-sm border border-gray-300 dark:border-slate-600 rounded-lg py-1.5 px-3 dark:bg-slate-700 dark:text-white";

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold dark:text-white">Leave Management</h1>
                <button
                    onClick={() => {
                        setEditId(null);
                        setFormData({ type: 'formal', duration_type: 'full_day', start_date: '', end_date: '', start_time: '', end_time: '', reason: '' });
                        setShowModal(true);
                    }}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center"
                >
                    <PlusIcon className="w-5 h-5 mr-2" /> Request Leave
                </button>
            </div>

            {/* Filter Board */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Start Date</label>
                        <input type="date" className={filterInputClass} value={filters.start_date} onChange={e => { setFilters({ ...filters, start_date: e.target.value }); setPage(1); }} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">End Date</label>
                        <input type="date" className={filterInputClass} value={filters.end_date} onChange={e => { setFilters({ ...filters, end_date: e.target.value }); setPage(1); }} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
                        <select className={filterInputClass} value={filters.type} onChange={e => { setFilters({ ...filters, type: e.target.value }); setPage(1); }}>
                            <option value="">All Types</option>
                            <option value="sick">Sick</option>
                            <option value="casual">Casual</option>
                            <option value="annual">Annual</option>
                            <option value="unpaid">Unpaid</option>
                            <option value="formal">Formal</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Duration Format</label>
                        <select className={filterInputClass} value={filters.duration_type} onChange={e => { setFilters({ ...filters, duration_type: e.target.value }); setPage(1); }}>
                            <option value="">All Durations</option>
                            <option value="full_day">Full Day</option>
                            <option value="half_day">Half Day</option>
                            <option value="hours">Hourly</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                        <select className={filterInputClass} value={filters.status} onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}>
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                    <div>
                        <button onClick={resetFilters} className="w-full text-sm font-medium border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 py-1.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
                            Clear Filters
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-gray-100 dark:border-slate-700 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-900">
                        <tr>
                            {isManager && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Employee</th>}
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Dates</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Days</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                        {leaves.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No leaves found matching filters.</td></tr>
                        ) : leaves.map((leave: any) => (
                            <tr key={leave.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                {isManager && (
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                        {leave.user_name}
                                    </td>
                                )}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                    <span className="capitalize">{leave.leave_type}</span>
                                    <span className="ml-2 text-xs text-gray-400">({leave.duration_type?.replace('_', ' ')})</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(leave.start_date).toLocaleDateString()} {leave.start_date !== leave.end_date && `- ${new Date(leave.end_date).toLocaleDateString()}`}
                                    {leave.start_time && <span className="block text-xs text-gray-400 mt-0.5">{leave.start_time} to {leave.end_time}</span>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-200">
                                    {leave.days_count}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full 
                                        ${leave.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                                            leave.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' : 
                                            'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                                        {leave.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end">
                                    <button onClick={() => setViewLeave(leave)} className="text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 mr-4 transition-colors p-1" title="View Details">
                                        <EyeIcon className="w-5 h-5" />
                                    </button>
                                    
                                    {leave.status === 'pending' && isManager && leave.user_id !== user?.id && (
                                        <>
                                            <button onClick={() => handleWorkflowAction(leave, 'approve')} className="text-green-600 hover:text-green-700 dark:text-green-500 mr-3 p-1 transition-colors" title="Approve Request"><CheckIcon className="w-5 h-5" /></button>
                                            <button onClick={() => handleWorkflowAction(leave, 'reject')} className="text-red-600 hover:text-red-700 dark:text-red-500 p-1 transition-colors" title="Reject Request"><XMarkIcon className="w-5 h-5" /></button>
                                        </>
                                    )}
                                    {leave.status === 'pending' && leave.user_id === user?.id && (
                                        <button onClick={() => {
                                            const sDate = leave.start_date ? new Date(leave.start_date).toISOString().split('T')[0] : '';
                                            const eDate = leave.end_date ? new Date(leave.end_date).toISOString().split('T')[0] : '';
                                            let uiDuration = leave.duration_type || 'full_day';
                                            if (sDate !== eDate) uiDuration = 'multi_day';

                                            setEditId(leave.id);
                                            setFormData({
                                                type: leave.leave_type || 'formal',
                                                duration_type: uiDuration,
                                                start_date: sDate,
                                                end_date: eDate,
                                                start_time: leave.start_time || '',
                                                end_time: leave.end_time || '',
                                                reason: leave.reason || ''
                                            });
                                            setShowModal(true);
                                        }} className="text-blue-500 hover:text-blue-700 font-semibold p-1 transition-colors" title="Correct Request">Edit</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="flex justify-between items-center p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-sm">
                    <div className="text-gray-600 dark:text-gray-400">
                        Showing {total === 0 ? 0 : (page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 font-medium bg-white dark:bg-slate-800 border dark:border-slate-700 rounded shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-700 dark:text-gray-300">Previous</button>
                        <button onClick={() => setPage(p => p + 1)} disabled={page * limit >= total} className="px-3 py-1.5 font-medium bg-white dark:bg-slate-800 border dark:border-slate-700 rounded shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-700 dark:text-gray-300">Next</button>
                    </div>
                </div>
            </div>

            {/* Read-Only Details Modal */}
            {viewLeave && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl max-w-md w-full shadow-2xl">
                        <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100 dark:border-slate-700">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Leave Application Details</h2>
                            <button onClick={() => setViewLeave(null)} className="text-gray-400 hover:text-red-500 transition-colors">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="space-y-3.5 text-sm">
                            <div className="flex justify-between border-b border-gray-50 dark:border-slate-750 pb-2">
                                <span className="font-semibold text-gray-500 dark:text-gray-400">Employee</span>
                                <span className="text-gray-800 dark:text-gray-200">{viewLeave.user_name}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-50 dark:border-slate-750 pb-2">
                                <span className="font-semibold text-gray-500 dark:text-gray-400">Leave Type</span>
                                <span className="capitalize text-gray-800 dark:text-gray-200">{viewLeave.leave_type}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-50 dark:border-slate-750 pb-2">
                                <span className="font-semibold text-gray-500 dark:text-gray-400">Duration Format</span>
                                <span className="capitalize text-gray-800 dark:text-gray-200">{viewLeave.duration_type?.replace('_', ' ')}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-50 dark:border-slate-750 pb-2">
                                <span className="font-semibold text-gray-500 dark:text-gray-400">Dates</span>
                                <span className="text-gray-800 dark:text-gray-200">{new Date(viewLeave.start_date).toLocaleDateString()} {viewLeave.start_date !== viewLeave.end_date && `to ${new Date(viewLeave.end_date).toLocaleDateString()}`}</span>
                            </div>
                            {viewLeave.start_time && viewLeave.end_time && (
                                <div className="flex justify-between border-b border-gray-50 dark:border-slate-750 pb-2">
                                    <span className="font-semibold text-gray-500 dark:text-gray-400">Time Segment</span>
                                    <span className="text-gray-800 dark:text-gray-200">{viewLeave.start_time} - {viewLeave.end_time}</span>
                                </div>
                            )}
                            <div className="flex justify-between border-b border-gray-50 dark:border-slate-750 pb-2">
                                <span className="font-semibold text-gray-500 dark:text-gray-400">Calculated Deductions</span>
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{viewLeave.days_count} Days</span>
                            </div>
                            <div className="flex justify-between pb-2">
                                <span className="font-semibold text-gray-500 dark:text-gray-400">Current Status</span>
                                <span className={`capitalize font-bold ${viewLeave.status === 'approved' ? 'text-green-600 dark:text-green-400' : viewLeave.status === 'rejected' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>{viewLeave.status}</span>
                            </div>
                            {viewLeave.reason && (
                                <div className="mt-4">
                                    <span className="font-semibold text-gray-500 dark:text-gray-400 block mb-1">Applicant Reason:</span>
                                    <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-700 min-h-[70px] text-gray-700 dark:text-gray-300 shadow-inner">
                                        {viewLeave.reason}
                                    </div>
                                </div>
                            )}
                            {viewLeave.rejection_reason && (
                                <div className="mt-2">
                                    <span className="font-semibold text-red-500 block mb-1">Rejection Remarks:</span>
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/50 min-h-[50px] text-red-700 dark:text-red-300">
                                        {viewLeave.rejection_reason}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Request/Edit Form Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl max-w-md w-full shadow-2xl">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-xl font-bold dark:text-white">{editId ? 'Edit Leave Request' : 'Request Leave'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300 mb-1">Type</label>
                                    <select className={inputClass} value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                        <option value="sick">Sick</option>
                                        <option value="casual">Casual</option>
                                        <option value="annual">Annual</option>
                                        <option value="unpaid">Unpaid</option>
                                        <option value="formal">Formal</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300 mb-1">Duration</label>
                                    <select className={inputClass} value={formData.duration_type} onChange={e => {
                                        const val = e.target.value;
                                        setFormData(prev => ({ 
                                            ...prev, 
                                            duration_type: val,
                                            end_date: val !== 'multi_day' ? prev.start_date : prev.end_date
                                        }));
                                    }}>
                                        <option value="multi_day">More than one day</option>
                                        <option value="full_day">Full Day</option>
                                        <option value="half_day">Half Day</option>
                                        <option value="hours">Custom Hours</option>
                                    </select>
                                </div>
                            </div>

                            {formData.duration_type === 'multi_day' ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium dark:text-gray-300 mb-1">Start Date</label>
                                        <input type="date" className={inputClass} required value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium dark:text-gray-300 mb-1">End Date</label>
                                        <input type="date" className={inputClass} required value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium dark:text-gray-300 mb-1">Select Date</label>
                                        <input type="date" className={inputClass} required value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value, end_date: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium dark:text-gray-300 mb-1">Start Time</label>
                                            <input type="time" className={inputClass} required value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium dark:text-gray-300 mb-1">End Time</label>
                                            <input type="time" className={inputClass} required value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300 mb-1">Reason</label>
                                <textarea className={inputClass} rows={3} value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })}></textarea>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
                                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 rounded-lg transition-colors font-medium">Cancel</button>
                                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 dark:shadow-none text-white px-5 py-2 rounded-lg transition-colors font-medium">Submit Request</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
