'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
    Receipt,
    PlusCircle,
    MinusCircle,
    ArrowLeft,
    DollarSign,
    Download,
    CreditCard
} from 'lucide-react';

export default function FolioPage() {
    const params = useParams();
    const router = useRouter();
    const [folio, setFolio] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showChargeModal, setShowChargeModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Form States
    const [chargeForm, setChargeForm] = useState({ category: 'room', amount: '', description: '' });
    const [paymentForm, setPaymentForm] = useState({ method: 'cash', amount: '', description: '' });

    useEffect(() => {
        if (params.bookingId) fetchFolio();
    }, [params.bookingId]);

    const fetchFolio = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/finance/folios/booking/${params.bookingId}`);
            if (res.data.success) {
                setFolio(res.data.data);
                setTransactions(res.data.data.transactions);
            }
        } catch (error) {
            console.error("Failed to load folio", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCharge = async () => {
        try {
            await api.post(`/finance/folios/booking/${params.bookingId}/charge`, chargeForm);
            setShowChargeModal(false);
            setChargeForm({ category: 'room', amount: '', description: '' });
            fetchFolio();
        } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    };

    const handleAddPayment = async () => {
        try {
            await api.post(`/finance/folios/booking/${params.bookingId}/payment`, {
                amount: paymentForm.amount,
                description: paymentForm.description,
                paymentMethod: paymentForm.method
            });
            setShowPaymentModal(false);
            setPaymentForm({ method: 'cash', amount: '', description: '' });
            fetchFolio();
        } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    };

    if (loading && !folio) return <div className="p-10 text-center">Loading Folio...</div>;

    const balance = (folio?.total_charges || 0) - (folio?.total_payments || 0);

    return (
        <div className="p-6 max-w-5xl mx-auto bg-gray-50 min-h-screen">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 font-medium">
                <ArrowLeft size={18} /> Back
            </button>

            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <Receipt className="text-gray-400" /> Folio #{folio?.id}
                    </h1>
                    <p className="text-gray-500">Booking ID: {params.bookingId}</p>
                </div>
                <div className="text-right">
                    <div className="text-sm text-gray-500 uppercase font-bold tracking-wider">Current Balance</div>
                    <div className={`text-4xl font-bold ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        ₹{balance.toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
                    <div>
                        <div className="text-sm text-gray-500 font-medium">Total Charges</div>
                        <div className="text-2xl font-bold text-gray-900">₹{folio?.total_charges}</div>
                    </div>
                    <div className="p-3 bg-gray-100 rounded-full text-gray-600"><PlusCircle /></div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
                    <div>
                        <div className="text-sm text-gray-500 font-medium">Total Payments</div>
                        <div className="text-2xl font-bold text-gray-900">₹{folio?.total_payments}</div>
                    </div>
                    <div className="p-3 bg-gray-100 rounded-full text-gray-600"><MinusCircle /></div>
                </div>
            </div>

            {/* Actions Toolbar */}
            <div className="flex gap-4 mb-6">
                <button
                    onClick={() => setShowChargeModal(true)}
                    className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
                >
                    <PlusCircle size={18} /> Add Charge
                </button>
                <button
                    onClick={() => setShowPaymentModal(true)}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
                >
                    <DollarSign size={18} /> Add Payment
                </button>
                <button
                    onClick={() => window.open(`/ops/folios/${params.bookingId}/invoice`, '_blank')}
                    className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium shadow-sm ml-auto"
                >
                    <Download size={18} /> Invoice
                </button>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {transactions.map(tx => (
                            <tr key={tx.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(tx.created_at).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                    {tx.description}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold
                                        ${tx.type === 'charge' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}
                                    `}>
                                        {tx.category || tx.type}
                                    </span>
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right
                                    ${tx.type === 'charge' ? 'text-gray-900' : 'text-emerald-600'}
                                `}>
                                    {tx.type === 'payment' ? '-' : ''}₹{parseFloat(tx.amount).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                        {transactions.length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-500">No transactions recorded.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            {showChargeModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <h3 className="font-bold text-xl mb-4">Add Charge</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Category</label>
                                <select
                                    value={chargeForm.category}
                                    onChange={e => setChargeForm({ ...chargeForm, category: e.target.value })}
                                    className="w-full p-2 border rounded"
                                >
                                    <option value="room">Room Rate</option>
                                    <option value="fnb">Food & Beverage</option>
                                    <option value="laundry">Laundry</option>
                                    <option value="misc">Miscellaneous</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Amount</label>
                                <input
                                    type="number"
                                    value={chargeForm.amount}
                                    onChange={e => setChargeForm({ ...chargeForm, amount: e.target.value })}
                                    className="w-full p-2 border rounded"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <input
                                    type="text"
                                    value={chargeForm.description}
                                    onChange={e => setChargeForm({ ...chargeForm, description: e.target.value })}
                                    className="w-full p-2 border rounded"
                                    placeholder="Details..."
                                />
                            </div>
                            <div className="flex gap-2 justify-end pt-4">
                                <button onClick={() => setShowChargeModal(false)} className="px-4 py-2 text-gray-600">Cancel</button>
                                <button onClick={handleAddCharge} className="px-4 py-2 bg-rose-600 text-white rounded hover:bg-rose-700">Add Charge</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <h3 className="font-bold text-xl mb-4">Record Payment</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Payment Method</label>
                                <select
                                    value={paymentForm.method}
                                    onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}
                                    className="w-full p-2 border rounded"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="card">Credit/Debit Card</option>
                                    <option value="upi">UPI/QR</option>
                                    <option value="transfer">Bank Transfer</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Amount</label>
                                <input
                                    type="number"
                                    value={paymentForm.amount}
                                    onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                    className="w-full p-2 border rounded"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <input
                                    type="text"
                                    value={paymentForm.description}
                                    onChange={e => setPaymentForm({ ...paymentForm, description: e.target.value })}
                                    className="w-full p-2 border rounded"
                                    placeholder="Notes..."
                                />
                            </div>
                            <div className="flex gap-2 justify-end pt-4">
                                <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 text-gray-600">Cancel</button>
                                <button onClick={handleAddPayment} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">Record Payment</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
