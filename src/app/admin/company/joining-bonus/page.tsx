"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCcw, Save, Tag } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getWalletTypeLabels, WALLET_TYPE_KEYS } from "@/lib/walletTypeLabels";

type MlmSettings = {
  joining_bonus_enabled: number;
  joining_bonus_label: string;
  joining_bonus_amount: number;
  joining_bonus_condition: "NONE" | "PAYMENT" | "DOWNLINE" | "BOTH";
  joining_bonus_min_downline_members: number;
  joining_bonus_balance_type: string;
  wallet_type_labels?: Partial<Record<string, unknown>> | null;
};

const defaultForm: MlmSettings = {
  joining_bonus_enabled: 0,
  joining_bonus_label: "Joining Bonus",
  joining_bonus_amount: 0,
  joining_bonus_condition: "PAYMENT",
  joining_bonus_min_downline_members: 1,
  joining_bonus_balance_type: "direct_balance",
  wallet_type_labels: null,
};

export default function JoiningBonusPage() {
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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        joining_bonus_enabled: form.joining_bonus_enabled ? 1 : 0,
        joining_bonus_label: form.joining_bonus_label,
        joining_bonus_amount: Number(form.joining_bonus_amount || 0),
        joining_bonus_condition: form.joining_bonus_condition,
        joining_bonus_min_downline_members: Number(form.joining_bonus_min_downline_members || 1),
        joining_bonus_balance_type: form.joining_bonus_balance_type,
      };
      const response = await api.put("/settings/mlm", payload);
      setForm({ ...defaultForm, ...(response.data?.data || payload) });
      toast.success("Joining bonus settings updated");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update joining bonus settings";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Joining Bonus</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure sponsor joining bonus rule and target wallet.
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
              <p className="text-2xl font-semibold">{form.joining_bonus_enabled ? "Enabled" : "Disabled"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
              <p className="text-xs text-slate-500">Condition</p>
              <p className="text-2xl font-semibold">{form.joining_bonus_condition}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
              <p className="text-xs text-slate-500">Bonus Amount</p>
              <p className="text-2xl font-semibold">{Number(form.joining_bonus_amount || 0).toFixed(3)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
              <p className="text-xs text-slate-500">Min Downline</p>
              <p className="text-2xl font-semibold">{Number(form.joining_bonus_min_downline_members || 0)}</p>
            </div>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-fuchsia-500" />
              <h2 className="text-lg font-semibold">Rule Config</h2>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Bonus Label</span>
                <input
                  value={form.joining_bonus_label}
                  onChange={(e) => setForm((prev) => ({ ...prev, joining_bonus_label: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Bonus Amount</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.joining_bonus_amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, joining_bonus_amount: Number(e.target.value || 0) }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Condition Mode</span>
                <select
                  value={form.joining_bonus_condition}
                  onChange={(e) => setForm((prev) => ({ ...prev, joining_bonus_condition: e.target.value as MlmSettings["joining_bonus_condition"] }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="NONE">None</option>
                  <option value="PAYMENT">Payment Required</option>
                  <option value="DOWNLINE">Downline Required</option>
                  <option value="BOTH">Both Required</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Minimum Downline Members</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.joining_bonus_min_downline_members}
                  disabled={form.joining_bonus_condition === "NONE" || form.joining_bonus_condition === "PAYMENT"}
                  onChange={(e) => setForm((prev) => ({ ...prev, joining_bonus_min_downline_members: Number(e.target.value || 1) }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Credit To Balance</span>
                <select
                  value={form.joining_bonus_balance_type}
                  onChange={(e) => setForm((prev) => ({ ...prev, joining_bonus_balance_type: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                >
                  {WALLET_TYPE_KEYS.map((walletKey) => (
                    <option key={walletKey} value={walletKey}>{walletTypeLabels[walletKey]}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2 dark:border-slate-800 dark:bg-slate-900/60">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Joining Bonus Status</span>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, joining_bonus_enabled: prev.joining_bonus_enabled ? 0 : 1 }))}
                  className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${form.joining_bonus_enabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}
                >
                  {form.joining_bonus_enabled ? "Enabled" : "Disabled"}
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
              {saving ? "Saving..." : "Save Joining Bonus"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
