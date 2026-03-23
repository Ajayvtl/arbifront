"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Save, ArrowLeft, Layers, Menu as MenuIcon, Layout, Globe, Package } from 'lucide-react';
import DashboardBuilder from '@/components/admin/DashboardBuilder';

export default function ProductBuilderPage() {
    const { id } = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('general');
    const [template, setTemplate] = useState<any>(null);
    const [modules, setModules] = useState<any[]>([]);
    const [packages, setPackages] = useState<any[]>([]);

    // State for Builder
    const [dashboardConfig, setDashboardConfig] = useState<any>(null);
    const [menuConfig, setMenuConfig] = useState<any>(null);
    const [selectedModules, setSelectedModules] = useState<string[]>([]);
    const [localeConfig, setLocaleConfig] = useState<any>({ default: 'en', supported: ['en'] });

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const [tplRes, modRes, pkgRes] = await Promise.all([
                api.get(`/admin/products/templates/${id}`),
                api.get('/saas/modules'), // Assuming this exists
                api.get('/saas/packages') // Assuming this exists
            ]);

            const tpl = tplRes.data.data;
            setTemplate(tpl);
            setModules(modRes.data.data || []);
            setPackages(pkgRes.data.data || []);

            // Hydrate State
            setSelectedModules(tpl.module_config || []);
            setDashboardConfig(tpl.dashboard_config || { layout: [] });
            setMenuConfig(tpl.menu_config || { items: [] });
            setLocaleConfig(tpl.locale_config || { default: 'en', supported: ['en'] });

        } catch (error) {
            console.error("Failed to load builder data", error);
            toast.error("Failed to load template data");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const payload = {
                ...template,
                module_config: selectedModules,
                dashboard_config: dashboardConfig,
                menu_config: menuConfig,
                locale_config: localeConfig
            };

            await api.put(`/admin/products/templates/${id}`, payload);
            toast.success("Template saved successfully!");
        } catch (error) {
            console.error("Save failed", error);
            toast.error("Failed to save template");
        }
    };

    if (loading) return <div className="p-10 text-center">Loading Builder...</div>;

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <div className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            Product Builder: <span className="text-emerald-600">{template.name}</span>
                        </h1>
                        <p className="text-xs text-slate-500">Configure Modules, Menus, and Dashboards for this product.</p>
                    </div>
                </div>
                <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium">
                    <Save size={18} /> Save Template
                </button>
            </div>

            {/* Tabs */}
            <div className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 float-left h-full flex flex-col">
                <div className="p-4 space-y-1">
                    <TabBtn id="general" icon={<Globe size={18} />} label="General & Localization" active={activeTab} onClick={setActiveTab} />
                    <TabBtn id="modules" icon={<Layers size={18} />} label="Modules & Features" active={activeTab} onClick={setActiveTab} />
                    <TabBtn id="menu" icon={<MenuIcon size={18} />} label="Navigation Menu" active={activeTab} onClick={setActiveTab} />
                    <TabBtn id="dashboard" icon={<Layout size={18} />} label="Dashboard Layout" active={activeTab} onClick={setActiveTab} />
                    <TabBtn id="roles" icon={<Package size={18} />} label="Roles & Packages" active={activeTab} onClick={setActiveTab} />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                <div className="h-full overflow-y-auto p-8">
                    {activeTab === 'general' && (
                        <GeneralTab template={template} setTemplate={setTemplate} localeConfig={localeConfig} setLocaleConfig={setLocaleConfig} />
                    )}
                    {activeTab === 'modules' && (
                        <ModulesTab modules={modules} selected={selectedModules} onChange={setSelectedModules} />
                    )}
                    {activeTab === 'dashboard' && (
                        <div className="h-full flex flex-col">
                            <h2 className="text-xl font-bold mb-4">Dashboard Layout</h2>
                            <div className="flex-1 border rounded-xl overflow-hidden bg-slate-100">
                                <DashboardBuilder
                                    widgets={dashboardConfig.layout || []}
                                    onChange={(layout: any) => setDashboardConfig({ ...dashboardConfig, layout })}
                                />
                            </div>
                        </div>
                    )}
                    {activeTab === 'menu' && (
                        <MenuBuilder config={menuConfig} setConfig={setMenuConfig} availableModules={selectedModules} />
                    )}
                </div>
            </div>
        </div>
    );
}

// Sub-components (Moved to separate files in real implementation, inline for speed)

function TabBtn({ id, icon, label, active, onClick }: any) {
    return (
        <button
            onClick={() => onClick(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${active === id
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
        >
            {icon} {label}
        </button>
    );
}

function GeneralTab({ template, setTemplate, localeConfig, setLocaleConfig }: any) {
    return (
        <div className="max-w-2xl space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-lg mb-4">Basic Settings</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Product Name</label>
                        <input
                            value={template.name}
                            onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                            className="w-full p-2 border rounded dark:bg-slate-700"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Database Mode</label>
                        <select
                            value={template.db_mode}
                            onChange={(e) => setTemplate({ ...template, db_mode: e.target.value })}
                            className="w-full p-2 border rounded dark:bg-slate-700"
                        >
                            <option value="SHARED">Shared Database (Cost Effective)</option>
                            <option value="DEDICATED">Dedicated Database (Premium/Compliance)</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-lg mb-4">Localization</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Default Language</label>
                        <select
                            value={localeConfig.default}
                            onChange={(e) => setLocaleConfig({ ...localeConfig, default: e.target.value })}
                            className="w-full p-2 border rounded dark:bg-slate-700"
                        >
                            <option value="en">English (US)</option>
                            <option value="es">Spanish</option>
                            <option value="fr">French</option>
                            <option value="ar">Arabic</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Supported Languages (JSON)</label>
                        <textarea
                            value={JSON.stringify(localeConfig.supported)}
                            readOnly
                            className="w-full p-2 border rounded bg-slate-50 dark:bg-slate-900 font-mono text-xs"
                        />
                        <p className="text-xs text-slate-500 mt-1">Manage supported languages in System Settings.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ModulesTab({ modules, selected, onChange }: any) {
    const toggle = (slug: string) => {
        if (selected.includes(slug)) {
            onChange(selected.filter((s: string) => s !== slug));
        } else {
            onChange([...selected, slug]);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((mod: any) => (
                <div
                    key={mod.id}
                    onClick={() => toggle(mod.slug)}
                    className={`cursor-pointer p-4 rounded-xl border transition-all ${selected.includes(mod.slug)
                        ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500 dark:bg-emerald-900/20'
                        : 'bg-white border-slate-200 hover:border-emerald-300 dark:bg-slate-800 dark:border-slate-700'
                        }`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-bold">{mod.name}</span>
                        {selected.includes(mod.slug) && <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>}
                    </div>
                    <p className="text-xs text-slate-500">{mod.category}</p>
                </div>
            ))}
        </div>
    );
}

import ProductMenuBuilder from '@/components/admin/ProductMenuBuilder';

function MenuBuilder({ config, setConfig, availableModules, template }: any) {
    return (
        <ProductMenuBuilder
            config={config}
            setConfig={setConfig}
            availableModules={availableModules}
            isSystemTemplate={false} // Could be dynamic based on user intent
        />
    );
}
