"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Printer, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

export default function OrderDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (id) fetchOrderDetails();
    }, [id]);

    const fetchOrderDetails = async () => {
        try {
            const response = await api.get(`/orders/${id}`);
            setOrder(response.data.data);
        } catch (error) {
            toast.error("Failed to load order details");
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (newStatus: string) => {
        if (!confirm(`Are you sure you want to mark this order as ${newStatus}?`)) return;
        setUpdating(true);
        try {
            await api.put(`/orders/${id}/status`, { status: newStatus });
            toast.success(`Order marked as ${newStatus}`);
            fetchOrderDetails(); // Refresh
        } catch (error) {
            toast.error("Failed to update status");
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><Loader2 className="animate-spin text-emerald-600" /></div>;
    if (!order) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Order not found</div>;

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="mb-6">
                <Link href="/orders" className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-2 mb-4 transition-colors">
                    <ArrowLeft size={18} /> Back to Orders
                </Link>
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Order #{order.order_number}</h1>
                        <p className="text-slate-500 dark:text-slate-400">Placed on {new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                            <Printer size={18} /> Print Invoice
                        </button>
                        {order.status === 'placed' && (
                            <button
                                onClick={() => updateStatus('confirmed')}
                                disabled={updating}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
                            >
                                <CheckCircle size={18} /> Confirm Order
                            </button>
                        )}
                        {order.status === 'confirmed' && (
                            <button
                                onClick={() => updateStatus('completed')}
                                disabled={updating}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
                            >
                                <CheckCircle size={18} /> Mark Completed
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Items */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Order Items</h2>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {order.items.map((item: any) => (
                                <div key={item.id} className="py-4 flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-slate-800 dark:text-white">
                                            {item.item_type === 'test' ? item.test_name : item.package_name}
                                        </p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{item.item_type}</p>
                                    </div>
                                    <p className="font-medium text-slate-700 dark:text-slate-300">${item.price_at_booking}</p>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-slate-100 dark:border-slate-700 mt-4 pt-4 flex justify-between items-center">
                            <p className="font-semibold text-slate-800 dark:text-white">Total Amount</p>
                            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">${order.total_amount}</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Timeline</h2>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="w-2 h-2 mt-2 rounded-full bg-emerald-500"></div>
                                <div>
                                    <p className="text-sm font-medium text-slate-800 dark:text-white">Order Placed</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(order.created_at).toLocaleString()}</p>
                                </div>
                            </div>
                            {/* More timeline items can be added here based on audit logs or status history */}
                        </div>
                    </div>
                </div>

                {/* Right Column: Customer & Info */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Customer Details</h2>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-medium">Name</p>
                                <p className="text-slate-700 dark:text-slate-300">{order.user_name}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-medium">Email</p>
                                <p className="text-slate-700 dark:text-slate-300">{order.user_email}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-medium">Phone</p>
                                <p className="text-slate-700 dark:text-slate-300">{order.user_phone || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Payment Info</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-slate-500 dark:text-slate-400">Status</span>
                                <Badge variant={order.payment_status === 'paid' ? 'success' : 'warning'}>
                                    {order.payment_status?.toUpperCase() || 'PENDING'}
                                </Badge>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500 dark:text-slate-400">Method</span>
                                <span className="text-slate-700 dark:text-slate-300">Online</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
