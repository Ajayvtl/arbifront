"use client";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function PropertiesPanel({ selectedId, components, setComponents }: any) {
    if (!selectedId) {
        return (
            <div className="w-80 bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 p-6">
                <p className="text-sm text-slate-400 text-center mt-10">Select an element to edit its properties.</p>
            </div>
        );
    }

    const component = components.find((c: any) => c.id === selectedId);
    if (!component) return null;

    const updateProperty = (key: string, value: any) => {
        setComponents((prev: any[]) => prev.map(c =>
            c.id === selectedId ? { ...c, data: { ...(c.data || {}), [key]: value } } : c
        ));
    };

    return (
        <div className="w-80 bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 p-6 overflow-y-auto">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Properties</h3>

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Type</label>
                    <Input disabled value={component.type.toUpperCase()} />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Width</label>
                    <select
                        className="w-full p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                        value={component.data?.width || '100%'}
                        onChange={(e) => updateProperty('width', e.target.value)}
                    >
                        <option value="100%">Full Width (100%)</option>
                        <option value="66%">Two Thirds (66%)</option>
                        <option value="50%">Half Width (50%)</option>
                        <option value="33%">One Third (33%)</option>
                        <option value="25%">One Quarter (25%)</option>
                    </select>
                </div>

                {component.type === 'header' && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Title Text</label>
                        <Input
                            value={component.data?.title || 'INVOICE'}
                            onChange={(e) => updateProperty('title', e.target.value)}
                        />
                    </div>
                )}

                {/* Add more specific properties based on type later */}

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-400">
                        ID: <span className="font-mono">{selectedId}</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
