"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowDownTrayIcon, FunnelIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function ReportsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);
    const [filters, setFilters] = useState({
        start_date: '',
        end_date: '',
        country_id: '',
        state_id: '',
        city_id: ''
    });

    // Masters for Filters
    const [countries, setCountries] = useState([]);
    const [states, setStates] = useState([]);

    useEffect(() => {
        fetchData();
        if (user?.role_id === 1) fetchCountries();
    }, [filters]);

    // Debounce or Trigger manually? For now, effect on filter change.

    const fetchData = async () => {
        try {
            setLoading(true);
            const query = new URLSearchParams(filters as any).toString();
            const res = await api.get(`/reports/revenue?${query}`);
            // Transform data for Recharts if needed
            setData(res.data.data || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load report data");
        } finally {
            setLoading(false);
        }
    };

    const fetchCountries = async () => {
        try { const res = await api.get('/master/countries'); setCountries(res.data.data); } catch (e) { }
    };

    const fetchStates = async (countryId: any) => {
        try { const res = await api.get(`/master/states?country_id=${countryId}`); setStates(res.data.data); } catch (e) { }
    };

    const handleCountryChange = (e: any) => {
        const cid = e.target.value;
        setFilters({ ...filters, country_id: cid, state_id: '', city_id: '' });
        if (cid) fetchStates(cid);
    };

    const totalRevenue = data.reduce((acc, curr) => acc + parseFloat(curr.total || 0), 0);

    // Formatting
    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {user?.role_id === 1 ? 'Global Financial Reports' : 'My Hotel Performance'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {user?.role_id === 1
                            ? 'Aggregated revenue data across all tenants.'
                            : 'Revenue and occupancy trends for your properties.'}
                    </p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                    <ArrowDownTrayIcon className="w-4 h-4" /> Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-700 flex flex-wrap gap-4 items-end">
                <div className="flex items-center gap-2 text-gray-500 mb-2 w-full">
                    <FunnelIcon className="w-4 h-4" /> <span className="text-xs uppercase font-bold tracking-wider">Filters</span>
                </div>

                {user?.role_id === 1 && (
                    <>
                        <div className="w-full sm:w-auto">
                            <label className="block text-xs font-medium bg-transparent mb-1">Country</label>
                            <select
                                className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-lg p-2 text-sm focus:ring-1 focus:ring-emerald-500"
                                value={filters.country_id}
                                onChange={handleCountryChange}
                            >
                                <option value="">All Countries</option>
                                {countries.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="w-full sm:w-auto">
                            <label className="block text-xs font-medium bg-transparent mb-1">State</label>
                            <select
                                className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-lg p-2 text-sm focus:ring-1 focus:ring-emerald-500"
                                value={filters.state_id}
                                onChange={(e) => setFilters({ ...filters, state_id: e.target.value })}
                                disabled={!filters.country_id}
                            >
                                <option value="">All States</option>
                                {states.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </>
                )}

                <div className="w-full sm:w-auto">
                    <label className="block text-xs font-medium bg-transparent mb-1">Start Date</label>
                    <input
                        type="date"
                        className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-lg p-2 text-sm focus:ring-1 focus:ring-emerald-500"
                        value={filters.start_date}
                        onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                    />
                </div>
                <div className="w-full sm:w-auto">
                    <label className="block text-xs font-medium bg-transparent mb-1">End Date</label>
                    <input
                        type="date"
                        className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-lg p-2 text-sm focus:ring-1 focus:ring-emerald-500"
                        value={filters.end_date}
                        onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                    />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
                    <p className="text-sm text-gray-500">Total Revenue</p>
                    <h3 className="text-3xl font-bold mt-2 text-emerald-600">{formatCurrency(totalRevenue)}</h3>
                    <p className="text-xs text-emerald-500 mt-1 font-medium">+12.5% from last period</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
                    <p className="text-sm text-gray-500">Transactions</p>
                    <h3 className="text-3xl font-bold mt-2 dark:text-white">{data.length}</h3>
                </div>
            </div>

            {/* Main Chart */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm h-[400px]">
                <h3 className="text-lg font-bold mb-6 dark:text-white">Revenue Trend</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.3} />
                        <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                            itemStyle={{ color: '#10b981' }}
                            formatter={(value: any) => [`$${value}`, 'Revenue']}
                        />
                        <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
