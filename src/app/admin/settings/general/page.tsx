"use client";
import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { PhotoIcon, BuildingOffice2Icon } from '@heroicons/react/24/solid';

export default function GeneralSettingsPage() {
    const [settings, setSettings] = useState({
        site_name: '',
        brand_name: '',
        contact_email: '',
        contact_phone: '',
        contact_address: '',
        logo_url: '' // For display
    });
    const [logoFile, setLogoFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/settings');
            if (res.data && res.data.data) {
                setSettings(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch settings", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setLogoFile(e.target.files[0]);
        }
    };

    const handleChange = (e) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const formData = new FormData();
            formData.append('site_name', settings.site_name);
            formData.append('brand_name', settings.brand_name);
            formData.append('contact_email', settings.contact_email);
            formData.append('contact_phone', settings.contact_phone);
            formData.append('contact_address', settings.contact_address);
            if (logoFile) {
                formData.append('logo', logoFile);
            }

            await api.post('/settings', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setMessage({ type: 'success', text: 'Settings updated successfully!' });
            fetchSettings(); // Refresh to see updated logo URL
        } catch (error) {
            console.error("Failed to save settings", error);
            setMessage({ type: 'error', text: 'Failed to save settings.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8">Loading settings...</div>;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    // Helper to resolve logo URL if relative
    const resolveLogo = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        // Clean double slashes
        const base = API_URL.replace('/api/v1', '');
        return `${base}${path}`;
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <BuildingOffice2Icon className="w-8 h-8 text-emerald-600" />
                    Company Settings & Branding
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Configure your tenant's brand identity, logo, and contact details. These settings will be reflected on your public website and invoices.
                </p>
            </div>

            {message && (
                <div className={`p-4 mb-6 rounded-lg ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8 bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                {/* Branding Section */}
                <div>
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Brand Identity</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-full">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company Logo</label>
                            <div className="mt-2 flex items-center gap-x-8">
                                {settings.logo ? (
                                    <img
                                        src={resolveLogo(settings.logo)}
                                        alt="Company Logo"
                                        className="h-24 w-auto object-contain bg-gray-50 p-2 rounded-lg border border-gray-200"
                                    />
                                ) : (
                                    <PhotoIcon className="h-24 w-24 text-gray-300" aria-hidden="true" />
                                )}
                                <div className="flex flex-col gap-2">
                                    <label
                                        htmlFor="logo-upload"
                                        className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 cursor-pointer"
                                    >
                                        Change Logo
                                    </label>
                                    <input
                                        id="logo-upload"
                                        name="logo"
                                        type="file"
                                        className="sr-only"
                                        accept="image/png, image/jpeg, image/svg+xml"
                                        onChange={handleFileChange}
                                    />
                                    <p className="text-xs text-gray-500">PNG, JPG, SVG up to 2MB</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Site Name (Public Title)</label>
                            <input
                                type="text"
                                name="site_name"
                                value={settings.site_name || ''}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 dark:bg-slate-900 dark:border-slate-600"
                                placeholder="e.g. GreenCross Clinic"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Brand Name (Short)</label>
                            <input
                                type="text"
                                name="brand_name"
                                value={settings.brand_name || ''}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 dark:bg-slate-900 dark:border-slate-600"
                                placeholder="e.g. GreenCross"
                            />
                        </div>
                    </div>
                </div>

                <hr className="border-gray-200 dark:border-gray-700" />

                {/* Contact Section */}
                <div>
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Contact Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contact Email</label>
                            <input
                                type="email"
                                name="contact_email"
                                value={settings.contact_email || ''}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 dark:bg-slate-900 dark:border-slate-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contact Phone</label>
                            <input
                                type="text"
                                name="contact_phone"
                                value={settings.contact_phone || ''}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 dark:bg-slate-900 dark:border-slate-600"
                            />
                        </div>

                        <div className="col-span-full">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                            <textarea
                                name="contact_address"
                                rows={3}
                                value={settings.contact_address || ''}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 dark:bg-slate-900 dark:border-slate-600"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-md bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
}
