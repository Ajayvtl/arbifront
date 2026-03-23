"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PlusIcon, UserIcon } from '@heroicons/react/24/outline';

export default function StaffPage() {
    const [staff, setStaff] = useState([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role_id: ''
    });

    const inputClass = "w-full border border-gray-300 dark:border-slate-500 rounded-lg p-2 dark:bg-slate-900 dark:text-white bg-white outline-none focus:border-emerald-500 transition-all shadow-sm";

    const fetchData = async () => {
        try {
            const [staffRes, rolesRes] = await Promise.all([
                api.get('/users'), // TODO: Ensure filtered by Current Hotel
                api.get('/settings/roles')
            ]);
            setStaff(staffRes.data.data);
            setRoles(rolesRes.data.data);
            if (rolesRes.data.data.length > 0) {
                setFormData(prev => ({ ...prev, role_id: rolesRes.data.data[0].id }));
            }
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Need API endpoint to Create User assigned to Hotel
            // Assuming POST /users does this if logic is updated
            await api.post('/users', formData);
            toast.success('Staff Invited Successfully');
            setShowModal(false);
            setFormData({ name: '', email: '', role_id: roles[0]?.id || '' });
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to invite staff');
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Management</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center"
                >
                    <PlusIcon className="w-5 h-5 mr-2" /> Add Staff
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden border border-slate-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-slate-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {staff.map((user: any) => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                                            <UserIcon className="h-6 w-6" />
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                                            <div className="text-sm text-gray-500">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                        {user.role_name || 'Staff'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {user.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4 dark:text-white">Add New Staff</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input
                                placeholder="Full Name"
                                className={inputClass}
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                            <input
                                type="email"
                                placeholder="Email Address"
                                className={inputClass}
                                required
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />

                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300 mb-1">Assign Role</label>
                                <select
                                    className={inputClass}
                                    value={formData.role_id}
                                    onChange={e => setFormData({ ...formData, role_id: e.target.value })}
                                >
                                    {roles.map((role: any) => (
                                        <option key={role.id} value={role.id}>{role.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-500">Cancel</button>
                                <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700">Invite</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
