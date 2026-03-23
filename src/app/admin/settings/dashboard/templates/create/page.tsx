"use client";
import { useState } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function CreateTemplatePage() {
    const router = useRouter();
    const [form, setForm] = useState({ name: '', description: '', type: 'system' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/admin/dashboard/templates', form);
            // Redirect to builder
            router.push(`/admin/settings/dashboard/templates/${res.data.id}`);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <Link href="/admin/settings/dashboard" className="flex items-center text-gray-500 hover:text-gray-900 dark:text-gray-400 mb-6">
                <ArrowLeftIcon className="w-4 h-4 mr-1" />
                Back to Dashboard Settings
            </Link>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Template</h1>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 shadow rounded-lg p-6 border border-slate-200 dark:border-slate-700 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template Name</label>
                    <input
                        type="text"
                        required
                        className="w-full border rounded-lg p-2 dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea
                        className="w-full border rounded-lg p-2 dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                        rows={3}
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                    <select
                        className="w-full border rounded-lg p-2 dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                        value={form.type}
                        onChange={e => setForm({ ...form, type: e.target.value })}
                    >
                        <option value="system">System (Admin Panel)</option>
                        <option value="tenant">Tenant (Hotel Panel)</option>
                    </select>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Create & Configure Layout'}
                    </button>
                </div>
            </form>
        </div>
    );
}
