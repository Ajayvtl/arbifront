"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { hasAnyPermission } from '@/lib/permissions';

export default function EmployeeStatusPage() {
  const { user } = useAuth();
  const allowed = hasAnyPermission(user, ['hr.view', 'hr.manage', 'hr.manage_staff', 'employee_status.view', 'employee_status.manage', 'menu.hr']);
  const [rows, setRows] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [form, setForm] = useState({ user_id: '', status: 'probation', effective_date: new Date().toISOString().slice(0, 10), notes: '' });

  const load = async () => {
    try {
      const [s, e] = await Promise.all([api.get('/hr/employee-status'), api.get('/hr/employees')]);
      setRows(s.data.data || []);
      setEmployees(e.data.data || []);
    } catch {
      toast.error('Failed to load status data');
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/hr/employee-status', form);
      toast.success('Employee status updated');
      setForm({ ...form, notes: '' });
      load();
    } catch {
      toast.error('Failed to save status');
    }
  };

  return (
    <div className="p-8 space-y-6">
      {!allowed ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">Access denied for Employee Status.</div>
      ) : (
        <>
      <h1 className="text-2xl font-bold dark:text-white">Employee Lifecycle Status</h1>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <select className="p-2 rounded border dark:bg-slate-900" value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })} required>
          <option value="">Select employee</option>
          {employees.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select className="p-2 rounded border dark:bg-slate-900" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
          {['probation', 'confirmed', 'warning', 'notice', 'suspended', 'relieved'].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <input className="p-2 rounded border dark:bg-slate-900" type="date" value={form.effective_date} onChange={e => setForm({ ...form, effective_date: e.target.value })} />
        <input className="p-2 rounded border dark:bg-slate-900" placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        <button className="md:col-span-4 bg-emerald-600 text-white rounded px-4 py-2">Save Status</button>
      </form>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-900/40"><tr><th className="p-3 text-left">Employee</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Effective</th><th className="p-3 text-left">Notes</th></tr></thead><tbody>
          {rows.map((r: any) => <tr key={r.id} className="border-t border-slate-100 dark:border-slate-700"><td className="p-3">{r.user_name}</td><td className="p-3 uppercase text-xs font-semibold">{r.status}</td><td className="p-3">{new Date(r.effective_date).toLocaleDateString()}</td><td className="p-3">{r.notes || '-'}</td></tr>)}
        </tbody></table>
      </div>
        </>
      )}
    </div>
  );
}
