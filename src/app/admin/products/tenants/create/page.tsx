"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { BuildingOffice2Icon, UserIcon, AtSymbolIcon, CurrencyDollarIcon, CreditCardIcon } from '@heroicons/react/24/outline';

export default function CreateTenantPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [packages, setPackages] = useState([]);

    // Location Data
    const [countries, setCountries] = useState([]);
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
        name: '', subdomain: '', address: '',
        admin_name: '', admin_email: '',
        package_id: '', billing_cycle: 'monthly', payment_mode: 'cash', referral_code: '',
        country_id: '', state_id: '', city_id: ''
    });

    const [summary, setSummary] = useState({ basic: 0, tax: 0, total: 0, symbol: '$' });

    const inputClass = "w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 dark:bg-slate-900 dark:text-white bg-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all";

    useEffect(() => {
        fetchPackages();
        fetchCountries();
    }, []);

    useEffect(() => {
        if (formData.country_id) fetchStates(formData.country_id);
        else setStates([]);
    }, [formData.country_id]);

    useEffect(() => {
        if (formData.state_id) fetchCities(formData.country_id, formData.state_id);
        else setCities([]);
    }, [formData.state_id]);

    useEffect(() => {
        calculateSummary();
    }, [formData.package_id, formData.billing_cycle, packages]);

    const fetchCountries = async () => {
        try { const res = await api.get('/master/countries'); setCountries(res.data.data); } catch (e) { }
    };
    const fetchStates = async (countryId: any) => {
        try { const res = await api.get(`/master/states?country_id=${countryId}`); setStates(res.data.data); } catch (e) { }
    };
    const fetchCities = async (countryId: any, stateId: any) => {
        try { const res = await api.get(`/master/cities?country_id=${countryId}&state_id=${stateId}`); setCities(res.data.data); } catch (e) { }
    };

    const fetchPackages = async () => {
        try {
            const res = await api.get('/saas/packages');
            setPackages(res.data.data);
            if (res.data.data.length > 0) {
                setFormData(prev => ({ ...prev, package_id: res.data.data[0].id }));
            }
        } catch (error) {
            toast.error('Failed to load packages');
        }
    };

    // Helper to get formatted price based on selected country
    const getPackagePrice = (pkg: any) => {
        const selectedCountry = countries.find((c: any) => c.id == formData.country_id);
        const code = (selectedCountry as any)?.iso_code || 'US'; // Default to US if no country selected

        // Find specific price for this country
        const localPrice = pkg.prices?.find((p: any) => p.country_code === code);

        if (localPrice) {
            return {
                monthly: Number(localPrice.price_monthly),
                yearly: Number(localPrice.price_yearly),
                symbol: localPrice.currency_code === 'INR' ? '₹' : localPrice.currency_code === 'EUR' ? '€' : localPrice.currency_code === 'GBP' ? '£' : '$',
                currency: localPrice.currency_code
            };
        }

        // Fallback to default/base price
        // Assuming base price is USD
        return {
            monthly: pkg.local_monthly ? Number(pkg.local_monthly) : Number(pkg.price_monthly),
            yearly: pkg.local_yearly ? Number(pkg.local_yearly) : Number(pkg.price_yearly),
            symbol: '$',
            currency: 'USD'
        };
    };

    const calculateSummary = () => {
        const pkg: any = packages.find((p: any) => p.id == formData.package_id);
        if (!pkg) return;

        const isYearly = formData.billing_cycle === 'yearly';
        const priceInfo = getPackagePrice(pkg);

        const price = isYearly ? priceInfo.yearly : priceInfo.monthly;

        const taxPercent = Number(pkg.tax_percentage) || 0;

        let tax = (price * taxPercent) / 100;
        let total = price + tax;

        setSummary({
            basic: price,
            tax: tax,
            total: total,
            symbol: priceInfo.symbol
        });
    };

    const handleChange = (e: any) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData,
                package_id: Number(formData.package_id)
            };
            await api.post('/admin/hotels', payload);
            toast.success('Tenant & Subscription Created Successfully');
            router.push('/admin/products/tenants');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create tenant');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Onboard New Tenant</h1>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* Left Column: Form Fields */}
                <div className="md:col-span-2 space-y-6 bg-white dark:bg-slate-800 p-8 rounded-xl shadow border border-slate-200 dark:border-slate-700">

                    {/* Hotel Details */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-4 flex items-center">
                            <BuildingOffice2Icon className="w-5 h-5 mr-2 text-emerald-500" />
                            Property Details
                        </h3>
                        <div className="grid grid-cols-1 gap-6">
                            <input type="text" name="name" required value={formData.name} onChange={handleChange}
                                className={inputClass} placeholder="Tenant Name" />

                            <div className="flex rounded-md shadow-sm">
                                <input type="text" name="subdomain" required value={formData.subdomain} onChange={handleChange}
                                    className={`${inputClass} rounded-r-none`} placeholder="subdomain" />
                                <span className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300">
                                    .greencross.com
                                </span>
                            </div>

                            <input type="text" name="address" value={formData.address} onChange={handleChange}
                                className={inputClass} placeholder="Address" />

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300 mb-1">Country</label>
                                    <select name="country_id" value={formData.country_id} onChange={(e) => {
                                        setFormData({ ...formData, country_id: e.target.value, state_id: '', city_id: '' });
                                    }} className={inputClass}>
                                        <option value="">Global</option>
                                        {countries.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300 mb-1">State</label>
                                    <select name="state_id" value={formData.state_id} onChange={(e) => {
                                        setFormData({ ...formData, state_id: e.target.value, city_id: '' });
                                    }} className={inputClass} disabled={!formData.country_id}>
                                        <option value="">Select State</option>
                                        {states.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300 mb-1">City</label>
                                    <select name="city_id" value={formData.city_id} onChange={(e) => {
                                        setFormData({ ...formData, city_id: e.target.value });
                                    }} className={inputClass} disabled={!formData.state_id}>
                                        <option value="">Select City</option>
                                        {cities.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-200 dark:border-slate-700" />

                    {/* Admin User */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-4 flex items-center">
                            <UserIcon className="w-5 h-5 mr-2 text-blue-500" />
                            Admin Account
                        </h3>
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <input type="text" name="admin_name" required value={formData.admin_name} onChange={handleChange}
                                className={inputClass} placeholder="Admin Name" />
                            <input type="email" name="admin_email" required value={formData.admin_email} onChange={handleChange}
                                className={inputClass} placeholder="Admin Email" />
                        </div>
                    </div>
                </div>

                {/* Right Column: Billing & Summary */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-4 flex items-center">
                            <CurrencyDollarIcon className="w-5 h-5 mr-2 text-amber-500" />
                            Plan Selection
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300 mb-1">Select Package</label>
                                <select name="package_id" value={formData.package_id} onChange={handleChange} className={inputClass}>
                                    {packages.map((pkg: any) => {
                                        const priceInfo = getPackagePrice(pkg);
                                        return (
                                            <option key={pkg.id} value={pkg.id}>
                                                {pkg.name} - {priceInfo.symbol}{priceInfo.monthly}/mo
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300 mb-1">Billing Cycle</label>
                                <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                                    {['monthly', 'yearly'].map(cycle => (
                                        <button
                                            key={cycle}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, billing_cycle: cycle })}
                                            className={`flex-1 py-1.5 text-sm font-medium rounded-md capitalize transition-all ${formData.billing_cycle === cycle
                                                ? 'bg-white dark:bg-slate-600 shadow text-emerald-600 dark:text-emerald-400'
                                                : 'text-gray-500 dark:text-gray-400'
                                                }`}
                                        >
                                            {cycle}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300 mb-1">Payment Mode</label>
                                <select name="payment_mode" value={formData.payment_mode} onChange={handleChange} className={inputClass}>
                                    <option value="cash">Cash</option>
                                    <option value="card">Credit/Debit Card</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="upi">UPI</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300 mb-1">Referral Code (Optional)</label>
                                <input
                                    type="text"
                                    name="referral_code"
                                    value={formData.referral_code}
                                    onChange={handleChange}
                                    className={`${inputClass} uppercase`}
                                    placeholder="Enter Agent Code"
                                />
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700 space-y-2">
                            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                                <span>Basic Amount</span>
                                <span>{(summary as any).symbol}{summary.basic.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                                <span>Tax</span>
                                <span>{(summary as any).symbol}{summary.tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-dashed border-gray-200 dark:border-slate-600">
                                <span>Total Payable</span>
                                <span className="text-emerald-600">{(summary as any).symbol}{summary.total.toFixed(2)}</span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : 'Create & Subscribe'}
                        </button>
                    </div>
                </div>
            </form>

        </div>
    );
}
