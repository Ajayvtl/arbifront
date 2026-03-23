"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { hasAnyPermission } from '@/lib/permissions';

export default function SalaryStructuresPage() {
  const { user } = useAuth();
  const allowed = hasAnyPermission(user, ['hr.view', 'hr.manage', 'hr.payroll', 'salary_structure.view', 'salary_structure.manage', 'menu.hr']);
  const [rows, setRows] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [form, setForm] = useState({ user_id: '', currency: 'INR', basic: 0, house_rent: 0, allowances: 0, deductions: 0, overtime_rate: 0, effective_from: new Date().toISOString().slice(0, 10) });

  const load = async () => {
    try {
      const [s, e] = await Promise.all([api.get('/hr/salary-structures'), api.get('/hr/employees')]);
      setRows(s.data.data || []);
      setEmployees(e.data.data || []);
    } catch {
      toast.error('Failed to load salary structures');
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/hr/salary-structures', form);
      toast.success('Salary structure saved');
      load();
    } catch {
      toast.error('Failed to save salary structure');
    }
  };

  return (
    <div className="p-8 space-y-6">
      {!allowed ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">Access denied for Salary Structures.</div>
      ) : (
        <>
      <h1 className="text-2xl font-bold dark:text-white">Salary Structures</h1>
      <h1 className="text-xl font-bold dark:text-white border-b border-slate-100 dark:border-slate-700 pb-3 mb-4">Create / Edit Salary Structure</h1>
      <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-4 gap-5 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        
        <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Employee</label>
            <select className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none" value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })} required>
                <option value="">-- Select Employee --</option>
                {employees.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
        </div>
        
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Currency</label>
            <input className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none uppercase" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} placeholder="e.g. USD, INR" required />
        </div>

        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Effective Date</label>
            <input className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none" type="date" value={form.effective_from} onChange={e => setForm({ ...form, effective_from: e.target.value })} required />
        </div>
        
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Basic Salary</label>
            <input className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none" type="number" min="0" step="0.01" value={form.basic} onChange={e => setForm({ ...form, basic: Number(e.target.value) })} placeholder="0.00" />
        </div>

        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">House Rent (HRA)</label>
            <input className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none" type="number" min="0" step="0.01" value={form.house_rent} onChange={e => setForm({ ...form, house_rent: Number(e.target.value) })} placeholder="0.00" />
        </div>

        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Other Allowances</label>
            <input className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none" type="number" min="0" step="0.01" value={form.allowances} onChange={e => setForm({ ...form, allowances: Number(e.target.value) })} placeholder="0.00" />
        </div>

        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-amber-700 dark:text-amber-500">Standard Deductions</label>
            <input className="w-full p-2.5 rounded-lg border border-amber-200 dark:border-amber-700/50 bg-amber-50/30 dark:bg-amber-900/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none" type="number" min="0" step="0.01" value={form.deductions} onChange={e => setForm({ ...form, deductions: Number(e.target.value) })} placeholder="0.00" />
        </div>

        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-indigo-700 dark:text-indigo-400">Overtime Rate (/hr)</label>
            <input className="w-full p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-700/50 bg-indigo-50/30 dark:bg-indigo-900/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" type="number" min="0" step="0.01" value={form.overtime_rate} onChange={e => setForm({ ...form, overtime_rate: Number(e.target.value) })} placeholder="0.00" />
        </div>

        <div className="md:col-span-4 flex justify-end pt-5 border-t border-slate-100 dark:border-slate-700 mt-2">
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg px-8 py-2.5 transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center">
                Save Structure
            </button>
        </div>
      </form>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-900/40"><tr><th className="p-3 text-left">Employee</th><th className="p-3 text-left">Monthly Gross</th><th className="p-3 text-left">Deductions</th><th className="p-3 text-left">Net</th></tr></thead><tbody>
          {rows.map((r: any) => { const gross = Number(r.basic) + Number(r.house_rent) + Number(r.allowances); const net = gross - Number(r.deductions); return <tr key={r.id} className="border-t border-slate-100 dark:border-slate-700"><td className="p-3">{r.user_name}</td><td className="p-3">{r.currency} {gross.toFixed(2)}</td><td className="p-3">{r.currency} {Number(r.deductions).toFixed(2)}</td><td className="p-3 font-semibold">{r.currency} {net.toFixed(2)}</td></tr>; })}
        </tbody></table>
      </div>
        </>
      )}
    </div>
  );
}
