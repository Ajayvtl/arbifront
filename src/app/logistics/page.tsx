"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Truck, MapPin, Users } from "lucide-react";
import { Loader2 } from "lucide-react";

interface DayStats {
    date: string;
    count: number;
}

export default function LogisticsDashboard() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [stats, setStats] = useState<DayStats[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMonthStats();
    }, [currentMonth]);

    const fetchMonthStats = async () => {
        setLoading(true);
        const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
        const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

        try {
            // We need a new endpoint for this, or just fetch all orders and filter client-side (not efficient but okay for MVP)
            // Or better, use existing orders API with date range
            const response = await api.get('/orders', { params: { startDate: start, endDate: end } });

            // Process orders to get counts per day
            const orders = response.data.data;
            const counts: Record<string, number> = {};

            orders.forEach((o: any) => {
                if (o.collection_slot) {
                    const date = o.collection_slot.split('T')[0];
                    counts[date] = (counts[date] || 0) + 1;
                }
            });

            const statsArray = Object.keys(counts).map(date => ({ date, count: counts[date] }));
            setStats(statsArray);

        } catch (error) {
            console.error("Failed to fetch month stats", error);
        } finally {
            setLoading(false);
        }
    };

    const days = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
    });

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const getCountForDay = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return stats.find(s => s.date === dateStr)?.count || 0;
    };

    return (
        <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Logistics Dashboard</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Order collection scheduling and phlebotomist management</p>
                </div>
                <div>
                    <Link href="/logistics/phlebotomists" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20">
                        <Users size={18} />
                        <span>View All Phlebotomists</span>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Calendar Section */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <CalendarIcon size={20} className="text-emerald-500" />
                            {format(currentMonth, 'MMMM yyyy')}
                        </h2>
                        <div className="flex gap-2">
                            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                <ChevronLeft size={20} />
                            </button>
                            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="h-64 flex items-center justify-center">
                            <Loader2 className="animate-spin text-emerald-500 w-8 h-8" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="bg-slate-50 dark:bg-slate-900 p-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    {day}
                                </div>
                            ))}
                            {days.map((day, dayIdx) => {
                                const count = getCountForDay(day);
                                return (
                                    <Link
                                        key={day.toString()}
                                        href={`/logistics/phlebotomists?date=${format(day, 'yyyy-MM-dd')}`}
                                        className={`bg-white dark:bg-slate-800 min-h-[100px] p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors relative group
                                            ${!isSameMonth(day, currentMonth) ? 'bg-slate-50/50 dark:bg-slate-900/50 text-slate-400' : ''}
                                        `}
                                    >
                                        <div className={`text-sm font-medium mb-2 ${isSameDay(day, new Date()) ? 'w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {format(day, 'd')}
                                        </div>

                                        {count > 0 && (
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md w-fit">
                                                <Truck size={12} />
                                                <span>{count} Orders</span>
                                            </div>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Quick Stats / Info */}
                <div className="space-y-6">
                    <div className="bg-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-900/20 relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold mb-2">Phlebotomist App</h3>
                            <p className="text-emerald-100 text-sm mb-4">Ensure all field staff have the latest version of the mobile app for real-time tracking.</p>
                            <button className="bg-white text-emerald-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-50 transition-colors">
                                Send App Link
                            </button>
                        </div>
                        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
                            <Truck size={150} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4">Quick Legend</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                <span>High Demand (5+ Orders)</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                                <span>Normal Load</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                <span className="w-3 h-3 rounded-full bg-slate-300"></span>
                                <span>No Orders</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
