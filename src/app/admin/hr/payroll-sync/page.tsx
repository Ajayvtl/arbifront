"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { hasAnyPermission } from '@/lib/permissions';

export default function PayrollSyncPage() {
  const { user } = useAuth();
  const allowed = hasAnyPermission(user, ['hr.manage', 'hr.payroll', 'payroll.sync', 'menu.hr']);
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    try {
      const { data } = await api.get('/hr/payroll/sync/history');
      setRows(data.data || []);
    } catch {
      toast.error('Failed to load sync history');
    }
  };

  useEffect(() => { load(); }, []);

  const sync = async () => {
    try {
      await api.post('/hr/payroll/sync', { month, year });
      toast.success('Payroll sync completed');
      load();
    } catch {
      toast.error('Payroll sync failed');
    }
  };

  return (
    <div className="p-8 space-y-6">
      {!allowed ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">Access denied for Payroll Sync.</div>
      ) : (
        <>
      <h1 className="text-2xl font-bold dark:text-white">Payroll Synchronization</h1>
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex gap-3 items-end">
        <div><label className="text-xs text-gray-500">Month</label><input type="number" min={1} max={12} value={month} onChange={e => setMonth(Number(e.target.value))} className="w-24 p-2 rounded border dark:bg-slate-900" /></div>
        <div><label className="text-xs text-gray-500">Year</label><input type="number" min={2000} max={2100} value={year} onChange={e => setYear(Number(e.target.value))} className="w-28 p-2 rounded border dark:bg-slate-900" /></div>
        <button onClick={sync} className="bg-emerald-600 text-white rounded px-4 py-2">Run Sync</button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-900/40"><tr><th className="p-3 text-left">Sync Time</th><th className="p-3 text-left">Period</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Summary</th></tr></thead><tbody>
          {rows.map((r: any) => <tr key={r.id} className="border-t border-slate-100 dark:border-slate-700"><td className="p-3">{new Date(r.synced_at || r.created_at).toLocaleString()}</td><td className="p-3">{r.month}/{r.year}</td><td className="p-3 uppercase text-xs">{r.status}</td><td className="p-3">{r.summary?.payroll_records ?? '-'} payroll / {r.summary?.attendance_records ?? '-'} attendance</td></tr>)}
        </tbody></table>
      </div>
        </>
      )}
    </div>
  );
}
