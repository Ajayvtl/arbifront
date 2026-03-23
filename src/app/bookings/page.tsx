"use client";

import React, { useEffect, useState } from 'react';
import api from "@/lib/api";
import { Search, Filter, Calendar, User, CreditCard, MoreVertical, Eye, FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import toast from 'react-hot-toast';

interface Booking {
    id: number;
    booking_number: string;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    check_in_date: string;
    check_out_date: string;
    status: string;
    total_amount: string;
    payment_status: string;
    room_name?: string;
}

export default function BookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        fetchBookings();
    }, [filterStatus]);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const params: any = {};
            if (filterStatus !== 'all') params.status = filterStatus;

            const res = await api.get('/bookings', { params });
            if (res.data.success) {
                setBookings(res.data.data);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load bookings");
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'checked_in': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'checked_out': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
            case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-slate-900 dark:text-slate-100">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Booking Management</h1>
                    <p className="text-slate-500 dark:text-slate-400">View and manage all hotel reservations</p>
                </div>
                <div className="flex gap-2">
                    <button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                        onClick={() => toast.success("Feature coming soon: Manual Booking Wizard")}
                    >
                        <User size={18} />
                        New Booking
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search guest, booking ID..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                    {['all', 'confirmed', 'checked_in', 'checked_out', 'cancelled'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${filterStatus === status
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
                                    : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                                <th className="p-4 font-semibold">Booking Ref</th>
                                <th className="p-4 font-semibold">Guest</th>
                                <th className="p-4 font-semibold">Dates</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold">Payment</th>
                                <th className="p-4 font-semibold">Amount</th>
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-500">
                                        <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                        Loading bookings...
                                    </td>
                                </tr>
                            ) : bookings.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-slate-500">
                                        No bookings found.
                                    </td>
                                </tr>
                            ) : (
                                bookings.map((booking) => (
                                    <tr key={booking.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-mono text-sm font-medium text-emerald-600 dark:text-emerald-400">{booking.booking_number}</div>
                                            <div className="text-xs text-slate-400">ID: {booking.id}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                                                    <User size={14} />
                                                </div>
                                                <div>
                                                    <div className="font-medium">{booking.guest_name}</div>
                                                    <div className="text-xs text-slate-400">{booking.guest_phone}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Calendar size={14} className="text-slate-400" />
                                                <span>
                                                    {new Date(booking.check_in_date).toLocaleDateString()}
                                                    <span className="text-slate-400 mx-1">→</span>
                                                    {new Date(booking.check_out_date).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border border-transparent ${getStatusColor(booking.status)}`}>
                                                {booking.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-sm">
                                                <div className={`w-2 h-2 rounded-full ${booking.payment_status === 'paid' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                                                <span className="capitalize">{booking.payment_status}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 font-medium">
                                            ₹{booking.total_amount}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500">
                                                <MoreVertical size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
