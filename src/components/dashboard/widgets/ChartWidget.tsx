"use client";
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';

export default function ChartWidget({ slug, name, type }: { slug: string, name: string, type: string }) {
    const [data, setData] = useState<any[]>([]); // Array of data points
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock data for now since backend currently returns empty object for charts in my simple controller
        // In real impl, fetch from API.
        if (slug === 'revenue_chart') {
            setData([
                { name: 'Jan', value: 4000 }, { name: 'Feb', value: 3000 }, { name: 'Mar', value: 2000 },
                { name: 'Apr', value: 2780 }, { name: 'May', value: 1890 }, { name: 'Jun', value: 2390 },
            ]);
            setLoading(false);
        } else if (slug === 'user_growth_chart') {
            setData([
                { name: 'Jan', value: 10 }, { name: 'Feb', value: 25 }, { name: 'Mar', value: 40 },
                { name: 'Apr', value: 55 }, { name: 'May', value: 80 }, { name: 'Jun', value: 120 },
            ]);
            setLoading(false);
        } else {
            api.get(`/admin/dashboard/widget-data/${slug}`)
                .then(res => setData(res.data.data))
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [slug]);

    if (loading) return <div className="h-64 bg-gray-50 dark:bg-slate-800 rounded-lg animate-pulse border border-gray-200 dark:border-slate-700"></div>;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-4 h-full flex flex-col relative">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{name}</h3>
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-[10px] text-gray-500 uppercase tracking-widest">{type?.replace('_', ' ')}</span>
            </div>
            <div className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    {type === 'line_chart' || type === 'chart' ? (
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                            <YAxis stroke="#9ca3af" fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                            <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    ) : (
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                            <YAxis stroke="#9ca3af" fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
}
