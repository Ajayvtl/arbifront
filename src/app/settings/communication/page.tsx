'use client';

import { useState, useEffect } from 'react';
import { Mail, MessageSquare, Phone, Save, RefreshCw, CheckCircle, XCircle, Settings } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '@/context/ThemeContext';

export default function CommunicationSettings() {
    const { isDarkMode } = useTheme();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testingEmail, setTestingEmail] = useState(false);
    const [testingSMS, setTestingSMS] = useState(false);
    const [testingWhatsApp, setTestingWhatsApp] = useState(false);

    const [settings, setSettings] = useState({
        // Enable/Disable Flags
        enable_email: true,
        enable_sms: true,
        enable_whatsapp: true,

        // Email Settings
        smtp_host: '',
        smtp_port: '587',
        smtp_user: '',
        smtp_pass: '',
        smtp_from_name: '',

        // SMS Settings
        sms_provider: 'airtel', // airtel, bsnl, custom
        airtel_api_key: '',
        airtel_sender_id: '',
        airtel_entity_id: '',
        airtel_template_id: '',
        bsnl_username: '',
        bsnl_password: '',
        bsnl_sender_id: '',
        custom_sms_api_url: '',
        custom_sms_api_key: '',
        custom_sms_sender_id: '',

        // WhatsApp Settings
        whatsapp_api_url: 'https://graph.facebook.com/v18.0',
        whatsapp_access_token: '',
        whatsapp_phone_number_id: '',
        whatsapp_business_account_id: '',

        // Business Info
        hotel_name: '',
        hotel_address: '',
        hotel_phone: '',
        lab_name: '',
        lab_phone: '',
        website_url: ''
    });

    const [testResults, setTestResults] = useState<{
        email: boolean | null;
        sms: boolean | null;
        whatsapp: boolean | null;
    }>({
        email: null,
        sms: null,
        whatsapp: null
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
            const token = localStorage.getItem('token');

            const res = await axios.get(`${API_URL}/communication-settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setSettings(prev => ({ ...prev, ...res.data.data }));
            }
        } catch (error: unknown) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
            const token = localStorage.getItem('token');

            const res = await axios.post(`${API_URL}/communication-settings`, settings, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                alert('Communication settings saved successfully!');
            }
        } catch (error: any) {
            console.error('Failed to save settings:', error);
            alert('Failed to save settings: ' + (error.response?.data?.message || error.message));
        } finally {
            setSaving(false);
        }
    };

    const testEmail = async () => {
        setTestingEmail(true);
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/v1';
            const token = localStorage.getItem('token');

            const res = await axios.post(`${API_URL}/communication-settings/test-email`, {
                to: settings.smtp_user
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setTestResults(prev => ({ ...prev, email: res.data.success }));
            alert(res.data.success ? 'Test email sent successfully!' : 'Failed to send test email');
        } catch (error: any) {
            setTestResults(prev => ({ ...prev, email: false }));
            alert('Email test failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setTestingEmail(false);
        }
    };

    const testSMS = async () => {
        setTestingSMS(true);
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/v1';
            const token = localStorage.getItem('token');

            const res = await axios.post(`${API_URL}/communication-settings/test-sms`, {
                to: settings.hotel_phone
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setTestResults(prev => ({ ...prev, sms: res.data.success }));
            alert(res.data.success ? 'Test SMS sent successfully!' : 'Failed to send test SMS');
        } catch (error: any) {
            setTestResults(prev => ({ ...prev, sms: false }));
            alert('SMS test failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setTestingSMS(false);
        }
    };

    const testWhatsApp = async () => {
        setTestingWhatsApp(true);
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
            const token = localStorage.getItem('token');

            const res = await axios.post(`${API_URL}/communication-settings/test-whatsapp`, {
                to: settings.hotel_phone
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setTestResults(prev => ({ ...prev, whatsapp: res.data.success }));
            alert(res.data.success ? 'Test WhatsApp sent successfully!' : 'Failed to send test WhatsApp');
        } catch (error: any) {
            setTestResults(prev => ({ ...prev, whatsapp: false }));
            alert('WhatsApp test failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setTestingWhatsApp(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isDarkMode ? 'border-emerald-400' : 'border-blue-600'}`}></div>
            </div>
        );
    }

    // Theme-aware classes
    const cardClass = isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white shadow-sm';
    const textClass = isDarkMode ? 'text-slate-100' : 'text-gray-900';
    const textMutedClass = isDarkMode ? 'text-slate-400' : 'text-gray-600';
    const inputClass = isDarkMode
        ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400 focus:ring-emerald-500 focus:border-emerald-500'
        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500';
    const labelClass = isDarkMode ? 'text-slate-300' : 'text-gray-700';
    const borderClass = isDarkMode ? 'border-slate-700' : 'border-gray-200';

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className={`text-3xl font-bold ${textClass} flex items-center gap-3`}>
                    <Settings className={`w-8 h-8 ${isDarkMode ? 'text-emerald-400' : 'text-blue-600'}`} />
                    Communication Settings
                </h1>
                <p className={`${textMutedClass} mt-2`}>Configure email, SMS, and WhatsApp notifications</p>
            </div>

            {/* Enable/Disable Toggles */}
            <div className={`${cardClass} rounded-lg p-6 mb-6`}>
                <h2 className={`text-xl font-semibold ${textClass} mb-4`}>Enable Communication Channels</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className={`flex items-center justify-between p-4 border ${borderClass} rounded-lg`}>
                        <div className="flex items-center gap-3">
                            <Mail className="w-6 h-6 text-blue-600" />
                            <div>
                                <p className={`font-medium ${textClass}`}>Email</p>
                                <p className={`text-sm ${textMutedClass}`}>SMTP Server</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.enable_email}
                                onChange={(e) => setSettings({ ...settings, enable_email: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className={`w-11 h-6 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600`}></div>
                        </label>
                    </div>

                    <div className={`flex items-center justify-between p-4 border ${borderClass} rounded-lg`}>
                        <div className="flex items-center gap-3">
                            <MessageSquare className="w-6 h-6 text-green-600" />
                            <div>
                                <p className={`font-medium ${textClass}`}>SMS</p>
                                <p className={`text-sm ${textMutedClass}`}>Direct Gateway</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.enable_sms}
                                onChange={(e) => setSettings({ ...settings, enable_sms: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className={`w-11 h-6 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600`}></div>
                        </label>
                    </div>

                    <div className={`flex items-center justify-between p-4 border ${borderClass} rounded-lg`}>
                        <div className="flex items-center gap-3">
                            <Phone className="w-6 h-6 text-emerald-600" />
                            <div>
                                <p className={`font-medium ${textClass}`}>WhatsApp</p>
                                <p className={`text-sm ${textMutedClass}`}>Business API</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.enable_whatsapp}
                                onChange={(e) => setSettings({ ...settings, enable_whatsapp: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className={`w-11 h-6 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600`}></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Business Information */}
            <div className={`${cardClass} rounded-lg p-6 mb-6`}>
                <h2 className={`text-xl font-semibold ${textClass} mb-4`}>Business Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={`block text-sm font-medium ${labelClass} mb-1`}>Hotel Name</label>
                        <input
                            type="text"
                            value={settings.hotel_name}
                            onChange={(e) => setSettings({ ...settings, hotel_name: e.target.value })}
                            className={`w-full p-2 border rounded-lg ${inputClass}`}
                            placeholder="Your Hotel Name"
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-medium ${labelClass} mb-1`}>Hotel Phone</label>
                        <input
                            type="tel"
                            value={settings.hotel_phone}
                            onChange={(e) => setSettings({ ...settings, hotel_phone: e.target.value })}
                            className={`w-full p-2 border rounded-lg ${inputClass}`}
                            placeholder="+91-XXXXXXXXXX"
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-medium ${labelClass} mb-1`}>Hotel Address</label>
                        <input
                            type="text"
                            value={settings.hotel_address}
                            onChange={(e) => setSettings({ ...settings, hotel_address: e.target.value })}
                            className={`w-full p-2 border rounded-lg ${inputClass}`}
                            placeholder="Full Address"
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-medium ${labelClass} mb-1`}>Website URL</label>
                        <input
                            type="url"
                            value={settings.website_url}
                            onChange={(e) => setSettings({ ...settings, website_url: e.target.value })}
                            className={`w-full p-2 border rounded-lg ${inputClass}`}
                            placeholder="https://yourdomain.com"
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-medium ${labelClass} mb-1`}>Lab Name</label>
                        <input
                            type="text"
                            value={settings.lab_name}
                            onChange={(e) => setSettings({ ...settings, lab_name: e.target.value })}
                            className={`w-full p-2 border rounded-lg ${inputClass}`}
                            placeholder="Lab Name (for orders)"
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-medium ${labelClass} mb-1`}>Lab Phone</label>
                        <input
                            type="tel"
                            value={settings.lab_phone}
                            onChange={(e) => setSettings({ ...settings, lab_phone: e.target.value })}
                            className={`w-full p-2 border rounded-lg ${inputClass}`}
                            placeholder="+91-XXXXXXXXXX"
                        />
                    </div>
                </div>
            </div>

            {/* Email Settings */}
            {settings.enable_email && (
                <div className={`${cardClass} rounded-lg p-6 mb-6`}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className={`text-xl font-semibold ${textClass} flex items-center gap-2`}>
                            <Mail className="w-6 h-6 text-blue-600" />
                            Email Settings (SMTP)
                        </h2>
                        <button
                            onClick={testEmail}
                            disabled={testingEmail}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {testingEmail ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                            Test Email
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium ${labelClass} mb-1`}>SMTP Host</label>
                            <input
                                type="text"
                                value={settings.smtp_host}
                                onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                                className={`w-full p-2 border rounded-lg ${inputClass}`}
                                placeholder="smtp.yourdomain.com"
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium ${labelClass} mb-1`}>SMTP Port</label>
                            <input
                                type="number"
                                value={settings.smtp_port}
                                onChange={(e) => setSettings({ ...settings, smtp_port: e.target.value })}
                                className={`w-full p-2 border rounded-lg ${inputClass}`}
                                placeholder="587"
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium ${labelClass} mb-1`}>SMTP User (Email)</label>
                            <input
                                type="email"
                                value={settings.smtp_user}
                                onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                                className={`w-full p-2 border rounded-lg ${inputClass}`}
                                placeholder="noreply@yourdomain.com"
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium ${labelClass} mb-1`}>SMTP Password</label>
                            <input
                                type="password"
                                value={settings.smtp_pass}
                                onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })}
                                className={`w-full p-2 border rounded-lg ${inputClass}`}
                                placeholder="••••••••"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className={`block text-sm font-medium ${labelClass} mb-1`}>From Name</label>
                            <input
                                type="text"
                                value={settings.smtp_from_name}
                                onChange={(e) => setSettings({ ...settings, smtp_from_name: e.target.value })}
                                className={`w-full p-2 border rounded-lg ${inputClass}`}
                                placeholder="Your Hotel Name"
                            />
                        </div>
                    </div>
                    {testResults.email !== null && (
                        <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${testResults.email ? (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-800') : (isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-800')}`}>
                            {testResults.email ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                            {testResults.email ? 'Email test successful!' : 'Email test failed. Check your settings.'}
                        </div>
                    )}
                </div>
            )}

            {/* SMS Settings */}
            {settings.enable_sms && (
                <div className={`${cardClass} rounded-lg p-6 mb-6`}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className={`text-xl font-semibold ${textClass} flex items-center gap-2`}>
                            <MessageSquare className="w-6 h-6 text-green-600" />
                            SMS Settings
                        </h2>
                        <button
                            onClick={testSMS}
                            disabled={testingSMS}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                            {testingSMS ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                            Test SMS
                        </button>
                    </div>

                    <div className="mb-4">
                        <label className={`block text-sm font-medium ${labelClass} mb-2`}>SMS Provider</label>
                        <select
                            value={settings.sms_provider}
                            onChange={(e) => setSettings({ ...settings, sms_provider: e.target.value })}
                            className={`w-full p-2 border rounded-lg ${inputClass}`}
                        >
                            <option value="airtel">Airtel Business SMS</option>
                            <option value="bsnl">BSNL Bulk SMS</option>
                            <option value="custom">Custom Gateway/Modem</option>
                        </select>
                    </div>

                    {settings.sms_provider === 'airtel' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={`block text-sm font-medium ${labelClass} mb-1`}>Airtel API Key</label>
                                <input
                                    type="password"
                                    value={settings.airtel_api_key}
                                    onChange={(e) => setSettings({ ...settings, airtel_api_key: e.target.value })}
                                    className={`w-full p-2 border rounded-lg ${inputClass}`}
                                    placeholder="Your Airtel API Key"
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium ${labelClass} mb-1`}>Sender ID</label>
                                <input
                                    type="text"
                                    value={settings.airtel_sender_id}
                                    onChange={(e) => setSettings({ ...settings, airtel_sender_id: e.target.value })}
                                    className={`w-full p-2 border rounded-lg ${inputClass}`}
                                    placeholder="HOTNAM"
                                    maxLength={6}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium ${labelClass} mb-1`}>Entity ID</label>
                                <input
                                    type="text"
                                    value={settings.airtel_entity_id}
                                    onChange={(e) => setSettings({ ...settings, airtel_entity_id: e.target.value })}
                                    className={`w-full p-2 border rounded-lg ${inputClass}`}
                                    placeholder="DLT Entity ID"
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium ${labelClass} mb-1`}>Template ID</label>
                                <input
                                    type="text"
                                    value={settings.airtel_template_id}
                                    onChange={(e) => setSettings({ ...settings, airtel_template_id: e.target.value })}
                                    className={`w-full p-2 border rounded-lg ${inputClass}`}
                                    placeholder="DLT Template ID"
                                />
                            </div>
                        </div>
                    )}

                    {settings.sms_provider === 'bsnl' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={`block text-sm font-medium ${labelClass} mb-1`}>BSNL Username</label>
                                <input
                                    type="text"
                                    value={settings.bsnl_username}
                                    onChange={(e) => setSettings({ ...settings, bsnl_username: e.target.value })}
                                    className={`w-full p-2 border rounded-lg ${inputClass}`}
                                    placeholder="Your BSNL Username"
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium ${labelClass} mb-1`}>BSNL Password</label>
                                <input
                                    type="password"
                                    value={settings.bsnl_password}
                                    onChange={(e) => setSettings({ ...settings, bsnl_password: e.target.value })}
                                    className={`w-full p-2 border rounded-lg ${inputClass}`}
                                    placeholder="••••••••"
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium ${labelClass} mb-1`}>Sender ID</label>
                                <input
                                    type="text"
                                    value={settings.bsnl_sender_id}
                                    onChange={(e) => setSettings({ ...settings, bsnl_sender_id: e.target.value })}
                                    className={`w-full p-2 border rounded-lg ${inputClass}`}
                                    placeholder="HOTNAM"
                                    maxLength={6}
                                />
                            </div>
                        </div>
                    )}

                    {settings.sms_provider === 'custom' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className={`block text-sm font-medium ${labelClass} mb-1`}>Custom API URL</label>
                                <input
                                    type="url"
                                    value={settings.custom_sms_api_url}
                                    onChange={(e) => setSettings({ ...settings, custom_sms_api_url: e.target.value })}
                                    className={`w-full p-2 border rounded-lg ${inputClass}`}
                                    placeholder="http://your-gateway.local/api/send"
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium ${labelClass} mb-1`}>API Key (Optional)</label>
                                <input
                                    type="password"
                                    value={settings.custom_sms_api_key}
                                    onChange={(e) => setSettings({ ...settings, custom_sms_api_key: e.target.value })}
                                    className={`w-full p-2 border rounded-lg ${inputClass}`}
                                    placeholder="Optional API Key"
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium ${labelClass} mb-1`}>Sender ID</label>
                                <input
                                    type="text"
                                    value={settings.custom_sms_sender_id}
                                    onChange={(e) => setSettings({ ...settings, custom_sms_sender_id: e.target.value })}
                                    className={`w-full p-2 border rounded-lg ${inputClass}`}
                                    placeholder="HOTNAM"
                                />
                            </div>
                        </div>
                    )}

                    {testResults.sms !== null && (
                        <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${testResults.sms ? (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-800') : (isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-800')}`}>
                            {testResults.sms ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                            {testResults.sms ? 'SMS test successful!' : 'SMS test failed. Check your settings.'}
                        </div>
                    )}
                </div>
            )}

            {/* WhatsApp Settings */}
            {settings.enable_whatsapp && (
                <div className={`${cardClass} rounded-lg p-6 mb-6`}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className={`text-xl font-semibold ${textClass} flex items-center gap-2`}>
                            <Phone className="w-6 h-6 text-emerald-600" />
                            WhatsApp Business API Settings
                        </h2>
                        <button
                            onClick={testWhatsApp}
                            disabled={testingWhatsApp}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                        >
                            {testingWhatsApp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                            Test WhatsApp
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className={`block text-sm font-medium ${labelClass} mb-1`}>WhatsApp API URL</label>
                            <input
                                type="url"
                                value={settings.whatsapp_api_url}
                                onChange={(e) => setSettings({ ...settings, whatsapp_api_url: e.target.value })}
                                className={`w-full p-2 border rounded-lg ${inputClass}`}
                                placeholder="https://graph.facebook.com/v18.0"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className={`block text-sm font-medium ${labelClass} mb-1`}>Access Token</label>
                            <input
                                type="password"
                                value={settings.whatsapp_access_token}
                                onChange={(e) => setSettings({ ...settings, whatsapp_access_token: e.target.value })}
                                className={`w-full p-2 border rounded-lg ${inputClass}`}
                                placeholder="Your WhatsApp Business API Access Token"
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium ${labelClass} mb-1`}>Phone Number ID</label>
                            <input
                                type="text"
                                value={settings.whatsapp_phone_number_id}
                                onChange={(e) => setSettings({ ...settings, whatsapp_phone_number_id: e.target.value })}
                                className={`w-full p-2 border rounded-lg ${inputClass}`}
                                placeholder="Phone Number ID from Meta"
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium ${labelClass} mb-1`}>Business Account ID</label>
                            <input
                                type="text"
                                value={settings.whatsapp_business_account_id}
                                onChange={(e) => setSettings({ ...settings, whatsapp_business_account_id: e.target.value })}
                                className={`w-full p-2 border rounded-lg ${inputClass}`}
                                placeholder="Business Account ID from Meta"
                            />
                        </div>
                    </div>
                    {testResults.whatsapp !== null && (
                        <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${testResults.whatsapp ? (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-800') : (isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-800')}`}>
                            {testResults.whatsapp ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                            {testResults.whatsapp ? 'WhatsApp test successful!' : 'WhatsApp test failed. Check your settings.'}
                        </div>
                    )}
                </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end gap-4">
                <button
                    onClick={fetchSettings}
                    className={`px-6 py-3 border ${borderClass} rounded-lg ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-50'} font-medium ${textClass} transition-colors`}
                >
                    Reset
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex items-center gap-2 px-6 py-3 ${isDarkMode ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg disabled:opacity-50 font-medium transition-colors`}
                >
                    {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
        </div>
    );
}
