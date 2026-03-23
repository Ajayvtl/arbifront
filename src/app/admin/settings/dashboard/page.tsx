"use client";
import { useState, useEffect } from 'react';
import api from '@/lib/api'; // user-defined api instance
import Link from 'next/link';
import { PlusIcon, PencilIcon, TrashIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export default function DashboardSettingsPage() {
    const [activeTab, setActiveTab] = useState('templates');
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (activeTab === 'templates') {
            loadTemplates();
        }
    }, [activeTab]);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/dashboard/templates');
            setTemplates(res.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Management</h1>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-slate-700 mb-6">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={`${activeTab === 'templates'
                            ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Templates
                    </button>
                    <button
                        onClick={() => setActiveTab('assignments')}
                        className={`${activeTab === 'assignments'
                            ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Role Assignments
                    </button>
                </nav>
            </div>

            {/* Content */}
            {activeTab === 'templates' && (
                <div>
                    <div className="flex justify-end mb-4">
                        <Link
                            href="/admin/settings/dashboard/templates/create"
                            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Create New Template
                        </Link>
                    </div>

                    <div className="bg-white dark:bg-slate-800 shadow rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                            <thead className="bg-gray-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                                {loading ? (
                                    <tr><td colSpan={4} className="px-6 py-4 text-center">Loading...</td></tr>
                                ) : templates.map((t) => (
                                    <tr key={t.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</div>
                                            <div className="text-xs text-gray-500">{t.description}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${t.type === 'system' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-800'
                                                }`}>
                                                {t.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {format(new Date(t.created_at), 'MMM dd, yyyy')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Link href={`/admin/settings/dashboard/templates/${t.id}`} className="text-emerald-600 hover:text-emerald-900 dark:hover:text-emerald-400 mr-4">
                                                Edit Layout
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'assignments' && (
                <AssignmentsTab /> // We'll implement this component inline or import it
            )}
        </div>
    );
}

// Inline Assignments Component
function AssignmentsTab() {
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [form, setForm] = useState({
        id: null, // For edit
        role_id: '',
        template_id: '',
        priority: 0,
        country_id: '',
        state_id: '',
        city_id: ''
    });

    // Dropdown Data
    const [roles, setRoles] = useState<any[]>([]);
    const [templatesList, setTemplatesList] = useState<any[]>([]);
    const [countries, setCountries] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);

    useEffect(() => {
        loadAssignments();
        loadDropdowns();
    }, []);

    // Filter states/cities when country/state changes
    const filteredStates = form.country_id ? states.filter(s => s.country_id == form.country_id) : [];
    const filteredCities = form.state_id ? cities.filter(c => c.state_id == form.state_id) : [];

    const loadAssignments = async () => {
        try {
            const res = await api.get('/admin/dashboard/assignments');
            setAssignments(res.data.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const loadDropdowns = async () => {
        // Parallel fetch
        try {
            const [r, t, c, s, ci] = await Promise.all([
                api.get('/settings/roles?all=true'),
                api.get('/admin/dashboard/templates'),
                api.get('/locations/countries'),
                api.get('/locations/states'),
                api.get('/locations/cities')
            ]);
            setRoles(r.data.data || []);
            setTemplatesList(t.data.data || []);
            setCountries(c.data.data || []);
            setStates(s.data.data || []);
            setCities(ci.data.data || []);
        } catch (e) { }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure?')) return;
        try {
            await api.delete(`/admin/dashboard/assignments/${id}`);
            loadAssignments();
        } catch (e) { console.error(e); }
    };

    const handleEdit = (assignment: any) => {
        setForm({
            id: assignment.id,
            role_id: assignment.role_id,
            template_id: assignment.template_id,
            priority: assignment.priority,
            country_id: assignment.country_id || '',
            state_id: assignment.state_id || '',
            city_id: assignment.city_id || ''
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            // If ID exists, we delete old and create new (simplest for now since no PUT endpoint)
            // Or ideally implementing PUT. Given standard, we likely need to just Create as new or Replace.
            // Let's stick to Create for now as previous impl didn't have PUT. 
            // Better: Delete old one implicitly? Or user manually deletes.
            // Wait, standard convention is separate Create/Update.
            // Controller only has saveAssignment (INSERT).
            // So if editing, delete first.
            if (form.id) {
                await api.delete(`/admin/dashboard/assignments/${form.id}`);
            }

            await api.post('/admin/dashboard/assignments', form);
            setShowModal(false);
            setForm({ id: null, role_id: '', template_id: '', priority: 0, country_id: '', state_id: '', city_id: '' }); // Reset
            loadAssignments();
        } catch (e) { console.error(e); }
    }

    const filteredAssignments = assignments.filter(a =>
        a.role_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.template_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <input
                    type="text"
                    placeholder="Search assignments..."
                    className="border p-2 rounded-lg dark:bg-slate-800 dark:border-slate-700 w-64"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <button
                    onClick={() => {
                        setForm({ id: null, role_id: '', template_id: '', priority: 0, country_id: '', state_id: '', city_id: '' });
                        setShowModal(true);
                    }}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                    <PlusIcon className="w-4 h-4" />
                    New Assignment
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 shadow rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-900/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location Context</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assigned Template</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                        {filteredAssignments.map((a) => (
                            <tr key={a.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">{a.role_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {a.city_name ? `${a.city_name}, ` : ''}
                                    {a.state_name ? `${a.state_name}, ` : ''}
                                    {a.country_name || 'Global'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 dark:text-emerald-400">{a.template_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{a.priority}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleEdit(a)} className="text-emerald-600 hover:text-emerald-900 mr-3">
                                        <PencilIcon className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleDelete(a.id)} className="text-red-600 hover:text-red-900">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{form.id ? 'Edit Assignment' : 'New Assignment'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Role</label>
                                <select className="w-full border p-2 rounded dark:bg-slate-800 dark:border-slate-700"
                                    value={form.role_id} onChange={e => setForm({ ...form, role_id: e.target.value })}>
                                    <option value="">Select Role</option>
                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name} {r.hotel_name ? `(${r.hotel_name})` : ''}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Template</label>
                                <select className="w-full border p-2 rounded dark:bg-slate-800 dark:border-slate-700"
                                    value={form.template_id} onChange={e => setForm({ ...form, template_id: e.target.value })}>
                                    <option value="">Select Template</option>
                                    {templatesList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>

                            {/* Location Dropdowns */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium mb-1 dark:text-gray-300">Country</label>
                                    <select className="w-full border p-2 rounded dark:bg-slate-800 dark:border-slate-700 text-sm"
                                        value={form.country_id} onChange={e => setForm({ ...form, country_id: e.target.value, state_id: '', city_id: '' })}>
                                        <option value="">Global</option>
                                        {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1 dark:text-gray-300">State</label>
                                    <select className="w-full border p-2 rounded dark:bg-slate-800 dark:border-slate-700 text-sm"
                                        value={form.state_id} onChange={e => setForm({ ...form, state_id: e.target.value, city_id: '' })} disabled={!form.country_id}>
                                        <option value="">All States</option>
                                        {filteredStates.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1 dark:text-gray-300">City</label>
                                <select className="w-full border p-2 rounded dark:bg-slate-800 dark:border-slate-700 text-sm"
                                    value={form.city_id} onChange={e => setForm({ ...form, city_id: e.target.value })} disabled={!form.state_id}>
                                    <option value="">All Cities</option>
                                    {filteredCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Priority (Higher wins)</label>
                                <input type="number" className="w-full border p-2 rounded dark:bg-slate-800 dark:border-slate-700"
                                    value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) })} />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700">Cancel</button>
                            <button onClick={handleSave} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">Save Assignment</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

