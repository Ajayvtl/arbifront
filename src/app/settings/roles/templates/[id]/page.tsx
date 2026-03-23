"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { toast } from "react-hot-toast";
import { ArrowLeftIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default function EditRoleTemplatePage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id;

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [modules, setModules] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        permissions: [] as string[]
    });

    useEffect(() => {
        const load = async () => {
            try {
                await Promise.all([fetchPermissions(), fetchTemplate()]);
            } finally {
                setFetching(false);
            }
        };
        load();
    }, [id]);

    const fetchPermissions = async () => {
        try {
            const res = await api.get('/settings/roles/permissions');
            const payload = res.data.data || {};
            if (Array.isArray(payload)) {
                setModules(payload);
            } else {
                setModules(payload.modules || []);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load permissions");
        }
    };

    const fetchTemplate = async () => {
        try {
            const res = await api.get(`/settings/roles/templates`);
            // The list API returns all templates. We find the one we need. 
            // Ideally we should have a GET /templates/:id endpoint.
            // Let's check RoleController.js... I didn't verify if GET /templates/:id exists.
            // RoleController.js listTemplates returns all. 
            // I should have added a findById in controller, but RoleTemplateModel has it. 
            // Let's iterate the list for now to avoid another backend cycle if possible, 
            // OR simply rely on the list since it's small.
            // Wait, I strictly implemented listTemplates, create, update, delete. I missed `getTemplate` detail endpoint?
            // Let's check roleRoutes.js.
            // Only listTemplates is there. Update PUT /templates/:id exists.

            // So for now, I will fetch list and find by ID.
            const allTemplates = res.data.data || [];
            // ID from params is string, template id is number usually
            const tpl = allTemplates.find((t: any) => t.id == id);

            if (tpl) {
                setFormData({
                    name: tpl.name,
                    description: tpl.description || '',
                    permissions: tpl.permissions || []
                });
            } else {
                toast.error("Template not found");
                router.push('/settings/roles/templates');
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load template details");
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put(`/settings/roles/templates/${id}`, formData);
            toast.success("Template Updated Successfully");
            router.push('/settings/roles/templates');
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to update template");
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full border border-gray-300 dark:border-slate-500 rounded-lg p-2.5 dark:bg-slate-900 dark:text-white bg-white outline-none focus:border-emerald-500 transition-all shadow-sm";

    if (fetching) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="p-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/settings/roles/templates" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500">
                    <ArrowLeftIcon className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <DocumentDuplicateIcon className="w-8 h-8 text-emerald-500" />
                        Edit Template
                    </h1>
                    <p className="text-sm text-gray-500">Modify standard permissions.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">

                {/* Basic Info */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4 dark:text-white">Template Details</h2>
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                                Template Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                required
                                className={inputClass}
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Shift Manager Standard"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                                Description
                            </label>
                            <textarea
                                className={inputClass}
                                rows={3}
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Briefly describe what this template is for..."
                            />
                        </div>
                    </div>
                </div>

                {/* Permissions Matrix */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/20">
                        <h3 className="text-lg font-semibold dark:text-white">Permission Configuration</h3>
                        <p className="text-sm text-gray-500">Select the modules and capabilities included in this template.</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                            <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48">Module</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Menu</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Capabilities</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Active</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                                {modules.map((mod) => {
                                    const allActions = (mod.permissions || []).map((p: any) => p.slug);
                                    const isAnySelected = formData.permissions.some(p => allActions.includes(p));
                                    const menuSlug = `menu.${mod.key}`;
                                    const isMenuSelected = formData.permissions.includes(menuSlug);

                                    return (
                                        <tr key={mod.key} className={isAnySelected ? "bg-emerald-50/30 dark:bg-emerald-900/5" : ""}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <span className={`font-semibold ${isAnySelected ? 'text-emerald-900 dark:text-emerald-100' : 'text-gray-900 dark:text-white'}`}>{mod.name}</span>
                                                </div>
                                            </td>

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

                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData(prev => {
                                                                let newPerms = [...prev.permissions];
                                                                if (isAnySelected) {
                                                                    newPerms = newPerms.filter(p => !allActions.includes(p));
                                                                } else {
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
                                            </td>
                                        </tr>
                                    );
                                })}
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
                        {loading ? 'Updating...' : 'Update Template'}
                    </Button>
                    <Link href="/settings/roles/templates">
                        <Button variant="ghost" type="button">Cancel</Button>
                    </Link>
                </div>
            </form>
        </div>
    );
}
