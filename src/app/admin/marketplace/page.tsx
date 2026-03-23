"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import MarketplaceCard from "@/components/marketplace/MarketplaceCard";
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default function MarketplacePage() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMarketplace();
    }, []);

    const fetchMarketplace = async () => {
        try {
            const res = await api.get('/marketplace/categories');
            setCategories(res.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center">Loading Marketplace...</div>;
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">App Marketplace</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Discover integrations and modules to power up your hotel.</p>
                </div>

                <div className="flex gap-2">
                    <Link href="/admin/marketplace/my-apps" className="inline-flex items-center px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                        <AdjustmentsHorizontalIcon className="w-5 h-5 mr-2" />
                        My Apps
                    </Link>
                    <div className="relative">
                        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search apps..."
                            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="space-y-10">
                {categories.map((cat) => (
                    cat.items && cat.items.length > 0 && (
                        <div key={cat.id}>
                            <div className="flex items-center gap-3 mb-4">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{cat.name}</h2>
                                <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 rounded-full text-xs text-gray-500 dark:text-gray-400">
                                    {cat.items.length}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {cat.items.map((item: any) => (
                                    <MarketplaceCard key={item.id} item={item} />
                                ))}
                            </div>
                        </div>
                    )
                ))}

                {categories.length === 0 && (
                    <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
                        <p className="text-gray-500">No apps available in the marketplace yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
