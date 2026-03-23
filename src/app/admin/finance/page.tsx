"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { CurrencyDollarIcon, UserGroupIcon, ArrowTrendingUpIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminFinancePage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/finance/stats');
                setStats(res.data.data);
            } catch (error) {
                console.error("Failed to load finance stats");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const mockChartData = [
        { name: 'Jan', revenue: 4000 },
        { name: 'Feb', revenue: 3000 },
        { name: 'Mar', revenue: 2000 },
        { name: 'Apr', revenue: 2780 },
        { name: 'May', revenue: 1890 },
        { name: 'Jun', revenue: 2390 },
        { name: 'Jul', revenue: 3490 },
    ];

    if (loading) return <div className="p-8">Loading Finance Dashboard...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <CurrencyDollarIcon className="w-8 h-8 text-emerald-500" />
                Platform Finance
            </h1>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total ARR</h3>
                        <span className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
                            <CurrencyDollarIcon className="w-5 h-5" />
                        </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">${stats?.total_revenue?.toLocaleString()}</div>
                    <p className="text-xs text-green-500 mt-1 flex items-center">
                        <ArrowTrendingUpIcon className="w-3 h-3 mr-1" /> +12% from last month
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">MRR</h3>
                        <span className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                            <ArrowPathIcon className="w-5 h-5" />
                        </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">${stats?.mrr?.toLocaleString()}</div>
                    <p className="text-xs text-green-500 mt-1 flex items-center">
                        <ArrowTrendingUpIcon className="w-3 h-3 mr-1" /> +5% from last month
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Subscriptions</h3>
                        <span className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
                            <UserGroupIcon className="w-5 h-5" />
                        </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.active_subs}</div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Churn Rate</h3>
                        <span className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg">
                            <ArrowTrendingUpIcon className="w-5 h-5 rotate-180" />
                        </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.churn_rate}%</div>
                    <p className="text-xs text-red-500 mt-1">Requires attention</p>
                </div>
            </div>

            {/* Revenue Chart */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-slate-200 dark:border-slate-700 h-96">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Revenue Growth</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mockChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                        />
                        <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
