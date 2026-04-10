"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCcw, Rocket, Save } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getWalletTypeLabels, WALLET_TYPE_KEYS } from "@/lib/walletTypeLabels";

type MlmSettings = {
  fast_start_bonus_enabled: number;
  fast_start_bonus_label: string;
  fast_start_window_hours: number;
  fast_start_direct_referrals: number;
  fast_start_min_package_amount: number;
  fast_start_min_total_volume: number;
  fast_start_bonus_amount: number;
  fast_start_bonus_balance_type: string;
  fast_start_apply_for_inactive: number;
  fast_start_convert_to_roi_package: number;
  wallet_type_labels?: Partial<Record<string, unknown>> | null;
};

const defaultForm: MlmSettings = {
  fast_start_bonus_enabled: 0,
  fast_start_bonus_label: "72 Hour Fast Start",
  fast_start_window_hours: 72,
  fast_start_direct_referrals: 3,
  fast_start_min_package_amount: 100,
  fast_start_min_total_volume: 300,
  fast_start_bonus_amount: 0,
  fast_start_bonus_balance_type: "direct_balance",
  fast_start_apply_for_inactive: 1,
  fast_start_convert_to_roi_package: 0,
  wallet_type_labels: null,
};

export default function FastStartBonusPage() {
  const [form, setForm] = useState<MlmSettings>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/settings/mlm");
      setForm({ ...defaultForm, ...(response.data?.data || {}) });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to load MLM settings";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const walletTypeLabels = useMemo(
    () => getWalletTypeLabels(form.wallet_type_labels || null),
    [form.wallet_type_labels]
  );

  const qualificationPreview = useMemo(() => {
    const qualifyingVolume = Number(form.fast_start_direct_referrals || 0) * Number(form.fast_start_min_package_amount || 0);
    return Math.max(qualifyingVolume, Number(form.fast_start_min_total_volume || 0));
  }, [form.fast_start_direct_referrals, form.fast_start_min_package_amount, form.fast_start_min_total_volume]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        fast_start_bonus_enabled: form.fast_start_bonus_enabled ? 1 : 0,
        fast_start_bonus_label: form.fast_start_bonus_label,
        fast_start_window_hours: Number(form.fast_start_window_hours || 0),
        fast_start_direct_referrals: Number(form.fast_start_direct_referrals || 0),
        fast_start_min_package_amount: Number(form.fast_start_min_package_amount || 0),
        fast_start_min_total_volume: Number(form.fast_start_min_total_volume || 0),
        fast_start_bonus_amount: Number(form.fast_start_bonus_amount || 0),
        fast_start_bonus_balance_type: form.fast_start_bonus_balance_type,
        fast_start_apply_for_inactive: form.fast_start_apply_for_inactive ? 1 : 0,
        fast_start_convert_to_roi_package: form.fast_start_convert_to_roi_package ? 1 : 0,
      };
      const response = await api.put("/settings/mlm", payload);
      setForm({ ...defaultForm, ...(response.data?.data || payload) });
      toast.success("Fast-start bonus settings updated");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update fast-start bonus settings";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Fast-Start Bonus</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure qualification window, direct referral thresholds, and payout destination.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadSettings()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm hover:border-emerald-500"
        >
          <RefreshCcw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading settings...
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
              <p className="text-xs text-slate-500">Status</p>
              <p className="text-2xl font-semibold">{form.fast_start_bonus_enabled ? "Enabled" : "Disabled"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
              <p className="text-xs text-slate-500">Window</p>
              <p className="text-2xl font-semibold">{form.fast_start_window_hours}h</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
              <p className="text-xs text-slate-500">Directs Needed</p>
              <p className="text-2xl font-semibold">{form.fast_start_direct_referrals}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
              <p className="text-xs text-slate-500">Qualifying Volume</p>
              <p className="text-2xl font-semibold">{qualificationPreview.toFixed(3)}</p>
            </div>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-semibold">Rule Config</h2>
            </div>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Rule Label</span>
                <input
                  value={form.fast_start_bonus_label}
                  onChange={(e) => setForm((prev) => ({ ...prev, fast_start_bonus_label: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Qualification Window (Hours)</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.fast_start_window_hours}
                  onChange={(e) => setForm((prev) => ({ ...prev, fast_start_window_hours: Number(e.target.value || 0) }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Minimum Direct Referrals</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.fast_start_direct_referrals}
                  onChange={(e) => setForm((prev) => ({ ...prev, fast_start_direct_referrals: Number(e.target.value || 0) }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Minimum Package Amount Per Direct</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.fast_start_min_package_amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, fast_start_min_package_amount: Number(e.target.value || 0) }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Minimum Total Referred Volume</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.fast_start_min_total_volume}
                  onChange={(e) => setForm((prev) => ({ ...prev, fast_start_min_total_volume: Number(e.target.value || 0) }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Bonus Amount</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.fast_start_bonus_amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, fast_start_bonus_amount: Number(e.target.value || 0) }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Credit To Balance</span>
                <select
                  value={form.fast_start_bonus_balance_type}
                  onChange={(e) => setForm((prev) => ({ ...prev, fast_start_bonus_balance_type: e.target.value }))}
                  disabled={Boolean(form.fast_start_convert_to_roi_package)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-900"
                >
                  {WALLET_TYPE_KEYS.map((walletKey) => (
                    <option key={walletKey} value={walletKey}>{walletTypeLabels[walletKey]}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2 dark:border-slate-800 dark:bg-slate-900/60">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Inactive Sponsor Eligibility</span>
                <label className="inline-flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={Boolean(form.fast_start_apply_for_inactive)}
                    onChange={(e) => setForm((prev) => ({ ...prev, fast_start_apply_for_inactive: e.target.checked ? 1 : 0 }))}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Apply fast-start bonus even if sponsor has no active package
                </label>
              </label>
              <label className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2 dark:border-slate-800 dark:bg-slate-900/60">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Convert to ROI Package</span>
                <label className="inline-flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={Boolean(form.fast_start_convert_to_roi_package)}
                    onChange={(e) => setForm((prev) => ({ ...prev, fast_start_convert_to_roi_package: e.target.checked ? 1 : 0 }))}
                    className="h-4 w-4 rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500"
                  />
                  Convert fast-start bonus to an active ROI subscription
                </label>
              </label>
              <label className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2 dark:border-slate-800 dark:bg-slate-900/60">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Fast-Start Bonus Status</span>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, fast_start_bonus_enabled: prev.fast_start_bonus_enabled ? 0 : 1 }))}
                  className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${form.fast_start_bonus_enabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}
                >
                  {form.fast_start_bonus_enabled ? "Enabled" : "Disabled"}
                </button>
              </label>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save Fast-Start Bonus"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
