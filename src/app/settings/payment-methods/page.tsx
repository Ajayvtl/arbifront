"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Loader2, Plus, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import toast from "react-hot-toast";

export default function PaymentMethodsPage() {
    const [methods, setMethods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', type: 'cash', description: '', is_active: true });

    useEffect(() => { fetchMethods(); }, []);

    const fetchMethods = async () => {
        try {
            const res = await api.get('/settings/payment-methods');
            setMethods(res.data.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = { ...formData, id: editing?.id };
            await api.post('/settings/payment-methods', payload);
            toast.success(editing ? "Method updated" : "Method added");
            setShowModal(false);
            fetchMethods();
        } catch (e) { toast.error("Operation failed"); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure?")) return;
        try {
            await api.delete(`/settings/payment-methods/${id}`);
            toast.success("Method deleted");
            fetchMethods();
        } catch (e) { toast.error("Delete failed"); }
    };

    const openEdit = (item: any) => {
        setEditing(item);
        setFormData({ name: item.name, type: item.type, description: item.description || '', is_active: !!item.is_active });
        setShowModal(true);
    };

    const openCreate = () => {
        setEditing(null);
        setFormData({ name: '', type: 'cash', description: '', is_active: true });
        setShowModal(true);
    };

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Payment Methods</h1>
                    <p className="text-slate-500">Configure how guests can pay.</p>
                </div>
                <Button onClick={openCreate} icon={<Plus size={16} />}>Add Method</Button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                        <tr>
                            <th className="p-4">Name</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Description</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {methods.map((pm: any) => (
                            <tr key={pm.id}>
                                <td className="p-4 font-medium">{pm.name}</td>
                                <td className="p-4 capitalize">{pm.type}</td>
                                <td className="p-4 text-slate-500">{pm.description}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${pm.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                        {pm.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="p-4 text-right space-x-2">
                                    <button onClick={() => openEdit(pm)} className="text-blue-500 hover:text-blue-600"><Edit size={16} /></button>
                                    <button onClick={() => handleDelete(pm.id)} className="text-red-500 hover:text-red-600"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                        {methods.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">No payment methods configured.</td></tr>}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Method" : "Add Method"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input label="Method Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                    <Select label="Type" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} options={[{ value: 'cash', label: 'Cash / Pay at Hotel' }, { value: 'gateway', label: 'Payment Gateway' }, { value: 'qr', label: 'QR Code / UPI' }]} />
                    <div>
                        <label className="text-sm font-medium mb-1 block">Description</label>
                        <textarea className="w-full p-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700" rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="rounded text-emerald-600" />
                        <span className="text-sm font-medium">Active</span>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button type="submit">Save</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
