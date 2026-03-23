"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import {
    ShieldCheckIcon,
    PlusIcon,
    TrashIcon,
    KeyIcon,
    SparklesIcon,
    EyeIcon,
    ListBulletIcon,
    ExclamationTriangleIcon,
    FolderIcon,
    FolderOpenIcon,
    ChevronRightIcon,
    ChevronDownIcon
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { toast } from "react-hot-toast";

// Tree Item Component
const ModuleTreeItem = ({
    module,
    level = 0,
    selectedModule,
    onSelect,
    modules
}: {
    module: any;
    level?: number;
    selectedModule: any;
    onSelect: (module: any) => void;
    modules: any[];
}) => {
    const [expanded, setExpanded] = useState(true); // Default open
    const children = modules.filter((m: any) => m.parent_id === module.id);
    const hasChildren = children.length > 0;
    const isSelected = selectedModule?.id === module.id;

    return (
        <div className="select-none">
            <button
                onClick={() => {
                    onSelect(module);
                    // if (hasChildren) setExpanded(!expanded); // Don't collapse on select, use arrow
                }}
                className={`w-full text-left px-2 py-2 flex items-center justify-between transition-colors border-l-2 ${isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500'
                    : 'hover:bg-gray-50 dark:hover:bg-slate-700 border-transparent'
                    }`}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {hasChildren ? (
                        <div onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="p-0.5 hover:bg-gray-200 dark:hover:bg-slate-600 rounded cursor-pointer">
                            {expanded ? <ChevronDownIcon className="w-3 h-3 text-gray-400" /> : <ChevronRightIcon className="w-3 h-3 text-gray-400" />}
                        </div>
                    ) : <div className="w-4" />}

                    {hasChildren ? <FolderIcon className="w-4 h-4 text-amber-500" /> : <ListBulletIcon className="w-4 h-4 text-gray-400" />}

                    <div>
                        <div className={`text-sm truncate ${isSelected ? 'font-semibold text-emerald-900 dark:text-emerald-300' : 'text-gray-900 dark:text-white'}`}>
                            {module.name}
                        </div>
                    </div>
                </div>
                {module.permCount > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-emerald-200 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                        {module.permCount}
                    </span>
                )}
            </button>

            {expanded && hasChildren && (
                <div>
                    {children.map((child: any) => (
                        <ModuleTreeItem
                            key={child.id}
                            module={child}
                            level={level + 1}
                            selectedModule={selectedModule}
                            onSelect={onSelect}
                            modules={modules}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default function PermissionsMatrixPage() {
    const [modules, setModules] = useState<any[]>([]);
    const [permissions, setPermissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedModule, setSelectedModule] = useState<any>(null);
    const [permLoading, setPermLoading] = useState(false);

    // Form for new permission
    const [newPerm, setNewPerm] = useState({ name: '', slug: '', description: '' });

    // Helper to get root modules
    const rootModules = modules.filter(m => !m.parent_id);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [modRes, permRes] = await Promise.all([
                api.get('/saas/modules?limit=100'), // Should return flat list with parent_ids
                api.get('/settings/roles/permissions')
            ]);

            const rawModules = modRes.data.data.data || []; // Handle pagination wrapper if present
            // OR if API returns direct array (as per my update today):
            // const rawModules = Array.isArray(modRes.data.data) ? modRes.data.data : modRes.data.data.data;
            // Let's assume standard response wrapper `data`.
            const modList = Array.isArray(modRes.data.data) ? modRes.data.data : (modRes.data.data?.data || []);

            const groupedPerms = permRes.data.data;

            const modulesWithCounts = modList.map((m: any) => {
                const group = groupedPerms.find((g: any) => g.module_id === m.id);
                return { ...m, permCount: group ? group.permissions.length : 0 };
            });
            setModules(modulesWithCounts);

            if (selectedModule) {
                const group = groupedPerms.find((g: any) => g.module_id === selectedModule.id);
                setPermissions(group ? group.permissions : []);
            }

        } catch (error) {
            console.error(error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleModuleSelect = async (module: any) => {
        setSelectedModule(module);
        const permRes = await api.get('/settings/roles/permissions');
        const grouped = permRes.data.data;
        const group = grouped.find((g: any) => g.module_id === module.id);
        setPermissions(group ? group.permissions : []);
    };

    const handleAddPermission = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedModule) return;
        let finalSlug = newPerm.slug;
        try {
            setPermLoading(true);
            await api.post(`/saas/modules/${selectedModule.id}/scopes`, {
                name: newPerm.name,
                slug: finalSlug,
                description: newPerm.description
            });
            toast.success("Permission Added");
            setNewPerm({ name: '', slug: '', description: '' });
            handleModuleSelect(selectedModule);
            fetchData();
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to add permission");
        } finally {
            setPermLoading(false);
        }
    };

    const handleDeletePermission = async (id: number) => {
        if (!confirm("Are you sure?")) return;
        try {
            await api.delete(`/saas/modules/scopes/${id}`);
            toast.success("Permission Deleted");
            handleModuleSelect(selectedModule);
            fetchData();
        } catch (e: any) { toast.error("Failed"); }
    };

    const generateDefaults = async () => {
        if (!selectedModule) return;
        if (!confirm(`Generate default CRUD + Menu for ${selectedModule.name}?`)) return;
        const defaults = [
            { suffix: 'view', name: `View ${selectedModule.name}`, desc: `View ${selectedModule.name}` },
            { suffix: 'create', name: `Create ${selectedModule.name}`, desc: `Create ${selectedModule.name}` },
            { suffix: 'update', name: `Edit ${selectedModule.name}`, desc: `Edit ${selectedModule.name}` },
            { suffix: 'delete', name: `Delete ${selectedModule.name}`, desc: `Delete ${selectedModule.name}` },
            { slug: `menu.${selectedModule.slug}`, name: `Menu: ${selectedModule.name}`, desc: `Show in Sidebar` }
        ];
        try {
            setPermLoading(true);
            let added = 0;
            for (const def of defaults) {
                const slug = def.slug || `${selectedModule.slug}.${def.suffix}`;
                const exists = permissions.find(p => p.slug === slug);
                if (!exists) {
                    await api.post(`/saas/modules/${selectedModule.id}/scopes`, { name: def.name, slug, description: def.desc });
                    added++;
                }
            }
            toast.success(`Generated ${added}`);
            handleModuleSelect(selectedModule);
            fetchData();
        } catch (e) { toast.error("Error"); } finally { setPermLoading(false); }
    };

    const inputClass = "w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500";

    return (
        <div className="p-6 max-w-[1600px] mx-auto min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <KeyIcon className="w-8 h-8 text-emerald-500" />
                        Permission & Menu Matrix
                    </h1>
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg max-w-3xl">
                        <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-1">Area 2: System Capability Registry (Source of Truth)</h4>
                        <p className="text-xs text-blue-700 dark:text-blue-200">
                            This page defines <b>what is possible</b> in the system. Use this to register Modules, organize Submenus, and define granular Capabilities (e.g. <code>view</code>, <code>create</code>).
                            These definitions drive the Sidebar layout and populate the checkboxes in the Role Editors.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6 h-[calc(100vh-180px)]">
                {/* Left: Tree */}
                <div className="col-span-12 lg:col-span-3 bg-white dark:bg-slate-800 rounded-xl shadow border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex justify-between items-center">
                        <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Modules</h2>
                        {/* Could add 'New Module' button here */}
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {rootModules.map((mod: any) => (
                            <ModuleTreeItem
                                key={mod.id}
                                module={mod}
                                selectedModule={selectedModule}
                                onSelect={handleModuleSelect}
                                modules={modules}
                            />
                        ))}
                    </div>
                </div>

                {/* Right: Content */}
                <div className="col-span-12 lg:col-span-9 flex flex-col gap-6">
                    {selectedModule ? (
                        <>
                            {/* Header */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedModule.name}</h2>
                                        {selectedModule.parent_id && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Submodule</span>}
                                    </div>
                                    <p className="text-sm text-gray-500">{selectedModule.description}</p>
                                    <div className="flex gap-2 mt-4">
                                        <code className="text-xs bg-gray-100 dark:bg-slate-900 px-2 py-1 rounded text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700">
                                            {selectedModule.slug}
                                        </code>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={generateDefaults} disabled={permLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                        <SparklesIcon className="w-4 h-4 mr-2" />
                                        Auto-Generate
                                    </Button>
                                    {/* Could add 'Add Submodule' button here */}
                                </div>
                            </div>

                            {/* Perms Table */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex-1 flex flex-col overflow-hidden">
                                <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex justify-between items-center">
                                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Capabilities</h3>
                                    <span className="text-xs text-gray-500">{permissions.length} items</span>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50 dark:bg-slate-900/50 text-xs uppercase text-gray-500 font-medium sticky top-0">
                                            <tr>
                                                <th className="px-6 py-3 border-b border-gray-200 dark:border-slate-700">Name</th>
                                                <th className="px-6 py-3 border-b border-gray-200 dark:border-slate-700">Slug</th>
                                                <th className="px-6 py-3 border-b border-gray-200 dark:border-slate-700 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                            {permissions.map((perm: any) => (
                                                <tr key={perm.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                                                    <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                                        <div className="flex items-center gap-2">
                                                            {perm.slug.startsWith('menu.') && <ListBulletIcon className="w-4 h-4 text-purple-500" />}
                                                            {perm.name}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 text-xs text-gray-500 font-mono">{perm.slug}</td>
                                                    <td className="px-6 py-3 text-right">
                                                        <button onClick={() => handleDeletePermission(perm.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {permissions.length === 0 && (
                                                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400">No defined capabilities.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/30">
                                    <form onSubmit={handleAddPermission} className="flex gap-4 items-end">
                                        <div className="flex-1">
                                            <input required placeholder="Name" className={inputClass} value={newPerm.name} onChange={e => setNewPerm({ ...newPerm, name: e.target.value })} />
                                        </div>
                                        <div className="flex-1">
                                            <input required placeholder="Slug" className={`${inputClass} font-mono`} value={newPerm.slug} onChange={e => setNewPerm({ ...newPerm, slug: e.target.value })} />
                                        </div>
                                        <Button type="submit" disabled={permLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">Add</Button>
                                    </form>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
                            <ShieldCheckIcon className="w-20 h-20 text-gray-300 dark:text-slate-600 mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Select a Module</h3>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
