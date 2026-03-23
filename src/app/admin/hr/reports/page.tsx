"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { ChartBarIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';

export default function ReportsPage() {
    const [stats, setStats] = useState<any>({
        summary: {},
        attendance: [],
        tasks: [],
        leaves: [],
        corrections: []
    });

    // Default to current month
    const today = new Date();
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [year, setYear] = useState(today.getFullYear());

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const { data } = await api.get(`/hr/reports?month=${month}&year=${year}`);
                setStats(data.data);
            } catch (error) {
                console.error('Failed to load reports');
            }
        };
        fetchReports();
    }, [month, year]);

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                    <ChartBarIcon className="w-8 h-8 text-emerald-500" /> HR Reports
                </h1>

                <div className="flex gap-2">
                    <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="bg-white dark:bg-slate-800 border-gray-300 rounded-lg p-2">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'short' })}</option>
                        ))}
                    </select>
                    <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="bg-white dark:bg-slate-800 border-gray-300 rounded-lg p-2">
                        <option value={2024}>2024</option>
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Attendance Stats */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold mb-6 dark:text-white flex items-center">
                        <ClipboardDocumentCheckIcon className="w-5 h-5 mr-2" /> Attendance Overview
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-slate-900 text-gray-500 uppercase">
                                <tr>
                                    <th className="px-4 py-2 text-left">Employee</th>
                                    <th className="px-4 py-2 text-center text-green-600">Present</th>
                                    <th className="px-4 py-2 text-center text-yellow-600">Late</th>
                                    <th className="px-4 py-2 text-center text-red-600">Absent</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {stats.attendance.map((row: any, i: number) => (
                                    <tr key={i}>
                                        <td className="px-4 py-3 font-medium dark:text-white">{row.name}</td>
                                        <td className="px-4 py-3 text-center">{row.days_present}</td>
                                        <td className="px-4 py-3 text-center">{row.days_late}</td>
                                        <td className="px-4 py-3 text-center">{row.days_absent}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Task Stats (Simple Distribution) */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold mb-6 dark:text-white">Task Distribution</h2>
                    <div className="space-y-4">
                        {stats.tasks.map((row: any) => {
                            const total = stats.tasks.reduce((acc: number, r: any) => acc + r.count, 0);
                            const percent = Math.round((row.count / total) * 100);

                            let color = 'bg-gray-500';
                            if (row.status === 'completed') color = 'bg-green-500';
                            if (row.status === 'in_progress') color = 'bg-blue-500';
                            if (row.status === 'overdue') color = 'bg-red-500';

                            return (
                                <div key={row.status}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="capitalize font-medium dark:text-white">{row.status.replace('_', ' ')}</span>
                                        <span className="text-gray-500">{row.count} ({percent}%)</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
                                        <div className={`${color} h-2.5 rounded-full`} style={{ width: `${percent}%` }}></div>
                                    </div>
                                </div>
                            );
                        })}
                        {stats.tasks.length === 0 && <p className="text-gray-500 text-center py-4">No tasks data available.</p>}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <p className="text-xs uppercase text-slate-500">Attendance Rows</p>
                    <p className="text-2xl font-bold dark:text-white">{stats.summary?.attendance_records || 0}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <p className="text-xs uppercase text-slate-500">Task Buckets</p>
                    <p className="text-2xl font-bold dark:text-white">{stats.summary?.task_buckets || 0}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <p className="text-xs uppercase text-slate-500">Leaves Total</p>
                    <p className="text-2xl font-bold dark:text-white">{stats.summary?.leave_total || 0}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <p className="text-xs uppercase text-slate-500">Corrections Open</p>
                    <p className="text-2xl font-bold text-amber-600">{stats.summary?.corrections_open || 0}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold mb-4 dark:text-white">Leave Distribution</h2>
                    <div className="space-y-3">
                        {(stats.leaves || []).map((row: any) => (
                            <div key={row.status} className="flex justify-between text-sm">
                                <span className="capitalize dark:text-white">{String(row.status || '').replace('_', ' ')}</span>
                                <span className="font-semibold dark:text-white">{row.count}</span>
                            </div>
                        ))}
                        {(!stats.leaves || stats.leaves.length === 0) && (
                            <p className="text-sm text-slate-500">No leave data available.</p>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold mb-4 dark:text-white">Correction Requests</h2>
                    <div className="max-h-72 overflow-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-slate-900 text-gray-500 uppercase">
                                <tr>
                                    <th className="px-3 py-2 text-left">Employee</th>
                                    <th className="px-3 py-2 text-left">Date</th>
                                    <th className="px-3 py-2 text-left">Reason</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {(stats.corrections || [])
                                    .filter((r: any) => Number(r.needs_correction) === 1)
                                    .map((r: any) => (
                                        <tr key={r.id}>
                                            <td className="px-3 py-2 dark:text-white">{r.user_name}</td>
                                            <td className="px-3 py-2 dark:text-white">{new Date(r.date).toLocaleDateString()}</td>
                                            <td className="px-3 py-2 text-amber-700">
                                                {!r.clock_out ? 'Missing clock-out' : (r.status || 'Needs correction')}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                    {(stats.corrections || []).filter((r: any) => Number(r.needs_correction) === 1).length === 0 && (
                        <p className="text-sm text-slate-500 mt-3">No open correction requests in selected period.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
