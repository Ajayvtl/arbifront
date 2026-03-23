"use client";
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { IconMap } from '@/lib/iconMapping';
import { Shield } from 'lucide-react';

export default function StatCardWidget({ slug, name, icon, type }: { slug: string, name: string, icon?: string, type?: string }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/admin/dashboard/widget-data/${slug}`)
            .then(res => setData(res.data.data))
            .catch(err => console.error(err)) // permission/404 errors handled silently or show error UI
            .finally(() => setLoading(false));
    }, [slug]);

    if (loading) return <div className="h-32 bg-gray-50 dark:bg-slate-800 rounded-lg animate-pulse border border-gray-200 dark:border-slate-700"></div>;
    if (!data) return null; // Or error state

    const IconComponent = icon && IconMap[icon] ? IconMap[icon] : Shield;

    return (
        <div className="relative overflow-hidden rounded-lg bg-white dark:bg-slate-800 px-4 pt-5 pb-12 shadow sm:px-6 sm:pt-6 border border-slate-200 dark:border-slate-700 h-full">
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-[10px] text-gray-500 uppercase tracking-widest">{type?.replace('_', ' ')}</div>
            <dt>
                <div className="absolute rounded-md bg-emerald-500 p-3">
                    <IconComponent className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <p className="ml-16 truncate text-sm font-medium text-gray-500 dark:text-gray-400">{name}</p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-1 sm:pb-7">
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{data.value}</p>
                {data.change && (
                    <p className={`ml-2 flex items-baseline text-sm font-semibold ${data.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                        {data.change}
                    </p>
                )}
            </dd>
        </div>
    );
}
