"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Save, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { DEFAULT_WALLET_TYPE_LABELS, getWalletTypeLabels, WALLET_TYPE_KEYS, WalletTypeLabelMap } from "@/lib/walletTypeLabels";

type MlmSettings = {
  wallet_type_labels?: Partial<Record<string, unknown>> | null;
};

const fieldHelp: Record<keyof WalletTypeLabelMap, string> = {
  main_balance: "Primary account bucket.",
  earning_balance: "General earnings bucket.",
  roi_balance: "Daily ROI income bucket.",
  direct_balance: "Direct referral/working income bucket.",
  level_balance: "Level income bucket.",
  withdrawable_balance: "Available for withdrawal.",
  reward_balance: "Rewards and rank bonuses.",
  locked_balance: "Locked/hold amount.",
};

export default function WalletTypesPage() {
  const [form, setForm] = useState<WalletTypeLabelMap>(DEFAULT_WALLET_TYPE_LABELS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/settings/mlm");
      const data = (response.data?.data || null) as MlmSettings | null;
      setForm(getWalletTypeLabels(data?.wallet_type_labels || null));
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to load wallet types";
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
      const response = await api.put("/settings/mlm", { wallet_type_labels: form });
      const data = (response.data?.data || {}) as MlmSettings;
      setForm(getWalletTypeLabels(data.wallet_type_labels || form));
      toast.success("Wallet type labels updated");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update wallet type labels";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading wallet type settings...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Wallet Types</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage wallet bucket labels shown across DApp and admin interfaces.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadSettings()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:border-emerald-500 dark:border-slate-700"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <form onSubmit={(event) => void submit(event)} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {WALLET_TYPE_KEYS.map((key) => (
            <label key={key} className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
                <Wallet className="h-3.5 w-3.5" />
                {key}
              </span>
              <input
                value={form[key]}
                maxLength={80}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
              />
              <p className="text-xs text-slate-500">{fieldHelp[key]}</p>
            </label>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Wallet Types"}
          </button>
        </div>
      </form>
    </div>
  );
}
