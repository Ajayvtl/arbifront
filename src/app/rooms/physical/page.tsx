'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api'; // Assume api wrapper exists
import { Plus, Building, Trash2 } from 'lucide-react';

export default function PhysicalRoomsPage() {
    const [rooms, setRooms] = useState([]);
    const [roomTypes, setRoomTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        room_type_id: '',
        floor_number: '1',
        start_number: '101',
        count: '1' // 1 for single, >1 for bulk
    });

    const [editMode, setEditMode] = useState(false);
    const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [roomsRes, typesRes] = await Promise.all([
                api.get('/rooms/physical'),
                api.get('/rooms') // Get room types for dropdown
            ]);
            setRooms(roomsRes.data.data);
            setRoomTypes(typesRes.data.data || []);
        } catch (error) {
            console.error('Failed to fetch rooms', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (room: any) => {
        setFormData({
            room_type_id: room.room_type_id,
            floor_number: room.floor_number,
            start_number: room.room_number,
            count: '1'
        });
        setEditMode(true);
        setEditingRoomId(room.id);
        setShowModal(true);
    };

    const handleAddClick = () => {
        setFormData({
            room_type_id: '',
            floor_number: '1',
            start_number: '101',
            count: '1'
        });
        setEditMode(false);
        setEditingRoomId(null);
        setShowModal(true);
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        try {
            if (editMode && editingRoomId) {
                await api.put(`/rooms/physical/${editingRoomId}`, {
                    room_number: formData.start_number,
                    room_type_id: formData.room_type_id,
                    floor_number: formData.floor_number
                });
            } else {
                if (parseInt(formData.count) > 1) {
                    await api.post('/rooms/physical/bulk', formData);
                } else {
                    await api.post('/rooms/physical', {
                        room_number: formData.start_number,
                        room_type_id: formData.room_type_id,
                        floor_number: formData.floor_number
                    });
                }
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            alert('Failed to save rooms: ' + (error as any).response?.data?.message || (error as any).message);
        }
    };

    // Group rooms by floor
    const floors = rooms.reduce((acc: Record<string, any[]>, room: any) => {
        const floor = room.floor_number || 1;
        if (!acc[floor]) acc[floor] = [];
        acc[floor].push(room);
        return acc;
    }, {});

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Physical Room Inventory</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage your actual hotel rooms (101, 102...)</p>
                </div>
                <button
                    onClick={handleAddClick}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm"
                >
                    <Plus size={20} /> Add Rooms
                </button>
            </div>

            {loading ? (
                <div className="text-center py-20 text-gray-500 dark:text-gray-400">Loading inventory...</div>
            ) : Object.keys(floors).length === 0 ? (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                    <Building className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No rooms configured</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">Start by adding your physical rooms (e.g. 101, 102)</p>
                    <button
                        onClick={handleAddClick}
                        className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                    >
                        Create first room
                    </button>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.keys(floors).sort().map(floor => (
                        <div key={floor} className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-4">
                            <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 py-1 px-2 rounded text-sm">Floor {floor}</span>
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {floors[floor].map((room: any) => (
                                    <div key={room.id}
                                        onClick={() => handleEditClick(room)}
                                        className={`
                                        border rounded-lg p-3 relative group transition hover:shadow-md cursor-pointer
                                        ${room.status === 'clean' ? 'bg-green-50 border-green-100 dark:bg-green-900/10 dark:border-green-800' : ''}
                                        ${room.status === 'dirty' ? 'bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-800' : ''}
                                        ${room.status === 'maintenance' ? 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-800' : ''}
                                    `}>
                                        <div className="font-bold text-lg text-gray-800 dark:text-gray-100">{room.room_number}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={room.room_type_name}>
                                            {room.room_type_name}
                                        </div>
                                        <div className={`
                                            absolute top-2 right-2 w-2 h-2 rounded-full
                                            ${room.status === 'clean' ? 'bg-green-500' : ''}
                                            ${room.status === 'dirty' ? 'bg-amber-500' : ''}
                                            ${room.status === 'maintenance' ? 'bg-red-500' : ''}
                                        `}></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 transition-all">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900 dark:text-white">{editMode ? 'Edit Room' : 'Add Rooms'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Room Type</label>
                                <select
                                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    required
                                    value={formData.room_type_id}
                                    onChange={e => setFormData({ ...formData, room_type_id: e.target.value })}
                                >
                                    <option value="" className="dark:bg-slate-800">Select Type...</option>
                                    {roomTypes.map((rt: any) => (
                                        <option key={rt.id} value={rt.id} className="dark:bg-slate-800">{rt.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Floor</label>
                                    <input
                                        type="number"
                                        className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        value={formData.floor_number}
                                        onChange={e => setFormData({ ...formData, floor_number: e.target.value })}
                                    />
                                </div>
                                {!editMode && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Quantity</label>
                                        <input
                                            type="number"
                                            className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            min="1" max="50"
                                            value={formData.count}
                                            onChange={e => setFormData({ ...formData, count: e.target.value })}
                                        />
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">1 for single, &gt;1 for bulk</p>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                                    {editMode ? 'Room Number' : (parseInt(formData.count) > 1 ? 'Start Number' : 'Room Number')}
                                </label>
                                <input
                                    type="number"
                                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="e.g. 101"
                                    required
                                    value={formData.start_number}
                                    onChange={e => setFormData({ ...formData, start_number: e.target.value })}
                                />
                                {!editMode && parseInt(formData.count) > 1 && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        Will create rooms {formData.start_number} to {parseInt(formData.start_number) + parseInt(formData.count) - 1}
                                    </p>
                                )}
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-colors"
                                >
                                    {editMode ? 'Save Changes' : 'Create Rooms'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
