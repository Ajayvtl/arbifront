"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PlusIcon, GlobeAltIcon, BanknotesIcon, TrashIcon } from '@heroicons/react/24/outline';

const inputClass = "w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 dark:bg-slate-900 dark:text-white bg-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all";

export default function LocalizationPage() {
    const [countries, setCountries] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);
    const [taxes, setTaxes] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'countries' | 'states' | 'cities' | 'taxes'>('countries');
    const [searchTerm, setSearchTerm] = useState('');

    // Forms
    const [showCountryModal, setShowCountryModal] = useState(false);
    const [countryForm, setCountryForm] = useState({ name: '', iso_code: '', currency_code: '', currency_symbol: '', phone_code: '', timezone: '' });

    const [showStateModal, setShowStateModal] = useState(false);
    const [stateForm, setStateForm] = useState({ name: '', country_id: '', timezone: '' });

    const commonTimezones = [
        "UTC", "GMT", "America/New_York", "America/Chicago", "America/Los_Angeles",
        "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Dubai", "Asia/Kolkata",
        "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney", "Pacific/Auckland"
    ];

    const [showCityModal, setShowCityModal] = useState(false);
    const [cityForm, setCityForm] = useState({ name: '', country_id: '', state_id: '' });

    const [showTaxModal, setShowTaxModal] = useState(false);
    const [taxForm, setTaxForm] = useState({ name: '', percentage: '', country_id: '' });
    const [editingId, setEditingId] = useState<number | null>(null);

    const [selectedCountryForStates, setSelectedCountryForStates] = useState('');
    const [selectedStateForCities, setSelectedStateForCities] = useState('');
    const [selectedCountryForCities, setSelectedCountryForCities] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Reset page on tab/filter change
    useEffect(() => { setCurrentPage(1); }, [activeTab, searchTerm, selectedCountryForStates, selectedCountryForCities, selectedStateForCities]);

    useEffect(() => {
        fetchData();
        fetchCountries();
    }, []);

    useEffect(() => {
        if (stateForm.country_id) fetchStates(stateForm.country_id);
    }, [stateForm.country_id]);

    useEffect(() => {
        if (cityForm.country_id) fetchStatesForCity(cityForm.country_id);
    }, [cityForm.country_id]);

    const fetchData = async () => {
        try {
            const [tRes] = await Promise.all([
                api.get('/master/taxes')
            ]);
            setTaxes(tRes.data.data);
        } catch (error) {
            toast.error("Failed to load taxes");
        } finally {
            setLoading(false);
        }
    };

    const fetchCountries = async () => {
        try { const res = await api.get('/master/countries'); setCountries(res.data.data); } catch (e) { }
    };

    // Lazy Fetch States/Cities based on Tab or Need
    const fetchAllStates = async () => {
        // Warning: This could be large. Ideally paginate or search. 
        // For UI simplicity we fetch all IF count is low, or we force search.
        // Assuming /master/states?all=true or similar. Logic update needed on backend if huge.
        // For now, I'll fetch per country if selected, or just search.
        // Let's implement a 'smart' view: Select Country to view States.
    };

    // Better UX: "Global State/City Search" or "Drill Down". 
    // User requested "Live Search".
    // I will implement client-side filtering for Country, but for State/City I'll require Country Selection 
    // OR create a special search API. 
    // Given the constraints, I will add a "Select Country" Dropdown in States Tab to list states.



    useEffect(() => {
        if (activeTab === 'states') fetchStates(selectedCountryForStates);
    }, [activeTab, selectedCountryForStates]);

    useEffect(() => {
        if (activeTab === 'cities') fetchCities(selectedStateForCities, selectedCountryForCities);
    }, [activeTab, selectedStateForCities, selectedCountryForCities]);

    const fetchStates = async (countryId: any) => {
        const query = countryId ? `?country_id=${countryId}` : '';
        try { const res = await api.get(`/master/states${query}`); setStates(res.data.data); } catch (e) { }
    };

    // Separate state list for City Form to clearly distinguish
    const [formStates, setFormStates] = useState([]);
    const fetchStatesForCity = async (countryId: any) => {
        const query = countryId ? `?country_id=${countryId}` : '';
        try { const res = await api.get(`/master/states${query}`); setFormStates(res.data.data); } catch (e) { }
    };

    const fetchCities = async (stateId: any, countryId: any) => {
        let query = '?';
        if (countryId) query += `country_id=${countryId}&`;
        if (stateId) query += `state_id=${stateId}`;
        try { const res = await api.get(`/master/cities${query}`); setCities(res.data.data); } catch (e) { }
    };

    const resetForms = () => {
        setEditingId(null);
        setCountryForm({ name: '', iso_code: '', currency_code: '', currency_symbol: '', phone_code: '', timezone: '' });
        setStateForm({ name: '', country_id: '', timezone: '' });
        setCityForm({ name: '', country_id: '', state_id: '' });
        setTaxForm({ name: '', percentage: '', country_id: '' });
    };

    const handleEdit = (type: string, item: any) => {
        setEditingId(item.id);
        if (type === 'country') {
            setCountryForm(item);
            setShowCountryModal(true);
        } else if (type === 'state') {
            setStateForm({ name: item.name, country_id: item.country_id, timezone: item.timezone || '' });
            setShowStateModal(true);
        } else if (type === 'city') {
            setCityForm({ name: item.name, country_id: item.country_id, state_id: item.state_id });
            setShowCityModal(true);
            // Pre-fetch related states so dropdown works
            fetchStatesForCity(item.country_id);
        } else if (type === 'tax') {
            setTaxForm(item);
            setShowTaxModal(true);
        }
    };

    const handleDelete = async (type: string, id: number) => {
        if (!confirm('Are you sure?')) return;
        try {
            await api.delete(`/master/${type === 'tax' ? 'taxes' : type === 'country' ? 'countries' : type + 's'}/${id}`);
            toast.success("Deleted");
            // Refresh
            if (type === 'country') fetchCountries();
            if (type === 'state') fetchStates(selectedCountryForStates);
            if (type === 'city') fetchCities(selectedStateForCities, selectedCountryForCities);
            if (type === 'tax') fetchData();
        } catch (e) { toast.error("Failed to delete"); }
    };

    const handleCreateCountry = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) await api.put(`/master/countries/${editingId}`, countryForm);
            else await api.post('/master/countries', countryForm);

            toast.success(editingId ? "Updated" : "Created");
            setShowCountryModal(false);
            resetForms();
            fetchCountries();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed");
        }
    };

    const handleCreateState = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) await api.put(`/master/states/${editingId}`, stateForm);
            else await api.post('/master/states', stateForm);

            toast.success(editingId ? "Updated" : "Created");
            setShowStateModal(false);
            resetForms();
            fetchStates(selectedCountryForStates);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed");
        }
    };

    const handleCreateCity = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) await api.put(`/master/cities/${editingId}`, cityForm);
            else await api.post('/master/cities', cityForm);

            toast.success(editingId ? "Updated" : "Created");
            setShowCityModal(false);
            resetForms();
            fetchCities(selectedStateForCities, selectedCountryForCities);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed");
        }
    };

    const handleCreateTax = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = { ...taxForm, country_id: taxForm.country_id || null };
            if (editingId) await api.put(`/master/taxes/${editingId}`, payload);
            else await api.post('/master/taxes', payload);

            toast.success(editingId ? "Updated" : "Created");
            setShowTaxModal(false);
            resetForms();
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed");
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    // Filter Logic
    const filteredCountries = countries.filter((c: any) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // States and Cities are already tailoredByKey, but we can filter results locally too
    const filteredStates = states.filter((s: any) => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredCities = cities.filter((c: any) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // Pagination Logic


    const paginate = (items: any[]) => {
        const start = (currentPage - 1) * itemsPerPage;
        return items.slice(start, start + itemsPerPage);
    };

    const paginatedStates = paginate(filteredStates);
    const paginatedCities = paginate(filteredCities);

    const renderPagination = (totalItems: number) => {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (totalPages <= 1) return null;
        return (
            <div className="flex justify-between items-center px-6 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
                </span>
                <div className="flex gap-2">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                        className="px-3 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="px-3 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Global Localization</h1>

            {/* Tabs */}
            <div className="flex flex-wrap gap-4 border-b border-gray-200 dark:border-slate-700 mb-6">
                {['countries', 'states', 'cities', 'taxes'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => { setActiveTab(tab as any); setSearchTerm(''); }}
                        className={`pb-2 px-4 font-medium transition-colors capitalize ${activeTab === tab ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Live Search (Middle Tab) */}
            <div className="mb-6 max-w-md mx-auto relative">
                <input
                    type="text"
                    placeholder={`Search ${activeTab}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={inputClass + " pl-10"}
                />
                <div className="absolute left-3 top-3 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
            </div>

            {/* Countries Content */}
            {activeTab === 'countries' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex justify-end mb-4">
                        <button onClick={() => setShowCountryModal(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center shadow-lg shadow-emerald-500/20">
                            <PlusIcon className="w-5 h-5 mr-2" /> Add Country
                        </button>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden border border-gray-100 dark:border-slate-700">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-slate-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Code</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Timezone</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Currency</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Phone</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredCountries.map((c: any) => (
                                    <tr key={c.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{c.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{c.iso_code}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{c.timezone || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{c.currency_code} ({c.currency_symbol})</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{c.phone_code}</td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap text-sm font-medium">
                                            <button onClick={() => handleEdit('country', c)} className="text-emerald-600 hover:text-emerald-900 mr-4">Edit</button>
                                            <button onClick={() => handleDelete('country', c.id)} className="text-red-600 hover:text-red-900">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* States Content */}
            {activeTab === 'states' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <select
                            className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 min-w-[200px]"
                            value={selectedCountryForStates}
                            onChange={(e) => setSelectedCountryForStates(e.target.value)}
                        >
                            <option value="">All Countries</option>
                            {countries.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>

                        <button onClick={() => setShowStateModal(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center shadow-lg shadow-emerald-500/20">
                            <PlusIcon className="w-5 h-5 mr-2" /> Add State
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden border border-gray-100 dark:border-slate-700">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-slate-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">State Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Country</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {paginatedStates.map((s: any) => (
                                    <tr key={s.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                            {s.name}
                                            {s.timezone && <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-xs text-gray-500">{s.timezone}</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {countries.find((c: any) => c.id === s.country_id)?.name || s.country_id}
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap text-sm font-medium">
                                            <button onClick={() => handleEdit('state', s)} className="text-emerald-600 hover:text-emerald-900 mr-4">Edit</button>
                                            <button onClick={() => handleDelete('state', s.id)} className="text-red-600 hover:text-red-900">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredStates.length === 0 && (
                                    <tr><td colSpan={3} className="px-6 py-4 text-center text-gray-500">No states found.</td></tr>
                                )}
                            </tbody>
                        </table>
                        {renderPagination(filteredStates.length)}
                    </div>
                </div>
            )}

            {/* Cities Content */}
            {activeTab === 'cities' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex flex-col md:flex-row justify-start items-center mb-6 gap-4">
                        <select
                            className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 min-w-[200px]"
                            value={selectedCountryForCities}
                            onChange={(e) => {
                                setSelectedCountryForCities(e.target.value);
                                setSelectedStateForCities(''); // Reset State
                            }}
                        >
                            <option value="">All Countries</option>
                            {countries.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>

                        <select
                            className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 min-w-[200px]"
                            value={selectedStateForCities}
                            onChange={(e) => setSelectedStateForCities(e.target.value)}
                        >
                            <option value="">All States</option>
                            {formStates.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>

                        <button onClick={() => { resetForms(); setShowCityModal(true); }} className="ml-auto bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center shadow-lg shadow-emerald-500/20">
                            <PlusIcon className="w-5 h-5 mr-2" /> Add City
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden border border-gray-100 dark:border-slate-700">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-slate-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">City Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">State</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {paginatedCities.map((c: any) => (
                                    <tr key={c.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{c.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {/* We need state map for name, or join in backend. Backend only returns state_id currently. */}
                                            {/* UI Hack: We might not have all states loaded if filtering logic is separate. */}
                                            {/* Best to fetch names from backend. */}
                                            {c.state_id}
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap text-sm font-medium">
                                            <button onClick={() => handleEdit('city', c)} className="text-emerald-600 hover:text-emerald-900 mr-4">Edit</button>
                                            <button onClick={() => handleDelete('city', c.id)} className="text-red-600 hover:text-red-900">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredCities.length === 0 && (
                                    <tr><td colSpan={3} className="px-6 py-4 text-center text-gray-500">No cities found.</td></tr>
                                )}
                            </tbody>
                        </table>
                        {renderPagination(filteredCities.length)}
                    </div>
                </div>
            )}

            {/* Taxes Content */}
            {activeTab === 'taxes' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex justify-end mb-4">
                        <button onClick={() => setShowTaxModal(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center shadow-lg shadow-emerald-500/20">
                            <PlusIcon className="w-5 h-5 mr-2" /> Add Tax Rule
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {taxes.map((tax: any) => (
                            <div key={tax.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{tax.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{tax.country_name || 'Global Tax'}</p>
                                    </div>
                                    <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-3 py-1 rounded-full text-sm font-bold">
                                        {tax.percentage}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Create State Modal */}
            {showStateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full">
                        <h2 className="text-xl font-bold mb-4 dark:text-white">Add State</h2>
                        <form onSubmit={handleCreateState} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300 mb-1">Country</label>
                                <select className={inputClass} required value={stateForm.country_id || ''} onChange={e => setStateForm({ ...stateForm, country_id: e.target.value })}>
                                    <option value="">Select Country</option>
                                    {countries.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <input placeholder="State Name" required className={inputClass} value={stateForm.name} onChange={e => setStateForm({ ...stateForm, name: e.target.value })} />

                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300 mb-1">Timezone (Optional)</label>
                                <select className={inputClass} value={stateForm.timezone || ''} onChange={e => setStateForm({ ...stateForm, timezone: e.target.value })}>
                                    <option value="">Select Timezone</option>
                                    {commonTimezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                                </select>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setShowStateModal(false)} className="px-4 py-2 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700">Cancel</button>
                                <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create City Modal */}
            {showCityModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full">
                        <h2 className="text-xl font-bold mb-4 dark:text-white">Add City</h2>
                        <form onSubmit={handleCreateCity} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300 mb-1">Country</label>
                                <select className={inputClass} required value={cityForm.country_id || ''} onChange={e => setCityForm({ ...cityForm, country_id: e.target.value, state_id: '' })}>
                                    <option value="">Select Country</option>
                                    {countries.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300 mb-1">State</label>
                                <select className={inputClass} required value={cityForm.state_id || ''} onChange={e => setCityForm({ ...cityForm, state_id: e.target.value })} disabled={!cityForm.country_id}>
                                    <option value="">Select State</option>
                                    {formStates.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <input placeholder="City Name" required className={inputClass} value={cityForm.name} onChange={e => setCityForm({ ...cityForm, name: e.target.value })} />

                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setShowCityModal(false)} className="px-4 py-2 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700">Cancel</button>
                                <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Country Modal */}
            {showCountryModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full">
                        <h2 className="text-xl font-bold mb-4 dark:text-white">Add Country</h2>
                        <form onSubmit={handleCreateCountry} className="space-y-4">
                            <input placeholder="Country Name" required className={inputClass} value={countryForm.name} onChange={e => setCountryForm({ ...countryForm, name: e.target.value })} />
                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300 mb-1">Timezone (Default)</label>
                                <select className={inputClass} value={countryForm.timezone || ''} onChange={e => setCountryForm({ ...countryForm, timezone: e.target.value })}>
                                    <option value="">Select Timezone</option>
                                    {commonTimezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input placeholder="ISO Code (e.g. US)" required maxLength={2} className={inputClass} value={countryForm.iso_code} onChange={e => setCountryForm({ ...countryForm, iso_code: e.target.value.toUpperCase() })} />
                                <input placeholder="Phone Code (+1)" className={inputClass} value={countryForm.phone_code} onChange={e => setCountryForm({ ...countryForm, phone_code: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input placeholder="Currency (USD)" required maxLength={3} className={inputClass} value={countryForm.currency_code} onChange={e => setCountryForm({ ...countryForm, currency_code: e.target.value.toUpperCase() })} />
                                <input placeholder="Symbol ($)" required className={inputClass} value={countryForm.currency_symbol} onChange={e => setCountryForm({ ...countryForm, currency_symbol: e.target.value })} />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setShowCountryModal(false)} className="px-4 py-2 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700">Cancel</button>
                                <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Tax Modal */}
            {showTaxModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full">
                        <h2 className="text-xl font-bold mb-4 dark:text-white">Add Tax Rule</h2>
                        <form onSubmit={handleCreateTax} className="space-y-4">
                            <input placeholder="Tax Name (e.g. GST)" required className={inputClass} value={taxForm.name} onChange={e => setTaxForm({ ...taxForm, name: e.target.value })} />
                            <input type="number" step="0.01" placeholder="Percentage (%)" required className={inputClass} value={taxForm.percentage} onChange={e => setTaxForm({ ...taxForm, percentage: e.target.value })} />

                            <select className={inputClass} value={taxForm.country_id || ''} onChange={e => setTaxForm({ ...taxForm, country_id: e.target.value })}>
                                <option value="">Global Tax (All Countries)</option>
                                {countries.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>

                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setShowTaxModal(false)} className="px-4 py-2 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700">Cancel</button>
                                <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
