"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function ParityAlertsPage() {
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAlerts();
    }, []);

    const fetchAlerts = async () => {
        try {
            const response = await api.get('/pricing/alerts');
            setAlerts(response.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

    return (
        <div className="p-8 space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Parity Alerts</h1>
                <p className="text-slate-500">Channels undercutting your direct price.</p>
            </header>

            <div className="space-y-4">
                {alerts.length === 0 ? (
                    <div className="p-10 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 rounded-xl flex items-center gap-4 text-emerald-800 dark:text-emerald-300">
                        <CheckCircle size={24} />
                        <div>
                            <p className="font-bold">All Good!</p>
                            <p className="text-sm">No parity issues detected across channels.</p>
                        </div>
                    </div>
                ) : (
                    alerts.map((alert: any) => (
                        <div key={alert.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex justify-between items-center group hover:border-red-300 transition-colors">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-red-50 text-red-500 rounded-lg">
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white">{alert.ota_name}</h3>
                                    <p className="text-sm text-slate-500">Detected on {new Date(alert.detected_at).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-2xl font-bold text-red-600">-{alert.variance_percentage}%</div>
                                <div className="text-xs font-mono text-slate-400">OTA: {alert.ota_price} | YOURS: {alert.our_price}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
