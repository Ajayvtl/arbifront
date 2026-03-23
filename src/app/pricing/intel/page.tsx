"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Activity, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

export default function MarketIntelPage() {
    const [intel, setIntel] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchIntel();
    }, []);

    const fetchIntel = async () => {
        try {
            // Mock Date Range for V1
            const response = await api.get('/pricing/intel?start_date=2024-01-01&end_date=2024-01-07');
            setIntel(response.data.data);
        } catch (error) {
            console.error(error);
            // toast.error("Failed to load market intelligence");
        } finally {
            setLoading(false);
        }
    };

    const triggerScraper = async () => {
        try {
            const toastId = toast.loading("Triggering Scraper Agents...");
            await api.post('/pricing/scraper/trigger');
            toast.success("Scraper Job Started", { id: toastId });
        } catch (error) {
            toast.error("Failed to start scraper");
        }
    };

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

    return (
        <div className="p-8 space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Market Intelligence</h1>
                    <p className="text-slate-500">Real-time competitor tracking.</p>
                </div>
                <button
                    onClick={triggerScraper}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition"
                >
                    <RefreshCw size={18} />
                    Refresh Rates
                </button>
            </header>

            {/* Placeholder for Chart/Grid */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow border border-slate-100 dark:border-slate-700 text-center">
                <Activity size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">No Market Data Available</h3>
                <p className="text-slate-500">Trigger the scraper to populate competitor rates.</p>
            </div>
        </div>
    );
}
