"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Search, Filter, Download, Eye, Calendar, Loader2, LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import OrdersBoard from "@/components/orders-board/OrdersBoard";
import { useSettings } from "@/context/SettingsContext";

export default function OrdersPage() {
    const { t, formatCurrency, settings } = useSettings();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const response = await api.get('/orders');
            setOrders(response.data.data);
        } catch (error) {
            toast.error("Failed to load orders");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (orderId: number, newStatus: string) => {
        // Optimistic update
        const originalOrders = [...orders];
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

        try {
            await api.put(`/orders/${orderId}/status`, { status: newStatus });
            toast.success("Order status updated");
        } catch (error) {
            console.error(error);
            toast.error("Failed to update status");
            setOrders(originalOrders); // Revert
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesStatus = statusFilter ? order.status === statusFilter : true;
        const matchesSearch =
            order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.user_name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{t('orders')}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage patient orders and track status</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex items-center border border-slate-200 dark:border-slate-700 mr-2">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <List size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('board')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'board' ? 'bg-white dark:bg-slate-700 shadow text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                    </div>

                    <button className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
                        <Filter size={18} />
                        <span>Filter</span>
                    </button>
                    <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20">
                        <Download size={18} />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search orders by ID or customer..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-w-[200px]"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="">All Status</option>
                    <option value="placed">Placed</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="collected">Collected</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            {/* Content */}
            {loading ? (
                <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-emerald-600 w-8 h-8" /></div>
            ) : viewMode === 'list' ? (
                <Table>
                    <TableHeader>
                        <TableHead>{t('order_id')}</TableHead>
                        <TableHead>{t('customer')}</TableHead>
                        <TableHead>{t('amount')}</TableHead>
                        <TableHead>{t('status')}</TableHead>
                        <TableHead>{t('date')}</TableHead>
                        <TableHead className="text-right">{t('actions')}</TableHead>
                    </TableHeader>
                    <TableBody>
                        {filteredOrders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell>
                                    <span className="font-mono text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                        {order.order_number}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-slate-900 dark:text-white">{order.user_name}</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-500">{order.user_email}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(order.total_amount)}</span>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={
                                        order.status === 'completed' ? 'success' :
                                            order.status === 'cancelled' ? 'danger' :
                                                order.status === 'processing' ? 'warning' :
                                                    order.status === 'confirmed' ? 'info' :
                                                        'neutral'
                                    }>
                                        {order.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                                        <Calendar size={14} />
                                        {new Date(order.created_at).toLocaleDateString(settings.language === 'en' ? 'en-US' : settings.language)}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Link
                                        href={`/orders/${order.id}`}
                                        className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium text-sm bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        <Eye size={16} />
                                        {t('view_all') === 'View All' ? 'View' : t('view_all')}
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredOrders.length === 0 && (
                            <TableRow>
                                <td className="px-6 py-12 text-center text-slate-500 dark:text-slate-400" colSpan={6}>
                                    <div className="flex flex-col items-center gap-2">
                                        <Search size={32} className="text-slate-300 dark:text-slate-600" />
                                        <p>{t('no_data')}</p>
                                    </div>
                                </td>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            ) : (
                <OrdersBoard
                    orders={filteredOrders}
                    onStatusChange={handleStatusChange}
                />
            )}

            {/* Pagination (Mock) */}
            {viewMode === 'list' && (
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center text-sm text-slate-500 dark:text-slate-400 rounded-b-2xl">
                    <span>Showing 1 to {filteredOrders.length} of {filteredOrders.length} entries</span>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-50" disabled>Previous</button>
                        <button className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-50" disabled>Next</button>
                    </div>
                </div>
            )}
        </div>
    );
}
