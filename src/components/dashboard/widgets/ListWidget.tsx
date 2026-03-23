"use client";
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { format } from 'date-fns';

export default function ListWidget({ slug, name, type }: { slug: string, name: string, type?: string }) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/admin/dashboard/widget-data/${slug}`)
            .then(res => {
                if (Array.isArray(res.data.data)) setData(res.data.data);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [slug]);

    if (loading) return <div className="h-64 bg-gray-50 dark:bg-slate-800 rounded-lg animate-pulse border border-gray-200 dark:border-slate-700"></div>;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-4 h-full overflow-hidden flex flex-col relative">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{name}</h3>
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-[10px] text-gray-500 uppercase tracking-widest">{type?.replace('_', ' ')}</span>
            </div>
            <div className="overflow-y-auto flex-1 custom-scrollbar">
                <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                    {data.map((item, idx) => (
                        <li key={idx} className="py-3 flex justify-between items-center">
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                                <p className="text-xs text-gray-500">{item.created_at ? format(new Date(item.created_at), 'MMM dd, yyyy') : ''}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs capitalize 
                                ${item.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                    item.status === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                        item.status === 'medium' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                            'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-400'
                                }`}>
                                {item.status || 'Active'}
                            </span>
                        </li>
                    ))}
                    {data.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No data available</p>}
                </ul>
            </div>
        </div>
    );
}
