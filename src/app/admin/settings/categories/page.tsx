"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { PlusIcon, TrashIcon, PencilSquareIcon, MagnifyingGlassIcon, Squares2X2Icon, ListBulletIcon, ArrowDownTrayIcon, FolderIcon, TagIcon } from "@heroicons/react/24/outline";
import * as XLSX from 'xlsx';
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "react-hot-toast";

export default function CategoriesPage() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'categories' | 'subcategories'>('categories');

    // View State
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const LIMIT = 9;

    // Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', description: '', category_id: '' });

    const fetchData = async () => {
        try {
            const res = await api.get('/saas/categories');
            setCategories(res.data.data);
        } catch (error) {
            toast.error("Failed to load categories");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const endpoint = activeTab === 'categories' ? '/saas/categories' : '/saas/subcategories';
            if (editItem) {
                await api.put(`${endpoint}/${editItem.id}`, formData);
                toast.success("Updated successfully");
            } else {
                await api.post(endpoint, formData);
                toast.success("Created successfully");
            }
            setIsModalOpen(false);
            setEditItem(null);
            setFormData({ name: '', description: '', category_id: '' });
            fetchData();
        } catch (error) {
            toast.error("Operation failed");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure?")) return;
        try {
            const endpoint = activeTab === 'categories' ? '/saas/categories' : '/saas/subcategories';
            await api.delete(`${endpoint}/${id}`);
            toast.success("Deleted successfully");
            fetchData();
        } catch (error) {
            toast.error("Delete failed");
        }
    };

    const openModal = (item?: any) => {
        setEditItem(item);
        setFormData({
            name: item?.name || '',
            description: item?.description || '',
            category_id: item?.category_id || (categories.length > 0 ? categories[0].id : '')
        });
        setIsModalOpen(true);
    };

    if (loading) return <div className="p-8">Loading...</div>;

    // Data Processing
    const allSubcategories = categories.flatMap(cat => cat.subcategories || []);
    const sourceData = activeTab === 'categories' ? categories : allSubcategories;

    const filteredData = sourceData.filter((item: any) =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(search.toLowerCase()))
    );

    const totalPages = Math.ceil(filteredData.length / LIMIT);
    const paginatedData = filteredData.slice((page - 1) * LIMIT, page * LIMIT);

    const handleExport = () => {
        const data = filteredData.map(item => ({
            ID: item.id,
            Name: item.name,
            Description: item.description,
            Type: activeTab === 'categories' ? 'Category' : 'Subcategory',
            Parent: activeTab === 'subcategories' ? categories.find(c => c.id === item.category_id)?.name : '-'
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, activeTab === 'categories' ? "Categories" : "Subcategories");
        XLSX.writeFile(wb, `${activeTab}_export.xlsx`);
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Categories</h1>
                    <p className="text-sm text-gray-500">Manage classification for SaaS Packages</p>
                </div>
                <Button onClick={() => openModal()} className="flex items-center gap-2">
                    <PlusIcon className="w-4 h-4" /> Add {activeTab === 'categories' ? 'Category' : 'Subcategory'}
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 mb-6">
                <button
                    onClick={() => setActiveTab('categories')}
                    className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'categories' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-gray-500'}`}
                >
                    Categories
                </button>
                <button
                    onClick={() => setActiveTab('subcategories')}
                    className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'subcategories' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-gray-500'}`}
                >
                    Subcategories
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                <div className="relative flex-1 w-full md:max-w-md">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        className="w-full pl-10 pr-4 py-2 border rounded-lg bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20"
                        placeholder={`Search ${activeTab}...`}
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
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

            {/* Content */}
            {viewMode === 'list' ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden border border-gray-200 dark:border-slate-700">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Description</th>
                                {activeTab === 'subcategories' && <th className="px-6 py-4">Parent Category</th>}
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {paginatedData.map((item: any) => {
                                const parent = activeTab === 'subcategories'
                                    ? categories.find(c => c.id === item.category_id)?.name
                                    : null;

                                return (
                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                            <div className="flex items-center gap-2">
                                                {activeTab === 'categories' ? <FolderIcon className="w-4 h-4 text-blue-500" /> : <TagIcon className="w-4 h-4 text-emerald-500" />}
                                                {item.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-sm">{item.description || '-'}</td>
                                        {activeTab === 'subcategories' && <td className="px-6 py-4 text-sm"><span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs">{parent}</span></td>}
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <button onClick={() => openModal(item)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><PencilSquareIcon className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(item.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><TrashIcon className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {paginatedData.length === 0 && (
                                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No data found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedData.map((item: any) => (
                        <div key={item.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 flex flex-col hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <div className={`p-2 rounded-lg ${activeTab === 'categories' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                        {activeTab === 'categories' ? <FolderIcon className="w-6 h-6" /> : <TagIcon className="w-6 h-6" />}
                                    </div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{item.name}</h3>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => openModal(item)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-400 hover:text-blue-600 transition-colors">
                                        <PencilSquareIcon className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-400 hover:text-red-600 transition-colors">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2 min-h-[2.5rem]">{item.description || 'No description provided.'}</p>

                            {activeTab === 'subcategories' && (
                                <div className="mt-auto pt-4 border-t dark:border-slate-700 text-xs text-gray-500">
                                    Parent: <span className="font-medium text-gray-700 dark:text-gray-300">{categories.find(c => c.id === item.category_id)?.name}</span>
                                </div>
                            )}
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
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-lg font-bold mb-4">{editItem ? 'Edit' : 'Create'} {activeTab === 'categories' ? 'Category' : 'Subcategory'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {activeTab === 'subcategories' && (
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Parent Category</label>
                                    <select
                                        value={formData.category_id}
                                        onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                                        required
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <Input label="Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            <Input label="Description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />

                            <div className="flex justify-end gap-3 mt-6">
                                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit">{editItem ? 'Save Changes' : 'Create'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
