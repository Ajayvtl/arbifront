"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, UserIcon, ShieldCheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';

export default function SystemUsersPage() {
    const { user } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);

    const [departments, setDepartments] = useState<any[]>([]); // Assuming departments added earlier
    const [countries, setCountries] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);
    const [managers, setManagers] = useState<any[]>([]);
    const [shifts, setShifts] = useState<any[]>([]);

    // Note: Department fetching logic might be needed if departments are used. 
    // The previous view_file (Step 2349) didn't show department state, but user mentioned "finance" role etc.
    // I'll stick to Location logic for now to avoid breaking existing flow if not present.

    const [formData, setFormData] = useState({
        name: '', email: '', password: '', role_id: '', phone: '',
        country_id: '', state_id: '', city_id: '', department_id: '', manager_user_id: '', shift_template_id: ''
    });

    const inputClass = "w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 dark:bg-slate-900 dark:text-white bg-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all";

    useEffect(() => {
        fetchData();
        fetchCountries();
    }, []);

    useEffect(() => {
        if (formData.country_id) fetchStates(formData.country_id);
        else setStates([]);
    }, [formData.country_id]);

    useEffect(() => {
        if (formData.state_id) fetchCities(formData.country_id, formData.state_id);
        else setCities([]);
    }, [formData.state_id]);

    const fetchData = async () => {
        try {
            const [usersRes, rolesRes, departmentsRes, shiftsRes] = await Promise.all([
                api.get('/users?type=system'),
                api.get('/settings/roles'),
                api.get('/settings/departments').catch(() => ({ data: { data: [] } })),
                api.get('/hr/shifts').catch(() => ({ data: { data: [] } }))
            ]);
            setUsers(usersRes.data.data);
            setRoles(rolesRes.data.data);
            setDepartments(departmentsRes.data.data || []);
            setShifts(shiftsRes.data.data || []);
            setManagers(usersRes.data.data || []);
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const fetchCountries = async () => {
        try { const res = await api.get('/master/countries'); setCountries(res.data.data); } catch (e) { }
    };
    const fetchStates = async (countryId: any) => {
        try { const res = await api.get(`/master/states?country_id=${countryId}`); setStates(res.data.data); } catch (e) { }
    };
    const fetchCities = async (countryId: any, stateId: any) => {
        try { const res = await api.get(`/master/cities?country_id=${countryId}&state_id=${stateId}`); setCities(res.data.data); } catch (e) { }
    };

    const handleOpenModal = (user: any = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name,
                email: user.email,
                password: '',
                role_id: user.role_id,
                phone: user.phone || '',
                country_id: user.country_id || '',
                state_id: user.state_id || '',
                city_id: user.city_id || '',
                department_id: user.department_id || '',
                manager_user_id: user.manager_user_id || '',
                shift_template_id: user.shift_template_id || ''
            });
            // Trigger fetches for existing values
            if (user.country_id) fetchStates(user.country_id);
            if (user.country_id && user.state_id) fetchCities(user.country_id, user.state_id);
        } else {
            setEditingUser(null);
            setFormData({ name: '', email: '', password: '', role_id: '', phone: '', country_id: '', state_id: '', city_id: '', department_id: '', manager_user_id: '', shift_template_id: '' });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = { ...formData };
            if (!payload.password) delete payload.password;
            if (!payload.country_id) delete payload.country_id;
            if (!payload.state_id) delete payload.state_id;
            if (!payload.city_id) delete payload.city_id;
            if (!payload.department_id) delete payload.department_id;
            if (!payload.manager_user_id) delete payload.manager_user_id;
            if (!payload.shift_template_id) delete payload.shift_template_id;

            if (editingUser) {
                await api.put(`/users/${editingUser.id}?type=system`, payload);
                toast.success('User Updated');
            } else {
                await api.post('/users?type=system', payload);
                toast.success('User Created');
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Operation failed');
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <UserIcon className="w-6 h-6 text-emerald-500" />
                    System Users
                </h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
                >
                    <PlusIcon className="w-5 h-5" />
                    Add Staff
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-slate-900/50 text-xs uppercase text-gray-500 dark:text-gray-400">
                        <tr>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Role</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {users.map((u: any) => (
                            <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                                            {u.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white">{u.name}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                        <ShieldCheckIcon className="w-3 h-3 mr-1" />
                                        {u.role_name || 'Staff'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={async () => {
                                            if (!confirm('Change user status?')) return;
                                            try {
                                                await api.put(`/users/${u.id}?type=system`, { is_active: !u.is_active });
                                                toast.success('Status updated');
                                                fetchData();
                                            } catch (e) { toast.error('Failed to update status'); }
                                        }}
                                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 ${u.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800'}`}>
                                        {u.is_active ? 'Active' : 'Inactive'}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleOpenModal(u)} className="p-2 text-gray-400 hover:text-emerald-500 transition-colors" title="Edit">
                                            <PencilIcon className="w-5 h-5" />
                                        </button>
                                        {u.id !== 1 && (
                                            <button
                                                onClick={async () => {
                                                    if (!confirm('Delete this user permanently?')) return;
                                                    try {
                                                        await api.delete(`/users/${u.id}?type=system`);
                                                        toast.success('User deleted');
                                                        fetchData();
                                                    } catch (e) { toast.error('Failed to delete user'); }
                                                }}
                                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                                title="Delete"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">

                        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {editingUser ? 'Edit User' : 'New System User'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500 transition-colors">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium dark:text-slate-300 mb-1">Name</label>
                                <input required className={inputClass} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium dark:text-slate-300 mb-1">Email</label>
                                <input required type="email" className={inputClass} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium dark:text-slate-300 mb-1">Phone</label>
                                <input className={inputClass} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium dark:text-slate-300 mb-1">Password</label>
                                <input type="password" className={inputClass} placeholder={editingUser ? "Leave blank to keep same" : "Secure Password"} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                            </div>
                            <div>
                                <select required className={inputClass} value={formData.role_id} onChange={e => setFormData({ ...formData, role_id: e.target.value })}>
                                    <option value="">Select Role</option>
                                    {roles.map((r: any) => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium dark:text-slate-300 mb-1">Department</label>
                                    <select className={inputClass} value={formData.department_id} onChange={e => setFormData({ ...formData, department_id: e.target.value })}>
                                        <option value="">All Departments</option>
                                        {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-slate-300 mb-1">Country</label>
                                    <select className={inputClass} value={formData.country_id} onChange={e => setFormData({ ...formData, country_id: e.target.value, state_id: '', city_id: '' })}>
                                        <option value="">Global</option>
                                        {countries.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-slate-300 mb-1">State</label>
                                    <select className={inputClass} value={formData.state_id} onChange={e => setFormData({ ...formData, state_id: e.target.value, city_id: '' })} disabled={!formData.country_id}>
                                        <option value="">All States</option>
                                        {states.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-slate-300 mb-1">City</label>
                                    <select className={inputClass} value={formData.city_id} onChange={e => setFormData({ ...formData, city_id: e.target.value })} disabled={!formData.state_id}>
                                        <option value="">All Cities</option>
                                        {cities.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium dark:text-slate-300 mb-1">Upper Level (Manager)</label>
                                    <select className={inputClass} value={formData.manager_user_id} onChange={e => setFormData({ ...formData, manager_user_id: e.target.value })}>
                                        <option value="">No Manager</option>
                                        {managers.filter((m: any) => !editingUser || m.id !== editingUser.id).map((m: any) => (
                                            <option key={m.id} value={m.id}>{m.name} ({m.role_name || 'Role'})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-slate-300 mb-1">Shift Template</label>
                                    <select className={inputClass} value={formData.shift_template_id} onChange={e => setFormData({ ...formData, shift_template_id: e.target.value })}>
                                        <option value="">No Shift</option>
                                        {shifts.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <button type="submit" className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl">
                                {loading ? 'Saving...' : 'Save User'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
