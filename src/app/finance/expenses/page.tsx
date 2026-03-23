'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Plus, Filter, FileText, IndianRupee, PieChart, TrendingUp, AlertCircle } from 'lucide-react';

type Expense = {
    id: number;
    expense_date: string;
    category_name: string;
    description?: string;
    vendor_name?: string;
    amount: string | number;
    status: string;
};

type ExpenseCategory = {
    id: number;
    name: string;
};

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Stats
    const [totalSpend, setTotalSpend] = useState(0);

    const [formData, setFormData] = useState({
        category_id: '',
        amount: '',
        vendor_id: '',
        payment_method: 'cash',
        expense_date: new Date().toISOString().split('T')[0],
        description: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [expRes, catRes] = await Promise.all([
                api.get('/finance/expenses'),
                api.get('/finance/expenses/categories')
            ]);
            setExpenses(expRes.data.data);
            setCategories(catRes.data.data);

            // Calc Total
            const total = (expRes.data.data || []).reduce((sum: number, item: Expense) => sum + parseFloat(String(item.amount || 0)), 0);
            setTotalSpend(total);

        } catch (error) {
            console.error('Failed to load expenses', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            await api.post('/finance/expenses', formData);
            setShowModal(false);
            setFormData({ ...formData, amount: '', description: '' });
            fetchData();
        } catch (error: any) {
            alert('Failed: ' + (error?.response?.data?.message || 'Error'));
        }
    };

    if (loading) return <div className="p-8">Loading Expenses...</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Expense Manager</h1>
                    <p className="text-gray-500">Track hotel operational costs (Electricity, Water, Salary)</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 shadow-md"
                >
                    <Plus size={20} /> Log Expense
                </button>
            </div>

            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-red-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Total Spend (This Month)</p>
                            <h3 className="text-3xl font-bold text-gray-800 mt-2">₹{totalSpend.toLocaleString()}</h3>
                        </div>
                        <div className="bg-red-50 p-3 rounded-full text-red-600"><IndianRupee size={24} /></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Top Category</p>
                            <h3 className="text-xl font-bold text-gray-800 mt-2">Electricity</h3>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-full text-blue-600"><PieChart size={24} /></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-orange-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Pending Payments</p>
                            <h3 className="text-3xl font-bold text-gray-800 mt-2">₹0</h3>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-full text-orange-600"><AlertCircle size={24} /></div>
                    </div>
                </div>
            </div>

            {/* Expenses Table */}
            <div className="bg-white rounded-lg shadow border overflow-hidden">
                <table className="min-w-full divide-y">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-medium">
                        <tr>
                            <th className="p-4 text-left">Date</th>
                            <th className="p-4 text-left">Category</th>
                            <th className="p-4 text-left">Description</th>
                            <th className="p-4 text-right">Amount</th>
                            <th className="p-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {expenses.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-400">No expenses recorded yet.</td>
                            </tr>
                        ) : (
                            expenses.map((exp) => (
                                <tr key={exp.id} className="hover:bg-gray-50">
                                    <td className="p-4 text-sm text-gray-600">
                                        {new Date(exp.expense_date).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold uppercase">
                                            {exp.category_name}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-800 font-medium">
                                        {exp.description || '-'}
                                        {exp.vendor_name && <div className="text-xs text-gray-500">Vendor: {exp.vendor_name}</div>}
                                    </td>
                                    <td className="p-4 text-right font-mono font-bold text-gray-900">
                                        ₹{parseFloat(String(exp.amount)).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-center">
                                        {exp.status === 'paid' ? (
                                            <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded">PAID</span>
                                        ) : (
                                            <span className="text-orange-600 text-xs font-bold bg-orange-50 px-2 py-1 rounded">PENDING</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold">Log New Expense</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 font-bold">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Category</label>
                                <select
                                    className="w-full border rounded p-2"
                                    required
                                    value={formData.category_id}
                                    onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                                >
                                    <option value="">Select Category...</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Amount (₹)</label>
                                    <input
                                        type="number" step="0.01" className="w-full border rounded p-2 font-mono"
                                        required
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Date</label>
                                    <input
                                        type="date" className="w-full border rounded p-2"
                                        required
                                        value={formData.expense_date}
                                        onChange={e => setFormData({ ...formData, expense_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Description / Bill details</label>
                                <textarea
                                    className="w-full border rounded p-2"
                                    rows={2}
                                    placeholder="e.g. Monthly Electricity Bill for June"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <button type="submit" className="w-full bg-red-600 text-white rounded-lg py-3 font-bold hover:bg-red-700">
                                Save Expense
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
