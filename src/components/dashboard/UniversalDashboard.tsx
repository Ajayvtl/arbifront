"use client";
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import StatCardWidget from './widgets/StatCardWidget';
import ChartWidget from './widgets/ChartWidget';
import ListWidget from './widgets/ListWidget';

// Map DB Types to Components
const WIDGET_COMPONENTS: any = {
    'stat_card': StatCardWidget,
    'chart': ChartWidget,
    'bar_chart': ChartWidget,
    'line_chart': ChartWidget,
    'list': ListWidget,
    'task_stats_card': StatCardWidget
};

export default function UniversalDashboard({ source }: { source?: string }) {
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const endpoint = source ? `/admin/dashboard/config?source=${source}` : '/admin/dashboard/config';
        api.get(endpoint)
            .then(res => setConfig(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [source]);

    if (loading) return (
        <div className="p-8 animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-slate-700 w-1/3 rounded"></div>
            <div className="grid grid-cols-4 gap-4 h-32">
                {[1, 2, 3, 4].map(i => <div key={i} className="bg-gray-200 dark:bg-slate-700 rounded-xl"></div>)}
            </div>
        </div>
    );

    if (!config || config.source === 'none') {
        return (
            <div className="p-8 text-center text-gray-500">
                <h2 className="text-xl font-semibold mb-2">No Dashboard Configured</h2>
                <p>Please contact your administrator to assign a dashboard template to your role.</p>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {config.template_name}
                    </h1>
                    <p className="text-xs text-red-500 mt-1">
                        * Drag & Drop disabled: Server disk full (Failed to install dependencies).
                    </p>
                </div>
            </div>

            {/* CSS Grid Layout (Fallback) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-max">
                {config.layout.map((item: any) => {
                    const Component = WIDGET_COMPONENTS[item.type] || StatCardWidget;

                    // Calculate Grid Spans from config.layout (w, h)
                    const colSpan = item.layout?.w ? `lg:col-span-${item.layout.w}` : 'lg:col-span-1';
                    const rowSpan = item.layout?.h ? `row-span-${item.layout.h}` : '';

                    return (
                        <div key={item.id} className={`${colSpan} ${rowSpan}`}>
                            <Component
                                slug={item.slug}
                                name={item.name}
                                type={item.type}
                                icon={item.slug.includes('revenue') ? 'CurrencyDollar' : undefined}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
