"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function RoomTypesPage() {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRoom, setEditingRoom] = useState<any>(null);
    const [amenities, setAmenities] = useState<any[]>([]);

    // Form
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        base_price: '',
        max_adults: 2,
        max_children: 1,
        total_rooms: 0,
        amenityIds: [] as number[]
    });

    const inputClass = "w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 dark:bg-slate-900 dark:text-white bg-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all";

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [rCheck, aCheck] = await Promise.all([
                api.get('/rooms'),
                api.get('/rooms/amenities')
            ]);
            setRooms(rCheck.data.data);
            setAmenities(aCheck.data.data);
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditingRoom(null);
        setFormData({
            name: '', description: '', base_price: '',
            max_adults: 2, max_children: 1, total_rooms: 0, amenityIds: []
        });
        setShowModal(true);
    };

    const openEdit = (room: any) => {
        setEditingRoom(room);
        setFormData({
            name: room.name,
            description: room.description,
            base_price: room.base_price,
            max_adults: room.max_adults,
            max_children: room.max_children,
            total_rooms: room.total_rooms,
            amenityIds: room.amenities?.map((a: any) => a.id) || []
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = { ...formData, amenityIds: JSON.stringify(formData.amenityIds) };

            if (editingRoom) {
                await api.put(`/rooms/${editingRoom.id}`, payload);
                toast.success('Room Type Updated');
            } else {
                await api.post('/rooms', payload);
                toast.success('Room Type Created');
            }
            setShowModal(false);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this room type?')) return;
        try {
            await api.delete(`/rooms/${id}`);
            toast.success('Deleted');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const toggleAmenity = (id: number) => {
        setFormData(prev => {
            const ids = prev.amenityIds.includes(id)
                ? prev.amenityIds.filter(x => x !== id)
                : [...prev.amenityIds, id];
            return { ...prev, amenityIds: ids };
        });
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Room Types</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage room categories, pricing, and amenities.</p>
                </div>
                <button onClick={openCreate} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center">
                    <PlusIcon className="w-5 h-5 mr-2" /> Add Room Type
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {rooms.map((room: any) => (
                    <div key={room.id} className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6 relative group">
                        <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(room)} className="p-1.5 text-blue-600 bg-blue-50 rounded hover:bg-blue-100">
                                <PencilIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(room.id)} className="p-1.5 text-red-600 bg-red-50 rounded hover:bg-red-100">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{room.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 h-10">{room.description}</p>

                        <div className="mt-4 flex justify-between items-end border-t border-dashed border-gray-200 dark:border-slate-700 pt-4">
                            <div>
                                <span className="text-2xl font-bold text-emerald-600">${room.base_price}</span>
                                <span className="text-xs text-gray-400"> / night</span>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-semibold uppercase text-gray-400">Capacity</p>
                                <p className="text-sm dark:text-gray-200">{room.max_adults} Adults, {room.max_children} Kids</p>
                            </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                            {room.amenities?.slice(0, 3).map((a: any) => (
                                <span key={a.id} className="text-xs bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300">{a.name}</span>
                            ))}
                            {(room.amenities?.length || 0) > 3 && <span className="text-xs px-2 py-1 text-gray-400">+{room.amenities.length - 3} more</span>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
                        <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                        <h2 className="text-2xl font-bold mb-6 dark:text-white">{editingRoom ? 'Edit Room Type' : 'Create Room Type'}</h2>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium dark:text-gray-300 mb-1">Name</label>
                                    <input className={inputClass} required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Deluxe Ocean View" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium dark:text-gray-300 mb-1">Description</label>
                                    <textarea className={inputClass} rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300 mb-1">Base Price ($)</label>
                                    <input type="number" className={inputClass} required value={formData.base_price} onChange={e => setFormData({ ...formData, base_price: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300 mb-1">Total Inventory</label>
                                    <input type="number" className={inputClass} required value={formData.total_rooms} onChange={e => setFormData({ ...formData, total_rooms: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300 mb-1">Max Adults</label>
                                    <input type="number" className={inputClass} required value={formData.max_adults} onChange={e => setFormData({ ...formData, max_adults: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300 mb-1">Max Children</label>
                                    <input type="number" className={inputClass} required value={formData.max_children} onChange={e => setFormData({ ...formData, max_children: Number(e.target.value) })} />
                                </div>
                            </div>

                            <div className="border-t border-gray-100 dark:border-slate-700 pt-4">
                                <label className="block text-sm font-bold dark:text-white mb-3">Amenities</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {amenities.map(amenity => (
                                        <label key={amenity.id} className={`flex items-center space-x-2 p-2 rounded border cursor-pointer ${formData.amenityIds.includes(amenity.id) ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-slate-700'}`}>
                                            <input type="checkbox" checked={formData.amenityIds.includes(amenity.id)} onChange={() => toggleAmenity(amenity.id)} className="rounded text-emerald-600 focus:ring-emerald-500" />
                                            <span className="text-sm dark:text-gray-300">{amenity.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20">
                                {editingRoom ? 'Update Room Type' : 'Create Room Type'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
