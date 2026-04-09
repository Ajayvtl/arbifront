"use client";

import { useCallback, useEffect, useState, FormEvent } from "react";
import { Save, Loader2, RefreshCcw } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

type WithdrawalSettingsForm = {
  min_withdrawal: string;
  withdrawal_fee_percent: string;
  max_withdrawal_per_day: string;
  withdrawal_limit_per_user: string;
  is_withdrawal_enabled: boolean;
  processing_time: string;
};

const emptyForm: WithdrawalSettingsForm = {
  min_withdrawal: "10.0",
  withdrawal_fee_percent: "5.0",
  max_withdrawal_per_day: "1000.0",
  withdrawal_limit_per_user: "1",
  is_withdrawal_enabled: true,
  processing_time: "MANUAL",
};

export default function AdminWithdrawalSettingsPage() {
  const [form, setForm] = useState<WithdrawalSettingsForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/settings/withdrawals");
      if (response.data?.data) {
        const d = response.data.data;
        setForm({
          min_withdrawal: String(d.min_withdrawal ?? 10.0),
          withdrawal_fee_percent: String(d.withdrawal_fee_percent ?? 5.0),
          max_withdrawal_per_day: String(d.max_withdrawal_per_day ?? 1000.0),
          withdrawal_limit_per_user: String(d.withdrawal_limit_per_user ?? 1),
          is_withdrawal_enabled: Boolean(d.is_withdrawal_enabled ?? 1),
          processing_time: String(d.processing_time || "MANUAL"),
        });
      }
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to load withdrawal settings";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.put("/settings/withdrawals", {
        ...form,
        min_withdrawal: Number(form.min_withdrawal),
        withdrawal_fee_percent: Number(form.withdrawal_fee_percent),
        max_withdrawal_per_day: Number(form.max_withdrawal_per_day),
        withdrawal_limit_per_user: Number(form.withdrawal_limit_per_user),
      });
      toast.success("Withdrawal settings updated successfully");
      await loadSettings();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update withdrawal settings";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Withdrawal Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Configure global withdrawal rules and limits for users.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadSettings()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm hover:border-emerald-500"
        >
          <RefreshCcw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <form onSubmit={submit} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 md:p-6 max-w-3xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <label className="space-y-1.5 block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Minimum Withdrawal Amount</span>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={form.min_withdrawal}
                onChange={(e) => setForm({ ...form, min_withdrawal: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <p className="text-xs text-slate-500">The smallest amount a user can request to withdraw.</p>
          </label>

          <label className="space-y-1.5 block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Withdrawal Fee (%)</span>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                required
                value={form.withdrawal_fee_percent}
                onChange={(e) => setForm({ ...form, withdrawal_fee_percent: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <p className="text-xs text-slate-500">Deduction percentage applied to approved withdrawals.</p>
          </label>

          <label className="space-y-1.5 block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Max Withdrawal Per Day</span>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={form.max_withdrawal_per_day}
                onChange={(e) => setForm({ ...form, max_withdrawal_per_day: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <p className="text-xs text-slate-500">Maximum total amount a user can withdraw in a 24-hour period.</p>
          </label>

          <label className="space-y-1.5 block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Withdrawal Request Limit Per User</span>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                required
                value={form.withdrawal_limit_per_user}
                onChange={(e) => setForm({ ...form, withdrawal_limit_per_user: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <p className="text-xs text-slate-500">Number of pending/approved requests allowed per user at one time.</p>
          </label>

          <label className="space-y-1.5 block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Processing Time</span>
            <select
              value={form.processing_time}
              onChange={(e) => setForm({ ...form, processing_time: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="INSTANT">Instant (Auto-approval)</option>
              <option value="MANUAL">Manual Review</option>
              <option value="T_PLUS_1">T+1 (Next Business Day)</option>
            </select>
            <p className="text-xs text-slate-500">Determines how quickly withdrawal requests are processed.</p>
          </label>

        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={form.is_withdrawal_enabled}
                onChange={(e) => setForm({ ...form, is_withdrawal_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </div>
            <div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Enable Withdrawals Globally
              </span>
              <p className="text-xs text-slate-500">Toggle to pause or resume all user withdrawals.</p>
            </div>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
