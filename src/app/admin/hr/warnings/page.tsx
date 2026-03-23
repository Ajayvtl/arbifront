"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { hasAnyPermission } from '@/lib/permissions';

export default function HrWarningsPage() {
  const { user } = useAuth();
  const allowed = hasAnyPermission(user, ['hr.view', 'hr.manage', 'hr.manage_staff', 'warnings.view', 'warnings.manage', 'menu.hr']);
  const [rows, setRows] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [form, setForm] = useState({ user_id: '', warning_type: 'conduct', severity: 'medium', message: '', issued_on: new Date().toISOString().slice(0, 10) });

  const load = async () => {
    try {
      const [w, e] = await Promise.all([api.get('/hr/warnings'), api.get('/hr/employees')]);
      setRows(w.data.data || []);
      setEmployees(e.data.data || []);
    } catch {
      toast.error('Failed to load warnings');
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/hr/warnings', form);
      toast.success('Warning created');
      setForm({ ...form, message: '' });
      load();
    } catch {
      toast.error('Failed to save warning');
    }
  };

  const ack = async (id: number) => {
    try {
      await api.put(`/hr/warnings/${id}/ack`);
      toast.success('Warning acknowledged');
      load();
    } catch {
      toast.error('Failed to acknowledge');
    }
  };

  return (
    <div className="p-8 space-y-6">
      {!allowed ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">Access denied for Warnings.</div>
      ) : (
        <>
      <h1 className="text-2xl font-bold dark:text-white">Warnings & Disciplinary</h1>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <select className="p-2 rounded border dark:bg-slate-900" value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })} required>
          <option value="">Select employee</option>
          {employees.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <input className="p-2 rounded border dark:bg-slate-900" value={form.warning_type} onChange={e => setForm({ ...form, warning_type: e.target.value })} />
        <select className="p-2 rounded border dark:bg-slate-900" value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
          {['low', 'medium', 'high', 'critical'].map(v => <option key={v}>{v}</option>)}
        </select>
        <input className="p-2 rounded border dark:bg-slate-900" type="date" value={form.issued_on} onChange={e => setForm({ ...form, issued_on: e.target.value })} />
        <input className="p-2 rounded border dark:bg-slate-900" placeholder="Message" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required />
        <button className="md:col-span-5 bg-emerald-600 text-white rounded px-4 py-2">Issue Warning</button>
      </form>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-900/40"><tr><th className="p-3 text-left">Employee</th><th className="p-3 text-left">Type</th><th className="p-3 text-left">Severity</th><th className="p-3 text-left">Status</th><th className="p-3 text-right">Action</th></tr></thead><tbody>
          {rows.map((r: any) => <tr key={r.id} className="border-t border-slate-100 dark:border-slate-700"><td className="p-3">{r.user_name}</td><td className="p-3">{r.warning_type}</td><td className="p-3 uppercase text-xs">{r.severity}</td><td className="p-3">{r.status}</td><td className="p-3 text-right">{r.status !== 'acknowledged' ? <button onClick={() => ack(r.id)} className="px-2 py-1 rounded bg-amber-100 text-amber-800">Acknowledge</button> : '-'}</td></tr>)}
        </tbody></table>
      </div>
        </>
      )}
    </div>
  );
}
