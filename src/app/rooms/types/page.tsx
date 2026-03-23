"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Loader2, Plus, Edit, Trash2, Image as ImageIcon, CheckSquare, Grid, LayoutList, Star, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Power, LayoutGrid, List, BedDouble, Users } from "lucide-react";
import toast from "react-hot-toast";

// Reusable Components
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export default function RoomTypesPage() {
    const [types, setTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingType, setEditingType] = useState<any>(null);
    const [amenitiesMaster, setAmenitiesMaster] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'basic' | 'details' | 'photos' | 'amenities'>('basic');

    // View Preference
    const [viewMode, setViewMode] = useState<'grid' | 'rows'>('rows');
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [expandedRows, setExpandedRows] = useState<number[]>([]);

    // Bulk Selection
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        category: 'Standard',
        base_price: 0,
        total_rooms: 1,
        capacity_adults: 2,
        capacity_children: 1,
        description: '',
        // Details
        room_size_sqm: 25,
        bed_type: 'King',
        view_type: 'City View',
        has_balcony: false,
        smoking_allowed: false,
        // Media
        images_json: [] as string[],
        files: [] as File[],
        // Relations
        amenityIds: [] as number[],
        // Features
        is_featured: false,
        is_active: true
    });

    useEffect(() => {
        fetchTypes();
        fetchAmenities();
        const savedView = localStorage.getItem('room_view_mode') as 'grid' | 'rows';
        if (savedView) setViewMode(savedView);

        const savedCollapsed = localStorage.getItem('room_collapsed_cats');
        if (savedCollapsed) setCollapsed(JSON.parse(savedCollapsed));
    }, []);

    const toggleViewMode = (mode: 'grid' | 'rows') => {
        setViewMode(mode);
        localStorage.setItem('room_view_mode', mode);
    }

    const toggleCollapse = (cat: string) => {
        const newState = { ...collapsed, [cat]: !collapsed[cat] };
        setCollapsed(newState);
        localStorage.setItem('room_collapsed_cats', JSON.stringify(newState));
    }

    const toggleRowExpand = (id: number) => {
        setExpandedRows(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }

    const fetchTypes = async () => {
        try {
            const res = await api.get('/rooms');
            setTypes(res.data.data);
        } catch (e) { console.error(e) }
        finally { setLoading(false); }
    };

    const fetchAmenities = async () => {
        try {
            const res = await api.get('/rooms/meta/amenities');
            setAmenitiesMaster(res.data.data);
        } catch (e) { console.error("Failed loading amenities"); }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('code', formData.code || '');
            data.append('category', formData.category);
            data.append('base_price', (formData.base_price || 0).toString());
            data.append('total_rooms', (formData.total_rooms || 0).toString());
            data.append('capacity_adults', (formData.capacity_adults || 0).toString());
            data.append('capacity_children', (formData.capacity_children || 0).toString());
            data.append('description', formData.description || '');

            data.append('room_size_sqm', (formData.room_size_sqm || 0).toString());
            data.append('bed_type', formData.bed_type || 'King');
            data.append('view_type', formData.view_type || 'No View');
            data.append('has_balcony', formData.has_balcony ? '1' : '0');
            data.append('smoking_allowed', formData.smoking_allowed ? '1' : '0');
            data.append('is_featured', formData.is_featured ? '1' : '0');
            data.append('is_active', formData.is_active ? '1' : '0');

            data.append('images_json', JSON.stringify(formData.images_json));
            data.append('amenityIds', JSON.stringify(formData.amenityIds));

            formData.files.forEach(file => {
                data.append('images', file);
            });

            const config = { headers: { 'Content-Type': 'multipart/form-data' } };

            if (editingType) {
                await api.put(`/rooms/${editingType.id}`, data, config);
                toast.success("Room Type updated");
            } else {
                await api.post('/rooms', data, config);
                toast.success("Room Type created");
            }
            setShowModal(false);
            setEditingType(null);
            fetchTypes();
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Operation failed");
            console.error(e);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure?")) return;
        try {
            await api.delete(`/rooms/${id}`);
            toast.success("Room Type deleted");
            fetchTypes();
        } catch (e) { toast.error("Delete failed"); }
    }

    // Bulk Actions
    const handleBulkAction = async (action: 'delete' | 'toggle_status') => {
        if (!confirm(`Are you sure you want to ${action} ${selectedIds.length} items?`)) return;
        try {
            await api.post('/rooms/bulk-action', { action, ids: selectedIds });
            toast.success("Bulk action completed");
            setSelectedIds([]);
            fetchTypes();
        } catch (e) { toast.error("Bulk action failed"); }
    }

    const toggleFeatured = async (room: any) => {
        try {
            await api.put(`/rooms/${room.id}`, { is_featured: !room.is_featured });
            toast.success("Updated");
            fetchTypes();
        } catch (e) { toast.error("Failed to toggle feature"); }
    }

    const toggleActive = async (room: any) => {
        try {
            await api.put(`/rooms/${room.id}`, { is_active: !room.is_active });
            toast.success("Updated status");
            fetchTypes();
        } catch (e) { toast.error("Failed to update status"); }
    }

    // Selection
    const toggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }

    const openEdit = (type: any) => {
        setEditingType(type);
        const currentImages = typeof type.images_json === 'string' ? JSON.parse(type.images_json || '[]') : (type.images_json || []);

        setFormData({
            name: type.name || '',
            code: type.code || '',
            category: type.category || 'Standard',
            base_price: type.base_price || 0,
            total_rooms: type.total_rooms || 1,
            capacity_adults: type.capacity_adults || 2,
            capacity_children: type.capacity_children || 1,
            description: type.description || '',
            room_size_sqm: type.room_size_sqm || 25,
            bed_type: type.bed_type || 'King',
            view_type: type.view_type || 'City View',
            has_balcony: !!type.has_balcony,
            smoking_allowed: !!type.smoking_allowed,
            images_json: currentImages,
            files: [],
            amenityIds: type.amenities ? type.amenities.map((a: any) => a.id) : [],
            is_featured: !!type.is_featured,
            is_active: type.is_active !== 0
        });
        setActiveTab('basic');
        setShowModal(true);
    };

    const openCreate = () => {
        setEditingType(null);
        // Auto-generate code pattern: {HOTEL_ABBR}-{HOTEL_ID}-{YEAR_LAST_2}
        // Since we don't have hotel name/abbr in context explicitly properly, valid placeholders:
        // Assuming hotel_id is user.hotel_id or 1.
        // Assuming Hotel Name is generic or fetched.
        // We will default to 'GC' (GreenCross) for now if name unavailable, and get ID from auth.

        const hotelId = 1; // Default or fetch from user context later if available
        const year = new Date().getFullYear().toString().slice(-2);
        const codePattern = `GC-${hotelId}-${year}`;

        setFormData({
            name: '',
            code: codePattern,
            category: 'Standard', base_price: 0, total_rooms: 1, capacity_adults: 2, capacity_children: 1, description: '',
            room_size_sqm: 25, bed_type: 'King', view_type: 'City View', has_balcony: false, smoking_allowed: false,
            images_json: [], files: [], amenityIds: [], is_featured: false, is_active: true
        });
        setActiveTab('basic');
        setShowModal(true);
    }

    const toggleAmenity = (id: number) => {
        setFormData(prev => {
            const exists = prev.amenityIds.includes(id);
            if (exists) return { ...prev, amenityIds: prev.amenityIds.filter(x => x !== id) };
            return { ...prev, amenityIds: [...prev.amenityIds, id] };
        });
    }

    const addImageUrl = () => {
        const url = prompt("Enter Image URL");
        if (url) {
            setFormData(prev => ({ ...prev, images_json: [...prev.images_json, url] }));
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFormData(prev => ({
                ...prev,
                files: [...prev.files, ...Array.from(e.target.files!)]
            }));
        }
    }

    const removeFile = (index: number) => {
        setFormData(prev => ({
            ...prev,
            files: prev.files.filter((_, i) => i !== index)
        }));
    }

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

    // Group Types by Category
    const typesByCategory: Record<string, any[]> = {};
    types.forEach(t => {
        const cat = t.category || 'Other';
        if (!typesByCategory[cat]) typesByCategory[cat] = [];
        typesByCategory[cat].push(t);
    });

    const amenitiesByCategory: Record<string, any[]> = {};
    amenitiesMaster.forEach(a => {
        if (!amenitiesByCategory[a.category]) amenitiesByCategory[a.category] = [];
        amenitiesByCategory[a.category].push(a);
    });

    return (
        <div className="p-8 space-y-8 min-h-screen bg-slate-50/50 dark:bg-slate-950">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Room Types</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage inventory, pricing, and rich content.</p>
                </div>
                <div className="flex gap-3 items-center">
                    {/* View Switcher */}
                    <div className="bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 flex gap-1 mr-2">
                        <button onClick={() => toggleViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                            <LayoutGrid size={16} />
                        </button>
                        <button onClick={() => toggleViewMode('rows')} className={`p-1.5 rounded-md transition-all ${viewMode === 'rows' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                            <List size={16} />
                        </button>
                    </div>

                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm animate-in fade-in slide-in-from-top-2">
                            <Button variant="ghost" type="button" onClick={() => handleBulkAction('delete')} className="text-red-500 hover:bg-red-50">
                                <Trash2 size={16} className="mr-2" /> Delete ({selectedIds.length})
                            </Button>
                        </div>
                    )}
                    <Button onClick={openCreate} icon={<Plus size={18} />}>
                        Add Room Type
                    </Button>
                </div>
            </header>

            <div className="space-y-6">
                {Object.keys(typesByCategory).map((category) => (
                    <div key={category} className="space-y-4">
                        <div
                            onClick={() => toggleCollapse(category)}
                            className="flex items-center gap-3 cursor-pointer group select-none"
                        >
                            <div className="p-1 rounded-md text-slate-400 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors">
                                {collapsed[category] ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">{category}</h2>
                            <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500 font-medium">{typesByCategory[category].length}</span>
                            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800 ml-2" />
                        </div>

                        {!collapsed[category] && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                {viewMode === 'grid' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {typesByCategory[category].map(type => (
                                            <RoomCard
                                                key={type.id}
                                                type={type}
                                                isSelected={selectedIds.includes(type.id)}
                                                onSelect={() => toggleSelect(type.id)}
                                                onEdit={() => openEdit(type)}
                                                onDelete={() => handleDelete(type.id)}
                                                onToggleFeature={() => toggleFeatured(type)}
                                                onToggleActive={() => toggleActive(type)}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {typesByCategory[category].map((type) => (
                                            <div key={type.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-all hover:shadow-md">
                                                {/* Header Row */}
                                                <div
                                                    className="flex items-center p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                                    onClick={() => toggleRowExpand(type.id)}
                                                >
                                                    <div className="flex items-center gap-4 flex-1">
                                                        {/* Expand Icon */}
                                                        <div className={`p-1 rounded-full text-slate-400 transition-transform duration-300 ${expandedRows.includes(type.id) ? 'rotate-180 bg-slate-100 dark:bg-slate-800' : ''}`}>
                                                            <ChevronDown size={18} />
                                                        </div>

                                                        <div onClick={(e) => { e.stopPropagation(); toggleSelect(type.id); }} className={`w-5 h-5 rounded border-2 cursor-pointer flex items-center justify-center transition-all ${selectedIds.includes(type.id) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                                            {selectedIds.includes(type.id) && <CheckSquare size={12} className="text-white" />}
                                                        </div>

                                                        {/* Thumbnail */}
                                                        <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 border border-slate-100 dark:border-slate-700">
                                                            {(() => {
                                                                const imgs = typeof type.images_json === 'string' ? JSON.parse(type.images_json || '[]') : (type.images_json || []);
                                                                return imgs.length > 0 ? <img src={imgs[0]} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full"><ImageIcon size={16} className="text-slate-400" /></div>
                                                            })()}
                                                        </div>

                                                        <div>
                                                            <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                                {type.name}
                                                                {type.is_featured && <Star size={12} className="text-amber-500 fill-amber-500" />}
                                                                {!type.is_active && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Inactive</span>}
                                                            </h4>
                                                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{type.code}</span>
                                                                <span>•</span>
                                                                <span>{type.bed_type} Bed</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-12 mr-4">
                                                        <div className="text-right">
                                                            <span className="block text-sm font-medium text-slate-500 dark:text-slate-400">Availability</span>
                                                            <span className="block font-bold text-slate-900 dark:text-white">{type.total_rooms} <span className="text-xs font-normal text-slate-400">units</span></span>
                                                        </div>
                                                        <div className="text-right min-w-[80px]">
                                                            <span className="block text-sm font-medium text-slate-500 dark:text-slate-400">Price</span>
                                                            <span className="block font-bold text-emerald-600">₹{type.base_price}</span>
                                                        </div>

                                                        <div className="flex items-center gap-2 pl-4 border-l border-slate-100 dark:border-slate-800">
                                                            <button type="button" onClick={(e) => { e.stopPropagation(); openEdit(type); }} className="h-8 w-8 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-500 text-emerald-600 dark:text-emerald-400 transition-all"><Edit size={16} /></button>
                                                            <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(type.id); }} className="h-8 w-8 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-500 text-red-500 dark:text-red-400 transition-all"><Trash2 size={16} /></button>
                                                            <button type="button" onClick={(e) => { e.stopPropagation(); toggleActive(type); }} className={`h-8 w-8 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 transition-all ${type.is_active ? 'text-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><Power size={14} /></button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Expanded Details */}
                                                {expandedRows.includes(type.id) && (
                                                    <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 p-6 animate-in slide-in-from-top-2 duration-200">
                                                        <div className="grid grid-cols-3 gap-8">
                                                            <div>
                                                                <h5 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">Room Configuration</h5>
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center justify-between text-sm p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                                                        <span className="text-slate-500 flex items-center gap-2"><LayoutGrid size={14} /> Size</span>
                                                                        <span className="font-medium text-slate-900 dark:text-white">{type.room_size_sqm} m²</span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between text-sm p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                                                        <span className="text-slate-500 flex items-center gap-2"><BedDouble size={14} /> Bed Type</span>
                                                                        <span className="font-medium text-slate-900 dark:text-white">{type.bed_type}</span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between text-sm p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                                                        <span className="text-slate-500 flex items-center gap-2"><Users size={14} /> Capacity</span>
                                                                        <span className="font-medium text-slate-900 dark:text-white">{type.capacity_adults} Adults, {type.capacity_children} Children</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="col-span-2">
                                                                <h5 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">Description & Amenities</h5>
                                                                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                                                    {type.description || "No description provided."}
                                                                </p>

                                                                <div className="flex flex-wrap gap-2">
                                                                    {type.amenities && type.amenities.length > 0 ? (
                                                                        type.amenities.map((a: any) => (
                                                                            <span key={a.id} className="text-xs px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-slate-600 dark:text-slate-300">
                                                                                {a.name}
                                                                            </span>
                                                                        ))
                                                                    ) : (
                                                                        <span className="text-xs text-slate-400 italic">No amenities linked.</span>
                                                                    )}
                                                                </div>

                                                                <div className="mt-4 flex gap-2">
                                                                    <Button variant="secondary" onClick={() => openEdit(type)} icon={<Edit size={14} />}>Edit Details</Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingType ? 'Edit Room Type' : 'Create Room Type'}
                maxWidth="4xl"
            >
                {/* Modal Layout: Sidebar + Content Wrapper */}
                <div className="flex h-[600px] -m-6 divide-x divide-slate-100 dark:divide-slate-800">

                    {/* Sidebar */}
                    <div className="w-64 bg-slate-50 dark:bg-slate-900/50 p-4 space-y-2 flex-shrink-0">
                        <TabBtn active={activeTab === 'basic'} onClick={() => setActiveTab('basic')} icon={LayoutList} label="Basic Info" />
                        <TabBtn active={activeTab === 'details'} onClick={() => setActiveTab('details')} icon={Grid} label="Details & Policies" />
                        <TabBtn active={activeTab === 'amenities'} onClick={() => setActiveTab('amenities')} icon={CheckSquare} label="Amenities" />
                        <TabBtn active={activeTab === 'photos'} onClick={() => setActiveTab('photos')} icon={ImageIcon} label="Photos" />
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900">
                        <form id="room-type-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            {activeTab === 'basic' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <Toggle label="Featured Room" checked={formData.is_featured} onChange={e => setFormData({ ...formData, is_featured: e.target.checked })} />
                                        <Toggle label="Active Status" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} />
                                    </div>
                                    <Select label="Category" options={[{ value: 'Standard', label: 'Standard' }, { value: 'Deluxe', label: 'Deluxe' }, { value: 'Suite', label: 'Suite' }, { value: 'Villa', label: 'Villa' }]} value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                                    <div className="grid grid-cols-2 gap-6">
                                        <Input label="Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                        <Input label="Code" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <Input label="Base Price (₹)" type="number" value={formData.base_price} onChange={e => setFormData({ ...formData, base_price: e.target.value === '' ? 0 : parseFloat(e.target.value) })} required />
                                        <Input label="Inventory Count" type="number" value={formData.total_rooms} onChange={e => setFormData({ ...formData, total_rooms: e.target.value === '' ? 0 : parseInt(e.target.value) })} required />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <Input label="Max Adults" type="number" value={formData.capacity_adults} onChange={e => setFormData({ ...formData, capacity_adults: e.target.value === '' ? 0 : parseInt(e.target.value) })} required />
                                        <Input label="Max Children" type="number" value={formData.capacity_children} onChange={e => setFormData({ ...formData, capacity_children: e.target.value === '' ? 0 : parseInt(e.target.value) })} required />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Description</label>
                                        <textarea rows={4} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none" />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'details' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="grid grid-cols-2 gap-6">
                                        <Input label="Room Size (m²)" type="number" value={formData.room_size_sqm} onChange={e => setFormData({ ...formData, room_size_sqm: e.target.value === '' ? 0 : parseInt(e.target.value) })} />
                                        <Select label="Bed Configuration" options={[{ value: 'Single', label: 'Single' }, { value: 'Double', label: 'Double' }, { value: 'Queen', label: 'Queen' }, { value: 'King', label: 'King' }, { value: 'Twin', label: 'Twin' }]} value={formData.bed_type} onChange={e => setFormData({ ...formData, bed_type: e.target.value })} />
                                        <Select label="View Type" options={[{ value: 'No View', label: 'No View' }, { value: 'City View', label: 'City View' }, { value: 'Garden View', label: 'Garden View' }, { value: 'Ocean View', label: 'Ocean View' }, { value: 'Pool View', label: 'Pool View' }]} value={formData.view_type} onChange={e => setFormData({ ...formData, view_type: e.target.value })} />
                                    </div>
                                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                        <Toggle label="Has Balcony / Terrace" checked={formData.has_balcony} onChange={e => setFormData({ ...formData, has_balcony: e.target.checked })} />
                                        <Toggle label="Smoking Allowed" checked={formData.smoking_allowed} onChange={e => setFormData({ ...formData, smoking_allowed: e.target.checked })} />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'amenities' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 pb-4">
                                    {Object.keys(amenitiesByCategory).map(cat => (
                                        <div key={cat}>
                                            <h4 className="font-bold text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-4 border-b border-emerald-100 dark:border-emerald-900/30 pb-2">{cat}</h4>
                                            <div className="grid grid-cols-2 gap-3">
                                                {amenitiesByCategory[cat].map(amenity => (
                                                    <div key={amenity.id} onClick={() => toggleAmenity(amenity.id)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${formData.amenityIds.includes(amenity.id) ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500/50 text-emerald-900 dark:text-emerald-300 shadow-sm' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-emerald-500/30'}`}>
                                                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${formData.amenityIds.includes(amenity.id) ? 'bg-emerald-500 border-emerald-500' : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600'}`}>
                                                            {formData.amenityIds.includes(amenity.id) && <CheckSquare size={14} className="text-white" />}
                                                        </div>
                                                        <span className="text-sm font-medium">{amenity.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'photos' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-white">Photo Gallery</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Add high-quality images.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button type="button" variant="secondary" onClick={addImageUrl} icon={<Plus size={16} />}>Add URL</Button>
                                            <div className="relative">
                                                <input type="file" multiple accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={handleFileSelect} />
                                                <Button type="button" icon={<ImageIcon size={16} />}>Upload Files</Button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {formData.images_json.map((url, idx) => (
                                            <div key={url + idx} className="relative aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden group border border-slate-200 dark:border-slate-700 shadow-sm">
                                                <img src={url} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <button type="button" onClick={() => setFormData(p => ({ ...p, images_json: p.images_json.filter((_, i) => i !== idx) }))} className="bg-white text-red-500 p-2 rounded-xl hover:scale-110 transition-transform shadow-lg"><Trash2 size={18} /></button>
                                                </div>
                                            </div>
                                        ))}
                                        {formData.files.map((file, idx) => (
                                            <div key={file.name + idx} className="relative aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden group border border-emerald-500/50 shadow-sm">
                                                <img src={URL.createObjectURL(file)} className="w-full h-full object-cover opacity-80" />
                                                <div className="absolute top-2 left-2 bg-emerald-500 text-white text-xs px-2 py-1 rounded-lg shadow-lg">New Upload</div>
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <button type="button" onClick={() => removeFile(idx)} className="bg-white text-red-500 p-2 rounded-xl hover:scale-110 transition-transform shadow-lg"><Trash2 size={18} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </form>

                        {/* Static Footer (Outside of Scroll Area) */}
                        <div className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 z-10 flex-shrink-0">
                            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                            <Button type="submit" form="room-type-form">{editingType ? 'Save Changes' : 'Create Room Type'}</Button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

function RoomCard({ type, isSelected, onSelect, onEdit, onDelete, onToggleFeature, onToggleActive }: any) {
    // ... same as before
    const images = typeof type.images_json === 'string' ? JSON.parse(type.images_json || '[]') : (type.images_json || []);
    const [imgIndex, setImgIndex] = useState(0);

    const nextImg = (e: any) => { e.stopPropagation(); setImgIndex((prev) => (prev + 1) % images.length); }
    const prevImg = (e: any) => {
        e.stopPropagation();
        setImgIndex((prev) => (prev - 1 + images.length) % images.length);
    }

    return (
        <div className={`group relative flex flex-col bg-white dark:bg-slate-900 rounded-xl border transition-all duration-300 ${isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg' : 'border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-emerald-500/30'}`}>
            <div className="absolute top-3 left-3 z-20">
                <div onClick={onSelect} className={`w-6 h-6 rounded-lg border-2 cursor-pointer flex items-center justify-center transition-all shadow-sm ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'bg-white/90 dark:bg-slate-800/90 border-slate-300 dark:border-slate-500'}`}>
                    {isSelected && <CheckSquare size={14} className="text-white bg-transparent" />}
                </div>
            </div>

            <div className="absolute top-3 right-3 z-20 flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); onToggleFeature(); }} className={`p-1.5 rounded-lg backdrop-blur-md transition-all ${type.is_featured ? 'bg-amber-100 text-amber-500' : 'bg-white/90 text-slate-400 hover:text-amber-500'}`}>
                    <Star size={16} fill={type.is_featured ? "currentColor" : "none"} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onToggleActive(); }} className={`p-1.5 rounded-lg backdrop-blur-md transition-all ${type.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-white/90 text-slate-400 hover:bg-slate-200'}`}>
                    <Power size={16} />
                </button>
            </div>

            <div className="relative h-48 bg-slate-100 dark:bg-slate-800 rounded-t-xl overflow-hidden">
                {images.length > 0 ? (
                    <>
                        <img src={images[imgIndex]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        {images.length > 1 && (
                            <>
                                <button onClick={prevImg} className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/30 hover:bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><ChevronLeft size={16} /></button>
                                <button onClick={nextImg} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/30 hover:bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight size={16} /></button>
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                    {images.map((_: any, i: number) => (
                                        <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIndex ? 'bg-white w-3' : 'bg-white/50'}`} />
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-300 dark:text-slate-600">
                        <ImageIcon size={48} strokeWidth={1} />
                    </div>
                )}
            </div>

            <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1">{type.name}</h3>
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{type.code}</span>
                    </div>
                    <div className="text-right">
                        <span className="block font-bold text-emerald-600">₹{type.base_price}</span>
                        <span className="text-xs text-slate-400">/ night</span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-2 mb-4">
                    <Badge variant="blue">{type.bed_type}</Badge>
                    <Badge>{type.room_size_sqm} m²</Badge>
                    {type.is_active === 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-bold">Inactive</span>}
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <span className="text-xs text-slate-400">{type.total_rooms} units</span>
                    <div className="flex gap-1">
                        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="h-8 w-8 flex items-center justify-center rounded-full border border-transparent hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 transition-all"><Edit size={16} /></button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="h-8 w-8 flex items-center justify-center rounded-full border border-transparent text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"><Trash2 size={16} /></button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function TabBtn({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
    return (
        <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}>
            <Icon size={18} />
            {label}
        </button>
    )
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode, variant?: 'default' | 'amber' | 'blue' }) {
    const variants = {
        default: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
        amber: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500",
        blue: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
    }
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide border border-transparent ${variants[variant]}`}>{children}</span>
}

function Toggle({ label, checked, onChange }: { label: string, checked: boolean, onChange: (e: any) => void }) {
    return (
        <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-9 h-5 rounded-full relative transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 transition-colors">{label}</span>
        </label>
    )
}
