'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { CreditCard, ArrowRight, BedDouble, CheckSquare } from 'lucide-react';

interface Booking {
    id: number;
    booking_number: string;
    guest_name: string;
    guest_email?: string;
    guest_phone?: string;
    room_type_name: string;
    room_type_id: number;
    room_number?: string;
    floor_number?: number;
    check_in_date: string;
    check_out_date: string;
    status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
}

interface Room {
    id: number;
    room_number: string;
    floor_number: number;
    status: string;
}

export default function FrontDeskPage() {
    const router = useRouter();
    const { user, currentHotel, availableHotels, selectHotel, isLoading } = useAuth();
    const [activeTab, setActiveTab] = useState('arrivals');
    const [arrivals, setArrivals] = useState<Booking[]>([]);
    const [departures, setDepartures] = useState<Booking[]>([]);
    const [stats, setStats] = useState({ arrivals: 0, occupied: 0, departures: 0 });
    const [activeBooking, setActiveBooking] = useState<Booking | null>(null); // For Modal
    const [step, setStep] = useState(1);
    const [assignableRooms, setAssignableRooms] = useState<Room[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [contextError, setContextError] = useState<string | null>(null);

    const getErrorMessage = (error: unknown, fallback = 'Unknown error') => {
        if (
            typeof error === 'object' &&
            error !== null &&
            'response' in error &&
            typeof (error as { response?: unknown }).response === 'object' &&
            (error as { response?: unknown }).response !== null
        ) {
            const response = (error as { response?: { data?: { message?: string } } }).response;
            if (response?.data?.message) return response.data.message;
        }
        return fallback;
    };

    useEffect(() => {
        if (isLoading) return;
        if (!user) {
            router.replace('/login');
            return;
        }
        if (!currentHotel) {
            if (availableHotels.length === 1) {
                selectHotel(availableHotels[0].hotel_id);
                return;
            }
            if (availableHotels.length > 1) {
                router.replace('/select-hotel');
                return;
            }
            setLoading(false);
            setContextError('No active hotel context found. Please contact admin to assign hotel access.');
            return;
        }
        setContextError(null);
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading, user, currentHotel, availableHotels, router]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [arrRes, depRes] = await Promise.all([
                api.get('/ops/front-desk/arrivals'),
                api.get('/ops/front-desk/departures')
            ]);

            setArrivals(arrRes.data.data);
            setDepartures(depRes.data.data);

            setStats({
                arrivals: arrRes.data.data.length,
                occupied: 12, // Dummy for now
                departures: depRes.data.data.filter((d: Booking) => d.status === 'checked_in').length
            });
            setContextError(null);
        } catch (error) {
            console.error(error);
            setContextError('Unable to load front desk data. Ensure a valid hotel context is selected.');
        } finally {
            setLoading(false);
        }
    };

    const startCheckIn = async (booking: Booking) => {
        setActiveBooking(booking);
        setStep(1);
        setSelectedRoom(null);
    };

    const handleFetchRooms = async () => {
        try {
            const res = await api.get(`/ops/front-desk/assignable-rooms?roomTypeId=${activeBooking?.room_type_id || 1}`);
            setAssignableRooms(res.data.data);
            setStep(2);
        } catch {
            alert('Could not load rooms. Proceeding manually.');
            setStep(2);
        }
    };

    const confirmCheckIn = async () => {
        if (!selectedRoom) return alert('Please select a room');
        try {
            if (!activeBooking) return;
            await api.post(`/ops/front-desk/check-in/${activeBooking.id}`, {
                roomId: selectedRoom
            });
            alert('Check-In Successful!');
            setActiveBooking(null);
            fetchData();
        } catch (error: unknown) {
            alert('Failed: ' + getErrorMessage(error));
        }
    };

    const handleCheckOut = async (bookingId: number) => {
        if (!confirm('Are you sure you want to check out this guest? Room will be marked dirty.')) return;
        try {
            await api.post(`/ops/front-desk/check-out/${bookingId}`);
            alert('Check-Out Successful');
            fetchData();
        } catch (error: unknown) {
            alert('Failed: ' + getErrorMessage(error));
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Front Desk Operations</h1>
            {contextError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {contextError}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-blue-600 text-white rounded-xl p-6 shadow-lg">
                    <div className="text-blue-100 font-medium">Arrivals Today</div>
                    <div className="text-4xl font-bold mt-2">{stats.arrivals}</div>
                </div>
                <div className="bg-emerald-600 text-white rounded-xl p-6 shadow-lg">
                    <div className="text-blue-100 font-medium">Occupied Rooms</div>
                    <div className="text-4xl font-bold mt-2">{stats.occupied}</div>
                </div>
                <div className="bg-purple-600 text-white rounded-xl p-6 shadow-lg">
                    <div className="text-blue-100 font-medium">Pending Departures</div>
                    <div className="text-4xl font-bold mt-2">{stats.departures}</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveTab('arrivals')}
                    className={`pb-4 px-6 font-medium text-sm ${activeTab === 'arrivals' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Arrivals
                </button>
                <button
                    onClick={() => setActiveTab('departures')}
                    className={`pb-4 px-6 font-medium text-sm ${activeTab === 'departures' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Departures
                </button>
            </div>

            {/* Content List */}
            <div className="bg-white rounded-xl shadow border overflow-hidden">
                <div className="p-4 border-b bg-gray-50 font-bold text-gray-700">
                    {activeTab === 'arrivals' ? 'Expecting Arrivals' : 'Today\'s Departures'}
                </div>
                <div>
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading...</div>
                    ) : (
                        <table className="min-w-full">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="p-4 text-left">Guest</th>
                                    <th className="p-4 text-left">Room</th>
                                    <th className="p-4 text-left">Stay</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {activeTab === 'arrivals' && arrivals.length === 0 && (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">No arrivals.</td></tr>
                                )}
                                {activeTab === 'departures' && departures.length === 0 && (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">No departures.</td></tr>
                                )}

                                {(activeTab === 'arrivals' ? arrivals : departures).map(booking => (
                                    <tr key={booking.id} className="hover:bg-gray-50">
                                        <td className="p-4">
                                            <div className="font-bold text-gray-900">{booking.guest_name}</div>
                                            <div className="text-xs text-gray-500">{booking.booking_number}</div>
                                        </td>
                                        <td className="p-4 text-sm">
                                            {activeTab === 'arrivals' ? (
                                                <span className="text-gray-500">{booking.room_type_name}</span>
                                            ) : (
                                                <div>
                                                    <span className="font-bold text-gray-900">Room {booking.room_number || 'N/A'}</span>
                                                    <div className="text-xs text-gray-500">Floor {booking.floor_number}</div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">
                                            {new Date(booking.check_in_date).toLocaleDateString()} &rarr; {new Date(booking.check_out_date).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${booking.status === 'checked_in' ? 'bg-green-100 text-green-700' :
                                                booking.status === 'checked_out' ? 'bg-gray-100 text-gray-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {booking.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            {activeTab === 'arrivals' ? (
                                                <button
                                                    onClick={() => startCheckIn(booking)}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                                                >
                                                    Check In
                                                </button>
                                            ) : (
                                                booking.status === 'checked_in' && (
                                                    <div className="flex gap-2 justify-center">
                                                        <button
                                                            onClick={() => router.push(`/ops/folios/${booking.id}`)}
                                                            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1"
                                                            title="View Bill"
                                                        >
                                                            <CreditCard size={16} /> Bill
                                                        </button>
                                                        <button
                                                            onClick={() => handleCheckOut(booking.id)}
                                                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                                                        >
                                                            Check Out
                                                        </button>
                                                    </div>
                                                )
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Check-In Modal Steps */}
            {activeBooking && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
                        <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
                            <h3 className="font-bold text-lg">Check-In: {activeBooking.guest_name}</h3>
                            <button onClick={() => setActiveBooking(null)} className="hover:bg-blue-700 p-1 rounded">✕</button>
                        </div>

                        <div className="p-6">
                            {/* Visual Stepper */}
                            <div className="flex gap-2 mb-8 justify-center">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className={`
                                        w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                                        ${step >= i ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}
                                    `}>{i}</div>
                                ))}
                            </div>

                            {step === 1 && (
                                <div className="space-y-4">
                                    <h4 className="font-bold text-gray-800">Confirm Guest Details</h4>
                                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                                        <div><span className="text-xs text-gray-500 block">Name</span>{activeBooking.guest_name}</div>
                                        <div><span className="text-xs text-gray-500 block">Email</span>{activeBooking.guest_email || 'N/A'}</div>
                                        <div><span className="text-xs text-gray-500 block">Phone</span>{activeBooking.guest_phone || 'N/A'}</div>
                                        <div><span className="text-xs text-gray-500 block">Booking #</span>{activeBooking.booking_number}</div>
                                    </div>
                                    <div className="flex justify-end pt-4">
                                        <button
                                            onClick={handleFetchRooms}
                                            className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2"
                                        >
                                            Next: Assign Room <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-4">
                                    <h4 className="font-bold text-gray-800">Assign Room</h4>
                                    <p className="text-sm text-gray-500">Select a clean physical room for this guest.</p>

                                    <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2">
                                        {assignableRooms.map(room => (
                                            <div
                                                key={room.id}
                                                onClick={() => setSelectedRoom(room.id)}
                                                className={`
                                                    border rounded-lg p-3 cursor-pointer transition flex flex-col items-center justify-center
                                                    ${selectedRoom === room.id ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200' : 'hover:border-gray-400'}
                                                `}
                                            >
                                                <BedDouble className="text-gray-400 mb-1" />
                                                <span className="font-bold text-lg">{room.room_number}</span>
                                                <span className="text-xs text-gray-500">Floor {room.floor_number}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {assignableRooms.length === 0 && (
                                        <div className="text-center text-red-500 p-4 bg-red-50 rounded">
                                            No clean rooms available for this type!
                                        </div>
                                    )}

                                    <div className="flex justify-between pt-4">
                                        <button onClick={() => setStep(1)} className="text-gray-500">Back</button>
                                        <button
                                            onClick={() => setStep(3)}
                                            disabled={!selectedRoom}
                                            className="bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Next: Verify ID
                                        </button>
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <div className="inline-flex w-16 h-16 bg-green-100 text-green-600 rounded-full items-center justify-center mb-4">
                                            <CheckSquare size={32} />
                                        </div>
                                        <h4 className="font-bold text-xl">Ready to Check In</h4>
                                        <p className="text-gray-500">Room {assignableRooms.find(r => r.id === selectedRoom)?.room_number} assigned.</p>
                                    </div>

                                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 flex gap-3">
                                        <div className="text-yellow-600"><CreditCard /></div>
                                        <div>
                                            <div className="font-bold text-yellow-800 text-sm">Payment Pending</div>
                                            <div className="text-xs text-yellow-700">Standard policy requires payment collection upon arrival.</div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between pt-4">
                                        <button onClick={() => setStep(2)} className="text-gray-500">Back</button>
                                        <button
                                            onClick={confirmCheckIn}
                                            className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg"
                                        >
                                            Complete Check-In
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
