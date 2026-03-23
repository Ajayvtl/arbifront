"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ShieldCheckIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from "@/components/ui/Button";
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function RolesPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [roles, setRoles] = useState([]);
    const [modules, setModules] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Removed Modal state and form data since we moved to /create page
    // Edit logic should also be moved to /edit/[id] page ideally, but for now we haven't created Edit Page.
    // However, the user request focuses on "Add Role". 
    // I should probably disable Edit button or redirect to create page with ID query param if I want to support edit.
    // Given the task scope, I will just display the list.

    const fetchData = async () => {
        try {
            const [rolesRes, permsRes] = await Promise.all([
                api.get('/settings/roles'),
                api.get('/settings/roles/permissions')
            ]);
            setRoles(rolesRes.data.data);
            setModules(permsRes.data.data);
            setCategories([]); // Fetching logic remains same if needed
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role_id === 1) {
            router.replace('/admin/settings/roles');
            return;
        }
        fetchData();
    }, [user, router]);

    const handleDelete = async (id: number) => {
        if (id === 1) return toast.error("Cannot delete Super Admin");
        if (!confirm('Are you sure? This action cannot be undone.')) return;
        try {
            await api.delete(`/settings/roles/${id}`);
            toast.success('Role Deleted');
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Delete failed');
        }
    };

    // Removed openEdit/openCreate/handleSubmit/Modal JSX

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Role Management (Live)</h1>
                <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg max-w-3xl">
                    <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mb-1">Area 1: Tenant Roles (Enforcement)</h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-200">
                        These are the <b>live roles</b> assigned to your actual users.
                        They represent the final authority on "Who can do what" in this hotel.
                        You can create these from scratch or start from a <b>System Template</b> (Area 3).
                    </p>
                </div>
                {/* Button Removed as it is now in Sidebar Submenu */}
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map((role: any) => (
                    <div key={role.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-slate-200 dark:border-slate-700 relative group">
                        {role.id !== 1 && (
                            <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => router.push('/admin/settings/roles')}
                                    className="text-blue-500 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-lg"
                                    title="Edit in Global Role Manager"
                                >
                                    <PencilIcon className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(role.id)} className="text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-900/30 p-1.5 rounded-lg"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                        )}

                        <div className="flex items-center space-x-4 mb-4">
                            <div className={`p-3 rounded-xl ${role.category_id ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                <ShieldCheckIcon className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{role.name}</h3>
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-500 font-medium">
                                        {role.category_id
                                            ? `Category: ${role.category_name} ${role.subcategory_name ? '> ' + role.subcategory_name : ''}`
                                            : (role.hotel_id ? 'Custom Role' : 'System Default')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-slate-700">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Assigned Users</span>
                            <div className="flex items-center">
                                <span className="text-lg font-bold text-gray-900 dark:text-white mr-1">{role.user_count || 0}</span>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                            <span className="text-xs text-slate-500">Permissions</span>
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                {role.permissions?.includes('*') ? 'ALL' : (role.permissions?.length || 0)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {roles.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-500">
                    No roles found. use "Add Role" from sidebar to create one.
                </div>
            )}
        </div>
    );
}

