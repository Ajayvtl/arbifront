"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeftIcon, TrashIcon, ExclamationTriangleIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import toast from "react-hot-toast";

export default function MyAppsPage() {
    const { currentHotel } = useAuth();
    const [apps, setApps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (currentHotel) fetchApps();
    }, [currentHotel?.hotel_id]);

    const fetchApps = async () => {
        try {
            const res = await api.get(`/marketplace/my-apps?hotel_id=${currentHotel?.hotel_id}`);
            setApps(res.data.data);
        } catch (error) {
            toast.error("Failed to load installed apps");
        } finally {
            setLoading(false);
        }
    };

    const handleUninstall = async (app: any) => {
        if (!confirm(`Are you sure you want to uninstall ${app.name}? This will revoke access immediately.`)) return;

        try {
            await api.post('/marketplace/uninstall', {
                hotel_id: currentHotel?.hotel_id,
                item_id: app.item_id
            });
            toast.success(`${app.name} uninstalled.`);
            fetchApps();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Uninstall Failed");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading My Apps...</div>;

    return (
        <div className="max-w-7xl mx-auto p-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/admin/marketplace" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Installed Apps</h1>
                        <p className="text-gray-500 dark:text-gray-400">Manage subscriptions and settings for your add-ons.</p>
                    </div>
                </div>
            </div>

            {apps.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No apps installed</h3>
                    <p className="text-gray-500 mb-6">Explore the marketplace to find tools for your hotel.</p>
                    <Link href="/admin/marketplace" className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium">
                        Browse Marketplace
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {apps.map((app) => (
                        <div key={app.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 dark:bg-slate-700 rounded-lg p-2 flex items-center justify-center">
                                        {app.icon_url ? (
                                            <img src={app.icon_url} alt={app.name} className="w-full h-full object-contain" />
                                        ) : (
                                            <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-full" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white">{app.name}</h3>
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className={`px-2 py-0.5 rounded-full font-medium border ${app.status === 'active'
                                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                                    : app.status === 'suspended'
                                                        ? 'bg-red-100 text-red-800 border-red-200'
                                                        : 'bg-gray-100 text-gray-800 border-gray-200'
                                                }`}>
                                                {app.status.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 space-y-3 mb-6">
                                <div className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-slate-700">
                                    <span className="text-gray-500">Plan</span>
                                    <span className="font-medium dark:text-gray-200 capitalize">{app.billing_cycle}</span>
                                </div>
                                <div className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-slate-700">
                                    <span className="text-gray-500">Price</span>
                                    <span className="font-medium dark:text-gray-200">
                                        {app.currency === 'INR' ? '₹' : '$'}{Number(app.price_minor) / 100}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-slate-700">
                                    <span className="text-gray-500">Next Billing</span>
                                    <span className="font-medium dark:text-gray-200">
                                        {app.next_billing_date ? new Date(app.next_billing_date).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-auto">
                                <button className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors">
                                    Configure
                                </button>
                                <button
                                    onClick={() => handleUninstall(app)}
                                    className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg transition-colors"
                                    title="Uninstall App"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
