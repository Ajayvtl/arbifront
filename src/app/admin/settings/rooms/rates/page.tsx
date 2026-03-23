"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Tag } from 'lucide-react';

export default function RatePlansPage() {
    const [ratePlans, setRatePlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<any>(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        base_occupancy: 2,
        extra_adult_price: 0,
        extra_child_price: 0
    });

    const inputClass = "w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 dark:bg-slate-900 dark:text-white bg-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all";

    useEffect(() => {
        fetchRatePlans();
    }, []);

    const fetchRatePlans = async () => {
        try {
            const res = await api.get('/rooms/rate-plans');
            setRatePlans(res.data.data);
        } catch (error) {
            toast.error('Failed to load rate plans');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (plan: any = null) => {
        if (plan) {
            setEditingPlan(plan);
            setFormData({
                name: plan.name,
                description: plan.description || '',
                base_occupancy: plan.base_occupancy,
                extra_adult_price: plan.extra_adult_price,
                extra_child_price: plan.extra_child_price
            });
        } else {
            setEditingPlan(null);
            setFormData({ name: '', description: '', base_occupancy: 2, extra_adult_price: 0, extra_child_price: 0 });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingPlan) {
                await api.put(`/rooms/rate-plans/${editingPlan.id}`, formData);
                toast.success('Rate Plan Updated');
            } else {
                await api.post('/rooms/rate-plans', formData);
                toast.success('Rate Plan Created');
            }
            setIsModalOpen(false);
            fetchRatePlans();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure? This will deactivate the rate plan.')) return;
        try {
            await api.delete(`/rooms/rate-plans/${id}`);
            toast.success('Rate Plan Deleted');
            fetchRatePlans();
        } catch (error) {
            toast.error('Failed to delete plan');
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Tag className="w-6 h-6 text-emerald-500" />
                    Rate Plans
                </h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <PlusIcon className="w-5 h-5" />
                    New Rate Plan
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ratePlans.map((plan: any) => (
                    <div key={plan.id} className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6 relative group hover:border-emerald-500 transition-all">
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenModal(plan)} className="p-1.5 text-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100">
                                <PencilIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(plan.id)} className="p-1.5 text-red-500 bg-red-50 dark:bg-red-900/30 rounded-md hover:bg-red-100">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{plan.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 h-10 line-clamp-2">{plan.description || "No description provided."}</p>

                        <div className="space-y-2 text-sm border-t border-gray-100 dark:border-slate-700 pt-4">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Base Occupancy</span>
                                <span className="font-medium dark:text-gray-200">{plan.base_occupancy} Pax</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Extra Adult</span>
                                <span className="font-medium text-emerald-600">+${plan.extra_adult_price}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Extra Child</span>
                                <span className="font-medium text-emerald-600">+${plan.extra_child_price}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 dark:border-slate-800">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {editingPlan ? 'Edit Rate Plan' : 'New Rate Plan'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium dark:text-slate-300 mb-1">Plan Name</label>
                                <input
                                    required
                                    className={inputClass}
                                    placeholder="e.g. Standard Rate, Bed & Breakfast"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium dark:text-slate-300 mb-1">Description</label>
                                <textarea
                                    className={inputClass}
                                    rows={2}
                                    placeholder="What does this plan include?"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium dark:text-slate-300 mb-1">Base Occ.</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className={inputClass}
                                        value={formData.base_occupancy}
                                        onChange={e => setFormData({ ...formData, base_occupancy: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-4 col-span-2 grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium dark:text-slate-300 mb-1">Extra Adult $</label>
                                        <input
                                            type="number"
                                            min="0"
                                            className={inputClass}
                                            value={formData.extra_adult_price}
                                            onChange={e => setFormData({ ...formData, extra_adult_price: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium dark:text-slate-300 mb-1">Extra Child $</label>
                                        <input
                                            type="number"
                                            min="0"
                                            className={inputClass}
                                            value={formData.extra_child_price}
                                            onChange={e => setFormData({ ...formData, extra_child_price: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-lg shadow-emerald-500/20"
                                >
                                    Save Plan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
