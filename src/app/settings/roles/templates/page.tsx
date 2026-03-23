"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PlusIcon, PencilIcon, TrashIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";

export default function RoleTemplatesPage() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await api.get('/settings/roles/templates');
            setTemplates(res.data.data || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load templates");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this template?")) return;
        try {
            await api.delete(`/settings/roles/templates/${id}`);
            toast.success("Template deleted");
            fetchTemplates();
        } catch (error) {
            toast.error("Failed to delete template");
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <DocumentDuplicateIcon className="w-8 h-8 text-emerald-500" />
                        Role Templates
                    </h1>
                    <p className="text-sm text-gray-500">Manage standard role configurations for quick assignment.</p>
                </div>
                <Link href="/settings/roles/templates/create">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2">
                        <PlusIcon className="w-5 h-5" />
                        Create Template
                    </Button>
                </Link>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-900">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Template Name</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Permissions</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                        {loading ? (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">Loading templates...</td></tr>
                        ) : templates.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">No templates found.</td></tr>
                        ) : (
                            templates.map((tpl) => (
                                <tr key={tpl.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="font-medium text-gray-900 dark:text-white">{tpl.name}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{tpl.description || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {tpl.permissions?.slice(0, 3).map((p: string) => (
                                                <span key={p} className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-600">
                                                    {p}
                                                </span>
                                            ))}
                                            {(tpl.permissions?.length || 0) > 3 && (
                                                <span className="px-2 py-0.5 rounded text-xs bg-gray-50 text-gray-400 border border-gray-200">
                                                    +{tpl.permissions.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/settings/roles/templates/${tpl.id}`}>
                                                <button className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 transition-colors">
                                                    <PencilIcon className="w-5 h-5" />
                                                </button>
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(tpl.id)}
                                                className="p-1.5 rounded hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
