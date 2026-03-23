"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function CompanySettingsPage() {
    const [settings, setSettings] = useState<any>({
        brand_name: "",
        logo: "",
        support_email: "",
        support_phone: ""
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/settings').then(res => {
            setSettings(res.data.data || {});
            setLoading(false);
        }).catch(() => toast.error("Failed to load settings"));
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/settings', settings);
            toast.success("Company Settings Updated");
            window.location.reload(); // Refresh to update Sidebar logo etc
        } catch (error) {
            toast.error("Failed to update");
        }
    };

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Company Profile</h1>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 max-w-2xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Company / Brand Name</label>
                        <input
                            name="brand_name"
                            value={settings.brand_name || ''}
                            onChange={handleChange}
                            className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 dark:bg-slate-900 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Logo URL</label>
                        <input
                            name="logo"
                            value={settings.logo || ''}
                            onChange={handleChange}
                            className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 dark:bg-slate-900 dark:text-white"
                        />
                        {settings.logo && <img src={settings.logo} alt="Preview" className="h-12 mt-2 object-contain" />}
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Support Email</label>
                        <input
                            name="support_email"
                            value={settings.support_email || ''}
                            onChange={handleChange}
                            className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 dark:bg-slate-900 dark:text-white"
                        />
                    </div>
                    <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 font-medium">
                        Save Changes
                    </button>
                </form>
            </div>
        </div>
    );
}
