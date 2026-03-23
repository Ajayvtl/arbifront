"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Loader2, Plus, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import toast from "react-hot-toast";

export default function TaxesPage() {
    const [taxes, setTaxes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', type: 'percentage', value: 0, is_active: true });

    useEffect(() => { fetchTaxes(); }, []);

    const fetchTaxes = async () => {
        try {
            const res = await api.get('/settings/taxes');
            setTaxes(res.data.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = { ...formData, id: editing?.id };
            await api.post('/settings/taxes', payload);
            toast.success(editing ? "Tax updated" : "Tax added");
            setShowModal(false);
            fetchTaxes();
        } catch (e) { toast.error("Operation failed"); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure?")) return;
        try {
            await api.delete(`/settings/taxes/${id}`);
            toast.success("Tax deleted");
            fetchTaxes();
        } catch (e) { toast.error("Delete failed"); }
    };

    const openEdit = (item: any) => {
        setEditing(item);
        setFormData({ name: item.name, type: item.type, value: item.value, is_active: !!item.is_active });
        setShowModal(true);
    };

    const openCreate = () => {
        setEditing(null);
        setFormData({ name: '', type: 'percentage', value: 0, is_active: true });
        setShowModal(true);
    };

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Tax Settings</h1>
                    <p className="text-slate-500">Manage applicable taxes for bookings.</p>
                </div>
                <Button onClick={openCreate} icon={<Plus size={16} />}>Add Tax</Button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                        <tr>
                            <th className="p-4">Name</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Value</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {taxes.map((tax: any) => (
                            <tr key={tax.id}>
                                <td className="p-4 font-medium">{tax.name}</td>
                                <td className="p-4 capitalize">{tax.type}</td>
                                <td className="p-4">{tax.type === 'percentage' ? `${tax.value}%` : `₹${tax.value}`}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${tax.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                        {tax.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="p-4 text-right space-x-2">
                                    <button onClick={() => openEdit(tax)} className="text-blue-500 hover:text-blue-600"><Edit size={16} /></button>
                                    <button onClick={() => handleDelete(tax.id)} className="text-red-500 hover:text-red-600"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                        {taxes.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">No taxes configured.</td></tr>}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Tax" : "Add Tax"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input label="Tax Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                    <Select label="Type" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} options={[{ value: 'percentage', label: 'Percentage (%)' }, { value: 'fixed', label: 'Fixed Amount (₹)' }]} />
                    <Input label="Value" type="number" value={formData.value} onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) })} required />
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
