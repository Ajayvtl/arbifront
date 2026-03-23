'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Plus, Check, X, Edit, DollarSign, Loader2 } from 'lucide-react';
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

export default function RatePlansPage() {
    const [plans, setPlans] = useState<any[]>([]);
    const [roomTypes, setRoomTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('list'); // list, create, edit

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        meal_plan: 'EP', // EP, CP, MAP, AP
        description: '',
        rates: {} as Record<string, any> // Key: room_type_id, Value: price
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [plansRes, typesRes] = await Promise.all([
                api.get('/rooms/rate-plans'),
                api.get('/rooms') // Get room types
            ]);
            setPlans(plansRes.data.data);
            setRoomTypes(typesRes.data.data);

            // Initialize rates with base price from room types
            const initialRates: Record<string, any> = {};
            typesRes.data.data.forEach((rt: any) => {
                initialRates[rt.id] = rt.base_price;
            });
            setFormData(prev => ({ ...prev, rates: initialRates }));

        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Transform matrix to array
            const ratesArray = Object.keys(formData.rates).map(rtId => ({
                room_type_id: rtId,
                base_price: formData.rates[rtId as keyof typeof formData.rates]
            }));

            await api.post('/rooms/rate-plans', {
                ...formData,
                rates: ratesArray
            });

            setViewMode('list');
            fetchData();
        } catch (error: any) {
            alert('Failed: ' + error.response?.data?.message || error.message);
        }
    };

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

    const mealPlans = [
        { value: 'EP', label: 'EP (Room Only)' },
        { value: 'CP', label: 'CP (Breakfast)' },
        { value: 'MAP', label: 'MAP (Breakfast + Dinner)' },
        { value: 'AP', label: 'AP (All Meals)' }
    ];

    return (
        <div className="p-8 space-y-8 min-h-screen bg-slate-50/50 dark:bg-slate-950">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Rate Plans</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage pricing strategies and meal plans.</p>
                </div>
                {viewMode === 'list' && (
                    <Button onClick={() => setViewMode('create')} icon={<Plus size={18} />}>
                        New Plan
                    </Button>
                )}
            </div>

            {viewMode === 'list' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map((plan: any) => (
                        <div key={plan.id} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">{plan.name}</h3>
                                <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg text-xs font-bold ring-1 ring-blue-700/10 dark:ring-blue-300/10">
                                    {plan.meal_plan}
                                </span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 min-h-[40px] line-clamp-2">{plan.description || "No description provided."}</p>

                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6 space-y-3 border border-slate-100 dark:border-slate-800">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Snapshot Rates</div>
                                {plan.rates && Array.isArray(plan.rates) ? plan.rates.slice(0, 3).map((r: any) => (
                                    <div key={r.room_type_id} className="flex justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-300">{r.room_type_name}</span>
                                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{r.base_price}</span>
                                    </div>
                                )) : <div className="text-xs text-slate-400 italic">No rates confirmed</div>}
                                {plan.rates && plan.rates.length > 3 && <div className="text-xs text-slate-400 pt-1">+{plan.rates.length - 3} more types</div>}
                            </div>

                            <Button variant="secondary" className="w-full justify-center" icon={<Edit size={16} />}>
                                Edit Prices
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {viewMode === 'create' && (
                <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-between items-center">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">Create Rate Plan</h3>
                        <button onClick={() => setViewMode('list')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"><X size={20} /></button>
                    </div>
                    <form onSubmit={handleCreate} className="p-8">
                        <div className="grid grid-cols-2 gap-8 mb-8">
                            <div className="space-y-6">
                                <Input
                                    label="Plan Name"
                                    placeholder="e.g. Monsoon Sale"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                                <Select
                                    label="Meal Plan"
                                    options={mealPlans}
                                    value={formData.meal_plan}
                                    onChange={e => setFormData({ ...formData, meal_plan: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
                                <textarea
                                    className="w-full h-[132px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="mb-8">
                            <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400"><DollarSign size={16} /></div>
                                Base Rates Configuration
                            </h4>
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {roomTypes.map((rt: any) => (
                                    <div key={rt.id} className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <div>
                                            <div className="font-medium text-slate-900 dark:text-white">{rt.name}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Rack Rate: ₹{rt.base_price}</div>
                                        </div>
                                        <div className="w-32">
                                            <Input
                                                type="number"
                                                className="text-right font-mono"
                                                value={formData.rates[rt.id as keyof typeof formData.rates] || rt.base_price}
                                                onChange={e => setFormData({
                                                    ...formData,
                                                    rates: { ...formData.rates, [rt.id]: e.target.value }
                                                })}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <Button type="button" variant="ghost" onClick={() => setViewMode('list')}>Cancel</Button>
                            <Button type="submit">Create Plan</Button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
