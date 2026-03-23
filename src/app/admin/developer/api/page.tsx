"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import { KeyIcon, DocumentTextIcon, ClipboardDocumentIcon, TrashIcon, ExclamationTriangleIcon, EyeIcon } from "@heroicons/react/24/outline";

export default function ApiPage() {
    const [activeTab, setActiveTab] = useState<'keys' | 'docs' | 'logs'>('keys');

    // Key Mangement State
    const [keys, setKeys] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState({ name: '', expires_in_days: '30' });
    const [newKey, setNewKey] = useState<string | null>(null);
    const [logs, setLogs] = useState<any[]>([]);

    // Fetch Keys
    const fetchKeys = async () => {
        try {
            setLoading(true);
            const res = await api.get('/developer/keys');
            setKeys(res.data.data);
        } catch (error) {
            toast.error("Failed to load keys");
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        try {
            const res = await api.get('/developer/keys/logs');
            setLogs(res.data.data);
        } catch (error) {
            toast.error("Failed to load logs");
        }
    };

    useEffect(() => {
        if (activeTab === 'keys') fetchKeys();
        if (activeTab === 'logs') fetchLogs(); // New tab for logs
    }, [activeTab]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.post('/developer/keys', createForm);
            setNewKey(res.data.data.apiKey);
            setKeys([res.data.data, ...keys]); // Optimistic add (though list refresh is better for consistent fields)
            fetchKeys();
            setIsCreateOpen(false);
            setCreateForm({ name: '', expires_in_days: '30' });
            toast.success("API Key Generated");
        } catch (error: any) {
            const msg = error.response?.data?.message || "Failed to generate key";
            toast.error(msg);
        }
    };

    const handleRevoke = async (id: number) => {
        if (!confirm("Are you sure? This action cannot be undone.")) return;
        try {
            await api.delete(`/developer/keys/${id}`);
            toast.success("Key Revoked");
            fetchKeys();
        } catch (error) {
            toast.error("Failed to revoke key");
        }
    };

    const toggleActive = async (id: number, currentStatus: boolean) => {
        try {
            await api.patch(`/developer/keys/${id}/status`, { is_active: !currentStatus });
            toast.success(`Key ${!currentStatus ? 'Enabled' : 'Disabled'}`);
            fetchKeys();
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold mb-2">API Management</h1>
            <p className="text-gray-500 mb-6">Manage API Keys and view System Documentation.</p>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200 dark:border-slate-700 mb-6">
                {[
                    { id: 'keys', label: 'API Keys', icon: KeyIcon },
                    { id: 'logs', label: 'Request Logs', icon: ClipboardDocumentIcon },
                    { id: 'docs', label: 'Documentation', icon: DocumentTextIcon },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-2 px-1 flex items-center gap-2 transition-colors ${activeTab === tab.id ? 'border-b-2 border-indigo-600 text-indigo-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <tab.icon className="w-5 h-5" /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {activeTab === 'keys' ? (
                <div>
                    {/* New Key Alert */}
                    {newKey && (
                        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                            <div className="flex items-start gap-3">
                                <KeyIcon className="w-6 h-6 text-green-600 mt-1" />
                                <div className="flex-1">
                                    <h3 className="font-bold text-green-800 dark:text-green-300">New API Key Generated</h3>
                                    <p className="text-sm text-green-700 dark:text-green-400 mb-2">Please copy this key now. You won't be able to see it again!</p>
                                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded border border-green-200 dark:border-green-800 font-mono text-sm break-all">
                                        <span className="flex-1 select-all">{newKey}</span>
                                        <button onClick={() => copyToClipboard(newKey)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-gray-500">
                                            <ClipboardDocumentIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <button onClick={() => setNewKey(null)} className="text-green-600 hover:text-green-800">Dismiss</button>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end mb-4">
                        <Button onClick={() => setIsCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">Create New Key</Button>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden border border-gray-200 dark:border-slate-700">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-slate-700/50 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Prefix</th>
                                    <th className="px-6 py-4">Requests</th>
                                    <th className="px-6 py-4">Created</th>
                                    <th className="px-6 py-4">Expires</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {keys.map((key) => (
                                    <tr key={key.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors ${!key.is_active ? 'opacity-60 grayscale' : ''}`}>
                                        <td className="px-6 py-4 font-medium">
                                            {key.name}
                                            {!key.is_active && <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">DISABLED</span>}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-gray-500">{key.api_key_prefix}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-indigo-600">{key.request_count || 0}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{new Date(key.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-sm">
                                            {key.expires_at ? (
                                                <span className={new Date(key.expires_at) < new Date() ? 'text-red-500' : 'text-gray-500'}>
                                                    {new Date(key.expires_at).toLocaleDateString()}
                                                    {new Date(key.expires_at) < new Date() && " (Expired)"}
                                                </span>
                                            ) : 'Never'}
                                        </td>
                                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => toggleActive(key.id, key.is_active)}
                                                className={`text-xs px-2 py-1 rounded border transition-colors ${key.is_active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
                                            >
                                                {key.is_active ? 'Disable' : 'Enable'}
                                            </button>
                                            <button onClick={() => handleRevoke(key.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors" title="Revoke Key">
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {keys.length === 0 && !loading && (
                                    <tr key="no-keys"><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No active API keys found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : activeTab === 'logs' ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden border border-gray-200 dark:border-slate-700">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-700/50 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-6 py-4">Time</th>
                                <th className="px-6 py-4">Key Name</th>
                                <th className="px-6 py-4">Method</th>
                                <th className="px-6 py-4">Endpoint</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Latency</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {logs.map(log => (
                                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                                    <td className="px-6 py-4 text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                                    <td className="px-6 py-4 font-medium">{log.key_name || <span className="text-gray-400 italic">Unknown</span>}</td>
                                    <td className="px-6 py-4"><span className="font-mono text-xs font-bold">{log.method}</span></td>
                                    <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">{log.endpoint}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${log.status_code < 400 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {log.status_code}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-xs">{log.response_time_ms}ms</td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr key="no-logs"><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No logs found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="flex gap-6 h-[70vh]">
                    {/* Documentation Sidebar */}
                    <div className="w-64 bg-white dark:bg-slate-800 rounded-xl shadow border border-gray-200 dark:border-slate-700 p-4 overflow-y-auto">
                        <h3 className="font-bold text-sm uppercase text-gray-500 mb-4">Core Resources</h3>
                        <ul className="space-y-1">
                            {['Authentication', 'Product Modules', 'Locations', 'Categories', 'Packages', 'Roles & Permissions'].map(item => (
                                <li key={item}>
                                    <button
                                        className="w-full text-left px-3 py-2 rounded text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-indigo-600 transition-colors"
                                        onClick={() => document.getElementById(item.toLowerCase().replace(/ /g, '-'))?.scrollIntoView({ behavior: 'smooth' })}
                                    >
                                        {item}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Documentation Content */}
                    <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow border border-gray-200 dark:border-slate-700 p-8 overflow-y-auto scroll-smooth">
                        <div className="prose dark:prose-invert max-w-none">

                            {/* Authentication */}
                            <section id="authentication" className="mb-12">
                                <h2>Authentication</h2>
                                <p className="lead">All API requests must be authenticated using the <code>Authorization</code> header.</p>
                                <div className="bg-slate-900 rounded-lg p-4 my-4 font-mono text-sm text-slate-200">
                                    Authorization: Bearer {`<YOUR_API_KEY>`}
                                </div>
                                <h3>Base URL</h3>
                                <p><code>http://localhost:5000/api/v1/dev</code></p>
                            </section>

                            <hr className="my-8" />

                            {/* Products / Menus */}
                            {/* Product Modules */}
                            <section id="product-modules" className="mb-12">
                                <h2>Product Modules</h2>
                                <p>Manage the functional modules of the SaaS product (e.g. "Front Desk", "Housekeeping"). These are the building blocks for Packages and Roles.</p>

                                {/* List Modules */}
                                <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden my-4">
                                    <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-2 border-b border-gray-200 dark:border-slate-700 flex items-center gap-3">
                                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">GET</span>
                                        <code className="text-sm">/modules</code>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-sm text-gray-600 dark:text-gray-300">List all Product Modules.</p>
                                    </div>
                                </div>

                                {/* Create Module */}
                                <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden my-4">
                                    <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-2 border-b border-gray-200 dark:border-slate-700 flex items-center gap-3">
                                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700">POST</span>
                                        <code className="text-sm">/modules</code>
                                    </div>
                                    <div className="p-4">
                                        <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Payload</h4>
                                        <pre className="bg-gray-50 dark:bg-slate-900 p-3 rounded text-xs text-slate-700 dark:text-slate-300 overflow-x-auto font-mono">
                                            {`{
  "name": "Front Desk",
  "slug": "front_desk",
  "description": "Check-in, Check-out and Reservations"
}`}
                                        </pre>
                                    </div>
                                </div>

                                {/* Add Scope (Permission) */}
                                <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden my-4">
                                    <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-2 border-b border-gray-200 dark:border-slate-700 flex items-center gap-3">
                                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700">POST</span>
                                        <code className="text-sm">/modules/:id/scopes</code>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Add a granular permission (Scope) to a specific module.</p>
                                        <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Payload</h4>
                                        <pre className="bg-gray-50 dark:bg-slate-900 p-3 rounded text-xs text-slate-700 dark:text-slate-300 overflow-x-auto font-mono">
                                            {`{
  "name": "Check In Guest",
  "slug": "front_desk.check_in",
  "description": "Allow user to perform check-ins"
}`}
                                        </pre>
                                    </div>
                                </div>
                            </section>

                            <hr className="my-8" />

                            {/* Locations */}
                            <section id="locations" className="mb-12">
                                <h2>Locations</h2>
                                <p>Manage global location data: Countries, States, and Cities.</p>

                                {/* List Countries */}
                                <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden my-4">
                                    <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-2 border-b border-gray-200 dark:border-slate-700 flex items-center gap-3">
                                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">GET</span>
                                        <code className="text-sm">/locations/countries</code>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-sm text-gray-600 dark:text-gray-300">Get list of supported countries.</p>
                                    </div>
                                </div>

                                {/* Create Country */}
                                <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden my-4">
                                    <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-2 border-b border-gray-200 dark:border-slate-700 flex items-center gap-3">
                                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700">POST</span>
                                        <code className="text-sm">/locations/countries</code>
                                    </div>
                                    <div className="p-4">
                                        <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Payload</h4>
                                        <pre className="bg-gray-50 dark:bg-slate-900 p-3 rounded text-xs text-slate-700 dark:text-slate-300 overflow-x-auto font-mono">
                                            {`{
  "name": "United States",
  "iso_code": "US",
  "phone_code": "+1",
  "currency_code": "USD",
  "currency_symbol": "$"
}`}
                                        </pre>
                                    </div>
                                </div>

                                {/* List States */}
                                <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden my-4">
                                    <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-2 border-b border-gray-200 dark:border-slate-700 flex items-center gap-3">
                                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">GET</span>
                                        <code className="text-sm">/locations/countries/:id/states</code>
                                    </div>
                                </div>
                            </section>

                            <hr className="my-8" />

                            {/* Categories */}
                            <section id="categories" className="mb-12">
                                <h2>Categories</h2>
                                <p>Manage SaaS Product Categories and Subcategories.</p>

                                {/* Create Category */}
                                <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden my-4">
                                    <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-2 border-b border-gray-200 dark:border-slate-700 flex items-center gap-3">
                                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700">POST</span>
                                        <code className="text-sm">/categories</code>
                                    </div>
                                    <div className="p-4">
                                        <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Payload</h4>
                                        <pre className="bg-gray-50 dark:bg-slate-900 p-3 rounded text-xs text-slate-700 dark:text-slate-300 overflow-x-auto font-mono">
                                            {`{
  "name": "Hosting",
  "description": "Cloud and Web Hosting Services"
}`}
                                        </pre>
                                    </div>
                                </div>

                                {/* Create Subcategory */}
                                <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden my-4">
                                    <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-2 border-b border-gray-200 dark:border-slate-700 flex items-center gap-3">
                                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700">POST</span>
                                        <code className="text-sm">/categories/:id/subcategories</code>
                                    </div>
                                    <div className="p-4">
                                        <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Payload</h4>
                                        <pre className="bg-gray-50 dark:bg-slate-900 p-3 rounded text-xs text-slate-700 dark:text-slate-300 overflow-x-auto font-mono">
                                            {`{
  "name": "VPS Hosting",
  "description": "Virtual Private Server packages"
}`}
                                        </pre>
                                    </div>
                                </div>
                            </section>

                            <hr className="my-8" />

                            {/* Packages */}
                            <section id="packages" className="mb-12">
                                <h2>Packages</h2>
                                <p>Manage SaaS Packages and their associated Modules (Features).</p>

                                {/* List Packages */}
                                <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden my-4">
                                    <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-2 border-b border-gray-200 dark:border-slate-700 flex items-center gap-3">
                                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">GET</span>
                                        <code className="text-sm">/packages</code>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">List all packages. Supports filtering.</p>
                                        <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Query Params</h4>
                                        <ul className="text-xs text-gray-600 dark:text-gray-300 list-disc list-inside mb-3">
                                            <li><code>countryId</code> (optional): Filter by Country ID</li>
                                            <li><code>categoryId</code> (optional): Filter by Category ID</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Create Package */}
                                <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden my-4">
                                    <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-2 border-b border-gray-200 dark:border-slate-700 flex items-center gap-3">
                                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700">POST</span>
                                        <code className="text-sm">/packages</code>
                                    </div>
                                    <div className="p-4">
                                        <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Payload</h4>
                                        <p className="text-xs text-gray-500 mb-2">Notes: <code>module_ids</code> is an array of IDs from the <code>/menus</code> endpoint.</p>
                                        <pre className="bg-gray-50 dark:bg-slate-900 p-3 rounded text-xs text-slate-700 dark:text-slate-300 overflow-x-auto font-mono">
                                            {`{
  "name": "Gold Plan",
  "slug": "gold_plan_us",
  "description": "Premium features for US market",
  "category_id": 1, 
  "subcategory_id": 2,
  "country_id": 1,
  "price_monthly": 49.99,
  "price_yearly": 499.00,
  "currency": "USD",
  "module_ids": [1, 3, 5] 
}`}
                                        </pre>
                                    </div>
                                </div>

                                {/* Update Package */}
                                <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden my-4">
                                    <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-2 border-b border-gray-200 dark:border-slate-700 flex items-center gap-3">
                                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700">PUT</span>
                                        <code className="text-sm">/packages/:id</code>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Update package details and module associations. Only fields present in the payload will be updated.</p>
                                    </div>
                                </div>
                            </section>

                            <hr className="my-8" />

                            {/* Product Roles */}
                            <section id="roles-&-permissions" className="mb-12">
                                <h2>Product Roles & Permissions</h2>
                                <p>Manage Roles (e.g. "Front Desk Manager") and granular Permissions.</p>

                                {/* List Roles */}
                                <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden my-4">
                                    <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-2 border-b border-gray-200 dark:border-slate-700 flex items-center gap-3">
                                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">GET</span>
                                        <code className="text-sm">/roles</code>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-sm text-gray-600 dark:text-gray-300">List all Product Roles.</p>
                                    </div>
                                </div>

                                {/* Create Role */}
                                <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden my-4">
                                    <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-2 border-b border-gray-200 dark:border-slate-700 flex items-center gap-3">
                                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700">POST</span>
                                        <code className="text-sm">/roles</code>
                                    </div>
                                    <div className="p-4">
                                        <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Payload</h4>
                                        <pre className="bg-gray-50 dark:bg-slate-900 p-3 rounded text-xs text-slate-700 dark:text-slate-300 overflow-x-auto font-mono">
                                            {`{
  "name": "Front Desk Manager",
  "description": "Manages check-ins and bookings",
  "category_id": 1,
  "permission_ids": [101, 102, 105]
}`}
                                        </pre>
                                    </div>
                                </div>

                                {/* List Permissions */}
                                <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden my-4">
                                    <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-2 border-b border-gray-200 dark:border-slate-700 flex items-center gap-3">
                                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">GET</span>
                                        <code className="text-sm">/permissions</code>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Get all available permissions, grouped by Module.</p>
                                        <p className="text-xs text-gray-500">Useful for building the "Assign Permissions" UI.</p>
                                    </div>
                                </div>
                            </section>

                        </div>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95">
                        <h2 className="text-xl font-bold mb-4">Generate API Key</h2>
                        <form onSubmit={handleCreate}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Key Name</label>
                                    <input
                                        required
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        placeholder="e.g. Mobile App, Zapier"
                                        value={createForm.name}
                                        onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Expires In (Days)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        value={createForm.expires_in_days}
                                        onChange={e => setCreateForm({ ...createForm, expires_in_days: e.target.value })}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Leave empty or 0 for no expiry (not recommended).</p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                                <Button type="submit" className="bg-indigo-600 text-white">Generate</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
