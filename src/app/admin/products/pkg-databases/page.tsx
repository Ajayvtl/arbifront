"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { PlusIcon, TrashIcon, CircleStackIcon, PencilIcon, CheckCircleIcon, XCircleIcon, SignalIcon, PowerIcon, Squares2X2Icon, ListBulletIcon, ArrowDownTrayIcon, MagnifyingGlassIcon, TagIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import * as XLSX from 'xlsx';
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "react-hot-toast";

export default function PkgDatabasesPage() {
    const [databases, setDatabases] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [packages, setPackages] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentId, setCurrentId] = useState<number | null>(null);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState('');
    const [createActionReason, setCreateActionReason] = useState('');

    // View State
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [search, setSearch] = useState("");
    const [filterCategory, setFilterCategory] = useState("");
    const [page, setPage] = useState(1);
    const LIMIT = 9;

    const [formData, setFormData] = useState({
        category_id: '',
        subcategory_id: '', // UI Helper
        package_id: '',
        host: '',
        database_name: '',
        description: '',
        username: '',
        password: '',
        is_active: true
    });

    const fetchData = async () => {
        try {
            const [dbRes, catRes, pkgRes] = await Promise.all([
                api.get('/saas/databases'), // Pkg DBs
                api.get('/saas/categories'),
                api.get('/saas/packages')
            ]);
            setDatabases(dbRes.data.data);
            setCategories(catRes.data.data);
            setPackages(pkgRes.data.data);
        } catch (error) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    // Filter & Pagination
    const filteredDatabases = databases.filter(item => {
        const matchesSearch =
            item.database_name.toLowerCase().includes(search.toLowerCase()) ||
            item.host.toLowerCase().includes(search.toLowerCase()) ||
            (item.package_name && item.package_name.toLowerCase().includes(search.toLowerCase())) ||
            (item.description && item.description.toLowerCase().includes(search.toLowerCase()));

        // We can link package back to category if package info contains it, 
        // but for now filter on DB level might be tricky if DB record doesn't have category_name.
        // `PackageDatabaseController` joins `saas_packages`.
        // Usually `saas_packages` has `category_id`.
        // Let's assume we can filter if needed, but for MVP simple search is fine.
        return matchesSearch;
    });

    const totalPages = Math.ceil(filteredDatabases.length / LIMIT);
    const paginatedDatabases = filteredDatabases.slice((page - 1) * LIMIT, page * LIMIT);

    const handleExport = () => {
        const data = filteredDatabases.map(item => ({
            ID: item.id,
            Package: item.package_name,
            Host: item.host,
            Database: item.database_name,
            Username: item.username,
            Description: item.description || '-',
            Status: item.is_active ? 'Active' : 'Inactive'
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Databases");
        XLSX.writeFile(wb, "pkg_databases_config.xlsx");
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openCreate = () => {
        setFormData({
            category_id: '', subcategory_id: '', package_id: '',
            host: '', database_name: '', description: '',
            username: '', password: '', is_active: true
        });
        setEditMode(false);
        setTestStatus('idle');
        setTestMessage('');
        setCreateActionReason('');
        setIsModalOpen(true);
    };

    const openEdit = (item: any) => {
        // We need to reverse lookup Category/Subcategory for the package
        const pkg = packages.find(p => p.id === item.package_id);

        setFormData({
            category_id: pkg?.category_id || '',
            subcategory_id: pkg?.subcategory_id || '',
            package_id: item.package_id,
            host: item.host,
            database_name: item.database_name,
            description: item.description || '',
            username: item.username,
            password: '',
            is_active: item.is_active
        });
        setCurrentId(item.id);
        setEditMode(true);
        setTestStatus('idle');
        setTestMessage('');
        setIsModalOpen(true);
    };

    // Secure Action State
    const [actionToConfirm, setActionToConfirm] = useState<{ type: 'delete' | 'toggle' | 'edit' | 'export' | 'import', item: any } | null>(null);
    const [securePassword, setSecurePassword] = useState('');
    const [actionReason, setActionReason] = useState('');
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const importItemRef = useRef<any>(null);

    const initiateSecureAction = (type: 'delete' | 'toggle' | 'edit' | 'export' | 'import', item: any) => {
        setActionToConfirm({ type, item });
        setSecurePassword('');
        setActionReason('');
        setShowPasswordModal(true);
    };

    const handleImportClick = (item: any) => {
        importItemRef.current = item;
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImportFile(e.target.files[0]);
            if (importItemRef.current) {
                initiateSecureAction('import', importItemRef.current);
            }
        }
    };

    const handleSecureAction = async () => {
        if (!actionToConfirm || !securePassword || !actionReason.trim()) return;

        try {
            if (actionToConfirm.type === 'delete') {
                await api.delete(`/saas/databases/${actionToConfirm.item.id}`, {
                    data: { admin_password: securePassword, action_reason: actionReason.trim() }
                });
                toast.success("Deleted successfully");
            } else if (actionToConfirm.type === 'toggle') {
                await api.put(`/saas/databases/${actionToConfirm.item.id}`, {
                    ...actionToConfirm.item,
                    is_active: !actionToConfirm.item.is_active,
                    admin_password: securePassword,
                    action_reason: actionReason.trim()
                });
                toast.success("Status updated");
            } else if (actionToConfirm.type === 'export') {
                const toastId = toast.loading("Exporting...");
                const response = await api.post(`/saas/databases/${actionToConfirm.item.id}/export`,
                    { admin_password: securePassword, action_reason: actionReason.trim() },
                    { responseType: 'blob' }
                );
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `dump_${actionToConfirm.item.database_name}.sql`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                toast.dismiss(toastId);
                toast.success("Export Downloaded");
            } else if (actionToConfirm.type === 'import') {
                if (!importFile) return;
                const toastId = toast.loading("Importing...");
                const formData = new FormData();
                formData.append('file', importFile);
                formData.append('admin_password', securePassword);
                formData.append('action_reason', actionReason.trim());

                await api.post(`/saas/databases/${actionToConfirm.item.id}/import`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast.dismiss(toastId);
                toast.success("Import Successful");
                setImportFile(null);
            }

            if (actionToConfirm.type !== 'edit' && actionToConfirm.type !== 'export') fetchData();
        } catch (error: any) {
            if (actionToConfirm.type === 'export' && error.response?.data instanceof Blob) {
                const text = await error.response.data.text();
                try {
                    const json = JSON.parse(text);
                    toast.error(json.message || "Export Failed");
                } catch (e) { toast.error("Export Failed"); }
            } else {
                toast.error(error.response?.data?.message || "Action Failed");
            }
        } finally {
            setShowPasswordModal(false);
            if (actionToConfirm.type !== 'edit') setActionToConfirm(null);
        }
    };

    // Modified Handlers
    const runConnectionTest = async () => {
        setTestStatus('testing');
        setTestMessage('Testing connection...');
        try {
            if (!formData.host || !formData.database_name || !formData.username || (!formData.password && !editMode)) {
                setTestStatus('error');
                setTestMessage('Missing credentials for testing');
                return;
            }
            const payload =
                editMode && currentId && !formData.password
                    ? { db_id: currentId }
                    : formData;
            const res = await api.post('/saas/databases/test', payload);
            if (res.data.success) {
                setTestStatus('success');
                setTestMessage(res.data.message);
                toast.success("Connection Successful!");
            } else {
                setTestStatus('error');
                setTestMessage(res.data.message || 'Connection failed');
            }
        } catch (error: any) {
            setTestStatus('error');
            setTestMessage(error.response?.data?.message || 'Connection failed');
        }
    };

    const runListTest = async (item: any) => {
        const toastId = toast.loading("Testing connection...");
        try {
            const res = await api.post('/saas/databases/test', {
                db_id: item.id
            });
            if (res.data.success) {
                toast.success("Connection OK!", { id: toastId });
            }
        } catch (error: any) {
            toast.error(`Failed: ${error.response?.data?.message || 'Error'}`, { id: toastId });
        }
    };

    // Replaced direct calls with Secure Initiation
    const toggleStatus = (id: number, currentStatus: boolean, item: any) => {
        initiateSecureAction('toggle', item);
    };

    const handleDelete = (id: number) => {
        initiateSecureAction('delete', { id });
    };

    // Creating / Editing
    const [pendingFormSubmit, setPendingFormSubmit] = useState(false);
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // If Adding, no password needed usually? Or allow directly?
        // Let's require password for Edit (Update) but maybe not for Add?
        // User said "edit of disable db".
        if (editMode) {
            setPendingFormSubmit(true);
            setActionToConfirm({ type: 'edit', item: null }); // Item null as we use formData
            setSecurePassword('');
            setShowPasswordModal(true);
            return;
        }

        try {
            await api.post('/saas/databases', { ...formData, action_reason: createActionReason.trim() });
            toast.success("Database Added");
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Operation failed");
        }
    };

    const confirmEditSubmit = async () => {
        try {
            await api.put(`/saas/databases/${currentId}`, { ...formData, admin_password: securePassword, action_reason: actionReason.trim() });
            toast.success("Database Updated");
            setIsModalOpen(false);
            setShowPasswordModal(false);
            setPendingFormSubmit(false);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Update Failed");
            // Keep modal open on error?
        }
    };


    // ... helpers unchanged ...
    const activeSubcategories = categories.find(c => c.id == formData.category_id)?.subcategories || [];
    const activePackages = packages.filter(p => {
        if (!formData.category_id) return false;
        if (p.category_id != formData.category_id) return false;
        if (formData.subcategory_id && p.subcategory_id != formData.subcategory_id) return false;
        return true;
    });

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <input type="file" ref={fileInputRef} className="hidden" accept=".sql" onChange={handleFileChange} />
            {/* Headers and Toolbar (unchanged structure) */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <TagIcon className="w-8 h-8 text-indigo-500" />
                        Package Databases
                    </h1>
                    <p className="text-sm text-gray-500">Assign separate databases to specific Packages</p>
                </div>
                <Button onClick={openCreate} className="flex items-center gap-2">
                    <PlusIcon className="w-4 h-4" /> Add Configuration
                </Button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col xl:flex-row justify-between items-center gap-4 mb-6 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                <div className="flex flex-1 gap-4 w-full xl:w-auto">
                    <div className="relative flex-1 max-w-md">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20"
                            placeholder="Search Databases..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="bg-gray-100 dark:bg-slate-700 p-1 rounded-lg flex gap-1">
                        <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 shadow text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}><Squares2X2Icon className="w-5 h-5" /></button>
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}><ListBulletIcon className="w-5 h-5" /></button>
                    </div>
                </div>
            </div>

            {/* Content Table / Grid */}
            {viewMode === 'list' ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden border border-gray-200 dark:border-slate-700">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
                            <tr>
                                <th className="px-6 py-4">Package</th>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4">Host Details</th>
                                <th className="px-6 py-4">Credentials</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {paginatedDatabases.map((item: any) => (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{item.package_name || '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{item.description || '-'}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="font-mono text-gray-700 dark:text-gray-300">{item.host}</div>
                                        <div className="text-xs text-gray-400">{item.database_name}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{item.username} : ***</td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button onClick={() => runListTest(item)} className="p-2 text-gray-400 hover:text-blue-600 rounded bg-gray-50 dark:bg-slate-700 hover:bg-blue-50" title="Check Connection"><SignalIcon className="w-4 h-4" /></button>
                                        <button onClick={() => initiateSecureAction("export", item)} className="p-2 rounded bg-gray-50 dark:bg-slate-700 text-blue-500 hover:text-blue-700" title="Export SQL"><ArrowDownTrayIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleImportClick(item)} className="p-2 rounded bg-gray-50 dark:bg-slate-700 text-orange-500 hover:text-orange-700" title="Import SQL"><ArrowUpTrayIcon className="w-4 h-4" /></button>
                                        <button onClick={() => toggleStatus(item.id, item.is_active, item)} className={`p-2 rounded bg-gray-50 dark:bg-slate-700 ${item.is_active ? 'text-emerald-500 hover:text-emerald-700' : 'text-gray-400 hover:text-emerald-500'}`} title="Toggle Status"><PowerIcon className="w-4 h-4" /></button>
                                        <button onClick={() => openEdit(item)} className="p-2 text-gray-400 hover:text-emerald-600 rounded bg-gray-50 dark:bg-slate-700 hover:bg-emerald-50" title="Edit"><PencilIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600 rounded bg-gray-50 dark:bg-slate-700 hover:bg-red-50" title="Delete"><TrashIcon className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedDatabases.map((item: any) => (
                        <div key={item.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 flex flex-col hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><TagIcon className="w-6 h-6" /></div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white">{item.package_name}</h3>
                                        <p className="text-xs text-gray-500 font-mono">{item.host}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => runListTest(item)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-400 hover:text-blue-600"><SignalIcon className="w-4 h-4" /></button>
                                    <button onClick={() => initiateSecureAction("export", item)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-blue-500 hover:text-blue-700" title="Export"><ArrowDownTrayIcon className="w-4 h-4" /></button>
                                    <button onClick={() => handleImportClick(item)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-orange-500 hover:text-orange-700" title="Import"><ArrowUpTrayIcon className="w-4 h-4" /></button>
                                    <button onClick={() => toggleStatus(item.id, item.is_active, item)} className={`p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded ${item.is_active ? 'text-emerald-500' : 'text-gray-400'}`}><PowerIcon className="w-4 h-4" /></button>
                                    <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-400 hover:text-blue-600"><PencilIcon className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2 min-h-[2.5rem]">{item.description || 'No description provided.'}</p>
                            <div className="flex flex-col gap-2 mb-4 text-xs">
                                <div className="flex justify-between"><span className="text-gray-500">Database</span><span className="font-mono text-gray-700 dark:text-gray-300">{item.database_name}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Status</span><span className={`font-medium ${item.is_active ? 'text-emerald-600' : 'text-red-600'}`}>{item.is_active ? 'Active' : 'Inactive'}</span></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-8 w-full max-w-lg shadow-2xl border border-gray-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-6 dark:text-white">{editMode ? 'Edit Configuration' : 'Add Package Database'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Filter Section */}
                            <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                                {/* ... Selects kept same ... */}
                                <div>
                                    <label className="block text-xs font-medium mb-1 dark:text-gray-400">1. Category Filter</label>
                                    <select value={formData.category_id} onChange={e => setFormData({ ...formData, category_id: e.target.value, subcategory_id: '', package_id: '' })} className="w-full px-2 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded">
                                        <option value="">Select Category</option> {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1 dark:text-gray-400">2. Subcategory</label>
                                    <select value={formData.subcategory_id} onChange={e => setFormData({ ...formData, subcategory_id: e.target.value, package_id: '' })} className="w-full px-2 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded" disabled={!formData.category_id}>
                                        <option value="">All</option> {activeSubcategories.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold mb-1 dark:text-white text-emerald-600">3. Select Package (Required)</label>
                                    <select value={formData.package_id} onChange={e => setFormData({ ...formData, package_id: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border-2 border-emerald-500/50 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm" required disabled={!formData.category_id}>
                                        <option value="">Select Package</option> {activePackages.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.currency} {p.price_monthly})</option>)}
                                    </select>
                                </div>
                            </div>

                            <Input label="Description (Label)" placeholder="e.g. Dedicated DB for Premium Pkg" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            {!editMode && (
                                <Input
                                    label="Action Reason (Required)"
                                    placeholder="Why are you creating this Package DB mapping?"
                                    value={createActionReason}
                                    onChange={e => setCreateActionReason(e.target.value)}
                                    required
                                />
                            )}

                            <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-700 space-y-4">
                                <h3 className="text-xs font-bold uppercase text-gray-500">Target Database connection</h3>
                                <Input label="Host IP / Domain" placeholder="127.0.0.1" value={formData.host} onChange={e => setFormData({ ...formData, host: e.target.value })} required />
                                <Input label="Database Name" placeholder="db_name" value={formData.database_name} onChange={e => setFormData({ ...formData, database_name: e.target.value })} required />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Username" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required />
                                    <Input label="Password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700">
                                <div className="flex items-center gap-2">
                                    {testStatus === 'success' ? <CheckCircleIcon className="w-5 h-5 text-emerald-500" /> : testStatus === 'error' ? <XCircleIcon className="w-5 h-5 text-red-500" /> : <SignalIcon className="w-5 h-5 text-gray-400" />}
                                    <span className={`text-sm font-medium ${testStatus === 'success' ? 'text-emerald-600' : testStatus === 'error' ? 'text-red-600' : 'text-gray-500'}`}>{testMessage || 'Test connection before saving'}</span>
                                </div>
                                <Button type="button" variant="secondary" onClick={runConnectionTest} disabled={testStatus === 'testing'}>{testStatus === 'testing' ? 'Testing...' : 'Check Connection'}</Button>
                            </div>

                            <div className="flex justify-end gap-3 mt-4 pt-4 border-t dark:border-slate-700">
                                <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={testStatus !== 'success' || (!editMode && !createActionReason.trim())}>{editMode ? 'Update Configuration' : 'Save Configuration'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Password Confirmation Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-sm shadow-2xl border border-red-200 dark:border-red-900 animate-in fade-in zoom-in duration-200">
                        <div className="text-center mb-6">
                            <div className="bg-red-100 dark:bg-red-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                <div className="text-red-600 dark:text-red-400"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg></div>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Admin Authentication</h3>
                            <p className="text-sm text-gray-500 mt-1">Please enter your password to confirm this sensitive action.</p>
                        </div>
                        <input
                            type="password"
                            autoFocus
                            className="w-full px-4 py-3 text-center text-lg tracking-widest border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-slate-900 dark:text-white mb-6"
                            placeholder="Current Password"
                            value={securePassword}
                            onChange={e => setSecurePassword(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && securePassword && actionReason.trim()) {
                                    if (actionToConfirm?.type === 'edit') confirmEditSubmit();
                                    else handleSecureAction();
                                }
                            }}
                        />
                        <Input
                            label="Action Reason (Required)"
                            placeholder="Reason for this sensitive action"
                            value={actionReason}
                            onChange={e => setActionReason(e.target.value)}
                            required
                        />
                        <div className="flex gap-3">
                            <Button variant="ghost" onClick={() => setShowPasswordModal(false)} className="flex-1">Cancel</Button>
                            <Button
                                onClick={() => {
                                    if (actionToConfirm?.type === 'edit') confirmEditSubmit();
                                    else handleSecureAction();
                                }}
                                disabled={!securePassword || !actionReason.trim()}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                            >
                                Confirm
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
