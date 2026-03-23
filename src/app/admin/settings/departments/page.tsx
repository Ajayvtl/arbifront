"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Plus, Loader2, Save, Trash2, Edit2, Building2, X, Users, CornerDownRight } from "lucide-react";
import toast from "react-hot-toast";

export default function DepartmentsPage() {
    const [departments, setDepartments] = useState<any[]>([]);
    const [positions, setPositions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingDept, setEditingDept] = useState<any>(null);
    const [formData, setFormData] = useState({ 
        name: '', 
        description: '', 
        status: 'active',
        parent_department_id: '',
        manager_position_id: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [deptRes, posRes] = await Promise.all([
                api.get('/departments'),
                api.get('/hr/positions').catch(() => ({ data: { data: [] } }))
            ]);
            setDepartments(deptRes.data.data || []);
            setPositions(posRes.data.data || []);
        } catch (error) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...formData,
                parent_department_id: formData.parent_department_id ? Number(formData.parent_department_id) : null,
                manager_position_id: formData.manager_position_id ? Number(formData.manager_position_id) : null,
            };

            if (editingDept) {
                await api.put(`/departments/${editingDept.id}`, payload);
                toast.success("Department updated");
            } else {
                await api.post('/departments', payload);
                toast.success("Department created");
            }
            setShowModal(false);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to save department");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this department?")) return;
        try {
            await api.delete(`/departments/${id}`);
            toast.success("Department deleted");
            fetchData();
        } catch (error: any) {
            toast.error("Failed to delete department");
        }
    };

    const openEdit = (dept: any) => {
        setEditingDept(dept);
        setFormData({ 
            name: dept.name, 
            description: dept.description || '', 
            status: dept.status || 'active',
            parent_department_id: dept.parent_department_id?.toString() || '',
            manager_position_id: dept.manager_position_id?.toString() || ''
        });
        setShowModal(true);
    };

    const openCreate = () => {
        setEditingDept(null);
        setFormData({ name: '', description: '', status: 'active', parent_department_id: '', manager_position_id: '' });
        setShowModal(true);
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Departments</h1>
                    <p className="text-slate-500 dark:text-slate-400">Manage organizational hierarchy</p>
                </div>
                <button
                    onClick={openCreate}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
                >
                    <Plus size={18} />
                    Add Department
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-10"><Loader2 className="animate-spin text-emerald-600" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {departments.map((dept) => (
                        <div key={dept.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow group relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                    <Building2 size={24} />
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(dept)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors" title="Edit">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(dept.id)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Delete">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">{dept.name}</h3>
                            
                            {dept.parent_name && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2 bg-slate-50 dark:bg-slate-800/50 w-fit px-2 py-0.5 rounded">
                                    <CornerDownRight size={12} />
                                    <span>Sub-department of {dept.parent_name}</span>
                                </div>
                            )}

                            <p className="text-slate-500 dark:text-slate-400 text-sm h-10 line-clamp-2 mt-2">{dept.description || 'No description provided.'}</p>
                            
                            {dept.manager_position_name && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                                    <Users size={14} />
                                    Managed by: {dept.manager_position_name}
                                </div>
                            )}

                            <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-700 flex justify-between items-center text-xs text-slate-400">
                                <span>ID: {dept.id}</span>
                                <span className={`px-2 py-1 rounded-full capitalize ${dept.status === 'active' || dept.is_active === 1 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                                    {dept.status || (dept.is_active ? 'active' : 'inactive')}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg p-6 border border-slate-100 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{editingDept ? 'Edit Department' : 'New Department'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Parent Dept (Optional)</label>
                                    <select
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                                        value={formData.parent_department_id}
                                        onChange={e => setFormData({ ...formData, parent_department_id: e.target.value })}
                                    >
                                        <option value="">-- None (Top Level) --</option>
                                        {departments.filter(d => d.id !== editingDept?.id).map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Manager Position</label>
                                    <select
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                                        value={formData.manager_position_id}
                                        onChange={e => setFormData({ ...formData, manager_position_id: e.target.value })}
                                    >
                                        <option value="">-- No Manager Assigned --</option>
                                        {positions.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                                <textarea
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                                    rows={2}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            {editingDept && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                                    <select
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            )}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex justify-center items-center gap-2"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
