"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { ArrowLeftIcon, CheckCircleIcon, ShieldCheckIcon, CubeIcon, PuzzlePieceIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import toast from "react-hot-toast";

import { useAuth } from "@/context/AuthContext";

export default function MarketplaceItemPage() {
    const params = useParams();
    const router = useRouter();
    const { currentHotel } = useAuth();
    const [item, setItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [installing, setInstalling] = useState(false);

    useEffect(() => {
        if (params.id) fetchItem(params.id as string);
    }, [params.id, currentHotel?.hotel_id]);

    const fetchItem = async (id: string) => {
        try {
            // Pass hotel ID context if available
            const headers = currentHotel ? { 'x-hotel-id': currentHotel.hotel_id.toString() } : {};
            const res = await api.get(`/marketplace/items/${id}`, { headers });
            setItem(res.data.data);
        } catch (error) {
            toast.error("Failed to load app details");
            router.push('/admin/marketplace');
        } finally {
            setLoading(false);
        }
    };

    const handleInstall = async () => {
        if (!currentHotel) {
            toast.error("Please select a hotel context to install apps.");
            return;
        }

        // Validation logic will be here
        if (!confirm(`Are you sure you want to install ${item.name} for ${currentHotel.hotel_name}? This may incur charges.`)) return;

        setInstalling(true);
        try {
            await api.post('/marketplace/purchase', {
                hotel_id: currentHotel.hotel_id,
                item_id: item.id,
                billing_cycle: 'monthly' // Default for MVP
            });
            toast.success(`${item.name} Installed Successfully!`);
            fetchItem(params.id as string); // Refresh status
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Installation Failed");
        } finally {
            setInstalling(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading details...</div>;
    if (!item) return <div className="p-8 text-center text-red-500">Item not found</div>;

    const price = item.price_monthly_minor ? item.price_monthly_minor / 100 : 0;
    const currencySymbol = item.currency === 'INR' ? '₹' : '$';

    return (
        <div className="max-w-5xl mx-auto p-8">
            <Link href="/admin/marketplace" className="inline-flex items-center text-sm text-gray-500 hover:text-emerald-600 mb-6 transition-colors">
                <ArrowLeftIcon className="w-4 h-4 mr-1" /> Back to Marketplace
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Header */}
                    <div className="flex items-start gap-6">
                        <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-center shrink-0">
                            {item.icon_url ? (
                                <img src={item.icon_url} alt={item.name} className="w-full h-full object-contain" />
                            ) : (
                                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full" />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{item.name}</h1>
                                {item.is_installed && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                        <CheckCircleIcon className="w-3 h-3 mr-1" /> Installed
                                    </span>
                                )}
                            </div>
                            <p className="text-lg text-gray-600 dark:text-gray-300">{item.short_description}</p>
                            <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                    {item.type === 'module' ? <CubeIcon className="w-4 h-4" /> : <PuzzlePieceIcon className="w-4 h-4" />}
                                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                                </span>
                                <span className="flex items-center gap-1">
                                    <ShieldCheckIcon className="w-4 h-4" /> Verified by GreenCross
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">About this App</h2>
                        <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                            {item.description ? (
                                <p>{item.description}</p>
                            ) : (
                                <p>No detailed description provided.</p>
                            )}

                            {/* Placeholder for Features List - In real app, parse features/capabilities JSON */}
                            <h3 className="text-lg font-semibold mt-6 mb-2">Features Unlocked</h3>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Seamless integration with existing workflows</li>
                                <li>Real-time data synchronization</li>
                                <li>Standardized security and compliance</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Sidebar / Action Card */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 sticky top-8">
                        <div className="mb-6">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Pricing</h3>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {price > 0 ? `${currencySymbol}${price}` : 'Free'}
                                </span>
                                {price > 0 && <span className="text-gray-500">/month</span>}
                            </div>
                            {item.price_yearly_minor > 0 && (
                                <p className="text-xs text-emerald-600 mt-1">
                                    Save with yearly billing
                                </p>
                            )}
                        </div>

                        {item.is_installed ? (
                            <button disabled className="w-full py-3 px-4 bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500 font-medium rounded-lg cursor-not-allowed flex items-center justify-center gap-2">
                                <CheckCircleIcon className="w-5 h-5" /> App Installed
                            </button>
                        ) : (
                            <button
                                onClick={handleInstall}
                                disabled={installing}
                                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {installing ? 'Installing...' : 'Install App'}
                            </button>
                        )}

                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Version</span>
                                <span className="font-medium dark:text-gray-300">1.0.0</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Developer</span>
                                <span className="font-medium dark:text-gray-300">GreenCross Inc</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Last Updated</span>
                                <span className="font-medium dark:text-gray-300">Feb 2026</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
