"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { PlusIcon, TrashIcon, CubeTransparentIcon, MagnifyingGlassIcon, PencilIcon, LinkIcon, GlobeAltIcon, FolderIcon, XMarkIcon, Squares2X2Icon, ListBulletIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import * as XLSX from 'xlsx';
import { Button } from "@/components/ui/Button";
import { toast } from "react-hot-toast";

// Reusing SearchableSelect
const SearchableSelect = ({ label, options, value, onChange, placeholder, disabled }: any) => {
    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    const selectedOption = options.find((o: any) => o.id == value);
    const filtered = options.filter((o: any) => o.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="relative">
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{label}</label>
            <div
                className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer flex justify-between items-center ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className={`block truncate ${selectedOption ? "text-gray-900 dark:text-white" : "text-gray-400"}`}>
                    {selectedOption ? selectedOption.name : placeholder}
                </span>
                <span className="text-xs text-gray-400">▼</span>
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-hidden flex flex-col">
                    <div className="p-2 border-b dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
                        <input
                            autoFocus
                            className="w-full px-2 py-1 text-sm bg-gray-50 dark:bg-slate-900 border-none rounded outline-none focus:ring-0"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="overflow-y-auto flex-1 p-1">
                        {filtered.length === 0 ? (
                            <div className="p-2 text-sm text-gray-400 text-center">No results</div>
                        ) : (
                            filtered.map((opt: any) => (
                                <div
                                    key={opt.id}
                                    className={`px-3 py-2 text-sm rounded cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 ${opt.id == value ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600' : 'text-gray-700 dark:text-gray-300'}`}
                                    onClick={() => {
                                        onChange(opt.id);
                                        setIsOpen(false);
                                        setSearch("");
                                    }}
                                >
                                    {opt.name}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
            {isOpen && <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsOpen(false)} />}
        </div>
    );
};

export default function ModulesPage() {
    const [modules, setModules] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [countries, setCountries] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const LIMIT = 10;

    // Modals
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isAssignOpen, setIsAssignOpen] = useState(false);

    const [search, setSearch] = useState("");
    const [filterCategory, setFilterCategory] = useState("");
    const [filterSubcategory, setFilterSubcategory] = useState("");
    const [selectedModule, setSelectedModule] = useState<any>(null);

    // Form Data
    const [moduleForm, setModuleForm] = useState({ id: null, name: '', slug: '', description: '' });
    const [scopeForm, setScopeForm] = useState({
        category_id: '', subcategory_id: '',
        country_id: '', state_id: '', city_id: ''
    });

    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    const handleExport = () => {
        const data = modules.map(m => ({
            ID: m.id,
            Name: m.name,
            Slug: m.slug,
            Type: m.is_core ? 'Core' : 'Custom',
            Scopes: (m.scopes || []).map((s: any) => s.country_name || 'Global').join(', '),
            Description: m.description
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Modules");
        XLSX.writeFile(wb, "modules_export.xlsx");
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = {
                search, page, limit: LIMIT,
                category_id: filterCategory,
                subcategory_id: filterSubcategory
            };
            const [modRes, catRes, cntRes] = await Promise.all([
                api.get('/saas/modules', { params }),
                api.get('/saas/categories'),
                api.get('/master/countries')
            ]);
            setModules(modRes.data.data.data);
            setTotalPages(modRes.data.data.pagination?.pages || 1);
            setCategories(catRes.data.data);
            setCountries(cntRes.data.data);
        } catch (error) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [search, page, filterCategory, filterSubcategory]); // Re-fetch on filter change

    // Dependent Fetching for Scope Modal
    useEffect(() => {
        if (scopeForm.country_id) {
            api.get(`/master/states?country_id=${scopeForm.country_id}`)
                .then(res => setStates(res.data.data))
                .catch(() => setStates([]));
        } else {
            setStates([]); setCities([]);
        }
    }, [scopeForm.country_id]);

    useEffect(() => {
        if (scopeForm.state_id) {
            api.get(`/master/cities?state_id=${scopeForm.state_id}&country_id=${scopeForm.country_id}`)
                .then(res => setCities(res.data.data))
                .catch(() => setCities([]));
        } else {
            setCities([]);
        }
    }, [scopeForm.state_id]);

    // CRUD Handlers
    const handleCreateUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (moduleForm.id) {
                await api.put(`/saas/modules/${moduleForm.id}`, moduleForm);
                toast.success("Updated");
            } else {
                await api.post('/saas/modules', moduleForm);
                toast.success("Created");
            }
            setIsCreateOpen(false);
            fetchData();
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this module definition?")) return;
        try {
            await api.delete(`/saas/modules/${id}`);
            toast.success("Deleted");
            fetchData();
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Delete failed");
        }
    };

    const handleAssignScope = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedModule) return;
        try {
            await api.post(`/saas/modules/${selectedModule.id}/scopes`, scopeForm);
            toast.success("Scope Assigned");
            setScopeForm({ category_id: '', subcategory_id: '', country_id: '', state_id: '', city_id: '' });
            fetchData();
            // Refresh selectedModule
            const res = await api.get('/saas/modules', { params: { search, page, limit: LIMIT, category_id: filterCategory, subcategory_id: filterSubcategory } });
            const newModules = res.data.data.data;
            setModules(newModules);
            const found = newModules.find((m: any) => m.id === selectedModule.id);
            if (found) setSelectedModule(found);

        } catch (e: any) {
            toast.error(e.response?.data?.message || "Assignment failed");
        }
    };

    const handleRemoveScope = async (scopeId: number) => {
        if (!confirm("Remove this assignment?")) return;
        try {
            await api.delete(`/saas/modules/scopes/${scopeId}`);
            toast.success("Removed");
            // Refresh
            const res = await api.get('/saas/modules', { params: { search, page, limit: LIMIT, category_id: filterCategory, subcategory_id: filterSubcategory } });
            const newModules = res.data.data.data;
            setModules(newModules);
            const found = newModules.find((m: any) => m.id === selectedModule.id);
            if (found) setSelectedModule(found);
        } catch (e) {
            toast.error("Failed");
        }
    };

    const openCreate = () => {
        setModuleForm({ id: null, name: '', slug: '', description: '' });
        setIsCreateOpen(true);
    };

    const openEdit = (m: any) => {
        setModuleForm({ id: m.id, name: m.name, slug: m.slug, description: m.description });
        setIsCreateOpen(true);
    };

    const openAssign = (m: any) => {
        setSelectedModule(m);
        setScopeForm({ category_id: '', subcategory_id: '', country_id: '', state_id: '', city_id: '' });
        setIsAssignOpen(true);
    };

    const activeSubcategories = categories.find(c => c.id == scopeForm.category_id)?.subcategories || [];
    const filterSubcategories = categories.find(c => c.id == filterCategory)?.subcategories || [];

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <CubeTransparentIcon className="w-8 h-8 text-blue-500" />
                        Modules & Features
                    </h1>
                    <p className="text-sm text-gray-500">Manage System Modules and Assign Availability</p>
                </div>
                <Button onClick={openCreate} className="flex items-center gap-2">
                    <PlusIcon className="w-4 h-4" /> Create Definition
                </Button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col xl:flex-row justify-between items-center gap-4 mb-6 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                <div className="flex flex-1 gap-4 w-full xl:w-auto">
                    <div className="relative flex-1 max-w-md">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                            placeholder="Search Modules..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    {/* Filters */}
                    <div className="flex gap-2">
                        <select
                            className="px-4 py-2 border rounded-lg bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 outline-none"
                            value={filterCategory}
                            onChange={e => { setFilterCategory(e.target.value); setFilterSubcategory(""); }}
                        >
                            <option value="">All Categories</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>

                        {filterCategory && (
                            <select
                                className="px-4 py-2 border rounded-lg bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 outline-none"
                                value={filterSubcategory}
                                onChange={e => setFilterSubcategory(e.target.value)}
                            >
                                <option value="">All Subcategories</option>
                                {filterSubcategories.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="bg-gray-100 dark:bg-slate-700 p-1 rounded-lg flex gap-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 shadow text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Squares2X2Icon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <ListBulletIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <button
                        onClick={handleExport}
                        className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                        title="Export to Excel"
                    >
                        <ArrowDownTrayIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* List/Grid Content */}
            {viewMode === 'list' ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden border border-gray-200 dark:border-slate-700">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
                            <tr>
                                <th className="px-6 py-4">Module Name</th>
                                <th className="px-6 py-4 px-20">Availability</th>
                                <th className="px-6 py-4 text-center">Type</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {modules.map((item: any) => (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                                    <td className="px-6 py-4 align-top w-1/3">
                                        <div className="font-bold text-gray-900 dark:text-white">{item.name}</div>
                                        <div className="font-mono text-xs text-blue-500 mb-1">{item.slug}</div>
                                        <div className="text-xs text-gray-500 line-clamp-2">{item.description}</div>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="flex flex-wrap gap-2">
                                            {(item.scopes || []).map((scope: any) => (
                                                <span key={scope.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 max-w-full">
                                                    {scope.country_name ? (
                                                        <span className="flex items-center gap-1 text-emerald-600 font-medium whitespace-nowrap">
                                                            <GlobeAltIcon className="w-3 h-3" /> {scope.country_name}
                                                        </span>
                                                    ) : <span className="text-gray-400">🌐 Global</span>}

                                                    {scope.category_name && (
                                                        <>
                                                            <span className="text-gray-300">|</span>
                                                            <span className="flex items-center gap-1 text-indigo-600 font-medium whitespace-nowrap">
                                                                <FolderIcon className="w-3 h-3" /> {scope.category_name}
                                                            </span>
                                                        </>
                                                    )}

                                                    {!scope.country_name && !scope.category_name && (
                                                        <span className="text-gray-500 font-medium">All Regions & Categories</span>
                                                    )}
                                                </span>
                                            ))}
                                            {(item.scopes || []).length === 0 && (
                                                <span className="text-xs text-gray-400 italic">No Assignments (Inactive)</span>
                                            )}
                                        </div>
                                        <button onClick={() => openAssign(item)} className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                                            <LinkIcon className="w-3 h-3" /> Manage Assignments
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-center align-top">
                                        <span className={`px-2 py-0.5 rounded text-xs border ${item.is_core ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                                            {item.is_core ? 'Core' : 'Custom'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right align-top flex justify-end gap-2">
                                        <button onClick={() => openEdit(item)} className="p-2 text-gray-400 hover:text-blue-600 rounded bg-gray-50 dark:bg-slate-700 hover:bg-blue-50">
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        {!item.is_core && (
                                            <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600 rounded bg-gray-50 dark:bg-slate-700 hover:bg-red-50">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modules.map((item: any) => (
                        <div key={item.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 flex flex-col hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        {item.name}
                                        {item.is_core && <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded border border-purple-200">Core</span>}
                                    </h3>
                                    <span className="text-xs font-mono text-gray-500">{item.slug}</span>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-400 hover:text-blue-600 transition-colors">
                                        <PencilIcon className="w-4 h-4" />
                                    </button>
                                    {!item.is_core && (
                                        <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-400 hover:text-red-600 transition-colors">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2 h-10">{item.description}</p>

                            <div className="mt-auto space-y-3">
                                <div className="flex flex-wrap gap-2 max-h-16 overflow-hidden">
                                    {(item.scopes || []).map((scope: any) => (
                                        <span key={scope.id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] bg-gray-100 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-700">
                                            {scope.country_name || 'Global'}
                                        </span>
                                    ))}
                                    {(item.scopes || []).length === 0 && <span className="text-xs text-gray-400 italic">No Assignments</span>}
                                </div>
                                <button onClick={() => openAssign(item)} className="w-full py-2 flex items-center justify-center gap-2 text-sm border border-dashed border-gray-300 dark:border-slate-600 rounded-lg text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                    <LinkIcon className="w-4 h-4" /> Manage Assignments
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="secondary"
                        disabled={page >= totalPages}
                        onClick={() => setPage(page + 1)}
                    >
                        Next
                    </Button>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {
                isCreateOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-8 w-full max-w-lg shadow-2xl border border-gray-200 dark:border-slate-700">
                            <h2 className="text-xl font-bold mb-6 dark:text-white">{moduleForm.id ? 'Edit Module' : 'Create Module'}</h2>
                            <form onSubmit={handleCreateUpdate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Name</label>
                                    <input required className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700"
                                        value={moduleForm.name} onChange={e => setModuleForm({ ...moduleForm, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Key (Slug)</label>
                                    <input required disabled={!!moduleForm.id} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 disabled:opacity-50"
                                        value={moduleForm.slug} onChange={e => setModuleForm({ ...moduleForm, slug: e.target.value })}
                                        placeholder="e.g. front_desk" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Description</label>
                                    <textarea className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 h-20"
                                        value={moduleForm.description} onChange={e => setModuleForm({ ...moduleForm, description: e.target.value })} />
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <Button variant="ghost" type="button" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save Module</Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Assignments Modal */}
            {
                isAssignOpen && selectedModule && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-8 w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto relative">
                            <button
                                onClick={() => setIsAssignOpen(false)}
                                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>

                            <h2 className="text-xl font-bold mb-2 dark:text-white pr-8">Manage Assignments</h2>
                            <p className="text-sm text-gray-500 mb-6">Assign <b>{selectedModule.name}</b> to specific regions or categories.</p>

                            {/* Existing Assignments */}
                            <div className="mb-8">
                                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Current Scopes</h3>
                                <div className="space-y-2">
                                    {(selectedModule.scopes || []).map((scope: any) => (
                                        <div key={scope.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-lg border dark:border-slate-700">
                                            <div className="flex items-center gap-3">
                                                {scope.country_name ? (
                                                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                                        <span>{scope.country_name}</span>
                                                        {scope.state_name && <span> › {scope.state_name}</span>}
                                                    </span>
                                                ) : <span className="text-gray-400">All Countries</span>}

                                                <span className="text-gray-300">|</span>

                                                {scope.category_name ? (
                                                    <span className="flex items-center gap-1 text-indigo-600 font-medium">
                                                        <span>{scope.category_name}</span>
                                                        {scope.subcategory_name && <span> › {scope.subcategory_name}</span>}
                                                    </span>
                                                ) : <span className="text-gray-400">All Categories</span>}
                                            </div>
                                            <button onClick={() => handleRemoveScope(scope.id)} className="text-red-500 hover:text-red-700 p-1">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {(selectedModule.scopes || []).length === 0 && <p className="text-sm text-gray-400 italic">No active assignments.</p>}
                                </div>
                            </div>

                            <hr className="border-gray-100 dark:border-slate-700 mb-6" />

                            {/* Add New Scope */}
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Add New Assignment</h3>
                            <form onSubmit={handleAssignScope} className="space-y-4 bg-gray-50 dark:bg-slate-900/50 p-4 rounded-xl border dashed border-gray-200">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <SearchableSelect
                                            label="Category" placeholder="All Categories"
                                            options={categories} value={scopeForm.category_id}
                                            onChange={(v: any) => setScopeForm({ ...scopeForm, category_id: v, subcategory_id: '' })}
                                        />
                                    </div>
                                    <div>
                                        {scopeForm.category_id && (
                                            <SearchableSelect
                                                label="Subcategory" placeholder="All Subcategories"
                                                options={activeSubcategories} value={scopeForm.subcategory_id}
                                                onChange={(v: any) => {
                                                    const sub = activeSubcategories.find((s: any) => s.id === v);
                                                    setScopeForm({
                                                        ...scopeForm,
                                                        subcategory_id: v,
                                                        // Auto-fill location if present in subcategory
                                                        country_id: sub?.country_id || scopeForm.country_id,
                                                        state_id: sub?.state_id || scopeForm.state_id,
                                                        city_id: sub?.city_id || scopeForm.city_id
                                                    });
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <SearchableSelect
                                        label="Country" placeholder="All Countries"
                                        options={countries} value={scopeForm.country_id}
                                        onChange={(v: any) => setScopeForm({ ...scopeForm, country_id: v, state_id: '', city_id: '' })}
                                    />
                                    <SearchableSelect
                                        label="State" placeholder="All States"
                                        options={states} value={scopeForm.state_id}
                                        onChange={(v: any) => setScopeForm({ ...scopeForm, state_id: v, city_id: '' })}
                                        disabled={!scopeForm.country_id}
                                    />
                                    <SearchableSelect
                                        label="City" placeholder="All Cities"
                                        options={cities} value={scopeForm.city_id}
                                        onChange={(v: any) => setScopeForm({ ...scopeForm, city_id: v })}
                                        disabled={!scopeForm.state_id}
                                    />
                                </div>
                                <div className="flex justify-end pt-2">
                                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto">
                                        <PlusIcon className="w-4 h-4 mr-2" /> Add Assignment
                                    </Button>
                                </div>
                            </form>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t dark:border-slate-700">
                                <Button variant="secondary" type="button" onClick={() => setIsAssignOpen(false)}>Close</Button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
