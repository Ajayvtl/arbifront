"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { hasAnyPermission } from '@/lib/permissions';

const fmt = (seconds: number) => {
  const s = Math.max(0, Number(seconds || 0));
  const h = Math.floor(s / 3600).toString().padStart(2, '0');
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return `${h}:${m}:${ss}`;
};

export default function AttendanceInsightsPage() {
  const { user } = useAuth();
  const allowed = hasAnyPermission(user, ['attendance.view', 'attendance.summary', 'attendance.manage', 'hr.view', 'hr.manage', 'menu.hr']);
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    try {
      const { data } = await api.get(`/hr/attendance/summary?month=${month}&year=${year}`);
      setRows(data.data || []);
    } catch {
      toast.error('Failed to load attendance insights');
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-8 space-y-6">
      {!allowed ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">Access denied for Attendance Insights.</div>
      ) : (
        <>
      <h1 className="text-2xl font-bold dark:text-white">Attendance Insights (Short Attendance)</h1>
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex gap-3 items-end">
        <div><label className="text-xs text-gray-500">Month</label><input type="number" min={1} max={12} value={month} onChange={e => setMonth(Number(e.target.value))} className="w-24 p-2 rounded border dark:bg-slate-900" /></div>
        <div><label className="text-xs text-gray-500">Year</label><input type="number" min={2000} max={2100} value={year} onChange={e => setYear(Number(e.target.value))} className="w-28 p-2 rounded border dark:bg-slate-900" /></div>
        <button onClick={load} className="bg-emerald-600 text-white rounded px-4 py-2">Load</button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-900/40"><tr><th className="p-3 text-left">Employee</th><th className="p-3 text-left">Worked</th><th className="p-3 text-left">Required</th><th className="p-3 text-left">Short</th></tr></thead><tbody>
          {rows.map((r: any) => <tr key={r.user_id} className="border-t border-slate-100 dark:border-slate-700"><td className="p-3">{r.user_name}</td><td className="p-3">{fmt(r.worked_seconds)}</td><td className="p-3">{fmt(r.required_seconds)}</td><td className="p-3 font-semibold text-red-600">{fmt(r.short_seconds)}</td></tr>)}
        </tbody></table>
      </div>
        </>
      )}
    </div>
  );
}
