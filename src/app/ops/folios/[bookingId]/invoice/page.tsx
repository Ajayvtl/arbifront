'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';

export default function InvoicePage() {
    const params = useParams();
    const [folio, setFolio] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.bookingId) fetchFolio();
    }, [params.bookingId]);

    const fetchFolio = async () => {
        try {
            const res = await api.get(`/finance/folios/booking/${params.bookingId}`);
            if (res.data.success) {
                setFolio(res.data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-10 text-center">Generating Invoice...</div>;
    if (!folio) return <div className="p-10 text-center text-red-500">Invoice not found</div>;

    const balance = (folio.total_charges || 0) - (folio.total_payments || 0);

    return (
        <div className="bg-white min-h-screen text-gray-900 font-sans p-8 md:p-12 max-w-[210mm] mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-12 border-b pb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h1>
                    <p className="text-gray-500">Invoice #{folio.id}-{new Date().getFullYear()}</p>
                    <div className="mt-4 text-sm text-gray-600">
                        <p className="font-bold">Grand Vista Hotel</p>
                        <p>123 Luxury Avenue</p>
                        <p>Mumbai, MH 400001</p>
                        <p>GSTIN: 27AABCU9603R1Z2</p>
                    </div>
                </div>
                <div className="text-right">
                    <img src="/placeholder-logo.png" alt="Hotel Logo" className="h-16 w-auto mb-4 ml-auto object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                    <div className="text-sm text-gray-600">
                        <p className="font-bold">Date Issued:</p>
                        <p>{new Date().toLocaleDateString()}</p>
                        <p className="mt-2 font-bold">Booking Reference:</p>
                        <p>#{params.bookingId}</p>
                    </div>
                </div>
            </div>

            {/* Bill To */}
            <div className="mb-12">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Bill To</h3>
                <div className="text-lg font-bold">{folio.guest_name || 'Guest'}</div>
                <div className="text-gray-600">
                    {folio.customer_email && <p>{folio.customer_email}</p>}
                    {folio.customer_phone && <p>{folio.customer_phone}</p>}
                </div>
            </div>

            {/* Line Items */}
            <div className="mb-8">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b-2 border-gray-800">
                            <th className="py-3 text-sm font-bold uppercase tracking-wider">Description</th>
                            <th className="py-3 text-sm font-bold uppercase tracking-wider">Date</th>
                            <th className="py-3 text-sm font-bold uppercase tracking-wider">Category</th>
                            <th className="py-3 text-right text-sm font-bold uppercase tracking-wider">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {folio.transactions.filter((t: any) => t.type === 'charge').map((item: any) => (
                            <tr key={item.id}>
                                <td className="py-4 text-sm">{item.description}</td>
                                <td className="py-4 text-sm text-gray-500">{new Date(item.created_at).toLocaleDateString()}</td>
                                <td className="py-4 text-sm text-gray-500 capitalize">{item.category}</td>
                                <td className="py-4 text-right text-sm font-medium">₹{parseFloat(item.amount).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-12">
                <div className="w-64 space-y-3">
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Subtotal</span>
                        <span>₹{folio.total_charges}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Tax (12% GST) included</span>
                        <span>₹{(folio.total_charges * 0.12 / 1.12).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-emerald-600 border-b pb-3">
                        <span>Payments Made</span>
                        <span>- ₹{folio.total_payments}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold pt-2 border-t border-gray-900">
                        <span>Balance Due</span>
                        <span>₹{balance.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-400 mt-20 print:bottom-10 print:fixed print:w-full">
                <p>Thank you for choosing Grand Vista Hotel.</p>
                <p className="mt-1">For queries, contact finance@grandvista.com</p>
            </div>

            {/* Print Button (Hidden when printing) */}
            <div className="fixed bottom-8 right-8 print:hidden">
                <button
                    onClick={() => window.print()}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-transform hover:scale-105"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    Print Invoice
                </button>
            </div>
        </div>
    );
}
