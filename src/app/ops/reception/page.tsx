'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import {
    Users, LogIn, LogOut, BedDouble, AlertCircle,
    Calendar, CreditCard, CheckCircle, Clock, MoreHorizontal,
    Search, ClipboardList, X, DollarSign, ArrowRightLeft, CalendarClock, ShieldCheck
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export default function ReceptionDashboard() {
    const { t, formatCurrency } = useSettings();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    // Data State
    const [data, setData] = useState<any>({
        arrivals: [],
        departures: [],
        inHouse: [],
        rooms: [],
        events: [],
        compliance: [],
        handovers: [],
        stats: { pending_payments: 0, occupancy: 0, messages: 0 }
    });

    // Modal State
    const [selectedGuest, setSelectedGuest] = useState<any>(null);
    const [modalMode, setModalMode] = useState<'assign' | 'checkin' | 'checkout' | 'payment' | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Action Forms
    const [assignRoomId, setAssignRoomId] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentHigh, setPaymentDesc] = useState('Room Charge');

    useEffect(() => {
        fetchData();
        const socketUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5000';
        const socket = io(socketUrl);

        socket.on('connect', () => {
            const hotelId = (user as any)?.hotel_id || 1;
            socket.emit('join_hotel', hotelId);
        });

        socket.on('guest_checked_in', () => { toast.success("Guest Checked In!"); fetchData(); });
        socket.on('guest_checked_out', () => { toast.success("Guest Checked Out"); fetchData(); });
        socket.on('room_assigned', () => { toast.success("Room Assigned"); fetchData(); });
        socket.on('payment_posted', () => fetchData());

        return () => { socket.disconnect(); };
    }, []);

    const fetchData = async () => {
        try {
            const [arrivalsRes, departuresRes, roomsRes, inHouseRes, eventsRes, complianceRes, handoversRes, statsRes] = await Promise.all([
                api.get('/adapter/pms/arrivals'),
                api.get('/adapter/pms/departures'),
                api.get('/adapter/pms/room-status'),
                api.get('/adapter/pms/in-house'),
                api.get('/adapter/pms/events'),
                api.get('/adapter/pms/compliance'),
                api.get('/adapter/pms/handovers'),
                api.get('/analytics/overview')
            ]);

            const rooms = roomsRes.data.data || [];
            const occupiedCount = rooms.filter((r: any) => r.status === 'occupied').length;
            const occupancyRate = rooms.length > 0 ? Math.round((occupiedCount / rooms.length) * 100) : 0;

            setData({
                arrivals: arrivalsRes.data.data || [],
                departures: departuresRes.data.data || [],
                inHouse: inHouseRes.data.data || [],
                rooms: rooms,
                events: eventsRes.data.data || [],
                compliance: complianceRes.data.data || [
                    { title: "System Ready", status: "compliant", time: "Waiting for data..." }
                ],
                handovers: handoversRes.data.data || [],
                stats: {
                    pending_payments: statsRes.data.data?.finance?.pending_payments || 0,
                    occupancy: occupancyRate,
                    messages: 5
                }
            });
        } catch (error) {
            console.error("Dashboard Load Failed", error);
        } finally {
            setLoading(false);
        }
    };

    // --- Actions ---

    const openModal = (mode: 'assign' | 'checkin' | 'checkout' | 'payment', guest: any) => {
        setSelectedGuest(guest);
        setModalMode(mode);
        // Reset form vars
        setAssignRoomId('');
        setPaymentAmount('');
        setPaymentDesc('');
        // If posting payment to In-House guest, pre-fill balance if check-out
        if (mode === 'checkout' && guest.total_amount > 0) {
            setPaymentAmount(guest.total_amount.toString());
        }
    };

    const handleAssignRoom = async () => {
        if (!assignRoomId) return toast.error("Please select a room");
        const room = data.rooms.find((r: any) => r.id == assignRoomId);

        try {
            setActionLoading(true);
            await api.post('/adapter/pms/assign-room', {
                reservationId: selectedGuest.id,
                roomNumber: room.room_number
            });
            setModalMode(null);
            toast.success("Room assigned successfully")
            fetchData();
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Assignment Failed");
        } finally {
            setActionLoading(false);
        }
    };

    const handleCheckIn = async () => {
        try {
            setActionLoading(true);
            await api.post('/adapter/pms/check-in', { reservationId: selectedGuest.id });
            setModalMode(null);
            toast.success("Check-in successful")
            fetchData();
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Check-In Failed");
        } finally {
            setActionLoading(false);
        }
    };

    const handleCheckOut = async () => {
        try {
            setActionLoading(true);
            await api.post('/adapter/pms/check-out', {
                reservationId: selectedGuest.id,
                payment: paymentAmount ? { amount: parseFloat(paymentAmount), method: 'cash' } : null
            });
            setModalMode(null);
            toast.success("Check-out successful");
            fetchData();
        } catch (e: any) {
            toast.error(e.response?.data?.message || e.message || "Check-Out Failed");
        } finally {
            setActionLoading(false);
        }
    };

    const handlePostCharge = async () => {
        try {
            setActionLoading(true);
            await api.post('/adapter/pms/post-charge', {
                reservationId: selectedGuest.id,
                amount: parseFloat(paymentAmount),
                description: paymentHigh,
                type: 'charge'
            });
            toast.success("Charge Posted");
            setModalMode(null);
            fetchData();
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Post Charge Failed");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className="p-10 text-center animate-pulse">Loading Command Center...</div>;

    // Filter available rooms for assignment
    const availableRooms = data.rooms.filter((r: any) => r.status === 'clean');

    return (
        <div className="h-[calc(100vh-2rem)] flex flex-col gap-6 overflow-hidden p-2">

            {/* Header */}
            <header className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Reception Command Center</h1>
                    <p className="text-sm text-slate-500">Live Operations View • {new Date().toLocaleDateString()}</p>
                </div>
                <div className="flex gap-6">
                    <StatBadge icon={CreditCard} label="Pending Payments" value={formatCurrency(data.stats.pending_payments)} color="text-red-600" />
                    <StatBadge icon={BedDouble} label="In-House" value={data.rooms.filter((r: any) => r.status === 'occupied').length} color="text-blue-600" />
                    <StatBadge icon={Calendar} label="Events" value={data.events.length} color="text-purple-600" />
                    <StatBadge icon={ShieldCheck} label="Compliance" value="98%" color="text-teal-600" />
                </div>
            </header>

            {/* Main Layout */}
            <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden min-h-0">

                {/* LEFT COLUMN: Arrivals & Departures (Width 4) */}
                <div className="col-span-12 xl:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">

                    {/* Arrivals */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col h-[50%]">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-inherit z-10">
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <LogIn size={18} className="text-emerald-500" /> Today's Arrivals
                                <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full">{data.arrivals.length}</span>
                            </h2>
                            <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={18} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {data.arrivals.map((guest: any) => (
                                <ArrivalCard
                                    key={guest.id}
                                    guest={guest}
                                    currency={formatCurrency}
                                    onAssign={() => openModal('assign', guest)}
                                    onCheckIn={() => openModal('checkin', guest)}
                                />
                            ))}
                            {data.arrivals.length === 0 && <p className="text-center text-slate-400 py-10">No arrivals remaining today</p>}
                        </div>
                    </div>

                    {/* Departures */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col h-[50%]">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-inherit z-10">
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <LogOut size={18} className="text-orange-500" /> Departures
                                <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">{data.departures.length}</span>
                            </h2>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {data.departures.map((guest: any) => (
                                <DepartureCard
                                    key={guest.id}
                                    guest={guest}
                                    onCheckOut={() => openModal('checkout', guest)}
                                />
                            ))}
                            {data.departures.length === 0 && <p className="text-center text-slate-400 py-10">No departures remaining</p>}
                        </div>
                    </div>
                </div>

                {/* MIDDLE COLUMN: Room Grid & In-House List (Width 5) */}
                <div className="col-span-12 xl:col-span-5 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">

                    {/* Visual Room Grid (Restored) */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <BedDouble size={18} className="text-blue-500" /> Room Board
                            </h2>
                            <span className="text-xs text-slate-500">{data.stats.occupancy}% Occupancy</span>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-4 gap-2">
                            {data.rooms.slice(0, 20).map((room: any) => (
                                <RoomTile key={room.id} room={room} />
                            ))}
                        </div>
                        <div className="mt-4 text-center">
                            <button className="text-sm text-blue-600 font-medium hover:underline">View All Rooms</button>
                        </div>
                    </div>

                    {/* In-House Guests Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex-1 flex flex-col">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-inherit z-10">
                            <h2 className="font-bold text-lg flex items-center gap-2">In-House Guests</h2>
                            <div className="relative hidden sm:block">
                                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="text" placeholder="Search..." className="pl-7 pr-2 py-1 text-sm border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3">Room</th>
                                        <th className="px-4 py-3">Guest</th>
                                        <th className="px-4 py-3 text-right">Balance</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {data.inHouse.map((stay: any, i: number) => (
                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                            <td className="px-4 py-3 font-bold text-lg text-slate-700 dark:text-slate-200">{stay.room_number || '-'}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-slate-900 dark:text-white">{stay.guest_name}</div>
                                                <div className="text-xs text-slate-500">{new Date(stay.check_in_date).toLocaleDateString()} - {new Date(stay.check_out_date).toLocaleDateString()}</div>
                                            </td>
                                            <td className={`px-4 py-3 text-right font-bold ${stay.balance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                {formatCurrency(stay.balance)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openModal('payment', stay)} title="Post Charge" className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-blue-600"><DollarSign size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {data.inHouse.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400">No guests in-house</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Widgets (Events, Compliance, Handover) (Width 3) */}
                <div className="col-span-12 xl:col-span-3 flex flex-col gap-6 overflow-y-auto custom-scrollbar">

                    {/* Events Widget (Restored) */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-4">
                        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Calendar size={18} className="text-purple-500" /> Today's Events
                        </h2>
                        <div className="space-y-3">
                            {data.events && data.events.length > 0 ? (
                                data.events.map((evt: any, i: number) => (
                                    <div key={i} className="flex gap-3 items-start p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
                                        <div className="flex flex-col items-center justify-center min-w-[50px] bg-white dark:bg-slate-800 rounded p-1 shadow-sm text-xs font-bold text-slate-700 dark:text-slate-300">
                                            <span>{new Date(evt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-slate-800 dark:text-slate-100">{evt.name}</div>
                                            <div className="text-xs text-slate-500 flex flex-col gap-0.5">
                                                <span>{evt.location}</span>
                                                <span className="text-purple-600">{evt.pax} Attendees</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-slate-400 text-sm py-4">No events scheduled today</p>
                            )}
                        </div>
                    </div>

                    {/* Compliance Widget */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-4">
                        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <ShieldCheck size={18} className="text-teal-500" /> Compliance
                        </h2>
                        <div className="space-y-4">
                            {data.compliance.map((item: any, i: number) => (
                                <div key={i} className="flex gap-3 items-start p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                    <div className={`mt-0.5 ${item.status === 'compliant' ? 'text-teal-500' : 'text-orange-500'}`}>
                                        {item.status === 'compliant' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm text-slate-800 dark:text-slate-200">{item.title}</div>
                                        <div className="text-xs text-slate-500">{item.time}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Shift Handover Widget */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 flex-1 flex flex-col min-h-[300px]">
                        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <ClipboardList size={18} className="text-blue-500" /> Shift Handovers
                        </h2>
                        <div className="space-y-3 flex-1 overflow-y-auto">
                            {data.handovers.map((note: any, i: number) => (
                                <div key={i} className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800/30">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-xs text-blue-800 dark:text-blue-300">{note.shift_type.toUpperCase()}</span>
                                        <span className="text-[10px] text-slate-400">{new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3">{note.notes}</p>
                                    <div className="mt-2 text-xs font-medium text-slate-500 flex justify-between">
                                        <span>Cash: {formatCurrency(note.cash_in_drawer)}</span>
                                        <span className={`px-1.5 py-0.5 rounded ${note.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {note.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {data.handovers.length === 0 && <p className="text-center text-slate-400 py-10">No recent logs</p>}
                        </div>
                        <button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg transition-colors shadow-lg shadow-blue-500/20">
                            Add Handover Note
                        </button>
                    </div>

                </div>
            </div>

            {/* MODALS */}

            {/* Assign Room Modal */}
            <Modal isOpen={modalMode === 'assign'} onClose={() => setModalMode(null)} title="Assign Room">
                <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                        <div className="flex justify-between mb-1">
                            <span className="text-sm text-slate-500">Guest</span>
                            <span className="text-sm font-bold">{selectedGuest?.guest_name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-500">Reserved Type</span>
                            <span className="text-sm font-bold text-blue-600">{selectedGuest?.room_type_name}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Select Room</label>
                        <select
                            className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            value={assignRoomId}
                            onChange={e => setAssignRoomId(e.target.value)}
                        >
                            <option value="">Select a clean room...</option>
                            {availableRooms.map((r: any) => (
                                <option key={r.id} value={r.id}>
                                    {r.room_number} - {r.room_type_name} ({r.floor_number}F)
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-400 mt-1">Only Clean & Vacant rooms are shown.</p>
                    </div>
                    <div className="flex gap-2 justify-end pt-4">
                        <Button variant="ghost" onClick={() => setModalMode(null)}>Cancel</Button>
                        <Button onClick={handleAssignRoom} isLoading={actionLoading} disabled={!assignRoomId}>Confirm Assignment</Button>
                    </div>
                </div>
            </Modal>

            {/* Check In Modal */}
            <Modal isOpen={modalMode === 'checkin'} onClose={() => setModalMode(null)} title="Check In Guest">
                <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg flex items-center gap-3">
                        <CheckCircle size={24} />
                        <div>
                            <div className="font-bold">Ready for Check-In</div>
                            <div className="text-sm">Pre-checks complete. Room is ready.</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm p-2">
                        <div>
                            <span className="block text-slate-400 text-xs">Guest Name</span>
                            <span className="font-bold">{selectedGuest?.guest_name}</span>
                        </div>
                        <div>
                            <span className="block text-slate-400 text-xs">Room Assigned</span>
                            <span className="font-bold text-emerald-600 text-lg">#{selectedGuest?.room_number}</span>
                        </div>
                        <div>
                            <span className="block text-slate-400 text-xs">Stay Duration</span>
                            <span className="font-bold">{selectedGuest?.room_count} Room(s)</span>
                        </div>
                        <div>
                            <span className="block text-slate-400 text-xs">Balance</span>
                            <span className="font-bold">{formatCurrency(selectedGuest?.total_amount)}</span>
                        </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-4">
                        <Button variant="ghost" onClick={() => setModalMode(null)}>Cancel</Button>
                        <Button onClick={handleCheckIn} isLoading={actionLoading}>Confirm Check-In</Button>
                    </div>
                </div>
            </Modal>

            {/* Payment / Charge Modal */}
            <Modal isOpen={modalMode === 'payment'} onClose={() => setModalMode(null)} title="Post Charge">
                <div className="space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded text-sm mb-2">
                        Post charge to <b>Room {selectedGuest?.room_number}</b> ({selectedGuest?.guest_name})
                    </div>
                    <Input label="Description" value={paymentHigh} onChange={(e: any) => setPaymentDesc(e.target.value)} placeholder="e.g. Room Service, Laundry" />
                    <Input label="Amount" type="number" value={paymentAmount} onChange={(e: any) => setPaymentAmount(e.target.value)} placeholder="0.00" />
                    <div className="flex gap-2 justify-end pt-4">
                        <Button variant="ghost" onClick={() => setModalMode(null)}>Cancel</Button>
                        <Button onClick={handlePostCharge} isLoading={actionLoading} disabled={!paymentAmount}>Post Charge</Button>
                    </div>
                </div>
            </Modal>

            {/* Check Out Modal */}
            <Modal isOpen={modalMode === 'checkout'} onClose={() => setModalMode(null)} title="Check Out Guest">
                <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                        <span className="font-bold text-slate-700 dark:text-slate-200">Total Due</span>
                        <span className="font-bold text-xl text-red-600">{formatCurrency(selectedGuest?.total_amount || 0)}</span>
                    </div>
                    <div className="border-t dark:border-slate-700 pt-4">
                        <label className="block text-sm font-medium mb-1">Settle Payment (Optional)</label>
                        <Input type="number" placeholder="Enter amount to pay now..." value={paymentAmount} onChange={(e: any) => setPaymentAmount(e.target.value)} />
                    </div>
                    <div className="flex gap-2 justify-end pt-4">
                        <Button variant="ghost" onClick={() => setModalMode(null)}>Close</Button>
                        <Button onClick={handleCheckOut} isLoading={actionLoading} variant="danger">Review & Check Out</Button>
                    </div>
                </div>
            </Modal>

        </div>
    );
}

// --- Sub Components ---

function StatBadge({ icon: Icon, label, value, color }: any) {
    return (
        <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
                <Icon size={16} className={color} />
            </div>
            <div>
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</div>
                <div className="font-bold text-slate-900 dark:text-white leading-none">{value}</div>
            </div>
        </div>
    );
}

function ArrivalCard({ guest, currency, onAssign, onCheckIn }: any) {
    return (
        <div className="p-3 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                        {guest.guest_name.charAt(0)}
                    </div>
                    <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">{guest.guest_name}</div>
                        <div className="text-xs text-slate-500">{guest.room_type_name} • {guest.room_count} Room</div>
                    </div>
                </div>
                {guest.room_number ? (
                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-2 py-1 rounded">#{guest.room_number}</span>
                ) : (
                    <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1"><Clock size={10} /> Pending</span>
                )}
            </div>
            <div className="flex justify-between items-center mt-3">
                <div className="flex gap-2">
                    {guest.room_number ? (
                        <button onClick={onCheckIn} className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded shadow-sm hover:bg-emerald-700 font-bold transition-colors">Check In</button>
                    ) : (
                        <button onClick={onAssign} className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded shadow-sm hover:bg-blue-700 font-medium transition-colors">Assign Room</button>
                    )}
                </div>
                <div className="text-right">
                    <span className="text-xs text-slate-400 mr-2">Due</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{currency(guest.total_amount)}</span>
                </div>
            </div>
        </div>
    );
}

function DepartureCard({ guest, onCheckOut }: any) {
    return (
        <div className="p-3 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">{guest.guest_name}</div>
                <div className="text-xs text-slate-500">#{guest.room_number}</div>
            </div>
            <button onClick={onCheckOut} className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded font-medium transition-colors">Check Out</button>
        </div>
    );
}

function RoomTile({ room }: any) {
    const statusColors: any = {
        clean: 'bg-emerald-100 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300',
        dirty: 'bg-red-100 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300',
        occupied: 'bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300',
        maintenance: 'bg-slate-100 border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
    };
    return (
        <div className={`p-2 rounded-lg border ${statusColors[room.status] || 'bg-gray-100'} flex flex-col aspect-square justify-between transition-all hover:scale-105 cursor-pointer`}>
            <div className="flex justify-between items-start">
                <span className="font-bold text-sm">{room.room_number}</span>
                {room.status === 'dirty' && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
            </div>
            <div className="text-[10px] font-medium uppercase truncate">{room.status}</div>
        </div>
    )
}
