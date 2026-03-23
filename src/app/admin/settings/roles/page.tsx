"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PlusIcon, ShieldCheckIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from "@/components/ui/Button";

const TABS = [
    { id: 'permissions', label: 'Access Control' },
    { id: 'menu', label: 'Menu Visibility' }
];

export default function GlobalRolesPage() {
    const [roles, setRoles] = useState<any[]>([]);
    const [modules, setModules] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [countries, setCountries] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);
    const [shifts, setShifts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState('permissions');

    const [formData, setFormData] = useState({
        name: '',
        permissions: [] as string[],
        scope: 'global', // global, category
        category_id: '',
        subcategory_id: '',
        parent_role_id: '',
        hierarchy_level: '0',
        department_id: '',
        country_id: '',
        state_id: '',
        city_id: '',
        scope_type: 'global',
        shift_template_id: '',
        requires_parent_assignment: false
    });

    const inputClass = "w-full border border-gray-300 dark:border-slate-500 rounded-lg p-2.5 dark:bg-slate-900 dark:text-white bg-white outline-none focus:border-emerald-500 transition-all shadow-sm";

    const fetchData = async () => {
        try {
            const [rolesRes, permsRes, catsRes, departmentsRes, countriesRes, shiftsRes] = await Promise.all([
                api.get('/settings/roles'),
                api.get('/settings/roles/permissions'),
                api.get('/saas/categories'),
                api.get('/settings/departments').catch(() => ({ data: { data: [] } })),
                api.get('/master/countries').catch(() => ({ data: { data: [] } })),
                api.get('/hr/shifts').catch(() => ({ data: { data: [] } }))
            ]);
            setRoles(rolesRes.data.data);
            const payload = permsRes.data.data || {};
            if (Array.isArray(payload)) {
                setModules(payload);
                setTemplates([]);
            } else {
                setModules(payload.modules || []);
                setTemplates(payload.templates || []);
            }
            setCategories(catsRes.data.data);
            setDepartments(departmentsRes.data.data || []);
            setCountries(countriesRes.data.data || []);
            setShifts(shiftsRes.data.data || []);
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);
    useEffect(() => {
        if (!formData.country_id) {
            setStates([]);
            setCities([]);
            return;
        }
        api.get(`/master/states?country_id=${formData.country_id}`)
            .then((res) => setStates(res.data.data || []))
            .catch(() => setStates([]));
    }, [formData.country_id]);
    useEffect(() => {
        if (!formData.country_id || !formData.state_id) {
            setCities([]);
            return;
        }
        api.get(`/master/cities?country_id=${formData.country_id}&state_id=${formData.state_id}`)
            .then((res) => setCities(res.data.data || []))
            .catch(() => setCities([]));
    }, [formData.country_id, formData.state_id]);
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Prepare payload
            const payload = {
                ...formData,
                category_id: formData.scope === 'category' ? formData.category_id : null,
                subcategory_id: formData.scope === 'category' ? formData.subcategory_id : null,
                parent_role_id: formData.parent_role_id || null,
                hierarchy_level: Number(formData.hierarchy_level || 0),
                department_id: formData.department_id || null,
                country_id: formData.country_id || null,
                state_id: formData.state_id || null,
                city_id: formData.city_id || null,
                scope_type: formData.scope_type || 'global',
                shift_template_id: formData.shift_template_id || null
            };

            if (editId) {
                await api.put(`/settings/roles/${editId}`, payload);
                toast.success('Role Updated');
            } else {
                await api.post('/settings/roles', payload);
                toast.success('Role Created');
            }
            setShowModal(false);
            setFormData({
                name: '',
                permissions: [],
                scope: 'global',
                category_id: '',
                subcategory_id: '',
                parent_role_id: '',
                hierarchy_level: '0',
                department_id: '',
                country_id: '',
                state_id: '',
                city_id: '',
                scope_type: 'global',
                shift_template_id: '',
                requires_parent_assignment: false
            });
            setEditId(null);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Operation failed');
        }
    };

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

    const openEdit = (role: any) => {
        let scope = 'global';
        if (role.category_id) scope = 'category';
        const effectivePermissions = Array.isArray(role.permissions) && role.permissions.includes('*')
            ? (role.all_permissions || [])
            : (role.permissions || []);

        setFormData({
            name: role.name,
            permissions: effectivePermissions,
            scope: scope,
            category_id: role.category_id || '',
            subcategory_id: role.subcategory_id || '',
            parent_role_id: role.parent_role_id || '',
            hierarchy_level: String(role.hierarchy_level || 0),
            department_id: role.department_id || '',
            country_id: role.country_id || '',
            state_id: role.state_id || '',
            city_id: role.city_id || '',
            scope_type: role.scope_type || 'global',
            shift_template_id: role.shift_template_id || '',
            requires_parent_assignment: Boolean(role.requires_parent_assignment)
        });
        setEditId(role.id);
        setShowModal(true);
    };

    const openCreate = () => {
        setFormData({
            name: '',
            permissions: [],
            scope: 'global',
            category_id: '',
            subcategory_id: '',
            parent_role_id: '',
            hierarchy_level: '0',
            department_id: '',
            country_id: '',
            state_id: '',
            city_id: '',
            scope_type: 'global',
            shift_template_id: '',
            requires_parent_assignment: false
        });
        setEditId(null);
        setShowModal(true);
        setActiveTab('permissions');
    };

    const togglePermission = (slug: string) => {
        setFormData(prev => {
            const exists = prev.permissions.includes(slug);
            if (exists) {
                return { ...prev, permissions: prev.permissions.filter(p => p !== slug) };
            } else {
                return { ...prev, permissions: [...prev.permissions, slug] };
            }
        });
    };

    const toggleAllModule = (moduleKey: string, actions: string[]) => {
        const slugs = actions;
        const allSelected = slugs.every(s => formData.permissions.includes(s));

        setFormData(prev => {
            let newPerms = [...prev.permissions];
            if (allSelected) {
                newPerms = newPerms.filter(p => !slugs.includes(p));
            } else {
                const missing = slugs.filter(s => !newPerms.includes(s));
                newPerms = [...newPerms, ...missing];
            }
            return { ...prev, permissions: newPerms };
        });
    };

    const applyTemplate = (template: any) => {
        if (!template || !Array.isArray(template.permissions)) return;
        const templatePerms = template.permissions.map((p: any) => String(p));
        const deduped = Array.from(new Set<string>(templatePerms));
        setFormData(prev => ({ ...prev, permissions: deduped }));
        toast.success(`Applied template: ${template.name}`);
    };

    // Helper to get active subcategories
    const activeSubcategories = categories.find(c => c.id == formData.category_id)?.subcategories || [];

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Global Role Management</h1>
                    <p className="text-sm text-gray-500">Manage System and Category-Default roles</p>
                </div>
                <Button onClick={openCreate} className="flex items-center gap-2">
                    <PlusIcon className="w-5 h-5" /> Create Global Role
                </Button>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map((role: any) => (
                    <div key={role.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-slate-200 dark:border-slate-700 relative group">
                        <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(role)} className="text-blue-500 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-lg"><PencilIcon className="w-4 h-4" /></button>
                            {role.id !== 1 && (
                                <button onClick={() => handleDelete(role.id)} className="text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-900/30 p-1.5 rounded-lg"><TrashIcon className="w-4 h-4" /></button>
                            )}
                        </div>

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
                                            : 'System Default (Global)'}
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
                    </div>
                ))}
            </div>


            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

                        <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
                            <h2 className="text-xl font-bold dark:text-white">{editId ? 'Edit Role' : 'Create New Role'}</h2>
                            <button onClick={() => setShowModal(false)}><XMarkIcon className="w-6 h-6 text-gray-400 hover:text-gray-600" /></button>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto">
                            <form id="roleForm" onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold dark:text-gray-300 mb-2">Role Name</label>
                                        <input
                                            placeholder="e.g. Finance Manager"
                                            className={inputClass}
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-semibold dark:text-gray-300 mb-2">Scope</label>
                                        <select
                                            className={inputClass}
                                            value={formData.scope}
                                            onChange={e => setFormData({ ...formData, scope: e.target.value })}
                                        >
                                            <option value="global">Global (All Categories)</option>
                                            <option value="category">Category Specific</option>
                                        </select>
                                    </div>

                                    {formData.scope === 'category' && (
                                        <>
                                            <div className="col-span-2 md:col-span-1">
                                                <label className="block text-sm font-semibold dark:text-gray-300 mb-2">Category</label>
                                                <select
                                                    className={inputClass}
                                                    value={formData.category_id}
                                                    onChange={e => setFormData({ ...formData, category_id: e.target.value, subcategory_id: '' })}
                                                    required={formData.scope === 'category'}
                                                >
                                                    <option value="">Select Category</option>
                                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                            {formData.category_id && (
                                                <div className="col-span-2 md:col-span-1">
                                                    <label className="block text-sm font-semibold dark:text-gray-300 mb-2">Subcategory (Optional)</label>
                                                    <select
                                                        className={inputClass}
                                                        value={formData.subcategory_id}
                                                        onChange={e => setFormData({ ...formData, subcategory_id: e.target.value })}
                                                    >
                                                        <option value="">All Subcategories</option>
                                                        {activeSubcategories.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-semibold dark:text-gray-300 mb-2">Hierarchy Level</label>
                                        <input
                                            type="number"
                                            className={inputClass}
                                            value={formData.hierarchy_level}
                                            onChange={e => setFormData({ ...formData, hierarchy_level: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-semibold dark:text-gray-300 mb-2">Scope Type</label>
                                        <select className={inputClass} value={formData.scope_type} onChange={e => setFormData({ ...formData, scope_type: e.target.value })}>
                                            <option value="global">Global</option>
                                            <option value="localized">Localized</option>
                                            <option value="departmental">Departmental</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-semibold dark:text-gray-300 mb-2">Parent Role</label>
                                        <select className={inputClass} value={formData.parent_role_id} onChange={e => setFormData({ ...formData, parent_role_id: e.target.value })}>
                                            <option value="">None</option>
                                            {roles.filter((r: any) => !editId || r.id !== editId).map((r: any) => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-semibold dark:text-gray-300 mb-2">Department</label>
                                        <select className={inputClass} value={formData.department_id} onChange={e => setFormData({ ...formData, department_id: e.target.value })}>
                                            <option value="">All Departments</option>
                                            {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-semibold dark:text-gray-300 mb-2">Country</label>
                                        <select className={inputClass} value={formData.country_id} onChange={e => setFormData({ ...formData, country_id: e.target.value, state_id: '', city_id: '' })}>
                                            <option value="">Global</option>
                                            {countries.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-semibold dark:text-gray-300 mb-2">State</label>
                                        <select className={inputClass} value={formData.state_id} onChange={e => setFormData({ ...formData, state_id: e.target.value, city_id: '' })} disabled={!formData.country_id}>
                                            <option value="">All States</option>
                                            {states.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-semibold dark:text-gray-300 mb-2">City</label>
                                        <select className={inputClass} value={formData.city_id} onChange={e => setFormData({ ...formData, city_id: e.target.value })} disabled={!formData.state_id}>
                                            <option value="">All Cities</option>
                                            {cities.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-semibold dark:text-gray-300 mb-2">Shift Template</label>
                                        <select className={inputClass} value={formData.shift_template_id} onChange={e => setFormData({ ...formData, shift_template_id: e.target.value })}>
                                            <option value="">No default shift</option>
                                            {shifts.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2 md:col-span-1 flex items-center gap-3 mt-8">
                                        <input
                                            id="requires_parent_assignment"
                                            type="checkbox"
                                            checked={formData.requires_parent_assignment}
                                            onChange={e => setFormData({ ...formData, requires_parent_assignment: e.target.checked })}
                                        />
                                        <label htmlFor="requires_parent_assignment" className="text-sm font-semibold dark:text-gray-300">Require Upper-Level Assignment</label>
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div className="border-b border-gray-200 dark:border-slate-700">
                                    <nav className="-mb-px flex space-x-8">
                                        {TABS.map(tab => (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`
                                                    whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm
                                                    ${activeTab === tab.id
                                                        ? 'border-emerald-500 text-emerald-600'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                                                `}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </nav>
                                </div>

                                {activeTab === 'permissions' && (
                                    <div className="space-y-4 pt-4">
                                        {templates.length > 0 && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                                {templates.map((tpl: any) => (
                                                    <button
                                                        key={tpl.key}
                                                        type="button"
                                                        onClick={() => applyTemplate(tpl)}
                                                        className="text-left border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:border-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition-all"
                                                    >
                                                        <div className="font-semibold text-slate-900 dark:text-white">{tpl.name}</div>
                                                        <div className="text-xs text-slate-500 mt-1">{tpl.description}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700">
                                                <thead className="bg-gray-50 dark:bg-slate-900">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Module</th>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Capabilities</th>
                                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                                                    {modules.map((mod) => (
                                                        <tr key={mod.key}>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className="font-semibold text-gray-900 dark:text-white">{mod.name}</span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex flex-wrap gap-3">
                                                                    {(mod.permissions || []).filter((perm: any) => !String(perm.slug).startsWith('menu.')).map((perm: any) => {
                                                                        const slug = perm.slug;
                                                                        return (
                                                                            <label key={slug} className="flex items-center space-x-2 cursor-pointer bg-gray-50 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-slate-700 link-check">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={formData.permissions.includes(slug)}
                                                                                    onChange={() => togglePermission(slug)}
                                                                                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                                                                />
                                                                                <span className="text-sm text-gray-700 dark:text-gray-300">{perm.label || slug}</span>
                                                                            </label>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                                <button type="button" onClick={() => toggleAllModule(mod.key, (mod.permissions || []).map((p: any) => p.slug))} className="text-xs font-semibold text-emerald-600 hover:underline">
                                                                    Toggle All
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'menu' && (
                                    <div className="space-y-4 pt-4">
                                        <p className="text-sm text-gray-500 mb-4">Select which Sidebar items are visible to this role.</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {modules.filter(m => m.hasMenu).map((mod) => {
                                                const slug = `menu.${mod.key}`;
                                                return (
                                                    <label key={slug} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${formData.permissions.includes(slug) ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'border-gray-200 dark:border-slate-700'}`}>
                                                        <span className="font-medium text-gray-900 dark:text-white">{mod.name}</span>
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.permissions.includes(slug)}
                                                            onChange={() => togglePermission(slug)}
                                                            className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                                        />
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>

                        <div className="p-6 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex justify-end space-x-3">
                            <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white font-medium">Cancel</button>
                            <button type="submit" form="roleForm" className="bg-emerald-600 text-white px-8 py-2.5 rounded-xl hover:bg-emerald-700 font-medium shadow-lg shadow-emerald-500/20">
                                {editId ? 'Save Changes' : 'Create Role'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
