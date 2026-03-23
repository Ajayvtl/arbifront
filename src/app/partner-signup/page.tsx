"use client";

import { useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function PartnerSignupPage() {
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', bank_details: '' });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // bank_details expected as JSON object by backend, but for simplicity here treating as string notes or similar
            // Ideally we'd have fields for Bank Name, Account No, etc. 
            // Let's wrap it simply.
            const payload = { ...formData, bank_details: { notes: formData.bank_details } };

            await api.post('/agents/register', payload);
            setSuccess(true);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Registration failed");
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
                        <h2 className="text-2xl font-bold text-emerald-600 mb-4">Registration Successful!</h2>
                        <p className="text-gray-600 mb-6">
                            Thank you for applying to become a GreenCross Partner.
                            Our team will review your application and you will receive an email upon approval.
                        </p>
                        <Link href="/login" className="text-emerald-600 hover:text-emerald-500 font-medium">
                            Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <img className="mx-auto h-12 w-auto" src="/logo.png" alt="GreenCross" />
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Become a Partner
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Join our agency program and earn commissions.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Full Name</label>
                            <div className="mt-1">
                                <input name="name" type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email address</label>
                            <div className="mt-1">
                                <input name="email" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                            <div className="mt-1">
                                <input name="phone" type="text" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Bank Details / Notes</label>
                            <div className="mt-1">
                                <textarea name="bank" rows={3} value={formData.bank_details} onChange={e => setFormData({ ...formData, bank_details: e.target.value })} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" placeholder="Bank Name, Account Number (Optional for now)" />
                            </div>
                        </div>

                        <div>
                            <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50">
                                {loading ? 'Submitting...' : 'Submit Application'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
