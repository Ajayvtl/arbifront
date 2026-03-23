"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon, XMarkIcon } from '@heroicons/react/24/outline';
// @ts-ignore
import { addDays, format, startOfToday, parseISO } from 'date-fns';

export default function InventoryGridPage() {
    const [startDate, setStartDate] = useState(startOfToday());
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    // Bulk Update State
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkData, setBulkData] = useState({
        room_type_id: '',
        rate_plan_id: '',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
        value: '',
        type: 'inventory' // 'inventory' or 'rate'
    });

    const dates = Array.from({ length: 14 }, (_, i) => addDays(startDate, i));
    const inputClass = "w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 dark:bg-slate-900 dark:text-white bg-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all";

    useEffect(() => {
        fetchGrid();
    }, [startDate]);

    const fetchGrid = async () => {
        setLoading(true);
        try {
            const end = addDays(startDate, 13);
            const res = await api.get(`/inventory/grid?start_date=${format(startDate, 'yyyy-MM-dd')}&end_date=${format(end, 'yyyy-MM-dd')}`);
            setData(res.data.data);

            // Set default room type for bulk
            if (res.data.data.roomTypes.length > 0 && !bulkData.room_type_id) {
                setBulkData(prev => ({ ...prev, room_type_id: res.data.data.roomTypes[0].id }));
            }
        } catch (error) {
            toast.error('Failed to load inventory');
        } finally {
            setLoading(false);
        }
    };

    const getInventory = (roomTypeId: number, date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const record = data?.inventory.find((r: any) => r.room_type_id === roomTypeId && r.date.startsWith(dateStr));
        return record ? record.total_inventory : '-';
    };

    const getRate = (ratePlanId: number, roomTypeId: number, date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const record = data?.rates.find((r: any) => r.rate_plan_id === ratePlanId && r.room_type_id === roomTypeId && r.date.startsWith(dateStr));
        return record ? record.price : '-';
    };

    const handleBulkSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        try {
            if (bulkData.type === 'inventory') {
                await api.post('/inventory/inventory/bulk', {
                    room_type_id: bulkData.room_type_id,
                    start_date: bulkData.start_date,
                    end_date: bulkData.end_date,
                    total_inventory: bulkData.value,
                    is_closed: 0
                });
            } else {
                if (!bulkData.rate_plan_id) return toast.error('Select a rate plan');
                await api.post('/inventory/rates/bulk', {
                    rate_plan_id: bulkData.rate_plan_id,
                    room_type_id: bulkData.room_type_id,
                    start_date: bulkData.start_date,
                    end_date: bulkData.end_date,
                    price: bulkData.value,
                    is_closed: 0
                });
            }
            toast.success('Update Successful');
            setIsBulkModalOpen(false);
            fetchGrid();
        } catch (error) {
            toast.error('Update Failed');
        } finally {
            setUpdating(false);
        }
    };

    if (loading && !data) return <div className="p-8 text-center text-gray-500">Loading Calendar...</div>;

    return (
        <div className="p-4 md:p-8 max-w-[95vw] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <CalendarDaysIcon className="w-6 h-6 text-emerald-500" />
                    Inventory & Rates
                </h1>

                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg shadow border border-gray-200 dark:border-slate-700 p-1">
                        <button onClick={() => setStartDate(addDays(startDate, -7))} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md">
                            <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        </button>
                        <span className="px-4 font-medium text-sm text-gray-700 dark:text-gray-200 min-w-[140px] text-center">
                            {format(startDate, 'MMM d')} - {format(addDays(startDate, 13), 'MMM d, yyyy')}
                        </span>
                        <button onClick={() => setStartDate(addDays(startDate, 7))} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md">
                            <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        </button>
                    </div>

                    <button
                        onClick={() => setIsBulkModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg shadow-emerald-500/20 transition-all"
                    >
                        Bulk Update
                    </button>
                </div>
            </div>

            {/* Grid Container - Scrollable */}
            <div className="overflow-x-auto rounded-xl shadow border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-900/50 dark:text-gray-400">
                        <tr>
                            <th className="px-4 py-3 sticky left-0 z-10 bg-gray-50 dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 min-w-[200px]">
                                Room Type / Rate Plan
                            </th>
                            {dates.map(date => (
                                <th key={date.toString()} className="px-2 py-3 text-center border-l dark:border-slate-700 min-w-[80px]">
                                    <div className="font-bold text-gray-900 dark:text-white">{format(date, 'EEE')}</div>
                                    <div className="text-xs font-normal">{format(date, 'd MMM')}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data?.roomTypes.map((room: any) => (
                            <>
                                {/* Inventory Row */}
                                <tr key={`inv-${room.id}`} className="border-b dark:border-slate-700 bg-emerald-50/50 dark:bg-emerald-900/10">
                                    <td className="px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-400 sticky left-0 z-10 bg-emerald-50/50 dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700">
                                        {room.name} (Qty)
                                    </td>
                                    {dates.map(date => (
                                        <td key={date.toString()} className="px-2 py-3 text-center border-l dark:border-slate-700 font-medium">
                                            {getInventory(room.id, date)}
                                        </td>
                                    ))}
                                </tr>

                                {/* Rate Plan Rows */}
                                {data?.ratePlans.map((plan: any) => (
                                    <tr key={`rate-${room.id}-${plan.id}`} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 border-b dark:border-slate-700/50 last:border-b-0">
                                        <td className="px-4 py-2 pl-8 text-gray-600 dark:text-gray-300 sticky left-0 z-10 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700">
                                            {plan.name} ($)
                                        </td>
                                        {dates.map(date => (
                                            <td key={date.toString()} className="px-2 py-2 text-center border-l dark:border-slate-700 text-gray-500 dark:text-gray-400">
                                                {getRate(plan.id, room.id, date)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Bulk Update Modal */}
            {isBulkModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bulk Update</h2>
                            <button onClick={() => setIsBulkModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleBulkSubmit} className="p-6 space-y-4">

                            <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1 mb-6">
                                <button type="button" onClick={() => setBulkData({ ...bulkData, type: 'inventory' })} className={`flex-1 py-2 rounded-md font-medium transition-all ${bulkData.type === 'inventory' ? 'bg-white dark:bg-slate-700 shadow text-emerald-600' : 'text-gray-500'}`}>Inventory</button>
                                <button type="button" onClick={() => setBulkData({ ...bulkData, type: 'rate' })} className={`flex-1 py-2 rounded-md font-medium transition-all ${bulkData.type === 'rate' ? 'bg-white dark:bg-slate-700 shadow text-blue-600' : 'text-gray-500'}`}>Rates</button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300 mb-1">Start Date</label>
                                    <input type="date" required className={inputClass} value={bulkData.start_date} onChange={e => setBulkData({ ...bulkData, start_date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300 mb-1">End Date</label>
                                    <input type="date" required className={inputClass} value={bulkData.end_date} onChange={e => setBulkData({ ...bulkData, end_date: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300 mb-1">Room Type</label>
                                <select required className={inputClass} value={bulkData.room_type_id} onChange={e => setBulkData({ ...bulkData, room_type_id: e.target.value })}>
                                    {data?.roomTypes.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>

                            {bulkData.type === 'rate' && (
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300 mb-1">Rate Plan</label>
                                    <select required className={inputClass} value={bulkData.rate_plan_id} onChange={e => setBulkData({ ...bulkData, rate_plan_id: e.target.value })}>
                                        <option value="">Select Plan</option>
                                        {data?.ratePlans.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300 mb-1">
                                    {bulkData.type === 'inventory' ? 'Quantity to Set' : 'Price to Set ($)'}
                                </label>
                                <input type="number" required min="0" className={inputClass} value={bulkData.value} onChange={e => setBulkData({ ...bulkData, value: e.target.value })} />
                            </div>

                            <button type="submit" disabled={updating} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all">
                                {updating ? 'Updating...' : 'Apply Update'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
