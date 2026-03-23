"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Plus, Loader2, Save, Trash2, Edit2, FileText, X, CheckCircle2, Ban } from "lucide-react";
import toast from "react-hot-toast";

export default function ContractsPage() {
    const [contracts, setContracts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // For termination 
    const [showTerminateModal, setShowTerminateModal] = useState(false);
    const [selectedContract, setSelectedContract] = useState<any>(null);
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
    const [terminating, setTerminating] = useState(false);

    useEffect(() => {
        fetchContracts();
    }, []);

    const fetchContracts = async () => {
        setLoading(true);
        try {
            const res = await api.get('/hr/contracts');
            setContracts(res.data.data || []);
        } catch (error) {
            toast.error("Failed to load employee contracts");
        } finally {
            setLoading(false);
        }
    };

    const handleTerminate = async (e: React.FormEvent) => {
        e.preventDefault();
        setTerminating(true);
        try {
            await api.put(`/hr/contracts/${selectedContract.id}/terminate`, { end_date: endDate });
            toast.success("Contract successfully terminated");
            setShowTerminateModal(false);
            fetchContracts();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to terminate contract");
        } finally {
            setTerminating(false);
        }
    };

    const openTerminate = (contract: any) => {
        setSelectedContract(contract);
        setEndDate(new Date().toISOString().slice(0, 10));
        setShowTerminateModal(true);
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Employee Contracts</h1>
                    <p className="text-slate-500 dark:text-slate-400">View and manage HR assignments and history</p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-10"><Loader2 className="animate-spin text-emerald-600" /></div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-700/50 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Employee</th>
                                    <th className="px-6 py-4 font-semibold">Job Position</th>
                                    <th className="px-6 py-4 font-semibold">Department</th>
                                    <th className="px-6 py-4 font-semibold">Start Date</th>
                                    <th className="px-6 py-4 font-semibold">End Date</th>
                                    <th className="px-6 py-4 font-semibold">Status</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contracts.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                                            No contracts found. Hire users or create positions to assign contracts.
                                        </td>
                                    </tr>
                                ) : (
                                    contracts.map((contract) => (
                                        <tr key={contract.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-slate-800 dark:text-white">{contract.user_name}</div>
                                                <div className="text-xs text-slate-400">{contract.user_email}</div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">
                                                {contract.job_position_name || 'Generic Role'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {contract.department_name || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {new Date(contract.start_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {contract.end_date ? new Date(contract.end_date).toLocaleDateString() : 'Ongoing'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                                                    contract.status === 'active' 
                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                                    : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                }`}>
                                                    {contract.status === 'active' ? <CheckCircle2 size={14} /> : <Ban size={14} />}
                                                    <span className="capitalize">{contract.status}</span>
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {contract.status === 'active' && (
                                                    <button 
                                                        onClick={() => openTerminate(contract)}
                                                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium text-xs bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        Terminate
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Terminate Modal */}
            {showTerminateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Ban className="text-red-500" />
                                Terminate Contract
                            </h2>
                        </div>
                        <form onSubmit={handleTerminate} className="p-6 space-y-4">
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                    You are about to terminate the active employment contract for <span className="font-semibold text-slate-800 dark:text-white">{selectedContract?.user_name}</span> as <span className="font-semibold text-slate-800 dark:text-white">{selectedContract?.job_position_name}</span>.
                                </p>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Effective End Date</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowTerminateModal(false)}
                                    className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={terminating}
                                    className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 flex justify-center items-center gap-2 transition-all disabled:opacity-70"
                                >
                                    {terminating ? <Loader2 className="animate-spin" size={18} /> : null}
                                    Terminate
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
