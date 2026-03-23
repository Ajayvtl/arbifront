"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { hasAnyPermission } from '@/lib/permissions';

export default function HrShiftsPage() {
  const { user } = useAuth();
  const allowed = hasAnyPermission(user, ['hr.manage', 'hr.manage_staff', 'shifts.manage', 'menu.hr']);
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', start_time: '09:00', end_time: '18:00', lunch_minutes: 60, grace_minutes: 15, work_minutes_required: 480, is_flexible: false, is_field_shift: false });
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    try {
      const { data } = await api.get('/hr/shifts');
      setItems(data.data || []);
    } catch {
      toast.error('Failed to load shifts');
    }
  };

  useEffect(() => { load(); }, []);

  // Auto-calculate workduration based on start/end/lunch
  useEffect(() => {
    if (form.start_time && form.end_time) {
      const [sh, sm] = form.start_time.split(':').map(Number);
      const [eh, em] = form.end_time.split(':').map(Number);
      
      let start_mins = sh * 60 + (sm || 0);
      let end_mins = eh * 60 + (em || 0);
      
      if (end_mins < start_mins) {
        end_mins += 24 * 60; // Next day
      }
      
      let total_worked = end_mins - start_mins - (form.lunch_minutes || 0);
      if (total_worked < 0) total_worked = 0;
      
      setForm(prev => {
        if (prev.work_minutes_required === total_worked) return prev;
        return { ...prev, work_minutes_required: total_worked };
      });
    }
  }, [form.start_time, form.end_time, form.lunch_minutes]);

  const formatDuration = (mins: number) => {
    const h = Math.floor((mins || 0) / 60);
    const m = (mins || 0) % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const handleEdit = (shift: any) => {
    setEditingId(shift.id);
    setForm({
      name: shift.name,
      start_time: shift.start_time || '',
      end_time: shift.end_time || '',
      lunch_minutes: shift.lunch_minutes,
      grace_minutes: shift.grace_minutes,
      work_minutes_required: shift.work_minutes_required,
      is_flexible: !!shift.is_flexible,
      is_field_shift: !!shift.is_field_shift
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ name: '', start_time: '09:00', end_time: '18:00', lunch_minutes: 60, grace_minutes: 15, work_minutes_required: 480, is_flexible: false, is_field_shift: false });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/hr/shifts/${editingId}`, form);
        toast.success('Shift updated');
      } else {
        await api.post('/hr/shifts', form);
        toast.success('Shift created');
      }
      cancelEdit();
      load();
    } catch {
      toast.error('Failed to save shift');
    }
  };

  return (
    <div className="p-8 space-y-6">
      {!allowed ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">Access denied for Shift Management.</div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold dark:text-white">Shift Management</h1>
            {editingId && (
              <button onClick={cancelEdit} className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                Cancel Editing
              </button>
            )}
          </div>

          <form onSubmit={save} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2">
              {editingId ? 'Edit Shift Details' : 'Create New Shift'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Shift Name</label>
                <input className="w-full p-2 rounded border dark:bg-slate-900 dark:border-slate-600" placeholder="e.g. Morning Shift" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Time</label>
                <input className="w-full p-2 rounded border dark:bg-slate-900 dark:border-slate-600" type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} required />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Time</label>
                <input className="w-full p-2 rounded border dark:bg-slate-900 dark:border-slate-600" type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} required />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Lunch Break (Min)</label>
                <input className="w-full p-2 rounded border dark:bg-slate-900 dark:border-slate-600" type="number" placeholder="60" value={form.lunch_minutes} onChange={e => setForm({ ...form, lunch_minutes: Number(e.target.value) })} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Work Duration (HH:mm)</label>
                <div className="w-full p-2 rounded border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 font-mono font-medium flex items-center h-[42px] cursor-not-allowed select-none">
                  {formatDuration(form.work_minutes_required)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Grace Period (Min)</label>
                <input className="w-full p-2 rounded border dark:bg-slate-900 dark:border-slate-600" type="number" placeholder="15" value={form.grace_minutes} onChange={e => setForm({ ...form, grace_minutes: Number(e.target.value) })} />
              </div>

              <div className="flex flex-col justify-end pb-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer w-fit">
                  <input type="checkbox" className="rounded text-emerald-600" checked={form.is_flexible} onChange={e => setForm({ ...form, is_flexible: e.target.checked })} />
                  Flexible Timing
                </label>
              </div>

              <div className="flex flex-col justify-end pb-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer w-fit">
                  <input type="checkbox" className="rounded text-emerald-600" checked={form.is_field_shift} onChange={e => setForm({ ...form, is_field_shift: e.target.checked })} />
                  Field Shift
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button className={`rounded px-6 py-2.5 text-white font-medium transition-colors ${editingId ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'} shadow-lg`}>
                {editingId ? 'Update Shift Configuration' : 'Create New Shift'}
              </button>
            </div>
          </form>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/40">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Timing</th>
                  <th className="p-3 text-left">Policy</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s: any) => (
                  <tr key={s.id} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="p-3">{s.name}</td>
                    <td className="p-3">{s.start_time || '-'} - {s.end_time || '-'}</td>
                    <td className="p-3">Work: {formatDuration(s.work_minutes_required)} | Lunch: {s.lunch_minutes}m | Grace: {s.grace_minutes}m {s.is_flexible ? '| Flexible' : ''} {s.is_field_shift ? '| Field' : ''}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleEdit(s)}
                        className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
