"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { BanknotesIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { canManageHr } from '@/lib/permissions';

export default function PayrollPage() {
    const { user } = useAuth();
    const [payroll, setPayroll] = useState([]);
    const [loading, setLoading] = useState(false);

    // Default to current month
    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // 1-12
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());

    const isManager = canManageHr(user);

    const fetchPayroll = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/hr/payroll/list', {
                params: { month: selectedMonth, year: selectedYear }
            });
            setPayroll(data.data);
        } catch (error) {
            toast.error('Failed to load payroll');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayroll();
    }, [selectedMonth, selectedYear]);

    const handleGenerate = async () => {
        if (!confirm(`Generate payroll for ${selectedMonth}/${selectedYear}?`)) return;
        try {
            await api.post('/hr/payroll/generate', { month: selectedMonth, year: selectedYear });
            toast.success('Payroll Generated');
            fetchPayroll();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Generation failed');
        }
    };

    const handleStatusUpdate = async (id: number, status: string) => {
        try {
            await api.put(`/hr/payroll/${id}/status`, { status });
            toast.success('Status Updated');
            fetchPayroll();
        } catch (error) {
            toast.error('Update failed');
        }
    };

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                    <BanknotesIcon className="w-8 h-8 text-emerald-500" /> Payroll
                </h1>

                {isManager && (
                    <div className="flex items-center gap-4">
                        <select
                            className="bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                            ))}
                        </select>
                        <select
                            className="bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                        >
                            <option value={2024}>2024</option>
                            <option value={2025}>2025</option>
                            <option value={2026}>2026</option>
                        </select>

                        <button
                            onClick={handleGenerate}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                            <ArrowPathIcon className="w-5 h-5" /> Generate
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Base Salary</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Pay</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            {isManager && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                        {payroll.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No records found.</td></tr>
                        ) : (
                            payroll.map((record: any) => (
                                <tr key={record.id}>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                                        {record.user_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                        ${record.base_salary}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-emerald-600 font-bold">
                                        ${record.net_salary}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${record.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {record.status}
                                        </span>
                                    </td>
                                    {isManager && (
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {record.status !== 'paid' && (
                                                <button
                                                    onClick={() => handleStatusUpdate(record.id, 'paid')}
                                                    className="text-emerald-600 hover:text-emerald-900 bg-emerald-50 px-3 py-1 rounded"
                                                >
                                                    Mark Paid
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
