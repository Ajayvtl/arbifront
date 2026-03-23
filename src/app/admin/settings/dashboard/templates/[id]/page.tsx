"use client";
import { useState, useEffect, use } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import DashboardBuilder from '@/components/admin/DashboardBuilder';
import { toast } from 'react-hot-toast';

export default function TemplateBuilderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [template, setTemplate] = useState<any>(null);
    const [assignedWidgets, setAssignedWidgets] = useState<any[]>([]);
    const [availableWidgets, setAvailableWidgets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            const [tmplRes, widgetsRes] = await Promise.all([
                api.get(`/admin/dashboard/templates/${id}`),
                api.get('/admin/dashboard/widgets')
            ]);
            setTemplate(tmplRes.data.data);

            // Hydrate widgets with unique IDs for sorting if not present
            const widgets = (tmplRes.data.data.widgets || []).map((w: any) => ({
                ...w,
                uniqueId: w.uniqueId || `${w.id}-${Date.now()}-${Math.random()}`
            }));

            setAssignedWidgets(widgets);
            setAvailableWidgets(widgetsRes.data.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load template data");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                widgets: assignedWidgets.map(w => ({
                    widget_id: w.widget_id || w.id,
                    layout_config: {
                        colSpan: w.layout_config?.colSpan || w.layout_config?.w || 1, // Fallback
                        rowSpan: w.layout_config?.rowSpan || w.layout_config?.h || 1,
                        // Ensure compatibility with whatever structure usage
                        w: w.layout_config?.w,
                        h: w.layout_config?.h
                    }
                }))
            };
            await api.put(`/admin/dashboard/templates/${id}/layout`, payload);
            toast.success('Layout saved successfully!');
            loadData(); // Reload to ensure sync
        } catch (error) {
            console.error(error);
            toast.error('Failed to save layout');
        } finally {
            setSaving(false);
        }
    };

    // Helper for manual save button in Builder if needed, but we put save in header
    // pass handleSave to header button

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Enterprise Designer...</div>;
    if (!template) return <div className="p-8 text-center text-red-500">Template not found</div>;

    return (
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-slate-900">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <Link href="/admin/settings/dashboard" className="text-gray-500 hover:text-gray-900 dark:text-gray-400">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{template.name} <span className="text-emerald-500 text-sm font-normal">Enterprise Designer</span></h1>
                        <p className="text-xs text-gray-500">Drag to reorder. Changes are local until you click Save.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-md"
                    >
                        {saving ? 'Saving...' : 'Save Layout'}
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-hidden">
                <DashboardBuilder
                    widgets={assignedWidgets}
                    availableWidgets={availableWidgets}
                    onChange={setAssignedWidgets}
                />
            </div>
        </div>
    );
}
