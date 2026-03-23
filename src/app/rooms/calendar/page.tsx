'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { ChevronLeft, ChevronRight, Ban, DollarSign } from 'lucide-react';

type RoomType = {
    id: number;
    name: string;
    total_rooms?: number;
    base_occupancy?: number;
    base_price?: number;
};

type GridInventoryCell = {
    available: number;
    booked: number;
    stop_sell: boolean;
};

type GridRateCell = {
    final_price: number;
};

type GridData = {
    inventory: Record<string, Record<number, GridInventoryCell>>;
    rates: Record<string, Record<number, GridRateCell>>;
};

export default function CalendarPage() {
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [gridData, setGridData] = useState<GridData>({ inventory: {}, rates: {} });
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);

    useEffect(() => {
        fetchGrid(startDate);
    }, [startDate]);

    const fetchGrid = async (start: string) => {
        setLoading(true);
        try {
            // Calculate end date (start + 14 days)
            const d = new Date(start);
            d.setDate(d.getDate() + 13);
            const end = d.toISOString().split('T')[0];

            const res = await api.get(`/inventory/grid?start=${start}&end=${end}`);
            setGridData((res.data.data || { inventory: {}, rates: {} }) as GridData);

            // Extract room types from inventory map keys (if available via side-load)
            // Or get them from api separately. For now, we trust the inventory structure contains them inside first date
            // Better to fetch room types separately to ensure row order
            const typesRes = await api.get('/rooms'); // Existing endpoint
            setRoomTypes(typesRes.data.data);

        } catch (error) {
            console.error('Failed to fetch grid', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + 14);
        setStartDate(d.toISOString().split('T')[0]);
    };

    const handlePrev = () => {
        const d = new Date(startDate);
        d.setDate(d.getDate() - 14);
        setStartDate(d.toISOString().split('T')[0]);
    };

    if (loading) return <div className="p-6">Loading Calendar...</div>;

    // Generate date headers
    const dates: Date[] = [];
    const d = new Date(startDate);
    for (let i = 0; i < 14; i++) {
        dates.push(new Date(d));
        d.setDate(d.getDate() + 1);
    }

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Smart Availability</h1>
                    <p className="text-gray-500">Manage rates and inventory across all your room types</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handlePrev} className="p-2 border rounded hover:bg-white"><ChevronLeft /></button>
                    <span className="py-2 px-4 border rounded bg-white font-mono">
                        {new Date(startDate).toLocaleDateString()}
                    </span>
                    <button onClick={handleNext} className="p-2 border rounded hover:bg-white"><ChevronRight /></button>
                </div>
            </div>

            <div className="overflow-x-auto bg-white rounded-lg shadow border">
                <table className="min-w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="p-3 sticky left-0 bg-white border-b border-r z-10 w-48 text-left text-sm font-bold text-gray-700">Room Type</th>
                            {dates.map(date => {
                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                return (
                                    <th key={date.toISOString()} className={`
                                        p-2 border-b border-r text-center min-w-[80px]
                                        ${isWeekend ? 'bg-orange-50' : ''}
                                    `}>
                                        <div className="text-xs text-gray-500">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                        <div className="font-bold">{date.getDate()}</div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {roomTypes.map((rt) => (
                            <tr key={rt.id} className="hover:bg-gray-50">
                                <td className="p-3 sticky left-0 bg-white border-b border-r font-medium text-sm">
                                    {rt.name}
                                    <div className="text-xs font-normal text-gray-400">Total: {rt.total_rooms || rt.base_occupancy}</div> {/* Fallback check */}
                                </td>
                                {dates.map(date => {
                                    const dateStr = date.toISOString().split('T')[0];
                                    // Safety Access
                                    const inv: GridInventoryCell = gridData.inventory[dateStr]?.[rt.id] || { available: rt.total_rooms || 0, booked: 0, stop_sell: false };
                                    const rate: GridRateCell = gridData.rates[dateStr]?.[rt.id] || { final_price: rt.base_price || 0 };

                                    const isSoldOut = inv.available === 0 || inv.stop_sell;
                                    const isLow = inv.available < 3 && !isSoldOut;

                                    return (
                                        <td key={dateStr} className={`
                                            p-2 border-b border-r text-center cursor-pointer transition
                                            ${inv.stop_sell ? 'bg-red-50 pattern-diagonal' : ''}
                                            ${isSoldOut ? 'bg-red-50 text-red-900' : 'hover:bg-blue-50'}
                                        `}>
                                            <div className="flex flex-col items-center gap-1">
                                                {inv.stop_sell ? (
                                                    <span className="text-xs font-bold text-red-600 flex items-center"><Ban size={12} /> STOP</span>
                                                ) : (
                                                    <span className={`text-lg font-bold ${isLow ? 'text-orange-500' : 'text-green-600'}`}>
                                                        {inv.available}
                                                    </span>
                                                )}

                                                <span className="text-xs text-gray-600 font-mono">
                                                    ₹{rate.final_price?.toLocaleString()}
                                                </span>
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-600 rounded"></div> Available</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-500 rounded"></div> Low Inventory</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-50 text-red-900 border rounded flex items-center justify-center text-[8px]">0</div> Sold Out</div>
            </div>
        </div>
    );
}
