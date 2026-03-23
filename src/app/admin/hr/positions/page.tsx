"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Plus, Loader2, Save, Trash2, Edit2, Briefcase, X, Shield, Clock } from "lucide-react";
import toast from "react-hot-toast";

export default function JobPositionsPage() {
    const [positions, setPositions] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [shifts, setShifts] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [showModal, setShowModal] = useState(false);
    const [editingPos, setEditingPos] = useState<any>(null);
    const [formData, setFormData] = useState({ 
        name: '', 
        description: '', 
        department_id: '',
        reports_to_position_id: '',
        default_shift_id: '',
        is_active: true,
        role_ids: [] as number[]
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [posRes, deptRes, shiftRes, roleRes] = await Promise.all([
                api.get('/hr/positions'),
                api.get('/departments'),
                api.get('/hr/shifts').catch(() => ({ data: { data: [] } })),
                api.get('/settings/roles')
            ]);
            setPositions(posRes.data.data || []);
            setDepartments(deptRes.data.data || []);
            setShifts(shiftRes.data.data || []);
            setRoles(roleRes.data.data || []);
        } catch (error) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleRoleToggle = (roleId: number) => {
        setFormData(prev => {
            const exists = prev.role_ids.includes(roleId);
            if (exists) {
                return { ...prev, role_ids: prev.role_ids.filter(id => id !== roleId) };
            } else {
                return { ...prev, role_ids: [...prev.role_ids, roleId] };
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...formData,
                department_id: formData.department_id ? Number(formData.department_id) : null,
                reports_to_position_id: formData.reports_to_position_id ? Number(formData.reports_to_position_id) : null,
                default_shift_id: formData.default_shift_id ? Number(formData.default_shift_id) : null,
            };

            if (editingPos) {
                await api.put(`/hr/positions/${editingPos.id}`, payload);
                toast.success("Position updated");
            } else {
                await api.post('/hr/positions', payload);
                toast.success("Position created");
            }
            setShowModal(false);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to save position");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this position? Ensure no active contracts depend on it.")) return;
        try {
            await api.delete(`/hr/positions/${id}`);
            toast.success("Position deleted");
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete position");
        }
    };

    const openEdit = (pos: any) => {
        setEditingPos(pos);
        setFormData({ 
            name: pos.name, 
            description: pos.description || '', 
            department_id: pos.department_id?.toString() || '',
            reports_to_position_id: pos.reports_to_position_id?.toString() || '',
            default_shift_id: pos.default_shift_id?.toString() || '',
            is_active: pos.is_active === 1 || pos.is_active === true,
            role_ids: pos.roles ? pos.roles.map((r: any) => r.id) : []
        });
        setShowModal(true);
    };

    const openCreate = () => {
        setEditingPos(null);
        setFormData({ 
            name: '', description: '', department_id: '',
            reports_to_position_id: '', default_shift_id: '', is_active: true, role_ids: []
        });
        setShowModal(true);
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Job Positions</h1>
                    <p className="text-slate-500 dark:text-slate-400">Design employment architecture and roles</p>
                </div>
                <button
                    onClick={openCreate}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
                >
                    <Plus size={18} />
                    Create Position
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-10"><Loader2 className="animate-spin text-emerald-600" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {positions.map((pos) => (
                        <div key={pos.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow group relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                    <Briefcase size={24} />
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(pos)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Edit">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(pos.id)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Delete">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{pos.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{pos.department_name || 'No Department'}</p>

                            <div className="space-y-2 mb-4">
                                {pos.reports_to_name && (
                                    <div className="text-xs flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                        <span className="font-semibold text-slate-400">Reports To:</span> {pos.reports_to_name}
                                    </div>
                                )}
                                {pos.default_shift_name && (
                                    <div className="text-xs flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                        <Clock size={12} className="text-emerald-500" /> {pos.default_shift_name}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-1.5 mb-4 max-h-16 overflow-y-auto custom-scrollbar">
                                {pos.roles?.map((r: any) => (
                                    <span key={r.id} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/30">
                                        <Shield size={10} className="mr-1" />
                                        {r.name}
                                    </span>
                                ))}
                                {(!pos.roles || pos.roles.length === 0) && (
                                    <span className="text-xs text-slate-400 italic">No Roles Assigned</span>
                                )}
                            </div>

                            <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-700 flex justify-between items-center text-xs text-slate-400">
                                <span>Perms: {pos.inferred_permissions?.length || 0}</span>
                                <span className={`px-2 py-1 rounded-full capitalize ${pos.is_active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                                    {pos.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-700 overflow-hidden">
                        
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Briefcase className="text-blue-500" />
                                {editingPos ? 'Edit Position' : 'New Position'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 bg-white dark:bg-slate-700 p-1.5 rounded-full shadow-sm">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <form id="positionForm" onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Position Title</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Senior Front Desk Agent"
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Department</label>
                                        <select
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            value={formData.department_id}
                                            onChange={e => setFormData({ ...formData, department_id: e.target.value })}
                                        >
                                            <option value="">-- No Department --</option>
                                            {departments.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Reports To (Manager Position)</label>
                                        <select
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            value={formData.reports_to_position_id}
                                            onChange={e => setFormData({ ...formData, reports_to_position_id: e.target.value })}
                                        >
                                            <option value="">-- No Manager --</option>
                                            {positions.filter(p => p.id !== editingPos?.id).map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Default Shift</label>
                                        <select
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            value={formData.default_shift_id}
                                            onChange={e => setFormData({ ...formData, default_shift_id: e.target.value })}
                                        >
                                            <option value="">-- No Default Shift --</option>
                                            {shifts.map(s => (
                                                <option key={s.id} value={s.id}>{s.name} ({s.start_time || 'Flex'} - {s.end_time || 'Flex'})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                        <Shield size={16} className="text-indigo-500" /> 
                                        Assigned Roles & Templates
                                    </label>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-48 overflow-y-auto custom-scrollbar shadow-inner">
                                        {roles.map(role => (
                                            <label key={role.id} className="flex items-start gap-2 cursor-pointer group">
                                                <div className="relative flex items-center justify-center mt-0.5">
                                                    <input
                                                        type="checkbox"
                                                        className="peer sr-only"
                                                        checked={formData.role_ids.includes(role.id)}
                                                        onChange={() => handleRoleToggle(role.id)}
                                                    />
                                                    <div className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-600 peer-checked:bg-blue-500 peer-checked:border-blue-500 transition-colors"></div>
                                                    <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                                <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{role.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description / Responsibilities</label>
                                    <textarea
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        rows={3}
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                                
                                <label className="flex items-center gap-3 cursor-pointer mt-2 p-3 border border-slate-100 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors w-fit">
                                    <div className="relative flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            className="peer sr-only"
                                            checked={formData.is_active}
                                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                        />
                                        <div className="w-10 h-5 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Position is Active</span>
                                </label>
                            </form>
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="positionForm"
                                disabled={saving}
                                className="flex-1 px-6 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 active:bg-blue-800 flex justify-center items-center gap-2 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                {editingPos ? 'Save Changes' : 'Create Position'}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
