"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { CheckCircleIcon, XCircleIcon, UserGroupIcon, BuildingOfficeIcon, BanknotesIcon, PencilSquareIcon, TrashIcon, UserPlusIcon } from '@heroicons/react/24/outline';

interface Contact {
    id?: number;
    name: string;
    email: string;
    phone: string;
    position: string;
    is_primary: boolean;
}

interface Agent {
    id: number;
    name: string;
    email: string;
    phone: string;
    referral_code: string;
    status: 'pending' | 'active' | 'suspended';
    commission_percentage: string;
    referred_hotels_count: number;
    active_hotels_count: number;
    created_at: string;
    company_name?: string;
    tax_id?: string;
    billing_address?: string;
    bank_details?: any; // JSON
    contacts?: Contact[];
    user?: any;
    country_id?: number | null;
    state_id?: number | null;
    city_id?: number | null;
    pincode?: string;
    currency?: string;
    category_id?: number | null;
    category_name?: string;
    subcategory_ids?: number[];
    subcategories?: { id: number, name: string }[];
}

interface Location {
    id: number;
    name: string;
    country_id?: number;
    state_id?: number;
}

interface Category {
    id: number;
    name: string;
    subcategories?: { id: number, name: string }[];
}

const inputClass = "w-full border border-gray-300 dark:border-slate-600 p-2 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none";
const btnPrimaryClass = "bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition font-medium";
const btnSecondaryClass = "bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-white px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition font-medium";

export default function AgentsPage() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({
        name: '', email: '', phone: '', commission_percentage: 10, company_name: '', tax_id: '', billing_address: '',
        country_id: '', state_id: '', city_id: '', pincode: '', currency: 'INR',
        category_id: '', subcategory_ids: [] as number[]
    });

    // Location State
    const [countries, setCountries] = useState<Location[]>([]);
    const [states, setStates] = useState<Location[]>([]);
    const [cities, setCities] = useState<Location[]>([]);

    // Category State
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeSubcategories, setActiveSubcategories] = useState<{ id: number, name: string }[]>([]);

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [activeTab, setActiveTab] = useState('profile'); // profile, contacts, finance, settings
    const [editForm, setEditForm] = useState<Partial<Agent>>({});
    const [contacts, setContacts] = useState<Contact[]>([]);

    // Contact Form
    const [showContactForm, setShowContactForm] = useState(false);
    const [contactForm, setContactForm] = useState<Contact>({ name: '', email: '', phone: '', position: '', is_primary: false });

    useEffect(() => {
        fetchAgents();
        loadLocations();
        fetchCategories();
    }, []);

    const loadLocations = async () => {
        try {
            const [c, s, ci] = await Promise.all([
                api.get('/locations/countries'),
                api.get('/locations/states'),
                api.get('/locations/cities')
            ]);
            setCountries(c.data.data);
            setStates(s.data.data);
            setCities(ci.data.data);
        } catch (e) { }
    };

    const fetchCategories = async () => {
        try {
            const res = await api.get('/saas/categories'); // FIXED: Corrected API path
            setCategories(res.data.data);
        } catch (error) { console.error("Failed to load categories"); }
    };

    const fetchAgents = async () => {
        try {
            const res = await api.get('/agents');
            setAgents(res.data.data);
        } catch (error) {
            toast.error("Failed to load agents");
        } finally {
            setLoading(false);
        }
    };

    // Helper to get subcategories from local state (since API returns them nested)
    const getSubcategories = (categoryId: number) => {
        const category = categories.find(c => c.id === categoryId);
        return category ? (category.subcategories || []) : [];
    };

    // Update active subcategories when create category changes
    useEffect(() => {
        if (createForm.category_id) {
            setActiveSubcategories(getSubcategories(Number(createForm.category_id)));
        } else {
            setActiveSubcategories([]);
        }
    }, [createForm.category_id, categories]);

    // For Edit form
    useEffect(() => {
        if (editForm.category_id) {
            setActiveSubcategories(getSubcategories(Number(editForm.category_id)));
        }
    }, [editForm.category_id, categories]);


    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/agents', createForm);
            toast.success('Agency Partner Created');
            setShowCreateModal(false);
            setCreateForm({
                name: '', email: '', phone: '', commission_percentage: 10, company_name: '', tax_id: '', billing_address: '',
                country_id: '', state_id: '', city_id: '', pincode: '', currency: 'INR',
                category_id: '', subcategory_ids: []
            });
            fetchAgents();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Creation failed');
        }
    };

    const openEditModal = async (agentId: number) => {
        try {
            const res = await api.get(`/agents/${agentId}`);
            const agentData = res.data.data;
            setSelectedAgent(agentData);
            setEditForm(agentData);
            setContacts(agentData.contacts || []);
            setActiveTab('profile');

            // Pre-load subcategories handled by useEffect when editForm.category_id is set

            setShowEditModal(true);
        } catch (error) {
            toast.error("Failed to load agent details");
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAgent) return;
        try {
            await api.put(`/agents/${selectedAgent.id}`, editForm);
            toast.success('Profile Updated');
            fetchAgents();
            setShowEditModal(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Update failed');
        }
    };

    const handleContactSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAgent) return;
        try {
            const action = contactForm.id ? 'update' : 'add';
            const res = await api.post(`/agents/${selectedAgent.id}/contacts`, { action, contact: contactForm });
            setContacts(res.data.data);
            setShowContactForm(false);
            setContactForm({ name: '', email: '', phone: '', position: '', is_primary: false });
            toast.success(action === 'add' ? 'Contact Added' : 'Contact Updated');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Contact save failed');
        }
    };

    const handleDeleteContact = async (contactId: number) => {
        if (!selectedAgent || !confirm("Delete this contact?")) return;
        try {
            const res = await api.post(`/agents/${selectedAgent.id}/contacts`, { action: 'delete', contact: { id: contactId } });
            setContacts(res.data.data);
            toast.success('Contact Deleted');
        } catch (error: any) {
            toast.error('Failed to delete contact');
        }
    };

    const updateStatus = async (id: number, status: string) => {
        if (!confirm(`Are you sure you want to mark this agent as ${status}?`)) return;
        try {
            await api.patch(`/agents/${id}`, { status });
            toast.success(`Agent ${status}`);
            fetchAgents();
            if (selectedAgent && selectedAgent.id === id) {
                setSelectedAgent({ ...selectedAgent, status: status as any });
            }
        } catch (error) {
            toast.error("Status update failed");
        }
    };

    // Multi-select handler
    const toggleSubcategory = (subId: number, isCreate: boolean) => {
        if (isCreate) {
            const prev = createForm.subcategory_ids || [];
            if (prev.includes(subId)) setCreateForm({ ...createForm, subcategory_ids: prev.filter(id => id !== subId) });
            else setCreateForm({ ...createForm, subcategory_ids: [...prev, subId] });
        } else {
            const prev = editForm.subcategory_ids || [];
            if (prev.includes(subId)) setEditForm({ ...editForm, subcategory_ids: prev.filter(id => id !== subId) });
            else setEditForm({ ...editForm, subcategory_ids: [...prev, subId] });
        }
    }

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                    <UserGroupIcon className="w-8 h-8 mr-3 text-emerald-600" />
                    Agency Partners
                </h1>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 font-medium shadow flex items-center"
                >
                    <UserPlusIcon className="w-5 h-5 mr-2" /> Add Partner
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden border border-gray-100 dark:border-slate-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-slate-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Agent / Company</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Referral Code</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Performance</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-slate-800">
                        {agents.map((agent) => (
                            <tr key={agent.id}>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-900 dark:text-white">{agent.name}</span>
                                        {agent.company_name && <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{agent.company_name}</span>}
                                        <span className="text-sm text-gray-500 dark:text-gray-400">{agent.email}</span>
                                        <span className="text-xs text-gray-400">{agent.phone}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {agent.category_name ? (
                                        <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-1 rounded text-xs font-medium">
                                            {agent.category_name}
                                        </span>
                                    ) : <span className="text-gray-400 text-xs">-</span>}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded font-mono font-bold text-sm">
                                        {agent.referral_code}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                                        <div className="flex items-center" title="Total Referred Hotels">
                                            <BuildingOfficeIcon className="w-4 h-4 mr-1 text-gray-400" />
                                            {agent.referred_hotels_count}
                                        </div>
                                        <div className="flex items-center" title="Active Hotels (Commissionable)">
                                            <BanknotesIcon className="w-4 h-4 mr-1 text-emerald-500" />
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{agent.active_hotels_count}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase
                                        ${agent.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
                                        ${agent.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : ''}
                                        ${agent.status === 'suspended' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : ''}
                                    `}>
                                        {agent.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={() => openEditModal(agent.id)} className="text-blue-600 hover:text-blue-900" title="Edit">
                                        <PencilSquareIcon className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-2xl w-full shadow-2xl border border-gray-100 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4 dark:text-white">Add Agency Partner</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300 mb-1">Partner Name</label>
                                    <input className={inputClass} required
                                        value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300 mb-1">Company Name</label>
                                    <input className={inputClass}
                                        value={createForm.company_name} onChange={e => setCreateForm({ ...createForm, company_name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300 mb-1">Email</label>
                                    <input type="email" className={inputClass} required
                                        value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300 mb-1">Phone</label>
                                    <input className={inputClass} required
                                        value={createForm.phone} onChange={e => setCreateForm({ ...createForm, phone: e.target.value })} />
                                </div>
                            </div>

                            {/* Category Section */}
                            <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg border dark:border-slate-700">
                                <label className="block text-sm font-medium dark:text-gray-300 mb-2">Category</label>
                                <select className={inputClass} value={createForm.category_id} onChange={e => setCreateForm({ ...createForm, category_id: e.target.value })} required>
                                    <option value="">Select Category</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>

                                {activeSubcategories.length > 0 && (
                                    <div className="mt-3">
                                        <label className="block text-xs font-medium text-gray-500 mb-2">Select Subcategories</label>
                                        <div className="flex flex-wrap gap-2">
                                            {activeSubcategories.map(sub => (
                                                <button
                                                    key={sub.id} type="button"
                                                    onClick={() => toggleSubcategory(sub.id, true)}
                                                    className={`px-3 py-1 rounded-full text-xs font-medium border transition
                                                        ${createForm.subcategory_ids.includes(sub.id)
                                                            ? 'bg-emerald-100 border-emerald-500 text-emerald-700 dark:bg-emerald-900/30'
                                                            : 'bg-white border-gray-300 text-gray-600 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-300'}`}
                                                >
                                                    {sub.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>


                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300 mb-1">Tax ID</label>
                                    <input className={inputClass}
                                        value={createForm.tax_id} onChange={e => setCreateForm({ ...createForm, tax_id: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300 mb-1">Commission (%)</label>
                                    <input type="number" step="0.1" className={inputClass} required
                                        value={createForm.commission_percentage} onChange={e => setCreateForm({ ...createForm, commission_percentage: Number(e.target.value) })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300 mb-1">Billing Address</label>
                                <textarea className={inputClass} rows={2}
                                    value={createForm.billing_address} onChange={e => setCreateForm({ ...createForm, billing_address: e.target.value })} />
                            </div>

                            {/* Location & Finance */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300 mb-1">Country</label>
                                    <select className={inputClass}
                                        value={createForm.country_id} onChange={e => setCreateForm({ ...createForm, country_id: e.target.value })}>
                                        <option value="">Select Country</option>
                                        {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300 mb-1">State</label>
                                    <select className={inputClass}
                                        value={createForm.state_id} onChange={e => setCreateForm({ ...createForm, state_id: e.target.value })}>
                                        <option value="">Select State</option>
                                        {states.filter(s => !createForm.country_id || s.country_id == Number(createForm.country_id)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300 mb-1">City</label>
                                    <select className={inputClass}
                                        value={createForm.city_id} onChange={e => setCreateForm({ ...createForm, city_id: e.target.value })}>
                                        <option value="">Select City</option>
                                        {cities.filter(c => !createForm.state_id || c.state_id == Number(createForm.state_id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300 mb-1">Pincode</label>
                                    <input className={inputClass}
                                        value={createForm.pincode} onChange={e => setCreateForm({ ...createForm, pincode: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300 mb-1">Currency</label>
                                    <select className={inputClass}
                                        value={createForm.currency} onChange={e => setCreateForm({ ...createForm, currency: e.target.value })}>
                                        <option value="INR">INR</option>
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && selectedAgent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full shadow-2xl border border-gray-100 dark:border-slate-700 flex flex-col h-[80vh]">
                        <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900 rounded-t-xl">
                            <h2 className="text-lg font-bold dark:text-white flex items-center">
                                <span className="mr-2">Edit Partner:</span> {selectedAgent.name}
                            </h2>
                            <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                                <XCircleIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b dark:border-slate-700">
                            {['profile', 'contacts', 'finance', 'settings'].map(tab => (
                                <button key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-3 font-medium text-sm capitalize ${activeTab === tab ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {/* TAB: PROFILE */}
                            {activeTab === 'profile' && (
                                <form onSubmit={handleUpdateProfile} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium dark:text-gray-400 mb-1">Name</label>
                                            <input className={inputClass} value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium dark:text-gray-400 mb-1">Company Name</label>
                                            <input className={inputClass} value={editForm.company_name || ''} onChange={e => setEditForm({ ...editForm, company_name: e.target.value })} />
                                        </div>
                                    </div>

                                    {/* Category Edit */}
                                    <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium dark:text-gray-400 mb-1">Category</label>
                                                <select className={inputClass} value={editForm.category_id || ''} onChange={e => setEditForm({ ...editForm, category_id: Number(e.target.value) })}>
                                                    <option value="">Select Category</option>
                                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                {/* Placeholder for layout */}
                                            </div>
                                        </div>
                                        {activeSubcategories.length > 0 && (
                                            <div className="mt-3">
                                                <label className="block text-xs font-medium text-gray-500 mb-2">Subcategories</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {activeSubcategories.map(sub => (
                                                        <button
                                                            key={sub.id} type="button"
                                                            onClick={() => toggleSubcategory(sub.id, false)}
                                                            className={`px-3 py-1 rounded-full text-xs font-medium border transition
                                                                ${(editForm.subcategory_ids || []).includes(sub.id)
                                                                    ? 'bg-emerald-100 border-emerald-500 text-emerald-700 dark:bg-emerald-900/30'
                                                                    : 'bg-white border-gray-300 text-gray-600 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-300'}`}
                                                        >
                                                            {sub.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium dark:text-gray-400 mb-1">Email</label>
                                            <input className={inputClass} value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium dark:text-gray-400 mb-1">Phone</label>
                                            <input className={inputClass} value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-medium dark:text-gray-400 mb-1">Billing Address</label>
                                            <textarea className={inputClass} rows={2} value={editForm.billing_address || ''} onChange={e => setEditForm({ ...editForm, billing_address: e.target.value })} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 mt-4 border-t pt-4 dark:border-slate-700">
                                        <div>
                                            <label className="block text-xs font-medium dark:text-gray-400 mb-1">Country</label>
                                            <select className={inputClass} value={editForm.country_id || ''} onChange={e => setEditForm({ ...editForm, country_id: Number(e.target.value) })}>
                                                <option value="">Select</option>
                                                {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium dark:text-gray-400 mb-1">State</label>
                                            <select className={inputClass} value={editForm.state_id || ''} onChange={e => setEditForm({ ...editForm, state_id: Number(e.target.value) })}>
                                                <option value="">Select</option>
                                                {states.filter(s => !editForm.country_id || s.country_id == editForm.country_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium dark:text-gray-400 mb-1">City</label>
                                            <select className={inputClass} value={editForm.city_id || ''} onChange={e => setEditForm({ ...editForm, city_id: Number(e.target.value) })}>
                                                <option value="">Select</option>
                                                {cities.filter(c => !editForm.state_id || c.state_id == editForm.state_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium dark:text-gray-400 mb-1">Pincode</label>
                                            <input className={inputClass} value={editForm.pincode || ''} onChange={e => setEditForm({ ...editForm, pincode: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium dark:text-gray-400 mb-1">Currency</label>
                                            <select className={inputClass} value={editForm.currency || 'INR'} onChange={e => setEditForm({ ...editForm, currency: e.target.value })}>
                                                <option value="INR">INR</option>
                                                <option value="USD">USD</option>
                                                <option value="EUR">EUR</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-4">
                                        <button type="submit" className={btnPrimaryClass}>Save Profile</button>
                                    </div>
                                </form>
                            )}

                            {/* TAB: CONTACTS */}
                            {activeTab === 'contacts' && (
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-semibold dark:text-white">Contacts</h3>
                                        <button onClick={() => { setContactForm({ name: '', email: '', phone: '', position: '', is_primary: false }); setShowContactForm(true); }} className={`${btnSecondaryClass} text-sm py-1`}>
                                            + Add Contact
                                        </button>
                                    </div>

                                    {/* Contact List */}
                                    <div className="space-y-3 mb-6">
                                        {contacts.map(contact => (
                                            <div key={contact.id} className="p-3 border rounded-lg dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
                                                <div>
                                                    <p className="font-medium dark:text-white flex items-center">
                                                        {contact.name}
                                                        {contact.is_primary && <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 rounded-full">Primary</span>}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{contact.position} • {contact.email} • {contact.phone}</p>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <button onClick={() => { setContactForm(contact); setShowContactForm(true); }} className="text-blue-500 hover:text-blue-700"><PencilSquareIcon className="w-4 h-4" /></button>
                                                    <button onClick={() => handleDeleteContact(contact.id!)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        ))}
                                        {contacts.length === 0 && <p className="text-sm text-gray-400 italic">No contacts added.</p>}
                                    </div>

                                    {/* Edit/Add Contact Form */}
                                    {showContactForm && (
                                        <form onSubmit={handleContactSave} className="p-4 bg-gray-50 dark:bg-slate-900 rounded-lg border dark:border-slate-700">
                                            <h4 className="font-medium mb-3 dark:text-gray-200">{contactForm.id ? 'Edit Contact' : 'New Contact'}</h4>
                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                <input placeholder="Name" className={inputClass} required value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} />
                                                <input placeholder="Position" className={inputClass} value={contactForm.position} onChange={e => setContactForm({ ...contactForm, position: e.target.value })} />
                                                <input placeholder="Email" className={inputClass} required value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} />
                                                <input placeholder="Phone" className={inputClass} value={contactForm.phone} onChange={e => setContactForm({ ...contactForm, phone: e.target.value })} />
                                            </div>
                                            <div className="flex items-center mb-3">
                                                <input type="checkbox" id="is_primary" checked={contactForm.is_primary} onChange={e => setContactForm({ ...contactForm, is_primary: e.target.checked })} className="mr-2" />
                                                <label htmlFor="is_primary" className="text-sm dark:text-gray-300">Set as Primary Contact</label>
                                            </div>
                                            <div className="flex space-x-2">
                                                <button type="submit" className={`${btnPrimaryClass} text-sm py-1`}>Save</button>
                                                <button type="button" onClick={() => setShowContactForm(false)} className={`${btnSecondaryClass} text-sm py-1`}>Cancel</button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            )}

                            {/* TAB: FINANCE */}
                            {activeTab === 'finance' && (
                                <form onSubmit={handleUpdateProfile} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium dark:text-gray-400 mb-1">Commission %</label>
                                            <input type="number" step="0.1" className={inputClass} value={editForm.commission_percentage} onChange={e => setEditForm({ ...editForm, commission_percentage: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium dark:text-gray-400 mb-1">Tax ID / PAN / VAT</label>
                                            <input className={inputClass} value={editForm.tax_id || ''} onChange={e => setEditForm({ ...editForm, tax_id: e.target.value })} />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-medium dark:text-gray-400 mb-1">Bank Details (JSON)</label>
                                            <textarea className={`${inputClass} font-mono text-xs`} rows={4}
                                                value={JSON.stringify(editForm.bank_details || {}, null, 2)}
                                                onChange={e => {
                                                    try {
                                                        const parsed = JSON.parse(e.target.value);
                                                        setEditForm({ ...editForm, bank_details: parsed });
                                                    } catch (err) { }
                                                }}
                                            />
                                            <p className="text-[10px] text-gray-400 mt-1">Format: {"{ \"bank_name\": \"...\", \"account_no\": \"...\", \"swift\": \"...\" }"}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-4">
                                        <button type="submit" className={btnPrimaryClass}>Save Finance Info</button>
                                    </div>
                                </form>
                            )}

                            {/* TAB: SETTINGS */}
                            {activeTab === 'settings' && (
                                <div className="space-y-6">
                                    <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg">
                                        <label className="block text-sm font-medium dark:text-gray-300 mb-2">Partner Status</label>
                                        <div className="flex space-x-2">
                                            {['active', 'suspended', 'pending'].map(status => (
                                                <button key={status}
                                                    onClick={() => updateStatus(selectedAgent.id, status)}
                                                    className={`px-3 py-1 rounded text-sm capitalize border ${selectedAgent.status === status ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-gray-300'}`}
                                                >
                                                    {status}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {selectedAgent.user && (
                                        <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg">
                                            <h4 className="font-medium text-sm dark:text-white mb-2">Linked User Account</h4>
                                            <p className="text-xs text-gray-500 mb-2">Email: {selectedAgent.user.email}</p>
                                            <button onClick={() => toast.success("Password reset email sent (simulation)")} className="text-xs bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 px-3 py-1 rounded">
                                                Reset Password
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
