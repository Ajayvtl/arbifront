"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { toast } from "react-hot-toast";
import { ArrowLeftIcon, ShieldCheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import DashboardBuilder from "@/components/admin/DashboardBuilder";


export default function CreateRolePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [modules, setModules] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]); // For scope selection
    const [showBuilder, setShowBuilder] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        permissions: [] as string[],
        scope: 'global', // global, category
        category_id: '',
        subcategory_id: ''
    });

    useEffect(() => {
        fetchDependencies();
    }, []);

    const fetchDependencies = async () => {
        try {
            const [permsRes, catsRes] = await Promise.all([
                api.get('/settings/roles/permissions'),
                api.get('/saas/categories').catch(() => ({ data: { data: [] } })) // Optional for staff
            ]);
            const payload = permsRes.data.data || {};
            if (Array.isArray(payload)) {
                setModules(payload);
                setTemplates([]);
            } else {
                setModules(payload.modules || []);
                setTemplates(payload.templates || []);
            }
            setCategories(catsRes.data.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load permissions data");
        }
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                category_id: formData.scope === 'category' ? formData.category_id : null,
                subcategory_id: formData.scope === 'category' ? formData.subcategory_id : null
            };

            await api.post('/settings/roles', payload);
            toast.success("Role Created Successfully");
            router.push('/settings/roles');
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to create role");
        } finally {
            setLoading(false);
        }
    };

    // Helper to get active subcategories
    const activeSubcategories = categories.find(c => c.id == formData.category_id)?.subcategories || [];
    const canSelectScope = categories.length > 0;
    const inputClass = "w-full border border-gray-300 dark:border-slate-500 rounded-lg p-2.5 dark:bg-slate-900 dark:text-white bg-white outline-none focus:border-emerald-500 transition-all shadow-sm";

    return (
        <div className="p-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/settings/roles" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500">
                    <ArrowLeftIcon className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ShieldCheckIcon className="w-8 h-8 text-emerald-500" />
                        Create New Role
                    </h1>
                    <p className="text-sm text-gray-500">Define capabilities and access levels for staff members.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">

                {/* Basic Info Card */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4 dark:text-white">Role Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                                Role Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                required
                                className={inputClass}
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Front Desk Manager"
                            />
                        </div>

                        {canSelectScope && (
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Scope</label>
                                <select
                                    className={inputClass}
                                    value={formData.scope}
                                    onChange={e => setFormData({ ...formData, scope: e.target.value })}
                                >
                                    <option value="global">Global (Full Access)</option>
                                    <option value="category">Category Specific</option>
                                </select>
                            </div>
                        )}

                        {canSelectScope && formData.scope === 'category' && (
                            <>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Category</label>
                                    <select
                                        className={inputClass}
                                        value={formData.category_id}
                                        onChange={e => setFormData({ ...formData, category_id: e.target.value, subcategory_id: '' })}
                                        required
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                {formData.category_id && (
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Subcategory (Optional)</label>
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
                    </div>
                </div>

                {/* Unified Permissions Table */}
                {templates.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6">
                        <h3 className="text-lg font-semibold mb-3 dark:text-white">Role Templates</h3>
                        <p className="text-sm text-gray-500 mb-4">Apply a ready-to-use template, then fine-tune permissions below.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    </div>
                )}

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/20">
                        <h3 className="text-lg font-semibold dark:text-white">Role Capabilities & Menu Access</h3>
                        <p className="text-sm text-gray-500">Enable modules, sidebar menus, and specific actions for this role.</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                            <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48">Module</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Menu</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">Slug</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Capabilities</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Active</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                                {modules.map((mod) => {
                                    // Helper: check if all perms + menu (if applicable) are selected
                                    const allActions = (mod.permissions || []).map((p: any) => p.slug);

                                    const isAllSelected = allActions.every((s: string) => formData.permissions.includes(s));
                                    const isAnySelected = formData.permissions.some(p => allActions.includes(p));
                                    const menuSlug = `menu.${mod.key}`;
                                    const isMenuSelected = formData.permissions.includes(menuSlug);

                                    return (
                                        <tr key={mod.key} className={isAnySelected ? "bg-emerald-50/30 dark:bg-emerald-900/5" : ""}>
                                            {/* Module Name */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <span className={`font-semibold ${isAnySelected ? 'text-emerald-900 dark:text-emerald-100' : 'text-gray-900 dark:text-white'}`}>{mod.name}</span>
                                                </div>
                                            </td>

                                            {/* Menu Checkbox */}
                                            <td className="px-6 py-4 text-center">
                                                {mod.hasMenu ? (
                                                    <div className="flex justify-center">
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only peer"
                                                                checked={isMenuSelected}
                                                                onChange={() => togglePermission(menuSlug)}
                                                            />
                                                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                                                        </label>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300 dark:text-gray-600 text-xs">-</span>
                                                )}
                                            </td>

                                            {/* Slug */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <code className="px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded text-xs font-mono w-fit">
                                                        {mod.key}
                                                    </code>
                                                </div>
                                            </td>

                                            {/* Capabilities */}
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {(mod.permissions || []).filter((perm: any) => !String(perm.slug).startsWith('menu.')).map((perm: any) => {
                                                        const slug = perm.slug;
                                                        const isChecked = formData.permissions.includes(slug);
                                                        return (
                                                            <label
                                                                key={slug}
                                                                className={`
                                                                    flex items-center space-x-2 cursor-pointer px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all select-none
                                                                    ${isChecked
                                                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
                                                                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-400'}
                                                                `}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => togglePermission(slug)}
                                                                    className="sr-only"
                                                                />
                                                                <span>{perm.label || slug}</span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </td>

                                            {/* Active Toggle */}
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData(prev => {
                                                                let newPerms = [...prev.permissions];
                                                                if (isAnySelected) {
                                                                    // If ANY are selected, turning OFF removes ALL
                                                                    newPerms = newPerms.filter(p => !allActions.includes(p));
                                                                } else {
                                                                    // If NONE are selected, turning ON adds ALL
                                                                    newPerms = [...newPerms, ...allActions];
                                                                }
                                                                return { ...prev, permissions: newPerms };
                                                            });
                                                        }}
                                                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${isAnySelected ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-slate-700'}`}
                                                    >
                                                        <span className="sr-only">Use setting</span>
                                                        <span
                                                            aria-hidden="true"
                                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isAnySelected ? 'translate-x-5' : 'translate-x-0'}`}
                                                        />
                                                    </button>
                                                </div>
                                                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mt-1 block">
                                                    {isAnySelected ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {modules.length === 0 && (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Loading module definitions...</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex items-center gap-4 pt-4 pb-12">
                    <Button
                        type="submit"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[150px] shadow-lg shadow-emerald-500/20"
                        disabled={loading}
                    >
                        {loading ? 'Creating...' : 'Create Role'}
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowBuilder(true)}
                        className="flex items-center gap-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        <span className="w-5 h-5 flex items-center justify-center">📊</span>
                        Design Dashboard
                    </Button>

                    <Link href="/settings/roles">
                        <Button variant="ghost" type="button">Cancel</Button>
                    </Link>
                </div>

            </form>

            {/* Dashboard Builder Modal */}
            {showBuilder && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        {/* Background Overlay */}
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-900 opacity-75" onClick={() => setShowBuilder(false)}></div>
                        </div>

                        {/* Modal Panel */}
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white dark:bg-slate-900 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full h-[90vh] flex flex-col">

                            {/* Modal Header */}
                            <div className="bg-white dark:bg-slate-900 px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-white" id="modal-title">
                                        Design Dashboard for {formData.name || 'New Role'}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Drag and drop widgets. Only widgets available to the active menus are shown.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="bg-white dark:bg-slate-800 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                                    onClick={() => setShowBuilder(false)}
                                >
                                    <span className="sr-only">Close</span>
                                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                                </button>
                            </div>

                            {/* Modal Body: Builder */}
                            <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-slate-950">
                                <DashboardBuilder
                                    selectedPermissions={formData.permissions}
                                    onCancel={() => setShowBuilder(false)}
                                // In a real app we'd pass a save handler here that links the created template ID to the role form
                                // or saves it to a separate state. For UI demo we just show the builder.
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
