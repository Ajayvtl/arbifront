"use client";

import { useEffect, useState, Suspense } from "react";
import api from "@/lib/api";
import { format, parseISO } from "date-fns";
import { Loader2, Calendar as CalendarIcon, MapPin, Grid, List } from "lucide-react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

interface Phlebotomist {
    id: number;
    name: string;
    phone: string;
}

interface Task {
    id: number;
    phlebotomist_id: number;
    order_id: number;
    collection_slot: string;
    status: string;
    order_number: string;
    address_snapshot?: string;
}

interface UnassignedOrder {
    id: number;
    order_number: string;
    collection_slot: string;
    address_snapshot?: string;
    total_amount: number;
}

const HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]; // 10 AM to 7 PM

const ScheduleContent = () => {
    const [phlebotomists, setPhlebotomists] = useState<Phlebotomist[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [unassignedOrders, setUnassignedOrders] = useState<UnassignedOrder[]>([]);
    const searchParams = useSearchParams();
    const initialDate = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [selectedDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [phleboRes, scheduleRes] = await Promise.all([
                api.get('/phlebotomists'),
                api.get(`/phlebotomists/schedule?date=${selectedDate}`)
            ]);
            setPhlebotomists(phleboRes.data.data);
            setTasks(scheduleRes.data.data.schedule || []);
            setUnassignedOrders(scheduleRes.data.data.unassigned || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load schedule data");
        } finally {
            setLoading(false);
        }
    };

    const getTaskForSlot = (phlebotomistId: number, hour: number) => {
        return tasks.find(t => {
            if (t.phlebotomist_id !== phlebotomistId) return false;
            const taskTime = new Date(t.collection_slot);
            return taskTime.getHours() === hour;
        });
    };

    const getAddressLine = (snapshot: string | any) => {
        try {
            if (!snapshot) return 'No Address';
            const addr = typeof snapshot === 'string' ? JSON.parse(snapshot) : snapshot;
            return addr?.address_line_1 || 'No Address';
        } catch (e) {
            return 'Address Error';
        }
    };

    const handleDragStart = (e: React.DragEvent, order: UnassignedOrder) => {
        e.dataTransfer.setData("orderId", order.id.toString());
        e.dataTransfer.setData("type", "unassigned");
    };

    const handleDrop = async (e: React.DragEvent, phlebotomistId: number, hour: number) => {
        e.preventDefault();
        const orderId = e.dataTransfer.getData("orderId");

        if (!orderId) return;

        // Construct the new time slot string (YYYY-MM-DD HH:00:00)
        const timeSlot = `${selectedDate} ${hour.toString().padStart(2, '0')}:00:00`;

        // Optimistic Update
        const orderToAssign = unassignedOrders.find(o => o.id === parseInt(orderId));
        const existingTask = tasks.find(t => t.order_id === parseInt(orderId));

        if (orderToAssign) {
            // Case 1: Assigning from Unassigned List
            setUnassignedOrders(prev => prev.filter(o => o.id !== parseInt(orderId)));
            const newTask: Task = {
                id: Date.now(), // Temp ID
                phlebotomist_id: phlebotomistId,
                order_id: parseInt(orderId),
                collection_slot: timeSlot,
                status: 'assigned',
                order_number: orderToAssign.order_number,
                address_snapshot: orderToAssign.address_snapshot
            };
            setTasks(prev => [...prev, newTask]);
        } else if (existingTask) {
            // Case 2: Moving/Reassigning an existing task on the board
            setTasks(prev => prev.map(t => {
                if (t.order_id === parseInt(orderId)) {
                    return { ...t, phlebotomist_id: phlebotomistId, collection_slot: timeSlot };
                }
                return t;
            }));
        }

        try {
            await api.post('/phlebotomists/assign', {
                orderId: parseInt(orderId),
                phlebotomistId,
                timeSlot
            });
            toast.success("Order assigned successfully");
            fetchData(); // Refresh to get real IDs and exact data
        } catch (error) {
            console.error(error);
            toast.error("Failed to assign order");
            fetchData(); // Revert
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    return (
        <div className="p-6 max-w-[1700px] mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Phlebotomist Schedule</h1>
                    <p className="text-slate-500">Drag orders to assign them to specific time slots</p>
                </div>
                <div className="flex items-center gap-4">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 shadow-sm"
                    />
                </div>
            </div>

            {loading ? (
                <div className="h-96 flex items-center justify-center">
                    <Loader2 className="animate-spin w-8 h-8 text-emerald-600" />
                </div>
            ) : (
                <>
                    {/* Unassigned Tasks Area */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <List size={20} className="text-amber-500" />
                            <h2 className="font-semibold text-slate-800 dark:text-white">Unassigned Orders ({unassignedOrders.length})</h2>
                        </div>

                        {unassignedOrders.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-lg">
                                No unassigned orders for this date.
                            </div>
                        ) : (
                            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                                {unassignedOrders.map(order => (
                                    <div
                                        key={order.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, order)}
                                        className="min-w-[200px] w-[200px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-lg shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all border-l-4 border-l-amber-400"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-slate-800 dark:text-white text-sm">{order.order_number}</span>
                                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                                                {format(parseISO(order.collection_slot), 'HH:mm')}
                                            </span>
                                        </div>
                                        <div className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2">
                                            <MapPin size={12} className="mt-0.5 shrink-0" />
                                            <span className="line-clamp-2">{getAddressLine(order.address_snapshot)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Schedule Grid */}
                    <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <table className="w-full min-w-[1200px]">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                    <th className="p-4 text-left font-medium text-slate-600 dark:text-slate-300 w-64 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.1)]">Phlebotomist</th>
                                    {HOURS.map(hour => (
                                        <th key={hour} className="p-4 text-center font-medium text-slate-600 dark:text-slate-300 min-w-[120px]">
                                            {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {phlebotomists.length === 0 ? (
                                    <tr>
                                        <td colSpan={HOURS.length + 1} className="p-8 text-center text-slate-500">
                                            No phlebotomists found. Add users with 'Phlebotomist' role.
                                        </td>
                                    </tr>
                                ) : phlebotomists.map(phlebo => (
                                    <tr key={phlebo.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/50">
                                        <td className="p-4 sticky left-0 bg-white dark:bg-slate-800 z-10 border-r border-slate-100 dark:border-slate-700 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                                                    {phlebo.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-sm text-slate-900 dark:text-white">{phlebo.name}</div>
                                                    <div className="text-xs text-slate-500">{phlebo.phone}</div>
                                                </div>
                                            </div>
                                        </td>
                                        {HOURS.map(hour => {
                                            const task = getTaskForSlot(phlebo.id, hour);
                                            return (
                                                <td
                                                    key={hour}
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDrop(e, phlebo.id, hour)}
                                                    className={`p-2 border-r border-slate-5 dark:border-slate-800 relative transition-colors ${!task ? 'hover:bg-emerald-50/30' : ''}`}
                                                >
                                                    {task ? (
                                                        <div
                                                            draggable
                                                            onDragStart={(e) => {
                                                                e.dataTransfer.setData("orderId", task.order_id.toString());
                                                                e.dataTransfer.setData("currentPhlebId", task.phlebotomist_id.toString());
                                                            }}
                                                            className={`p-2 rounded-lg text-xs border shadow-sm cursor-grab active:cursor-grabbing ${task.status === 'completed' ? 'bg-green-50 border-green-200 text-green-700' :
                                                                task.status === 'started' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                                                    'bg-indigo-50 border-indigo-200 text-indigo-700'
                                                                }`}
                                                            title={`Order: ${task.order_number}`}
                                                        >
                                                            <div className="font-bold mb-1 truncate">{task.order_number}</div>
                                                            <div className="truncate text-[10px] opacity-80 mb-1 leading-tight line-clamp-2">
                                                                {getAddressLine(task.address_snapshot)}
                                                            </div>
                                                            <div className="text-[9px] uppercase tracking-wide font-semibold opacity-70">{task.status}</div>
                                                        </div>
                                                    ) : (
                                                        <div className="h-full w-full min-h-[60px] flex items-center justify-center text-slate-300/50 text-xs rounded border border-transparent border-dashed hover:border-slate-200">
                                                            Empty
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )
            }
        </div >
    );
};

export default function PhlebotomistSchedulePage() {
    return (
        <Suspense fallback={<div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-emerald-600" /></div>}>
            <ScheduleContent />
        </Suspense>
    );
}
