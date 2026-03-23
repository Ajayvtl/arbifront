"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, Trash2, Search, ShoppingCart } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

export default function CreateOrderPage() {
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [tests, setTests] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [selectedItems, setSelectedItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersRes, testsRes] = await Promise.all([
                api.get('/users'),
                api.get('/lis/tests')
            ]);
            setUsers(usersRes.data.data);
            setTests(testsRes.data.data);
        } catch (error) {
            toast.error("Failed to load data");
        }
    };

    const addItem = (item: any) => {
        if (selectedItems.find(i => i.id === item.id)) return;
        setSelectedItems([...selectedItems, { ...item, type: 'test' }]);
    };

    const removeItem = (id: number) => {
        setSelectedItems(selectedItems.filter(i => i.id !== id));
    };

    const calculateTotal = () => {
        return selectedItems.reduce((sum, item) => sum + parseFloat(item.price), 0);
    };

    const handleSubmit = async () => {
        if (!selectedUser || selectedItems.length === 0) {
            toast.error("Please select a user and at least one item");
            return;
        }

        setLoading(true);
        try {
            await api.post('/orders/place', {
                userId: selectedUser,
                items: selectedItems.map(i => ({ id: i.id, type: 'test' }))
            });
            toast.success("Order placed successfully");
            router.push('/orders');
        } catch (error: any) {
            toast.error("Failed to place order");
        } finally {
            setLoading(false);
        }
    };

    const filteredTests = tests.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="p-8 h-[calc(100vh-64px)] flex flex-col max-w-[1600px] mx-auto">
            <Link href="/orders" className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-2 mb-6 transition-colors">
                <ArrowLeft size={18} /> Back to Orders
            </Link>

            <div className="flex flex-col lg:flex-row gap-8 flex-1 overflow-hidden">
                {/* Left: Selection */}
                <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                    {/* User Selection */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <h2 className="font-semibold text-slate-800 dark:text-white mb-4">1. Select Patient</h2>
                        <select
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                        >
                            <option value="">Select a Patient</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                            ))}
                        </select>
                    </div>

                    {/* Test Selection */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex-1 flex flex-col overflow-hidden">
                        <h2 className="font-semibold text-slate-800 dark:text-white mb-4">2. Add Tests</h2>
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search tests..."
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                            {filteredTests.map(test => (
                                <div key={test.id} className="flex justify-between items-center p-3 border border-slate-100 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <div>
                                        <p className="font-medium text-slate-800 dark:text-white">{test.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{test.code} • ${test.price}</p>
                                    </div>
                                    <button
                                        onClick={() => addItem(test)}
                                        className="text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20 p-1.5 rounded-full transition-colors"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Summary */}
                <div className="w-full lg:w-96 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 flex flex-col">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                        <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <ShoppingCart size={20} className="text-emerald-600 dark:text-emerald-400" />
                            Order Summary
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                        {selectedItems.length === 0 ? (
                            <div className="text-center text-slate-400 dark:text-slate-500 py-10">
                                No items added
                            </div>
                        ) : (
                            selectedItems.map(item => (
                                <div key={item.id} className="flex justify-between items-start">
                                    <div>
                                        <p className="font-medium text-slate-800 dark:text-white text-sm">{item.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.code}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-medium text-slate-700 dark:text-slate-300 text-sm">${item.price}</span>
                                        <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30">
                        <div className="flex justify-between items-center mb-6">
                            <span className="font-semibold text-slate-600 dark:text-slate-400">Total Amount</span>
                            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">${calculateTotal().toFixed(2)}</span>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-none"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Plus size={18} />}
                            Place Order
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
