"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Loader2, Shield, Check, X, FileText } from "lucide-react";
import toast from "react-hot-toast";

export default function CompliancePage() {
    const [activeTab, setActiveTab] = useState<'guests' | 'system'>('guests');
    const [loading, setLoading] = useState(false);
    const [verifications, setVerifications] = useState<any[]>([]);
    const [report, setReport] = useState<any[]>([]);

    useEffect(() => {
        if (activeTab === 'guests') fetchPending();
        if (activeTab === 'system') fetchReport();
    }, [activeTab]);

    const fetchPending = async () => {
        try {
            const res = await api.get('/compliance/pending');
            setVerifications(res.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchReport = async () => {
        try {
            setLoading(true);
            const res = await api.get('/compliance/report');
            setReport(res.data.data);
        } catch (error) {
            toast.error("Failed to load system report");
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (id: number, status: 'verified' | 'rejected') => {
        try {
            const reason = status === 'rejected' ? prompt("Enter rejection reason:") : null;
            if (status === 'rejected' && !reason) return; // Cancelled

            await api.patch(`/compliance/${id}/verify`, { status, reason });
            toast.success(`Document ${status}`);

            // Remove from list
            setVerifications(prev => prev.filter(v => v.id !== id));
        } catch (error) {
            toast.error("Action failed");
        }
    };

    if (loading && !report.length && !verifications.length) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

    return (
        <div className="p-8 space-y-6 max-w-7xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Shield className="text-emerald-500" />
                        Compliance Center
                    </h1>
                    <p className="text-slate-500">Platform governance and identity verification.</p>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start">
                    <button
                        onClick={() => setActiveTab('guests')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'guests' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Guest Verification
                    </button>
                    <button
                        onClick={() => setActiveTab('system')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'system' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        System Health
                    </button>
                </div>
            </header>

            {activeTab === 'guests' ? (
                verifications.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 p-10 rounded-2xl shadow border border-slate-100 dark:border-slate-700 text-center">
                        <Check className="mx-auto text-emerald-500 w-12 h-12 mb-4" />
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">All Clear!</h3>
                        <p className="text-slate-500">No pending guest verifications.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {verifications.map((item) => (
                            <div key={item.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-6">

                                {/* Document Preview Placeholder */}
                                <div className="w-full md:w-1/3 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center min-h-[150px]">
                                    {item.document_url_front ? (
                                        <img src={item.document_url_front} alt="Doc" className="w-full h-full object-cover rounded-xl" />
                                    ) : (
                                        <div className="text-center text-slate-400">
                                            <FileText size={32} className="mx-auto mb-2 opacity-50" />
                                            <span className="text-xs">No Preview</span>
                                        </div>
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">{item.guest_name}</h3>
                                        <p className="text-sm text-slate-500">Booking: <span className="font-mono text-slate-700 dark:text-slate-300">{item.booking_number}</span></p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg">
                                            <span className="block text-xs text-slate-500">Type</span>
                                            <span className="font-medium capitalize">{item.document_type.replace('_', ' ')}</span>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg">
                                            <span className="block text-xs text-slate-500">Number</span>
                                            <span className="font-medium font-mono">{item.document_number}</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => handleVerify(item.id, 'verified')}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-medium text-sm transition flex items-center justify-center gap-2"
                                        >
                                            <Check size={16} /> Approve
                                        </button>
                                        <button
                                            onClick={() => handleVerify(item.id, 'rejected')}
                                            className="flex-1 bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-300 py-2 rounded-lg font-medium text-sm transition flex items-center justify-center gap-2"
                                        >
                                            <X size={16} /> Reject
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                // System Report UI
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {report.map((check, index) => (
                            <div key={index} className={`relative p-6 rounded-2xl border ${check.status === 'PASS'
                                    ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800/50'
                                    : check.status === 'WARN'
                                        ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800/50'
                                        : 'bg-red-50/50 border-red-200 dark:bg-red-900/10 dark:border-red-800/50'
                                }`}>
                                <div className="flex items-start justify-between mb-4">
                                    <h3 className="font-bold text-slate-800 dark:text-white">{check.category}</h3>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${check.status === 'PASS' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' :
                                            check.status === 'WARN' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' :
                                                'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
                                        }`}>
                                        {check.status}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{check.evidence}</p>

                                {check.details && (Array.isArray(check.details) ? check.details.length > 0 : Object.keys(check.details).length > 0) && (
                                    <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                                        <details className="text-xs">
                                            <summary className="cursor-pointer text-slate-400 hover:text-slate-600 select-none">View Technical Details</summary>
                                            <pre className="mt-2 p-2 bg-white/50 dark:bg-black/20 rounded overflow-x-auto font-mono text-slate-500">
                                                {JSON.stringify(check.details, null, 2)}
                                            </pre>
                                        </details>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
