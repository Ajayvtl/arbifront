"use client";

import { Shield, AlertTriangle, Copy, Check } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export default function AdminInfoPage() {
    const [copied, setCopied] = useState('');

    const credentials = {
        email: "superadmin@greencross.com",
        password: "12345678"
    };

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopied(field);
        toast.success(`Copied ${field} to clipboard`);
        setTimeout(() => setCopied(''), 2000);
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="bg-emerald-600 p-6 text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <Shield size={32} className="text-emerald-100" />
                        <h1 className="text-2xl font-bold">Super Admin Credentials</h1>
                    </div>
                    <p className="text-emerald-100 opacity-90">
                        Use these credentials to access the admin panel with full privileges.
                    </p>
                </div>

                <div className="p-8 space-y-6">
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg p-4 flex items-start gap-3">
                        <AlertTriangle className="text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" size={20} />
                        <div>
                            <h3 className="font-semibold text-amber-800 dark:text-amber-400">Development Only</h3>
                            <p className="text-sm text-amber-700 dark:text-amber-500/80 mt-1">
                                These credentials are for development and testing purposes.
                                In a production environment, please change the password immediately and store credentials securely.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="group">
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">Email Address</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    readOnly
                                    value={credentials.email}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-800 dark:text-slate-200 font-mono text-sm focus:outline-none"
                                />
                                <button
                                    onClick={() => copyToClipboard(credentials.email, 'email')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                >
                                    {copied === 'email' ? <Check size={18} /> : <Copy size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="group">
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    readOnly
                                    value={credentials.password}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-800 dark:text-slate-200 font-mono text-sm focus:outline-none"
                                />
                                <button
                                    onClick={() => copyToClipboard(credentials.password, 'password')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                >
                                    {copied === 'password' ? <Check size={18} /> : <Copy size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
