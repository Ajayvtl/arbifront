"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { PlusIcon, TrashIcon, GlobeAmericasIcon, MagnifyingGlassIcon, PowerIcon, MapPinIcon, PencilIcon, Squares2X2Icon, ListBulletIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import * as XLSX from 'xlsx';
import { Button } from "@/components/ui/Button";
import { toast } from "react-hot-toast";

// Simple Searchable Select Component
const SearchableSelect = ({ label, options, value, onChange, placeholder, disabled, required }: any) => {
    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    // Find selected label
    const selectedOption = options.find((o: any) => o.id == value);

    // Filter options
    const filtered = options.filter((o: any) =>
        o.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative">
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{label}</label>
            <div
                className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer flex justify-between items-center ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className={selectedOption ? "text-gray-900 dark:text-white" : "text-gray-400"}>
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
                            placeholder="Type to search..."
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
            {/* Backdrop to close */}
            {isOpen && <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsOpen(false)} />}
        </div>
    );
};

export default function CategoryLocationsPage() {
    const [locations, setLocations] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [countries, setCountries] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [filterCategory, setFilterCategory] = useState("");
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<any>({});

    const [editingId, setEditingId] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    const handleExport = () => {
        const data = locations.map(l => ({
            ID: l.id,
            Region: l.country_name,
            State: l.state_name || '-',
            City: l.city_name || '-',
            Category: l.category_name,
            Subcategory: l.subcategory_name || '-',
            Status: l.is_active ? 'Active' : 'Inactive'
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "ServiceLocations");
        XLSX.writeFile(wb, "locations_export.xlsx");
    };

    const [formData, setFormData] = useState({
        category_id: '',
        subcategory_id: '',
        country_id: '',
        state_id: '',
        city_id: '',
        is_active: true
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = {
                page,
                limit: 10,
                search,
                category_id: filterCategory
            };
            const [locRes, catRes] = await Promise.all([
                api.get('/saas/category-locations', { params }),
                api.get('/saas/categories')
            ]);
            setLocations(locRes.data.data);
            setPagination(locRes.data.pagination);
            setCategories(catRes.data.data);
        } catch (error) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        api.get('/master/countries').then(res => setCountries(res.data.data)).catch(err => console.error(err));
    }, []);

    useEffect(() => {
        fetchData();
    }, [page, search, filterCategory]);

    // Dependent Fetching for Modal
    useEffect(() => {
        if (formData.country_id) {
            api.get(`/master/states?country_id=${formData.country_id}`)
                .then(res => setStates(res.data.data))
                .catch(() => setStates([]));
        } else {
            setStates([]); setCities([]);
        }
    }, [formData.country_id]);

    useEffect(() => {
        if (formData.state_id) {
            api.get(`/master/cities?state_id=${formData.state_id}&country_id=${formData.country_id}`)
                .then(res => setCities(res.data.data))
                .catch(() => setCities([]));
        } else {
            setCities([]);
        }
    }, [formData.state_id]);


    const activeSubcategories = categories.find(c => c.id == formData.category_id)?.subcategories || [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/saas/category-locations/${editingId}`, formData);
                toast.success("Location Updated");
            } else {
                await api.post('/saas/category-locations', formData);
                toast.success("Location Assigned");
            }
            setIsModalOpen(false);
            resetForm();
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Operation failed");
        }
    };

    const toggleStatus = async (item: any) => {
        try {
            // Note: Updated route to /toggle
            await api.put(`/saas/category-locations/${item.id}/toggle`, { is_active: !item.is_active });
            toast.success("Status updated");
            fetchData();
        } catch (error) {
            toast.error("Update failed");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Remove this location assignment?")) return;
        try {
            await api.delete(`/saas/category-locations/${id}`);
            toast.success("Removed");
            fetchData();
        } catch (error) {
            toast.error("Delete failed");
        }
    };

    const resetForm = () => {
        setFormData({ category_id: '', subcategory_id: '', country_id: '', state_id: '', city_id: '', is_active: true });
        setEditingId(null);
    };

    const openCreate = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const openEdit = (item: any) => {
        setEditingId(item.id);
        setFormData({
            category_id: item.category_id,
            subcategory_id: item.subcategory_id || '',
            country_id: item.country_id,
            state_id: item.state_id || '',
            city_id: item.city_id || '',
            is_active: !!item.is_active
        });
        setIsModalOpen(true);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <GlobeAmericasIcon className="w-8 h-8 text-blue-500" />
                        Service Locations
                    </h1>
                    <p className="text-sm text-gray-500">Manage available regions per Category</p>
                </div>
                <Button onClick={openCreate} className="flex items-center gap-2">
                    <PlusIcon className="w-4 h-4" /> Add Location
                </Button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col xl:flex-row justify-between items-center gap-4 mb-6 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                <div className="flex flex-1 gap-4 w-full xl:w-auto">
                    <div className="relative flex-1 max-w-md">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                            placeholder="Search Location..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="px-4 py-2 border rounded-lg bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 outline-none"
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
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
                                <th className="px-6 py-4">Region Scope</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {locations.map((item: any) => (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-900 dark:text-white">{item.country_name}</span>
                                                <span className="text-xs text-gray-400 bg-gray-100 dark:bg-slate-700 px-1.5 rounded">{item.iso_code}</span>
                                            </div>
                                            {item.state_name && (
                                                <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                                                    <span className="text-gray-400">↳</span>
                                                    <span>{item.state_name}</span>
                                                </div>
                                            )}
                                            {item.city_name && (
                                                <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 ml-4">
                                                    <span className="text-gray-400">↳</span>
                                                    <MapPinIcon className="w-3 h-3 inline" />
                                                    <span>{item.city_name}</span>
                                                </div>
                                            )}
                                            {!item.state_name && !item.city_name && <span className="text-xs text-emerald-500 font-medium">Entire Country</span>}
                                            {item.state_name && !item.city_name && <span className="text-xs text-blue-500 font-medium ml-4">Entire State</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                                {item.category_name}
                                            </span>
                                            {item.subcategory_name && (
                                                <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full w-fit">
                                                    {item.subcategory_name}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {item.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => openEdit(item)}
                                            className="p-2 text-gray-400 hover:text-blue-600 rounded bg-gray-50 dark:bg-slate-700 hover:bg-blue-50"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => toggleStatus(item)}
                                            title={item.is_active ? "Disable" : "Enable"}
                                            className={`p-2 rounded bg-gray-50 dark:bg-slate-700 ${item.is_active ? 'text-emerald-500 hover:text-emerald-700' : 'text-gray-400 hover:text-emerald-500'}`}
                                        >
                                            <PowerIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600 rounded bg-gray-50 dark:bg-slate-700 hover:bg-red-50"><TrashIcon className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                            {locations.length === 0 && !loading && (
                                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">No locations configured yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                    {/* Pagination */}
                    <div className="p-4 border-t dark:border-slate-700 flex justify-center gap-2">
                        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 rounded border disabled:opacity-50">Prev</button>
                        <span className="px-3 py-1 text-gray-500">Page {page} of {pagination.pages || 1}</span>
                        <button disabled={page >= (pagination.pages || 1)} onClick={() => setPage(page + 1)} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {locations.map((item: any) => (
                            <div key={item.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 flex flex-col hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-2 rounded-lg ${item.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                            <GlobeAmericasIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-white">{item.country_name}</h3>
                                            <p className="text-xs text-gray-500">{item.iso_code}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => openEdit(item)}
                                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-400 hover:text-blue-600 transition-colors"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => toggleStatus(item)}
                                            className={`p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors ${item.is_active ? 'text-emerald-500 hover:text-emerald-700' : 'text-gray-400 hover:text-emerald-500'}`}
                                        >
                                            <PowerIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-400 hover:text-red-600 transition-colors">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-4">
                                    {item.state_name && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">State</span>
                                            <span className="font-medium dark:text-gray-300">{item.state_name}</span>
                                        </div>
                                    )}
                                    {item.city_name && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">City</span>
                                            <span className="font-medium dark:text-gray-300">{item.city_name}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Assigned To</span>
                                        <span className="font-medium text-blue-600 dark:text-blue-400">{item.category_name}</span>
                                    </div>
                                    {item.subcategory_name && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Subcategory</span>
                                            <span className="font-medium dark:text-gray-300">{item.subcategory_name}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-auto pt-4 border-t dark:border-slate-700 flex justify-between items-center text-xs text-gray-400 uppercase tracking-wider">
                                    <span>{item.is_active ? 'Active Region' : 'Region Disabled'}</span>
                                    <div className={`w-2 h-2 rounded-full ${item.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Pagination (Grid) */}
                    <div className="p-4 flex justify-center gap-2 mt-4">
                        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 rounded border bg-white dark:bg-slate-800 dark:border-slate-700 disabled:opacity-50">Prev</button>
                        <span className="px-3 py-1 text-gray-500">Page {page} of {pagination.pages || 1}</span>
                        <button disabled={page >= (pagination.pages || 1)} onClick={() => setPage(page + 1)} className="px-3 py-1 rounded border bg-white dark:bg-slate-800 dark:border-slate-700 disabled:opacity-50">Next</button>
                    </div>
                </>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-8 w-full max-w-lg shadow-2xl border border-gray-200 dark:border-slate-700 overflow-visible">
                        <h2 className="text-xl font-bold mb-6 dark:text-white">{editingId ? 'Edit Location' : 'Assign Location'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-5">

                            {/* Category Selection */}
                            <SearchableSelect
                                label="Category"
                                placeholder="Select Category"
                                options={categories}
                                value={formData.category_id}
                                onChange={(val: any) => setFormData({ ...formData, category_id: val, subcategory_id: '' })}
                            />

                            {formData.category_id && activeSubcategories.length > 0 && (
                                <SearchableSelect
                                    label="Subcategory (Optional)"
                                    placeholder="All Subcategories"
                                    options={activeSubcategories}
                                    value={formData.subcategory_id}
                                    onChange={(val: any) => setFormData({ ...formData, subcategory_id: val })}
                                />
                            )}

                            <hr className="border-gray-100 dark:border-slate-700" />

                            {/* Location Filters */}
                            <SearchableSelect
                                label="Country"
                                placeholder="Select Country"
                                options={countries}
                                value={formData.country_id}
                                onChange={(val: any) => setFormData({ ...formData, country_id: val, state_id: '', city_id: '' })}
                            />

                            <SearchableSelect
                                label="State / Province (Optional)"
                                placeholder="All States"
                                options={states}
                                value={formData.state_id}
                                onChange={(val: any) => setFormData({ ...formData, state_id: val, city_id: '' })}
                                disabled={!formData.country_id}
                            />

                            <SearchableSelect
                                label="City (Optional)"
                                placeholder="All Cities"
                                options={cities}
                                value={formData.city_id}
                                onChange={(val: any) => setFormData({ ...formData, city_id: val })}
                                disabled={!formData.state_id}
                            />

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t dark:border-slate-700">
                                <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                                    {editingId ? 'Save Changes' : 'Assign Location'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
