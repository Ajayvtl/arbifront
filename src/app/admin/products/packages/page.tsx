"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { PlusIcon, TrashIcon, PencilIcon, XMarkIcon, ChevronDownIcon, ChevronUpIcon, MagnifyingGlassIcon, Squares2X2Icon, ListBulletIcon, ArrowDownTrayIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Badge } from '@/components/ui/Badge';

// Shared Style
const inputClass = "w-full border border-gray-300 dark:border-slate-500 rounded-lg px-3 py-2.5 dark:bg-slate-900 dark:text-white bg-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-sm";

export default function PackageSettingsPage() {
    const [packages, setPackages] = useState<any[]>([]);
    const [countries, setCountries] = useState<any[]>([]);
    const [taxes, setTaxes] = useState<any[]>([]);
    const [availableModules, setAvailableModules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
    const [dbSourceIndicator, setDbSourceIndicator] = useState<string>('-');
    const [executionScopeIndicator, setExecutionScopeIndicator] = useState<string>('-');
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentId, setCurrentId] = useState<number | null>(null);

    const [categories, setCategories] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

    const toggleCollapse = (id: string | number) => {
        setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // UI State
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Filter Logic
    const filteredPackages = packages.filter(p => {
        if (!searchQuery) return true; // Show all if empty
        if (searchQuery.startsWith('cat-')) {
            const catId = searchQuery.replace('cat-', '');
            return p.category_id == catId;
        }
        if (searchQuery.startsWith('sub-')) {
            const subId = searchQuery.replace('sub-', '');
            return p.subcategory_id == subId;
        }
        if (searchQuery.startsWith('pkg-')) {
            const pkgId = searchQuery.replace('pkg-', '');
            return p.id == pkgId;
        }
        return true;
    });

    const handleExport = () => {
        const dataToExport = filteredPackages.map(p => ({
            ID: p.id,
            Name: p.name,
            Slug: p.slug,
            Category: categories.find(c => c.id == p.category_id)?.name || 'N/A',
            Subcategory: categories.flatMap(c => c.subcategories || []).find((s: any) => s.id == p.subcategory_id)?.name || 'N/A',
            MaxUsers: p.max_users,
            MaxBranches: p.max_branches,
            ValidityDays: p.validity_days,
            GracePeriodDays: p.grace_period_days ?? 7,
            RenewalNoticeDays: p.renewal_notice_days ?? 7,
            BaseTax: p.tax_percentage + '%',
            Active: p.is_active ? 'Yes' : 'No'
        }));
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Packages");
        XLSX.writeFile(wb, "packages_export.xlsx");
    };

    // Form State
    const [formData, setFormData] = useState({
        name: '', slug: '',
        max_users: 5, max_branches: 1, tax_percentage: 0,
        validity_days: 30,
        grace_period_days: 7,
        renewal_notice_days: 7,
        category_id: '', subcategory_id: '',
        features: {} as Record<string, boolean>,
        prices: [] as any[],
        is_separate_db: false,
        dedicated_db_id: ''
    });

    const [availableDatabases, setAvailableDatabases] = useState<any[]>([]);

    const fetchAvailableDatabases = async (categoryId: string) => {
        if (!categoryId) return;
        try {
            const res = await api.get(`/saas/databases/available?category_id=${categoryId}`);
            setAvailableDatabases(res.data.data || []);
        } catch (e) {
            console.error('Failed to fetch databases');
        }
    };

    useEffect(() => {
        if (formData.is_separate_db && formData.category_id) {
            fetchAvailableDatabases(formData.category_id);
        }
    }, [formData.category_id, formData.is_separate_db]);

    const fetchData = async () => {
        try {
            setLoadError(null);
            const [pkgRes, countryRes, taxRes, modRes, catRes] = await Promise.all([
                api.get('/saas/packages'),
                api.get('/master/countries'),
                api.get('/master/taxes'),
                api.get('/saas/packages/modules'),
                api.get('/saas/categories')
            ]);
            // Transform Packages (modules array -> features map)
            const packagesWithFeatures = pkgRes.data.data.map((pkg: any) => ({
                ...pkg,
                features: (pkg.modules || []).reduce((acc: any, mod: any) => {
                    acc[mod.slug] = true;
                    return acc;
                }, {})
            }));
            setPackages(packagesWithFeatures);

            setCountries(countryRes.data.data);
            setTaxes(taxRes.data.data);

            // Transform Available Modules (backend sends slug/name, frontend uses key/label or we adapt)
            // Let's adapt frontend to use slug/name directly OR map here.
            // Mapping here is easier for existing code.
            const mappedModules = modRes.data.data.map((m: any) => ({
                ...m,
                key: m.slug,
                label: m.name
            }));
            setAvailableModules(mappedModules);
            setCategories(catRes.data.data);
            setDbSourceIndicator(pkgRes.headers?.['x-db-source'] || '-');
            setExecutionScopeIndicator(pkgRes.headers?.['x-execution-scope'] || '-');
            setLastSyncAt(new Date());
        } catch (error) {
            setLoadError('Failed to load package data');
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (showModal) return;
        const interval = window.setInterval(() => {
            fetchData();
        }, 30000);
        return () => window.clearInterval(interval);
    }, [showModal]);

    const openEdit = (pkg: any) => {
        // Fallback for prices if legacy data not populated (should be populated by controller)
        const existingPrices = pkg.prices || [];
        // If no prices, maybe add default from old fields (migration visual aid)
        if (existingPrices.length === 0 && pkg.price_monthly) {
            existingPrices.push({
                country_code: 'US', currency_code: 'USD',
                price_monthly: pkg.price_monthly, price_yearly: pkg.price_yearly,
                tax_percentage: pkg.tax_percentage // Inherit global tax for legacy
            });
        }

        setFormData({
            name: pkg.name,
            slug: pkg.slug,
            max_users: pkg.max_users,
            max_branches: pkg.max_branches,
            tax_percentage: pkg.tax_percentage,
            validity_days: pkg.validity_days || 30,
            grace_period_days: Number(pkg.grace_period_days ?? 7),
            renewal_notice_days: Number(pkg.renewal_notice_days ?? 7),
            category_id: pkg.category_id || '',
            subcategory_id: pkg.subcategory_id || '',
            features: pkg.features || {},
            prices: existingPrices,
            is_separate_db: !!pkg.is_separate_db,
            dedicated_db_id: pkg.dedicated_db_id || ''
        });
        setCurrentId(pkg.id);
        setEditMode(true);
        setShowModal(true);
        // Pre-fetch if separate db
        if (pkg.category_id && pkg.is_separate_db) fetchAvailableDatabases(pkg.category_id);
    };

    const openCreate = () => {
        setFormData({
            name: '', slug: '',
            max_users: 5, max_branches: 1, tax_percentage: 18,
            validity_days: 30,
            grace_period_days: 7,
            renewal_notice_days: 7,
            category_id: '', subcategory_id: '',
            features: {},
            prices: [{ country_code: 'US', currency_code: 'USD', price_monthly: '', price_yearly: '', tax_percentage: 0 }],
            is_separate_db: false,
            dedicated_db_id: ''
        });
        setEditMode(false);
        setCurrentId(null);
        setShowModal(true);
    };

    // Helper to get subcategories of selected category
    const activeSubcategories = categories.find(c => c.id == formData.category_id)?.subcategories || [];


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Clean up prices (remove empty rows if any, though required fields might prevent this)
            const payload: any = { ...formData };

            // Convert features map to module_ids array
            payload.module_ids = Object.keys(formData.features || {})
                .filter(key => formData.features[key])
                .map(key => availableModules.find(m => m.key === key)?.id)
                .filter(id => id); // Remove undefined

            delete payload.features; // Remove map from payload

            if (editMode && currentId) {
                await api.put(`/saas/packages/${currentId}`, payload);
                toast.success('Package Updated');
            } else {
                await api.post('/saas/packages', payload);
                toast.success('Package Created');
            }
            setShowModal(false);
            fetchData();
        } catch (error: any) {
            toast.error('Operation failed');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this package?')) return;
        try {
            await api.delete(`/saas/packages/${id}`);
            toast.success('Package Deleted');
            fetchData();
        } catch (error) {
            toast.error('Delete failed');
        }
    };

    const handleFeatureChange = (key: string, checked: boolean) => {
        setFormData(prev => ({ ...prev, features: { ...prev.features, [key]: checked } }));
    };

    const [statesMap, setStatesMap] = useState<Record<string, any[]>>({});

    // ... (fetchData remains same, but maybe we can preload if needed, for now lazy)

    const fetchStates = async (countryCode: string) => {
        // If already loaded, skip
        if (statesMap[countryCode]) return;

        // Find country ID from Code (assuming API needs ID or Code)
        // Localization API uses ID. Packages uses Code.
        // We need to map code to ID.
        const country = countries.find(c => c.iso_code === countryCode);
        if (!country) return;

        try {
            const res = await api.get(`/master/states?country_id=${country.id}`);
            setStatesMap(prev => ({ ...prev, [countryCode]: res.data.data }));
        } catch (e) {
            console.error(e);
        }
    };

    // Pricing Row Handlers
    const addPriceRow = () => {
        setFormData(prev => ({
            ...prev,
            prices: [...prev.prices, { country_code: '', state_id: '', currency_code: '', price_monthly: '', price_yearly: '', tax_percentage: 0 }]
        }));
    };

    const removePriceRow = (index: number) => {
        setFormData(prev => ({
            ...prev,
            prices: prev.prices.filter((_, i) => i !== index)
        }));
    };

    const updatePriceRow = async (index: number, field: string, value: string) => {
        const newPrices = [...formData.prices];
        newPrices[index] = { ...newPrices[index], [field]: value };

        // Auto-set currency if country selected AND fetch states
        if (field === 'country_code') {
            const selectedCountry = countries.find(c => c.iso_code === value);
            if (selectedCountry) {
                newPrices[index].currency_code = selectedCountry.currency_code;
                // Reset state if country changes
                newPrices[index].state_id = '';
                await fetchStates(value);
            }
        }

        setFormData(prev => ({ ...prev, prices: newPrices }));
    };

    // Pre-load states for existing prices when opening Edit
    useEffect(() => {
        if (showModal && editMode && formData.prices.length > 0) {
            formData.prices.forEach(p => {
                if (p.country_code) fetchStates(p.country_code);
            });
        }
    }, [showModal, editMode, formData.prices.length]); // Use length to trigger only once initially or when added, but we need to reference formData.prices for content. 
    // Actually safer to iterate unique coords.


    // Options for Selects
    const countryOptions = countries.map(c => ({
        value: c.iso_code,
        label: c.name,
        subLabel: c.currency_code
    }));

    const taxOptions = taxes.map(t => ({
        value: t.id,
        label: t.name,
        subLabel: `${t.percentage}%`
    }));

    return (
        <div className="p-8">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                <div className="w-full sm:w-auto sm:min-w-[28rem] space-y-3">
                    <div className="w-full sm:w-72">
                        <SearchableSelect
                            options={[
                                { label: 'All Packages', value: '' },
                                // Categories
                                ...categories.map(c => ({ label: `Category: ${c.name}`, value: `cat-${c.id}` })),
                                // Subcategories
                                ...categories.flatMap(c => (c.subcategories || []).map((s: any) => ({ label: `Subcategory: ${s.name}`, value: `sub-${s.id}` }))),
                                // Packages
                                ...packages.map(p => ({ label: `Plan: ${p.name}`, value: `pkg-${p.id}` }))
                            ]}
                            value={searchQuery}
                            onChange={(val) => setSearchQuery(val)}
                            placeholder="Search & Filter..."
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="info">Auto refresh: 30s</Badge>
                        <Badge variant="neutral">DB Source: {dbSourceIndicator}</Badge>
                        <Badge variant="neutral">Scope: {executionScopeIndicator}</Badge>
                        <Badge variant="default">Last Sync: {lastSyncAt ? lastSyncAt.toLocaleString() : 'Never'}</Badge>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Toggles */}
                    <div className="bg-gray-100 dark:bg-slate-700 p-1 rounded-lg flex gap-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 shadow text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Squares2X2Icon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <ListBulletIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <button
                        onClick={fetchData}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <ArrowPathIcon className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                        onClick={handleExport}
                        className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                        title="Export to Excel"
                    >
                        <ArrowDownTrayIcon className="w-6 h-6" />
                    </button>

                    <button
                        onClick={openCreate}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center shadow-lg shadow-emerald-500/20"
                    >
                        <PlusIcon className="w-5 h-5 mr-2" /> Add Package
                    </button>
                </div>
            </div>
            {loadError && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {loadError}
                </div>
            )}

            {/* Packages Content */}
            {viewMode === 'grid' ? (
                // GRID VIEW
                (() => {
                    const renderPackageCard = (pkg: any, idx: number) => (
                        <div key={pkg.id || `pkg-${idx}`} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex flex-col hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{pkg.name}</h3>
                                    <div className="flex gap-2">
                                        <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded uppercase tracking-wider font-semibold">{pkg.slug}</span>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <button onClick={() => openEdit(pkg)} className="p-2 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400">
                                        <PencilIcon className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleDelete(pkg.id)} className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 space-y-4 mb-6">
                                <div className="flex justify-between text-sm py-2 border-b dark:border-slate-700">
                                    <span className="text-gray-500 dark:text-gray-400">Validity</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">{pkg.validity_days} Days</span>
                                </div>
                                <div className="flex justify-between text-sm py-2 border-b dark:border-slate-700">
                                    <span className="text-gray-500 dark:text-gray-400">Grace / Notice</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {Number(pkg.grace_period_days ?? 7)} / {Number(pkg.renewal_notice_days ?? 7)} Days
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm py-2 border-b dark:border-slate-700">
                                    <span className="text-gray-500 dark:text-gray-400">Max Users</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">{pkg.max_users}</span>
                                </div>
                                <div className="flex justify-between text-sm py-2 border-b dark:border-slate-700">
                                    <span className="text-gray-500 dark:text-gray-400">Max Branches</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">{pkg.max_branches}</span>
                                </div>
                                <div className="mt-4">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Includes Modules</span>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.keys(pkg.features || {}).filter(k => pkg.features[k]).slice(0, 5).map(k => {
                                            const mod = availableModules.find(m => m.key === k);
                                            return (
                                                <span key={k} className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs px-2 py-1 rounded-full">
                                                    {mod?.label || k}
                                                </span>
                                            );
                                        })}
                                        {Object.keys(pkg.features || {}).filter(k => pkg.features[k]).length > 5 && (
                                            <span className="text-xs text-gray-400 flex items-center">+ more</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );

                    const uncategorized = filteredPackages.filter(p => !p.category_id);

                    return (
                        <div className="space-y-12 mb-12">
                            {/* Categorized Packages */}
                            {categories.map((cat, idx) => {
                                const catPackages = filteredPackages.filter(p => p.category_id === cat.id);
                                if (catPackages.length === 0) return null;

                                const directPackages = catPackages.filter(p => !p.subcategory_id);

                                return (
                                    <div key={cat.id || `cat-${idx}`} className="border-b border-gray-200 dark:border-slate-700 pb-8 last:border-0">
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                            <span className="w-2 h-8 bg-emerald-500 rounded-full"></span>
                                            {cat.name}
                                            <span className="text-sm font-normal text-gray-500 ml-2">({catPackages.length} Plans)</span>
                                        </h2>

                                        {directPackages.length > 0 && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                                                {directPackages.map(renderPackageCard)}
                                            </div>
                                        )}

                                        {(cat.subcategories || []).map((sub: any, subIdx: number) => {
                                            const subPackages = catPackages.filter(p => p.subcategory_id === sub.id);
                                            if (subPackages.length === 0) return null;

                                            return (
                                                <div key={sub.id || `sub-${subIdx}`} className="ml-4 pl-4 border-l-2 border-gray-100 dark:border-slate-800 mt-6">
                                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">{sub.name}</h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                        {subPackages.map(renderPackageCard)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}

                            {uncategorized.length > 0 && (
                                <div className="border-t border-gray-200 dark:border-slate-700 pt-8">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <span className="w-2 h-8 bg-gray-400 rounded-full"></span>
                                        Uncategorized
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {uncategorized.map(renderPackageCard)}
                                    </div>
                                </div>
                            )}

                            {filteredPackages.length === 0 && !loading && (
                                <div className="text-center py-12 text-gray-500">
                                    No packages found matching your filters.
                                </div>
                            )}
                        </div>
                    );
                })()
            ) : (
                // LIST VIEW
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden border border-gray-200 dark:border-slate-700">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                                <th className="p-4 font-semibold">Package Name</th>
                                <th className="p-4 font-semibold">Category</th>
                                <th className="p-4 font-semibold">Limits</th>
                                <th className="p-4 font-semibold">Validity</th>
                                <th className="p-4 font-semibold">Modules</th>
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {filteredPackages.map(pkg => (
                                <tr key={pkg.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="p-4">
                                        <div className="font-medium text-gray-900 dark:text-white">{pkg.name}</div>
                                        <div className="text-xs text-gray-500">{pkg.slug}</div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                        {categories.find(c => c.id == pkg.category_id)?.name || '-'}
                                        {pkg.subcategory_id && (
                                            <span className="text-xs text-gray-400 block">
                                                ↳ {categories.flatMap(c => c.subcategories || []).find((s: any) => s.id == pkg.subcategory_id)?.name}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                        <div title="Max Users" className="flex items-center gap-1"><span className="text-gray-400 w-4">U:</span> {pkg.max_users}</div>
                                        <div title="Max Branches" className="flex items-center gap-1"><span className="text-gray-400 w-4">B:</span> {pkg.max_branches}</div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                        <div>{pkg.validity_days} Days</div>
                                        <div className="text-xs text-gray-400">
                                            Grace {Number(pkg.grace_period_days ?? 7)}d / Notice {Number(pkg.renewal_notice_days ?? 7)}d
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1 max-w-xs">
                                            {Object.keys(pkg.features || {}).filter(k => pkg.features[k]).slice(0, 3).map(k => (
                                                <span key={k} className="text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                                                    {availableModules.find(m => m.key === k)?.label || k}
                                                </span>
                                            ))}
                                            {Object.keys(pkg.features || {}).filter(k => pkg.features[k]).length > 3 && (
                                                <span className="text-[10px] text-gray-400">+{Object.keys(pkg.features || {}).filter(k => pkg.features[k]).length - 3}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => openEdit(pkg)} className="p-1.5 text-gray-400 hover:text-emerald-600 transition-colors">
                                                <PencilIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleDelete(pkg.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredPackages.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        No packages found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* System Modules Reference Section */}
            <div className="mt-12 border-t dark:border-slate-700 pt-8">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">System Modules Reference</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {availableModules.map((mod, idx) => (
                        <div key={mod.key || `mod-${idx}`} className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{mod.label}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{mod.description}</p>
                            <span className="mt-2 inline-block text-[10px] bg-white dark:bg-slate-900 text-gray-400 px-1.5 py-0.5 rounded border dark:border-slate-700 font-mono">
                                {mod.key}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl max-w-3xl w-full p-8 max-h-[90vh] overflow-y-auto relative border border-slate-200 dark:border-slate-700 shadow-2xl">
                        <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                            <XMarkIcon className="w-6 h-6" />
                        </button>

                        <h2 className="text-2xl font-bold mb-6 dark:text-white border-b border-gray-100 dark:border-slate-700 pb-2">
                            {editMode ? 'Edit Package' : 'Create New Package'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Package Name</label>
                                    <input placeholder="Ex: Starter Plan" className={inputClass} required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Slug (Unique)</label>
                                    <input placeholder="starter-plan" className={inputClass} required
                                        value={formData.slug}
                                        onChange={e => setFormData({ ...formData, slug: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Category</label>
                                    <select
                                        value={formData.category_id}
                                        onChange={e => setFormData({ ...formData, category_id: e.target.value, subcategory_id: '' })} // Reset subcat on cat change
                                        className={inputClass}
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Subcategory</label>
                                    <select
                                        value={formData.subcategory_id}
                                        onChange={e => setFormData({ ...formData, subcategory_id: e.target.value })}
                                        className={inputClass}
                                        disabled={!formData.category_id}
                                    >
                                        <option value="">Select Subcategory</option>
                                        {activeSubcategories.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 md:grid-cols-6 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Max Users</label>
                                    <input type="number" className={inputClass} required
                                        value={formData.max_users}
                                        onChange={e => setFormData({ ...formData, max_users: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Max Branches</label>
                                    <input type="number" className={inputClass} required
                                        value={formData.max_branches}
                                        onChange={e => setFormData({ ...formData, max_branches: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Validity (Days)</label>
                                    <input type="number" className={inputClass} required
                                        value={formData.validity_days}
                                        onChange={e => setFormData({ ...formData, validity_days: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Base Tax (%)</label>
                                    <input type="number" step="0.1" className={inputClass} required
                                        value={formData.tax_percentage}
                                        onChange={e => setFormData({ ...formData, tax_percentage: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Grace (Days)</label>
                                    <input type="number" min="0" className={inputClass} required
                                        value={formData.grace_period_days}
                                        onChange={e => setFormData({ ...formData, grace_period_days: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Renewal Notice (Days)</label>
                                    <input type="number" min="0" className={inputClass} required
                                        value={formData.renewal_notice_days}
                                        onChange={e => setFormData({ ...formData, renewal_notice_days: Number(e.target.value) })} />
                                </div>
                            </div>

                            {/* Separate DB Configuration */}
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Separate Database Configuration</label>
                                <div className="flex items-center gap-6 mb-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="is_separate_db"
                                            checked={formData.is_separate_db === false}
                                            onChange={() => setFormData({ ...formData, is_separate_db: false, dedicated_db_id: '' })}
                                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500" />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Shared Database (Default)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="is_separate_db"
                                            checked={formData.is_separate_db === true}
                                            onChange={() => {
                                                setFormData({ ...formData, is_separate_db: true });
                                                // Trigger fetch if category exists
                                                if (formData.category_id) fetchAvailableDatabases(formData.category_id);
                                            }}
                                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500" />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Separate / Dedicated Database</span>
                                    </label>
                                </div>

                                {formData.is_separate_db && (
                                    <div>
                                        <label className="block text-xs uppercase text-gray-500 mb-1">Select Available Database (Filtered by Category)</label>
                                        {formData.category_id ? (
                                            availableDatabases.length > 0 ? (
                                                <SearchableSelect
                                                    options={availableDatabases.map(db => ({
                                                        label: `${db.database_name} (${db.host})`,
                                                        value: db.id,
                                                        subLabel: db.description
                                                    }))}
                                                    value={formData.dedicated_db_id}
                                                    onChange={(val) => setFormData({ ...formData, dedicated_db_id: val })}
                                                    placeholder="Select a Database..."
                                                />
                                            ) : (
                                                <div className="text-sm text-red-500 italic">No available databases found for this category. Please add one in 'Pkg DB'.</div>
                                            )
                                        ) : (
                                            <div className="text-sm text-amber-500 italic">Please select a Category first to see available databases.</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Dynamic Pricing Section */}
                            <div className="bg-gray-50 dark:bg-slate-700/30 p-5 rounded-xl border border-dashed border-gray-300 dark:border-slate-600">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Localized Pricing</h3>
                                    <button type="button" onClick={addPriceRow} className="text-emerald-600 text-xs font-bold hover:underline">
                                        + Add Region
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {formData.prices.map((price, idx) => (
                                        <div key={idx} className="flex gap-2 items-start bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm">
                                            <div className="flex-1">
                                                <label className="block text-[10px] uppercase text-gray-500 mb-1">Country</label>
                                                <SearchableSelect
                                                    options={countryOptions}
                                                    value={price.country_code}
                                                    onChange={(val) => updatePriceRow(idx, 'country_code', val)}
                                                    placeholder="Search Country"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-[10px] uppercase text-gray-500 mb-1">State (Opt)</label>
                                                <select
                                                    className={`${inputClass} text-sm py-2`}
                                                    value={price.state_id || ''}
                                                    onChange={(e) => updatePriceRow(idx, 'state_id', e.target.value)}
                                                    disabled={!price.country_code || !statesMap[price.country_code]}
                                                >
                                                    <option value="">All States</option>
                                                    {(statesMap[price.country_code] || []).map((s: any) => (
                                                        <option key={s.id} value={s.id}>{s.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="w-20">
                                                <label className="block text-[10px] uppercase text-gray-500 mb-1">Currency</label>
                                                <input className={`${inputClass} bg-gray-50 dark:bg-slate-700 cursor-not-allowed`} readOnly value={price.currency_code} required />
                                            </div>
                                            <div className="w-24">
                                                <label className="block text-[10px] uppercase text-gray-500 mb-1">Monthly</label>
                                                <input type="number" step="0.01" className={inputClass} value={price.price_monthly} onChange={e => updatePriceRow(idx, 'price_monthly', e.target.value)} required />
                                            </div>
                                            <div className="w-24">
                                                <label className="block text-[10px] uppercase text-gray-500 mb-1">Yearly</label>
                                                <input type="number" step="0.01" className={inputClass} value={price.price_yearly} onChange={e => updatePriceRow(idx, 'price_yearly', e.target.value)} required />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-[10px] uppercase text-gray-500 mb-1">Tax Profile</label>
                                                <div className="flex gap-1">
                                                    <input type="number" step="0.1" className={`${inputClass} w-16`}
                                                        value={price.tax_percentage || 0}
                                                        onChange={e => updatePriceRow(idx, 'tax_percentage', e.target.value)}
                                                        placeholder="%"
                                                        title="Tax Percentage"
                                                    />
                                                    <div className="flex-1">
                                                        <SearchableSelect
                                                            options={taxOptions}
                                                            value=""
                                                            placeholder="Preset"
                                                            onChange={(val) => {
                                                                const tax = taxes.find(t => t.id == val);
                                                                if (tax) updatePriceRow(idx, 'tax_percentage', tax.percentage);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => removePriceRow(idx)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 p-2.5 rounded-lg mt-5">
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <p className="text-sm font-bold text-gray-900 dark:text-white">Enabled Features</p>
                                <div className="grid grid-cols-2 gap-4">
                                    {availableModules.map((module, idx) => (
                                        <label key={module.key || `feat-${idx}`} className={`flex items-center space-x-3 p-4 border rounded-xl cursor-pointer transition-all ${formData.features[module.key] ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 bg-white dark:bg-slate-800'}`}>
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${formData.features[module.key] ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-300'}`}>
                                                {formData.features[module.key] && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                            <input type="checkbox" checked={formData.features[module.key] || false}
                                                onChange={e => handleFeatureChange(module.key, e.target.checked)}
                                                className="hidden" />
                                            <div>
                                                <span className="block font-medium text-gray-700 dark:text-gray-200">{module.label}</span>
                                                <span className="text-[10px] text-gray-500 dark:text-gray-400">{module.description}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100 dark:border-slate-700">
                                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
                                <button type="submit" className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg hover:bg-emerald-700 font-medium shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5">
                                    {editMode ? 'Update Package' : 'Create Package'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
