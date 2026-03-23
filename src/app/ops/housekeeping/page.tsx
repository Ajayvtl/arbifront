'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
    SprayCan,
    CheckCircle,
    AlertTriangle,
    Bed,
    Filter,
    Clock,
    MoreVertical,
    RefreshCcw,
    Search
} from 'lucide-react';

export default function HousekeepingPage() {
    const [rooms, setRooms] = useState<any[]>([]);
    const [stats, setStats] = useState({ total: 0, clean: 0, dirty: 0, occupied: 0, maintenance: 0 });
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterFloor, setFilterFloor] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRooms, setSelectedRooms] = useState<number[]>([]);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            const res = await api.get('/ops/housekeeping/dashboard');
            if (res.data.success) {
                setRooms(res.data.data.rooms);
                setStats(res.data.data.stats);
            }
        } catch (error) {
            console.error("Failed to load dashboard", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (roomIds: number[], status: string, notes?: string) => {
        // Optimistic UI Update
        const oldRooms = [...rooms];
        setRooms(prev => prev.map(r => roomIds.includes(r.id) ? { ...r, status: status } : r));

        // Recalculate stats locally for smoothness
        // (Skipping complex local stat recalc for brevity, usually simpler to fetch or just wait)

        try {
            await api.post('/ops/housekeeping/update-status', { roomIds, status, notes });
            // Success - maybe refetch stats to be 100% sure
            fetchDashboard();
        } catch (error) {
            alert("Failed to update status");
            setRooms(oldRooms); // Revert
        }
    };

    // Derived State for Filtering
    const floors = [...new Set(rooms.map(r => r.floor_number))].sort((a, b) => a - b);

    const filteredRooms = rooms.filter(room => {
        if (filterStatus !== 'all' && room.status !== filterStatus) return false;
        if (filterFloor !== 'all' && room.floor_number.toString() !== filterFloor) return false;
        if (searchQuery && !room.room_number.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    // Helper for Status UI
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'clean': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800';
            case 'dirty': return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800';
            case 'occupied': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
            case 'maintenance': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800';
            default: return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'clean': return <CheckCircle size={16} />;
            case 'dirty': return <SprayCan size={16} />;
            case 'occupied': return <Bed size={16} />;
            case 'maintenance': return <AlertTriangle size={16} />;
            default: return <Clock size={16} />;
        }
    };

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Housekeeping</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage room cleaning status and inspections</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchDashboard} className="p-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <RefreshCcw size={20} className="text-gray-600 dark:text-gray-300" />
                    </button>
                    {/* Bulk Action Placeholder */}
                    {selectedRooms.length > 0 && (
                        <button
                            onClick={() => {
                                if (confirm(`Mark ${selectedRooms.length} rooms as Clean?`)) {
                                    handleUpdateStatus(selectedRooms, 'clean');
                                    setSelectedRooms([]);
                                }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
                        >
                            Mark Selected Clean
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <StatsCard
                    label="Total Rooms"
                    value={stats.total}
                    icon={<Bed size={20} />}
                    color="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
                />
                <StatsCard
                    label="Clean"
                    value={stats.clean}
                    icon={<CheckCircle size={20} />}
                    color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                />
                <StatsCard
                    label="Dirty"
                    value={stats.dirty}
                    icon={<SprayCan size={20} />}
                    color="bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                />
                <StatsCard
                    label="Occupied"
                    value={stats.occupied}
                    icon={<Bed size={20} />}
                    color="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                />
                <StatsCard
                    label="Maintenance"
                    value={stats.maintenance}
                    icon={<AlertTriangle size={20} />}
                    color="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                />
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search Room..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Status</option>
                        <option value="clean">Clean</option>
                        <option value="dirty">Dirty</option>
                        <option value="occupied">Occupied</option>
                        <option value="maintenance">Maintenance</option>
                    </select>

                    <select
                        value={filterFloor}
                        onChange={(e) => setFilterFloor(e.target.value)}
                        className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Floors</option>
                        {floors.map(f => (
                            <option key={f} value={f}>Floor {f}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Room Grid */}
            {loading ? (
                <div className="text-center py-20 text-gray-500 dark:text-gray-400">Loading rooms...</div>
            ) : filteredRooms.length === 0 ? (
                <div className="text-center py-20 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    No rooms found matching your filters.
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredRooms.map(room => (
                        <div
                            key={room.id}
                            className={`
                                relative p-4 rounded-xl border-2 transition-all duration-200 text-left
                                ${getStatusColor(room.status)}
                                hover:shadow-md dark:hover:shadow-gray-900/30
                            `}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-2xl tracking-tight">
                                    {room.room_number}
                                </span>
                                <div className="flex gap-1">
                                    {room.status === 'dirty' && (
                                        <button
                                            title="Mark Clean"
                                            onClick={() => handleUpdateStatus([room.id], 'clean')}
                                            className="p-1.5 bg-white/50 hover:bg-white dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition-colors backdrop-blur-sm"
                                        >
                                            <CheckCircle size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <div className="text-xs font-semibold opacity-80 uppercase tracking-wider flex items-center gap-1">
                                    {getStatusIcon(room.status)} {room.status}
                                </div>
                                <div className="text-xs opacity-70">
                                    {room.room_type_name} &bull; Floor {room.floor_number}
                                </div>
                                {room.last_cleaned_at && (
                                    <div className="text-[10px] opacity-60 mt-2 flex items-center gap-1">
                                        <Clock size={10} />
                                        {new Date(room.last_cleaned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                )}
                            </div>

                            {/* Context Menu Trigger (Visual only for V1 or could toggle maintenance) */}
                            <div className="absolute bottom-2 right-2">
                                {room.status !== 'maintenance' ? (
                                    <button
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/10 rounded"
                                        onClick={() => handleUpdateStatus([room.id], 'maintenance')}
                                        title="Set to Maintenance"
                                    >
                                        <MoreVertical size={14} className="opacity-50" />
                                    </button>
                                ) : (
                                    <button
                                        className="text-xs underline opacity-80"
                                        onClick={() => handleUpdateStatus([room.id], 'clean')}
                                    >
                                        Finish
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function StatsCard({ label, value, icon, color }: { label: string, value: number, icon: any, color: string }) {
    return (
        <div className={`p-4 rounded-xl border ${color} flex flex-col items-center justify-center text-center shadow-sm`}>
            <div className="mb-2 opacity-80">{icon}</div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs font-medium opacity-70 uppercase tracking-wide">{label}</div>
        </div>
    );
}
