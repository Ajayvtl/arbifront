

"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { PlusIcon, TrashIcon, CircleStackIcon, PencilIcon, CheckCircleIcon, XCircleIcon, SignalIcon, PowerIcon, Squares2X2Icon, ListBulletIcon, ArrowDownTrayIcon, MagnifyingGlassIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import * as XLSX from 'xlsx';
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { hasAnyPermission } from "@/lib/permissions";

export default function DatabasesPage() {
    const { user } = useAuth();
    const [databases, setDatabases] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentId, setCurrentId] = useState<number | null>(null);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState('');
    const [dbSourceIndicator, setDbSourceIndicator] = useState('');
    const [createActionReason, setCreateActionReason] = useState('');

    // View State
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [search, setSearch] = useState("");
    const [filterCategory, setFilterCategory] = useState("");
    const [page, setPage] = useState(1);
    const LIMIT = 9;

    const [formData, setFormData] = useState({
        category_id: '',
        subcategory_id: '',
        host: '',
        database_name: '',
        description: '',
        username: '',
        password: '',
        is_active: true
    });

    const canView = hasAnyPermission(user, ['template_db.view', 'template_db.manage', 'settings.view.global', 'menu.template_db']);
    const canManage = hasAnyPermission(user, ['template_db.manage']);
    const canTest = hasAnyPermission(user, ['template_db.test', 'template_db.manage']);
    const canMigrate = hasAnyPermission(user, ['template_db.migrate', 'template_db.manage']);
    const canExport = hasAnyPermission(user, ['template_db.export', 'template_db.manage']);
    const canImport = hasAnyPermission(user, ['template_db.import', 'template_db.manage']);

    const fetchData = async () => {
        try {
            const [dbRes, catRes] = await Promise.all([
                api.get('/saas/template-databases'),
                api.get('/saas/categories')
            ]);
            setDatabases(dbRes.data.data);
            setCategories(catRes.data.data);
            setDbSourceIndicator(dbRes.headers?.['x-db-source'] || catRes.headers?.['x-db-source'] || '');
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
            (item.description && item.description.toLowerCase().includes(search.toLowerCase()));

        const matchesCategory = filterCategory ? item.category_id == filterCategory : true;

        return matchesSearch && matchesCategory;
    });

    const totalPages = Math.ceil(filteredDatabases.length / LIMIT);
    const paginatedDatabases = filteredDatabases.slice((page - 1) * LIMIT, page * LIMIT);

    const handleExport = () => {
        const data = filteredDatabases.map(item => ({
            ID: item.id,
            Scope: `${item.category_name || 'Global'} ${item.subcategory_name ? `> ${item.subcategory_name}` : ''}`,
            Host: item.host,
            Database: item.database_name,
            Username: item.username,
            Description: item.description || '-',
            Status: item.is_active ? 'Active' : 'Inactive'
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Databases");
        XLSX.writeFile(wb, "databases_config.xlsx");
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openCreate = () => {
        setFormData({ category_id: '', subcategory_id: '', host: '', database_name: '', description: '', username: '', password: '', is_active: true });
        setCreateActionReason('');
        setEditMode(false);
        setTestStatus('idle');
        setTestMessage('');
        setIsModalOpen(true);
    };

    const openEdit = (item: any) => {
        setFormData({
            category_id: item.category_id || '',
            subcategory_id: item.subcategory_id || '',
            host: item.host,
            database_name: item.database_name,
            description: item.description || '',
            username: item.username,
            password: item.password || '',
            is_active: item.is_active
        });
        setCurrentId(item.id);
        setEditMode(true);
        setTestStatus('idle');
        setTestMessage('');
        setIsModalOpen(true);
    };

    // Secure Action State
    const [actionToConfirm, setActionToConfirm] = useState<{ type: 'delete' | 'toggle' | 'edit' | 'export' | 'import' | 'migrate', item: any } | null>(null);
    const [securePassword, setSecurePassword] = useState('');
    const [actionReason, setActionReason] = useState('');
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const importItemRef = useRef<any>(null);

    const initiateSecureAction = (type: 'delete' | 'toggle' | 'edit' | 'export' | 'import' | 'migrate', item: any) => {
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
        if (!actionToConfirm || !securePassword) return;

        try {
            if (actionToConfirm.type === 'delete') {
                await api.delete(`/saas/template-databases/${actionToConfirm.item.id}`, {
                    data: { admin_password: securePassword, action_reason: actionReason || null }
                });
                toast.success("Deleted successfully");
            } else if (actionToConfirm.type === 'toggle') {
                await api.put(`/saas/template-databases/${actionToConfirm.item.id}`, {
                    ...actionToConfirm.item,
                    is_active: !actionToConfirm.item.is_active,
                    admin_password: securePassword,
                    action_reason: actionReason || null
                });
                toast.success("Status updated");
            } else if (actionToConfirm.type === 'export') {
                const toastId = toast.loading("Exporting...");
                const response = await api.post(`/saas/template-databases/${actionToConfirm.item.id}/export`,
                    { admin_password: securePassword, action_reason: actionReason || null },
                    { responseType: 'blob' }
                );
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `dump_cat_${actionToConfirm.item.database_name}.sql`);
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
                formData.append('action_reason', actionReason || '');

                await api.post(`/saas/template-databases/${actionToConfirm.item.id}/import`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast.dismiss(toastId);
                toast.success("Import Successful");
                setImportFile(null);
            } else if (actionToConfirm.type === 'migrate') {
                const toastId = toast.loading("Running Template DB migration...");
                await api.post(`/saas/template-databases/${actionToConfirm.item.id}/migrate`, {
                    admin_password: securePassword,
                    action_reason: actionReason || null
                });
                toast.dismiss(toastId);
                toast.success("Template DB migration completed");
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

    const runConnectionTestWithOptions = async (runMigration: boolean) => {
        if (!canTest) {
            toast.error("You don't have permission to test DB connection");
            return;
        }
        setTestStatus('testing');
        setTestMessage(runMigration ? 'Testing + migration...' : 'Testing connection...');
        try {
            // Validate required fields before testing
            if (!formData.host || !formData.database_name || !formData.username || !formData.password) {
                setTestStatus('error');
                setTestMessage('Missing credentials for testing');
                return;
            }

            const res = await api.post('/saas/template-databases/test', {
                ...formData,
                run_migration: runMigration,
                confirm_migration: runMigration
            });
            if (res.data.success) {
                setTestStatus('success');
                setTestMessage(res.data.message);
                toast.success(runMigration ? "Connection + migration successful" : "Connection successful");
            } else {
                setTestStatus('error');
                setTestMessage(res.data.message || 'Connection failed');
            }
        } catch (error: any) {
            setTestStatus('error');
            setTestMessage(error.response?.data?.message || 'Connection failed');
        }
    };

    const runConnectionTest = async () => runConnectionTestWithOptions(false);
    const runConnectionTestAndMigrate = async () => runConnectionTestWithOptions(true);

    const runListTest = async (item: any) => {
        if (!canTest) {
            toast.error("You don't have permission to test DB connection");
            return;
        }
        const toastId = toast.loading("Testing connection...");
        try {
            const res = await api.post('/saas/template-databases/test', {
                db_id: item.id
            });
            if (res.data.success) {
                toast.success("Connection OK!", { id: toastId });
            }
        } catch (error: any) {
            toast.error(`Failed: ${error.response?.data?.message || 'Error'}`, { id: toastId });
        }
    };

    const toggleStatus = (id: number, currentStatus: boolean, item?: any) => {
        const targetItem = item || databases.find(d => d.id === id);
        if (targetItem) initiateSecureAction('toggle', targetItem);
    };

    // Creating / Editing
    const [pendingFormSubmit, setPendingFormSubmit] = useState(false);
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canManage) {
            toast.error("You don't have permission to manage DB mappings");
            return;
        }

        if (editMode) {
            setPendingFormSubmit(true);
            setActionToConfirm({ type: 'edit', item: null });
            setSecurePassword('');
            setShowPasswordModal(true);
            return;
        }

        try {
            await api.post('/saas/template-databases', {
                ...formData,
                action_reason: createActionReason || null,
                run_migration: false,
                confirm_migration: false
            });
            toast.success("Database Added (no migration run)");
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Operation failed");
        }
    };

    const confirmEditSubmit = async () => {
        if (!canManage) {
            toast.error("You don't have permission to manage DB mappings");
            return;
        }
        try {
            await api.put(`/saas/template-databases/${currentId}`, { ...formData, admin_password: securePassword, action_reason: actionReason || null });
            toast.success("Database Updated");
            setIsModalOpen(false);
            setShowPasswordModal(false);
            setPendingFormSubmit(false);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Update Failed");
        }
    };

    const handleDelete = (id: number) => {
        if (!canManage) {
            toast.error("You don't have permission to delete DB mappings");
            return;
        }
        initiateSecureAction('delete', { id });
    };

    // Helper: Get subcategories for selected category
    const activeSubcategories = categories.find(c => c.id == formData.category_id)?.subcategories || [];

    if (!canView) {
        return (
            <div className="p-8">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
                    Access denied for Template DB.
                </div>
            </div>
        );
    }

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <input type="file" ref={fileInputRef} className="hidden" accept=".sql" onChange={handleFileChange} />
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <CircleStackIcon className="w-8 h-8 text-emerald-500" />
                        Template DB
                    </h1>
                    <p className="text-sm text-gray-500">Manage template database mappings per Category and Subcategory</p>
                    {dbSourceIndicator && (
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                            DB Source: <span className="font-semibold">{dbSourceIndicator}</span>
                        </p>
                    )}
                </div>
                {canManage && (
                    <Button onClick={openCreate} className="flex items-center gap-2">
                        <PlusIcon className="w-4 h-4" /> Add Configuration
                    </Button>
                )}
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
                    <select
                        className="px-4 py-2 border rounded-lg bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 outline-none"
                        value={filterCategory}
                        onChange={e => { setFilterCategory(e.target.value); setPage(1); }}
                    >
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
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

            {viewMode === 'list' ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden border border-gray-200 dark:border-slate-700">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
                            <tr>
                                <th className="px-6 py-4">Scope</th>
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
                                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                                                {item.category_name || 'Global'}
                                            </span>
                                            {item.subcategory_name && (
                                                <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full w-fit">
                                                    {item.subcategory_name}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                        {item.description || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="font-mono text-gray-700 dark:text-gray-300">{item.host}</div>
                                        <div className="text-xs text-gray-400">{item.database_name}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                                        {item.username} : ***
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        {canTest && (
                                            <button
                                                onClick={() => runListTest(item)}
                                                title="Test Connection"
                                                className="p-2 text-gray-400 hover:text-blue-600 rounded bg-gray-50 dark:bg-slate-700 hover:bg-blue-50"
                                            >
                                                <SignalIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                        {canMigrate && <button onClick={() => initiateSecureAction("migrate", item)} className="p-2 rounded bg-gray-50 dark:bg-slate-700 text-emerald-500 hover:text-emerald-700" title="Run Template DB migration"><CircleStackIcon className="w-4 h-4" /></button>}
                                        {canExport && <button onClick={() => initiateSecureAction("export", item)} className="p-2 rounded bg-gray-50 dark:bg-slate-700 text-blue-500 hover:text-blue-700" title="Export SQL"><ArrowDownTrayIcon className="w-4 h-4" /></button>}
                                        {canImport && <button onClick={() => handleImportClick(item)} className="p-2 rounded bg-gray-50 dark:bg-slate-700 text-orange-500 hover:text-orange-700" title="Import SQL"><ArrowUpTrayIcon className="w-4 h-4" /></button>}
                                        {canManage && (
                                            <button
                                                onClick={() => toggleStatus(item.id, item.is_active, item)}
                                                title={item.is_active ? "Disable" : "Enable"}
                                                className={`p-2 rounded bg-gray-50 dark:bg-slate-700 ${item.is_active ? 'text-emerald-500 hover:text-emerald-700' : 'text-gray-400 hover:text-emerald-500'}`}
                                            >
                                                <PowerIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                        {canManage && <button onClick={() => openEdit(item)} className="p-2 text-gray-400 hover:text-emerald-600 rounded bg-gray-50 dark:bg-slate-700 hover:bg-emerald-50"><PencilIcon className="w-4 h-4" /></button>}
                                        {canManage && <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600 rounded bg-gray-50 dark:bg-slate-700 hover:bg-red-50"><TrashIcon className="w-4 h-4" /></button>}
                                    </td>
                                </tr>
                            ))}
                            {paginatedDatabases.length === 0 && (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No database configurations found. Add one to start provisioning.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedDatabases.map((item: any) => (
                        <div key={item.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 flex flex-col hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                                        <CircleStackIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white">{item.database_name}</h3>
                                        <p className="text-xs text-gray-500 font-mono">{item.host}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    {canTest && (
                                        <button
                                            onClick={() => runListTest(item)}
                                            title="Test Connection"
                                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-400 hover:text-blue-600 transition-colors"
                                        >
                                            <SignalIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                    {canMigrate && <button onClick={() => initiateSecureAction("migrate", item)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-emerald-500 hover:text-emerald-700 transition-colors" title="Run Template DB migration"><CircleStackIcon className="w-4 h-4" /></button>}
                                    {canExport && <button onClick={() => initiateSecureAction("export", item)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-blue-500 hover:text-blue-700 transition-colors" title="Export"><ArrowDownTrayIcon className="w-4 h-4" /></button>}
                                    {canImport && <button onClick={() => handleImportClick(item)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-orange-500 hover:text-orange-700 transition-colors" title="Import"><ArrowUpTrayIcon className="w-4 h-4" /></button>}
                                    {canManage && (
                                        <button
                                            onClick={() => toggleStatus(item.id, item.is_active, item)}
                                            className={`p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors ${item.is_active ? 'text-emerald-500 hover:text-emerald-700' : 'text-gray-400 hover:text-emerald-500'}`}
                                        >
                                            <PowerIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                    {canManage && <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-400 hover:text-blue-600 transition-colors">
                                        <PencilIcon className="w-4 h-4" />
                                    </button>}
                                    {canManage && <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-400 hover:text-red-600 transition-colors">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>}
                                </div>
                            </div>

                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2 min-h-[2.5rem]">{item.description || 'No description provided.'}</p>

                            <div className="flex flex-col gap-2 mb-4 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Username</span>
                                    <span className="font-mono text-gray-700 dark:text-gray-300">{item.username}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Scope</span>
                                    <span className="font-medium text-emerald-600">
                                        {item.category_name}{item.subcategory_name ? ` > ${item.subcategory_name}` : ''}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-auto pt-4 border-t dark:border-slate-700 flex justify-between items-center text-xs text-gray-400 uppercase tracking-wider">
                                <span>{item.is_active ? 'Available' : 'Disabled'}</span>
                                <div className={`w-2 h-2 rounded-full ${item.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                    <Button
                        variant="secondary"
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                    >
                        Previous
                    </Button>
                    <span className="flex items-center px-4 text-sm text-gray-500">
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        variant="secondary"
                        disabled={page >= totalPages}
                        onClick={() => setPage(page + 1)}
                    >
                        Next
                    </Button>
                </div>
            )
            }

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-8 w-full max-w-lg shadow-2xl border border-gray-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold mb-6 dark:text-white">{editMode ? 'Edit Configuration' : 'Add Database Configuration'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Category (Required)</label>
                                    <select
                                        value={formData.category_id}
                                        onChange={e => setFormData({ ...formData, category_id: e.target.value, subcategory_id: '' })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
                                        required
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Subcategory (Opt)</label>
                                    <select
                                        value={formData.subcategory_id}
                                        onChange={e => setFormData({ ...formData, subcategory_id: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
                                        disabled={!formData.category_id}
                                    >
                                        <option value="">All / Default</option>
                                        {activeSubcategories.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <Input label="Description (Label)" placeholder="e.g. Primary High-Perf Cluster" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />

                            <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-700 space-y-4">
                                <h3 className="text-xs font-bold uppercase text-gray-500">Unprivileged User Credentials</h3>
                                <Input label="Host IP / Domain" placeholder="127.0.0.1" value={formData.host} onChange={e => setFormData({ ...formData, host: e.target.value })} required />
                                <Input label="Database Name" placeholder="db_name" value={formData.database_name} onChange={e => setFormData({ ...formData, database_name: e.target.value })} required />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Username" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required />
                                    <Input label="Password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700">
                                <div className="flex items-center gap-2">
                                    {testStatus === 'success' && <CheckCircleIcon className="w-5 h-5 text-emerald-500" />}
                                    {testStatus === 'error' && <XCircleIcon className="w-5 h-5 text-red-500" />}
                                    {testStatus === 'testing' && <SignalIcon className="w-5 h-5 text-blue-500 animate-pulse" />}
                                    <span className={`text-sm font-medium ${testStatus === 'success' ? 'text-emerald-600' :
                                        testStatus === 'error' ? 'text-red-600' : 'text-gray-500'
                                        }`}>
                                        {testMessage || 'Test connection before saving'}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={runConnectionTest}
                                        disabled={testStatus === 'testing' || !canTest}
                                    >
                                        {testStatus === 'testing' ? 'Testing...' : 'Test Connection Only'}
                                    </Button>
                                    {canMigrate && (
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={runConnectionTestAndMigrate}
                                            disabled={testStatus === 'testing' || !canTest}
                                        >
                                            Test + Migrate
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {!editMode && (
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-slate-900 dark:text-white mt-1"
                                    placeholder="Create reason (required for audit)"
                                    value={createActionReason}
                                    onChange={e => setCreateActionReason(e.target.value)}
                                />
                            )}

                            <div className="flex justify-end gap-3 mt-4 pt-4 border-t dark:border-slate-700">
                                <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={testStatus !== 'success' || !canManage || (!editMode && !createActionReason.trim())}>
                                    {editMode ? 'Update Configuration' : 'Save Configuration'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Password Confirmation Modal */}
            {
                showPasswordModal && (
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
                                    if (e.key === 'Enter' && securePassword) {
                                        if (actionToConfirm?.type === 'edit') confirmEditSubmit();
                                        else handleSecureAction();
                                    }
                                }}
                            />
                            <input
                                type="text"
                                className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-slate-900 dark:text-white mb-6"
                                placeholder="Action reason (for audit log)"
                                value={actionReason}
                                onChange={e => setActionReason(e.target.value)}
                            />
                            <div className="flex gap-3">
                                <Button variant="ghost" onClick={() => setShowPasswordModal(false)} className="flex-1">Cancel</Button>
                                <Button
                                    onClick={() => {
                                        if (actionToConfirm?.type === 'edit') confirmEditSubmit();
                                        else handleSecureAction();
                                    }}
                                    disabled={!securePassword}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                >
                                    Confirm
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

