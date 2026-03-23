"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { PlusIcon, EyeIcon, KeyIcon, XMarkIcon, PencilIcon, CheckCircleIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Hotel {
    id: number;
    name: string;
    subdomain: string;
    is_active: boolean;
    user_count: number;
    created_at: string;
    admin_details: { email: string; password?: string };
    active_plan?: string;
    plan_expiry?: string;
    address?: string;
    country_id?: number | string;
    state_id?: number | string;
    city_id?: number | string;
    city_name?: string;
    state_name?: string;
    country_name?: string;
    plan_features?: Record<string, boolean>;
}

export default function HotelListPage() {
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
    const [packages, setPackages] = useState<any[]>([]);
    const [modalMode, setModalMode] = useState<'edit' | 'credentials' | 'features' | 'delete' | null>(null);
    const [availableModules, setAvailableModules] = useState<any[]>([]);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');

    // Location Data
    const [countries, setCountries] = useState([]);
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);

    // Location State for Edit Modal
    const [editCountry, setEditCountry] = useState<string>('');
    const [editState, setEditState] = useState<string>('');
    const [editCity, setEditCity] = useState<string>('');

    useEffect(() => {
        fetchHotels();
        fetchCountries();
        // Fetch Packages & Modules
        Promise.all([
            api.get('/saas/packages'),
            api.get('/saas/packages/modules')
        ]).then(([pkgRes, modRes]) => {
            setPackages(pkgRes.data.data);
            setAvailableModules(modRes.data.data);
        }).catch(() => { });
    }, []);

    const fetchCountries = async () => {
        try { const res = await api.get('/master/countries'); setCountries(res.data.data); } catch (e) { }
    };
    const fetchStates = async (countryId: any) => {
        try { const res = await api.get(`/master/states?country_id=${countryId}`); setStates(res.data.data); } catch (e) { }
    };
    const fetchCities = async (countryId: any, stateId: any) => {
        try { const res = await api.get(`/master/cities?country_id=${countryId}&state_id=${stateId}`); setCities(res.data.data); } catch (e) { }
    };

    const fetchHotels = async () => {
        try {
            const response = await api.get('/admin/hotels');
            setHotels(response.data.data);
        } catch (error) {
            toast.error('Failed to load hotels');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateHotel = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        // Ensure manual state is merged if name attributes match logic, but safer to merge explicitly if needed.
        // FormData will pick up the <select name="country_id"> value.

        try {
            await api.put(`/admin/hotels/${selectedHotel?.id}`, data);
            toast.success('Hotel Updated Successfully');
            setModalMode(null);
            setSelectedHotel(null);
            fetchHotels();
        } catch (error) {
            toast.error('Update Failed');
        }
    };

    const toggleStatus = async (hotel: Hotel) => {
        try {
            await api.patch(`/admin/hotels/${hotel.id}/status`, { is_active: !hotel.is_active });
            toast.success(`${hotel.name} is now ${!hotel.is_active ? 'Active' : 'Disabled'}`);
            fetchHotels();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleHardDelete = async () => {
        if (deleteConfirmation !== selectedHotel?.subdomain) {
            toast.error('Subdomain verification failed');
            return;
        }

        try {
            await api.delete(`/admin/hotels/${selectedHotel?.id}/hard`);
            toast.success('Hotel permanently deleted');
            closeModal();
            fetchHotels();
        } catch (error) {
            toast.error('Delete failed');
        }
    };

    const openEditModal = async (hotel: Hotel) => {
        setSelectedHotel(hotel);
        setEditCountry(hotel.country_id?.toString() || '');
        setEditState(hotel.state_id?.toString() || '');
        setEditCity(hotel.city_id?.toString() || '');

        if (hotel.country_id) await fetchStates(hotel.country_id);
        if (hotel.country_id && hotel.state_id) await fetchCities(hotel.country_id, hotel.state_id);

        setModalMode('edit');
    };

    const openCredentialsModal = (hotel: Hotel) => {
        setSelectedHotel(hotel);
        setModalMode('credentials');
    };

    const openFeaturesModal = (hotel: Hotel) => {
        setSelectedHotel(hotel);
        setModalMode('features');
    };

    const openDeleteModal = (hotel: Hotel) => {
        setSelectedHotel(hotel);
        setDeleteConfirmation('');
        setModalMode('delete');
    };

    const closeModal = () => {
        setSelectedHotel(null);
        setModalMode(null);
        setDeleteConfirmation('');
    };

    if (loading) return <div className="p-8 text-center text-white">Loading...</div>;

    return (
        <div className="p-8">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Branch</h1>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                        Manage all registered hotels and their subscription status.
                    </p>
                </div>
                <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                    <Link
                        href="/admin/hotels/create"
                        className="block rounded-md bg-emerald-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 flex items-center"
                    >
                        <PlusIcon className="w-5 h-5 mr-1" />
                        Add Hotel
                    </Link>
                </div>
            </div>

            <div className="mt-8 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-slate-800">
                                    <tr>
                                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">Name</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Location</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Subdomain</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Plan</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Expiry</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Created At</th>
                                        <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-slate-900">
                                    {hotels.map((hotel: any) => (
                                        <tr key={hotel.id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">{hotel.name}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                                {hotel.city_name || '-'}, {hotel.state_name || '-'}
                                                <div className="text-xs text-gray-400">{hotel.country_name}</div>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">{hotel.subdomain}.greencross.com</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                                <div className="flex items-center space-x-2">
                                                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold uppercase ${hotel.active_plan ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {hotel.active_plan || 'No Active Plan'}
                                                    </span>
                                                    {hotel.active_plan && (
                                                        <button onClick={() => openFeaturesModal(hotel)} className="text-gray-400 hover:text-indigo-600 transition-colors" title="View Features">
                                                            <EyeIcon className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                                {hotel.plan_expiry ? new Date(hotel.plan_expiry).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${hotel.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {hotel.is_active ? 'Active' : 'Disabled'}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                                {new Date(hotel.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                                                <button onClick={() => openEditModal(hotel)} className="text-blue-600 hover:text-blue-900 inline-flex items-center p-1.5 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Details">
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => openCredentialsModal(hotel)} className="text-emerald-600 hover:text-emerald-900 inline-flex items-center p-1.5 hover:bg-emerald-50 rounded-lg transition-colors" title="View Credentials">
                                                    <KeyIcon className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => toggleStatus(hotel)} className={`p-1.5 rounded-lg transition-colors inline-flex items-center ${hotel.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                                                    {hotel.is_active ? 'Disable' : 'Enable'}
                                                </button>
                                                <button onClick={() => openDeleteModal(hotel)} className="text-rose-600 hover:text-rose-900 inline-flex items-center p-1.5 hover:bg-rose-50 rounded-lg transition-colors" title="Hard Delete">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {
                selectedHotel && modalMode === 'edit' && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-8 max-w-lg w-full relative">
                            <button onClick={closeModal} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Edit Hotel</h3>
                            <form onSubmit={handleUpdateHotel} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300">Hotel Name</label>
                                    <input className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 dark:bg-slate-900 dark:text-white"
                                        defaultValue={selectedHotel.name} name="name" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300">Subdomain</label>
                                    <input className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 dark:bg-slate-900 dark:text-white"
                                        defaultValue={selectedHotel.subdomain} name="subdomain" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300">Current Plan</label>
                                    <select className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 dark:bg-slate-900 dark:text-white"
                                        name="package_id"
                                        defaultValue={packages.find(p => p.name === selectedHotel.active_plan)?.id || ''}
                                    >
                                        <option value="">No Plan</option>
                                        {packages.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} (${p.price_monthly}/mo)</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-amber-500 mt-1">Changing this will upgrade/downgrade the tenant effectively immediately.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300">Address</label>
                                    <input className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 dark:bg-slate-900 dark:text-white"
                                        defaultValue={selectedHotel.address} name="address" />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium dark:text-gray-300">Country</label>
                                        <select
                                            name="country_id"
                                            className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 dark:bg-slate-900 dark:text-white"
                                            value={editCountry}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setEditCountry(val);
                                                setEditState('');
                                                setEditCity('');
                                                if (val) fetchStates(val);
                                                else setStates([]);
                                            }}
                                        >
                                            <option value="">Global</option>
                                            {countries.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium dark:text-gray-300">State</label>
                                        <select
                                            name="state_id"
                                            className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 dark:bg-slate-900 dark:text-white"
                                            value={editState}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setEditState(val);
                                                setEditCity('');
                                                if (val) fetchCities(editCountry, val);
                                                else setCities([]);
                                            }}
                                            disabled={!editCountry}
                                        >
                                            <option value="">Select State</option>
                                            {states.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium dark:text-gray-300">City</label>
                                        <select
                                            name="city_id"
                                            className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 dark:bg-slate-900 dark:text-white"
                                            value={editCity}
                                            onChange={(e) => setEditCity(e.target.value)}
                                            disabled={!editState}
                                        >
                                            <option value="">Select City</option>
                                            {cities.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-semibold hover:bg-emerald-700">
                                    Save Changes
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Access Modal */}
            {
                selectedHotel && modalMode === 'credentials' && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full relative">
                            <button onClick={closeModal} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
                                <XMarkIcon className="w-6 h-6" />
                            </button>

                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Admin Credentials</h3>

                            <div className="space-y-4">
                                <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                                    <label className="block text-xs text-gray-500 uppercase">Admin Email</label>
                                    <p className="text-gray-900 dark:text-white font-medium select-all">{selectedHotel.admin_details?.email || 'N/A'}</p>
                                </div>

                                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-700">
                                    <label className="block text-xs text-amber-600 dark:text-amber-400 uppercase font-bold">Initial Password (Dev Only)</label>
                                    <p className="text-gray-900 dark:text-white font-mono text-lg mt-1 select-all">
                                        {selectedHotel.admin_details?.password || '********'}
                                    </p>
                                    <p className="text-xs text-amber-600 mt-2">
                                        * This password is only visible if it hasn't been changed securely.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button onClick={closeModal} className="bg-gray-200 dark:bg-slate-700 px-4 py-2 rounded-lg text-gray-800 dark:text-white hover:bg-gray-300">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Features Modal */}
            {
                selectedHotel && modalMode === 'features' && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-lg w-full relative max-h-[80vh] overflow-y-auto">
                            <button onClick={closeModal} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Active Features</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Based on {selectedHotel.active_plan} Plan</p>

                            <div className="space-y-3">
                                {(selectedHotel as any).plan_features ? (
                                    <div className="grid grid-cols-1 gap-3">
                                        {Object.keys((selectedHotel as any).plan_features || {})
                                            .filter(k => (selectedHotel as any).plan_features[k])
                                            .map(k => {
                                                const mod = availableModules.find(m => m.key === k);
                                                return (
                                                    <div key={k} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                                                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                                            <CheckCircleIcon className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-medium text-gray-900 dark:text-white">{mod?.label || k}</h4>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">{mod?.description || 'Active Module'}</p>
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        }
                                    </div>
                                ) : (
                                    <p className="text-gray-500 p-4 text-center bg-gray-50 dark:bg-slate-700 rounded-lg">No enabled features data found.</p>
                                )}
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button onClick={closeModal} className="bg-gray-200 dark:bg-slate-700 px-4 py-2 rounded-lg text-gray-800 dark:text-white hover:bg-gray-300">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Modal */}
            {
                selectedHotel && modalMode === 'delete' && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full relative">
                            <button onClick={closeModal} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                            <div className="text-center p-2">
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                                    <TrashIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Hard Delete Tenant?</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                    This action is <span className="font-bold text-red-500">IRREVERSIBLE</span>. It will permanently delete the hotel <b>{selectedHotel.name}</b>, all its rooms, bookings, finance records, and associated users.
                                </p>

                                <div className="text-left bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-100 dark:border-red-900/20 mb-4">
                                    <label className="block text-xs text-red-600 dark:text-red-400 uppercase font-bold mb-2">
                                        Type "{selectedHotel.subdomain}" to confirm
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full border border-red-300 dark:border-red-800 rounded-lg p-2 text-sm focus:ring-red-500 focus:border-red-500 dark:bg-slate-900 dark:text-white"
                                        placeholder="Confirm subdomain"
                                        value={deleteConfirmation}
                                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                                    />
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={closeModal}
                                        className="flex-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 py-2.5 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleHardDelete}
                                        disabled={deleteConfirmation !== selectedHotel.subdomain}
                                        className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Permanently Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
