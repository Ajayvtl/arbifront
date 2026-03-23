"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Plus, Trash2, Edit2, Save, X, Activity, Heart, Shield, User, Award, CheckCircle, Zap, Thermometer, Stethoscope, Microscope, Brain, Bone, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import * as LucideIcons from "lucide-react";

// Lucide icon components map
const ICON_MAP: any = LucideIcons;

const AVAILABLE_ICONS = [
    "Activity", "Heart", "Shield", "User", "Award", "CheckCircle", "Zap",
    "Thermometer", "Stethoscope", "Microscope", "Brain", "Bone", "Eye"
];

const COLORS = [
    { label: "Blue", class: "bg-blue-100 text-blue-600" },
    { label: "Red", class: "bg-red-100 text-red-600" },
    { label: "Green", class: "bg-green-100 text-green-600" },
    { label: "Orange", class: "bg-orange-100 text-orange-600" },
    { label: "Purple", class: "bg-purple-100 text-purple-600" },
    { label: "Pink", class: "bg-pink-100 text-pink-600" },
    { label: "Teal", class: "bg-teal-100 text-teal-600" },
];

export default function CategoriesPage() {
    const [categories, setCategories] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [formData, setFormData] = useState({
        name_en: '',
        name_hi: '',
        name_gu: '',
        icon: 'Activity',
        color_class: 'bg-blue-100 text-blue-600',
        status: 'active',
        sort_order: 0
    });
    const [activeTab, setActiveTab] = useState<'en' | 'hi' | 'gu'>('en');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await api.get('/test-categories');
            setCategories(res.data.data);
        } catch (error) {
            toast.error("Failed to fetch categories");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await api.put(`/test-categories/${editingItem.id}`, formData);
                toast.success("Updated successfully");
            } else {
                await api.post('/test-categories', formData);
                toast.success("Created successfully");
            }
            setShowModal(false);
            setEditingItem(null);
            fetchData();
            // Reset form
            setFormData({ name_en: '', name_hi: '', name_gu: '', icon: 'Activity', color_class: 'bg-blue-100 text-blue-600', status: 'active', sort_order: 0 });
        } catch (error) {
            toast.error("Failed to save");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this category?")) return;
        try {
            await api.delete(`/test-categories/${id}`);
            toast.success("Deleted successfully");
            fetchData();
        } catch (err) {
            toast.error("Failed to delete");
        }
    };

    // Render icon dynamically
    const renderIcon = (params: { iconName: string, className?: string }) => {
        const IconComponent = ICON_MAP[params.iconName];
        return IconComponent ? <IconComponent className={params.className} /> : <Activity className={params.className} />;
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Website Categories</h1>
                    <p className="text-slate-500 dark:text-slate-400">Manage categories shown on the website home page</p>
                </div>
                <button
                    onClick={() => { setEditingItem(null); setShowModal(true); }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
                >
                    <Plus size={18} />
                    Add Category
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableHead>Order</TableHead>
                        <TableHead>Icon</TableHead>
                        <TableHead>Name (English)</TableHead>
                        <TableHead>Name (Hindi)</TableHead>
                        <TableHead>Name (Gujarati)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableHeader>
                    <TableBody>
                        {categories.map((cat) => (
                            <TableRow key={cat.id}>
                                <TableCell>{cat.sort_order}</TableCell>
                                <TableCell>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cat.color_class}`}>
                                        {renderIcon({ iconName: cat.icon, className: "w-4 h-4" })}
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium text-slate-800 dark:text-white">{cat.name_en}</TableCell>
                                <TableCell className="text-slate-600 dark:text-slate-400">{cat.name_hi || '-'}</TableCell>
                                <TableCell className="text-slate-600 dark:text-slate-400">{cat.name_gu || '-'}</TableCell>
                                <TableCell>
                                    <Badge variant={cat.status === 'active' ? 'success' : 'neutral'}>{cat.status}</Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-2">
                                        <button onClick={() => {
                                            setEditingItem(cat);
                                            setFormData({
                                                name_en: cat.name_en,
                                                name_hi: cat.name_hi,
                                                name_gu: cat.name_gu,
                                                icon: cat.icon,
                                                color_class: cat.color_class,
                                                status: cat.status,
                                                sort_order: cat.sort_order
                                            });
                                            setShowModal(true);
                                        }} className="text-slate-400 hover:text-emerald-600 transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(cat.id)} className="text-red-400 hover:text-red-600 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl p-6 border border-slate-100 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{editingItem ? 'Edit Category' : 'New Category'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Language Tabs */}
                            <div>
                                <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
                                    <button type="button" onClick={() => setActiveTab('en')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'en' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-slate-500'}`}>English</button>
                                    <button type="button" onClick={() => setActiveTab('hi')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'hi' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-slate-500'}`}>Hindi</button>
                                    <button type="button" onClick={() => setActiveTab('gu')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'gu' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-slate-500'}`}>Gujarati</button>
                                </div>

                                {activeTab === 'en' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name (English)</label>
                                        <input required type="text" value={formData.name_en} onChange={e => setFormData({ ...formData, name_en: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900" placeholder="e.g. Heart Health" />
                                    </div>
                                )}
                                {activeTab === 'hi' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name (Hindi)</label>
                                        <input type="text" value={formData.name_hi} onChange={e => setFormData({ ...formData, name_hi: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900" placeholder="e.g. हृदय स्वास्थ्य" />
                                    </div>
                                )}
                                {activeTab === 'gu' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name (Gujarati)</label>
                                        <input type="text" value={formData.name_gu} onChange={e => setFormData({ ...formData, name_gu: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900" placeholder="e.g. હૃદય આરોગ્ય" />
                                    </div>
                                )}
                            </div>

                            {/* Icon Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Icon</label>
                                <div className="grid grid-cols-6 gap-2">
                                    {AVAILABLE_ICONS.map(iconName => (
                                        <div
                                            key={iconName}
                                            onClick={() => setFormData({ ...formData, icon: iconName })}
                                            className={`cursor-pointer p-2 rounded-lg border flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${formData.icon === iconName ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700'}`}
                                        >
                                            {renderIcon({ iconName, className: "w-5 h-5 text-slate-600 dark:text-slate-400" })}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Color Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Theme</label>
                                <div className="flex flex-wrap gap-2">
                                    {COLORS.map(color => (
                                        <div
                                            key={color.label}
                                            onClick={() => setFormData({ ...formData, color_class: color.class })}
                                            className={`cursor-pointer px-3 py-1 rounded-full text-xs font-bold border transition-all ${color.class} ${formData.color_class === color.class ? 'ring-2 ring-offset-2 ring-slate-400 scale-105' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                        >
                                            {color.label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sort Order</label>
                                    <input type="number" value={formData.sort_order} onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value) })} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900" />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex justify-center items-center gap-2">
                                    <Save size={18} /> Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
