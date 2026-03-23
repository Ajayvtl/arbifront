"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { toast } from "react-hot-toast";
import { ArrowLeftIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default function CreateRolePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);

    // Form State
    const [roleForm, setRoleForm] = useState({
        name: '',
        description: '',
        category_id: '',
        is_active: true
    });

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await api.get('/saas/categories');
            setCategories(res.data.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load categories");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/saas/roles', roleForm);
            toast.success("Role Created Successfully");
            router.push('/admin/products/roles');
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to create role");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/admin/products/roles" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500">
                    <ArrowLeftIcon className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <UserGroupIcon className="w-8 h-8 text-indigo-500" />
                        Add New Role
                    </h1>
                    <p className="text-sm text-gray-500">Create a new role definition for the SaaS product.</p>
                </div>
            </div>

            {/* Form Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-8">
                <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">

                    {/* Role Name */}
                    <div>
                        <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                            Role Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            required
                            className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white transition-all"
                            value={roleForm.name}
                            onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                            placeholder="e.g. Hotel Manager, Front Desk Staff"
                        />
                        <p className="text-xs text-gray-500 mt-1">A descriptive name for this role.</p>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium mb-2 dark:text-gray-300">Category (Optional)</label>
                        <select
                            className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white transition-all"
                            value={roleForm.category_id}
                            onChange={e => setRoleForm({ ...roleForm, category_id: e.target.value })}
                        >
                            <option value="">Global / No Category</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Group this role under a specific category (e.g. Operations, Finance).</p>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium mb-2 dark:text-gray-300">Description</label>
                        <textarea
                            className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white h-32 transition-all resize-none"
                            value={roleForm.description}
                            onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                            placeholder="Describe the responsibilities and access level of this role..."
                        />
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-900/50 rounded-lg border border-gray-100 dark:border-slate-700">
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={roleForm.is_active}
                            onChange={e => setRoleForm({ ...roleForm, is_active: e.target.checked })}
                            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="is_active" className="text-sm font-medium text-gray-900 dark:text-gray-200 cursor-pointer">
                            Active Status
                        </label>
                    </div>

                    <div className="pt-6 flex items-center gap-4">
                        <Button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[150px]"
                            disabled={loading}
                        >
                            {loading ? 'Creating...' : 'Create Role'}
                        </Button>
                        <Link href="/admin/products/roles">
                            <Button variant="ghost" type="button">Cancel</Button>
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
