"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { hasAnyPermission } from '@/lib/permissions';

export default function HrPoliciesPage() {
  const { user } = useAuth();
  const allowed = hasAnyPermission(user, ['hr.policies.view', 'hr.policies.manage', 'hr.manage', 'roles.manage', 'menu.hr']);

  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({
    scope: 'SYSTEM',
    applies_to: 'all',
    product_id: '',
    package_id: '',
    hotel_id: '',
    entity: 'employee',
    action: 'update',
    field_key: '',
    field_label: '',
    is_required: true,
    is_active: true
  });

  const load = async () => {
    try {
      const { data } = await api.get('/hr/policies');
      setRows(data.data || []);
    } catch {
      toast.error('Failed to load HR policies');
    }
  };

  useEffect(() => { if (allowed) load(); }, [allowed]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        product_id: form.product_id || null,
        package_id: form.package_id || null,
        hotel_id: form.hotel_id || null
      };
      await api.post('/hr/policies', payload);
      toast.success('Policy saved');
      setForm({ ...form, field_key: '', field_label: '' });
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save policy');
    }
  };

  const disablePolicy = async (id: number) => {
    try {
      await api.delete(`/hr/policies/${id}`);
      toast.success('Policy disabled');
      load();
    } catch {
      toast.error('Failed to disable policy');
    }
  };

  if (!allowed) {
    return <div className="p-8"><div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">Access denied for HR Field Policies.</div></div>;
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold dark:text-white">HR Field Policies</h1>

      <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <select className="p-2 border rounded dark:bg-slate-900" value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value })}>
          {['SYSTEM', 'PRODUCT', 'PACKAGE', 'HOTEL'].map(v => <option key={v}>{v}</option>)}
        </select>
        <select className="p-2 border rounded dark:bg-slate-900" value={form.applies_to} onChange={e => setForm({ ...form, applies_to: e.target.value })}>
          {['all', 'system', 'tenant'].map(v => <option key={v}>{v}</option>)}
        </select>
        <input className="p-2 border rounded dark:bg-slate-900" placeholder="product_id" value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })} />
        <input className="p-2 border rounded dark:bg-slate-900" placeholder="package_id" value={form.package_id} onChange={e => setForm({ ...form, package_id: e.target.value })} />
        <input className="p-2 border rounded dark:bg-slate-900" placeholder="hotel_id" value={form.hotel_id} onChange={e => setForm({ ...form, hotel_id: e.target.value })} />

        <input className="p-2 border rounded dark:bg-slate-900" placeholder="entity (e.g. employee)" value={form.entity} onChange={e => setForm({ ...form, entity: e.target.value })} required />
        <input className="p-2 border rounded dark:bg-slate-900" placeholder="action (e.g. update/create)" value={form.action} onChange={e => setForm({ ...form, action: e.target.value })} required />
        <input className="p-2 border rounded dark:bg-slate-900" placeholder="field_key (e.g. phone)" value={form.field_key} onChange={e => setForm({ ...form, field_key: e.target.value })} required />
        <input className="p-2 border rounded dark:bg-slate-900" placeholder="field_label" value={form.field_label} onChange={e => setForm({ ...form, field_label: e.target.value })} />

        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_required} onChange={e => setForm({ ...form, is_required: e.target.checked })} /> Required</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Active</label>

        <button className="md:col-span-5 bg-emerald-600 text-white rounded px-4 py-2">Save Policy</button>
      </form>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/40">
            <tr>
              <th className="p-3 text-left">Scope</th>
              <th className="p-3 text-left">Applies</th>
              <th className="p-3 text-left">Entity/Action</th>
              <th className="p-3 text-left">Field</th>
              <th className="p-3 text-left">State</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-slate-700">
                <td className="p-3">{r.scope}</td>
                <td className="p-3">{r.applies_to}</td>
                <td className="p-3">{r.entity} / {r.action}</td>
                <td className="p-3">{r.field_key}</td>
                <td className="p-3">{r.is_active ? 'active' : 'inactive'}</td>
                <td className="p-3 text-right">
                  {r.is_active ? (
                    <button onClick={() => disablePolicy(r.id)} className="px-2 py-1 text-xs rounded bg-red-100 text-red-700">Disable</button>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
