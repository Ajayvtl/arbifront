"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Plus, Edit, Trash2, CheckCircle, Search, Grid, XCircle, ChevronDown, ChevronRight, Tags, Power } from "lucide-react";
import toast from "react-hot-toast";
import * as Icons from "lucide-react";

// Components
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export default function AmenitiesPage() {
    const [amenities, setAmenities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [iconSearch, setIconSearch] = useState('');
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

    const [formData, setFormData] = useState({
        name: '',
        category: 'General',
        icon: 'Check',
        is_featured: false,
        is_active: true
    });

    const CATEGORIES = ['General', 'Bathroom', 'Media', 'Food & Drink', 'Services', 'View', 'Outdoors'];

    useEffect(() => {
        fetchAmenities();
    }, []);

    const fetchAmenities = async () => {
        try {
            const res = await api.get('/amenities');
            setAmenities(res.data.data);
        } catch (e) { console.error(e) }
        finally { setLoading(false); }
    };

    const toggleCollapse = (cat: string) => {
        setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }));
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await api.put(`/amenities/${editingItem.id}`, formData);
                toast.success("Updated successfully");
            } else {
                await api.post('/amenities', formData);
                toast.success("Created successfully");
            }
            setShowModal(false);
            fetchAmenities();
        } catch (e) { toast.error("Operation failed"); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure?")) return;
        try {
            await api.delete(`/amenities/${id}`);
            toast.success("Deleted");
            fetchAmenities();
        } catch (e) { toast.error("Delete failed"); }
    }

    const handleToggleStatus = async (item: any) => {
        try {
            const newVal = !item.is_active;
            // If field is missing in DB for some reason, !undefined is true, so default works
            // Previous item might not have is_active if it's old data, so handle safely
            const payload = { ...item, is_active: newVal };
            await api.put(`/amenities/${item.id}`, payload);
            toast.success(newVal ? "Activated" : "Deactivated");
            fetchAmenities();
        } catch (e) { toast.error("Failed to update status"); }
    }

    const openEdit = (item: any) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            category: item.category,
            icon: item.icon,
            is_featured: !!item.is_featured,
            is_active: item.is_active !== undefined ? !!item.is_active : true
        });
        setIconSearch('');
        setShowModal(true);
    }

    const openCreate = () => {
        setEditingItem(null);
        setFormData({ name: '', category: 'General', icon: 'Check', is_featured: false, is_active: true });
        setIconSearch('');
        setShowModal(true);
    }

    const availableIcons = Object.keys(Icons).filter(k => k.toLowerCase().includes(iconSearch.toLowerCase()) && typeof (Icons as any)[k] !== 'number').slice(0, 48);

    // Grouping
    const grouped: Record<string, any[]> = {};
    amenities.forEach(a => {
        if (!grouped[a.category]) grouped[a.category] = [];
        grouped[a.category].push(a);
    });

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Amenities Master</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage global facility options and icons for your property.</p>
                </div>
                <Button onClick={openCreate} icon={<Plus size={18} />}>
                    Add New Amenity
                </Button>
            </header>

            <div className="space-y-6">
                {Object.keys(grouped).length === 0 && !loading && (
                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                        <Tags className="mx-auto h-12 w-12 text-slate-300" />
                        <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">No amenities</h3>
                        <p className="mt-1 text-sm text-slate-500">Get started by creating a new amenity.</p>
                        <div className="mt-6">
                            <Button onClick={openCreate} icon={<Plus size={16} />}>Create Amenity</Button>
                        </div>
                    </div>
                )}

                {Object.keys(grouped).map(category => (
                    <div key={category} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                        {/* Header */}
                        <div
                            onClick={() => toggleCollapse(category)}
                            className="flex items-center justify-between p-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <button className="text-slate-500 dark:text-slate-400">
                                    {collapsed[category] ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                                </button>
                                <h3 className="font-bold text-slate-800 dark:text-white">{category}</h3>
                                <span className="text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded-full text-slate-500 dark:text-slate-300">
                                    {grouped[category].length}
                                </span>
                            </div>
                        </div>

                        {/* Body */}
                        {!collapsed[category] && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50/50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                        <tr>
                                            <th className="p-4 pl-6 font-semibold text-slate-600 dark:text-slate-400 w-16">Icon</th>
                                            <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">Name</th>
                                            <th className="p-4 font-semibold text-slate-600 dark:text-slate-400 text-center">Status</th>
                                            <th className="p-4 font-semibold text-slate-600 dark:text-slate-400 text-center">Featured</th>
                                            <th className="p-4 pr-6 font-semibold text-slate-600 dark:text-slate-400 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                        {grouped[category].map(item => {
                                            const IconComp = (Icons as any)[item.icon] || Icons.HelpCircle;
                                            return (
                                                <tr key={item.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                    <td className="p-4 pl-6">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 dark:group-hover:bg-emerald-900/20 dark:group-hover:text-emerald-400 flex items-center justify-center transition-colors">
                                                            <IconComp size={20} strokeWidth={1.5} />
                                                        </div>
                                                    </td>
                                                    <td className="p-4 font-medium text-slate-900 dark:text-white">{item.name}</td>
                                                    <td className="p-4 text-center">
                                                        <button
                                                            onClick={() => handleToggleStatus(item)}
                                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${item.is_active !== 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}
                                                        >
                                                            <span className={`w-1.5 h-1.5 rounded-full ${item.is_active !== 0 ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                                            {item.is_active !== 0 ? 'Active' : 'Disabled'}
                                                        </button>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    const newVal = !item.is_featured;
                                                                    await api.put(`/amenities/${item.id}`, { ...item, is_featured: newVal });
                                                                    toast.success(newVal ? "Featured" : "Un-featured");
                                                                    fetchAmenities();
                                                                } catch (e) { toast.error("Failed to update"); }
                                                            }}
                                                            className={`inline-flex justify-center px-2 py-1 rounded-lg transition-colors ${item.is_featured ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100' : 'text-slate-300 dark:text-slate-700 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                                        >
                                                            {item.is_featured ? <StarFill size={16} /> : <Star size={16} />}
                                                        </button>
                                                    </td>
                                                    <td className="p-4 pr-6 text-right">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button variant="ghost" onClick={() => openEdit(item)} className="p-2 h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                                                                <Edit size={14} />
                                                            </Button>
                                                            <Button variant="ghost" onClick={() => handleDelete(item.id)} className="p-2 h-8 w-8 rounded-full border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 text-red-500 hover:bg-red-100">
                                                                <Trash2 size={14} />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingItem ? 'Edit Amenity' : 'Create New Amenity'}
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 mb-4">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-9 h-5 rounded-full relative transition-colors ${formData.is_active ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${formData.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                            </div>
                            <input type="checkbox" className="hidden" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 transition-colors">Active Status</span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-9 h-5 rounded-full relative transition-colors ${formData.is_featured ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${formData.is_featured ? 'translate-x-4' : 'translate-x-0'}`} />
                            </div>
                            <input type="checkbox" className="hidden" checked={formData.is_featured} onChange={e => setFormData({ ...formData, is_featured: e.target.checked })} />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-amber-600 transition-colors">Featured</span>
                        </label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Amenity Name"
                            placeholder="e.g. Ocean View Balcony"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                        <Select
                            label="Category"
                            options={CATEGORIES.map(c => ({ value: c, label: c }))}
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Choose Icon</label>
                            <div className="relative w-48">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    placeholder="Filter icons..."
                                    value={iconSearch}
                                    onChange={e => setIconSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 h-48 overflow-y-auto grid grid-cols-6 sm:grid-cols-8 gap-2 bg-slate-50/50 dark:bg-slate-900/50 custom-scrollbar">
                            {availableIcons.map(iconName => {
                                const Icn = (Icons as any)[iconName];
                                const isSelected = formData.icon === iconName;
                                return (
                                    <button
                                        type="button"
                                        key={iconName}
                                        onClick={() => setFormData({ ...formData, icon: iconName })}
                                        className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${isSelected ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 scale-105' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 hover:scale-105 border border-slate-100 dark:border-slate-700'}`}
                                        title={iconName}
                                    >
                                        <Icn size={20} strokeWidth={1.5} />
                                    </button>
                                )
                            })}
                        </div>
                        <p className="text-xs text-slate-400 text-right">Showing {availableIcons.length} icons</p>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                        <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button type="submit">
                            {editingItem ? 'Save Changes' : 'Create Amenity'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

function Star({ size }: { size: number }) {
    return <Icons.Star size={size} />;
}

function StarFill({ size }: { size: number }) {
    return <Icons.Star size={size} fill="currentColor" />;
}
