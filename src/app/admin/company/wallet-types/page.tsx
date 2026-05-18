"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCw, Save, ToggleLeft, ToggleRight, Trash2, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { DEFAULT_WALLET_TYPE_LABELS, WALLET_TYPE_KEYS, WalletTypeLabelMap } from "@/lib/walletTypeLabels";

type WalletTypeItem = {
  code: string;
  label: string;
  base_wallet: string;
  is_active: number;
  is_system: number;
};

type MlmSettings = {
  wallet_type_labels?: Partial<Record<string, unknown>> | null;
  wallet_types?: WalletTypeItem[] | null;
};

type DraftWalletType = {
  code: string;
  label: string;
  base_wallet: string;
};

const baseWalletHelp: Record<string, string> = {
  main_balance: "Primary account bucket.",
  earning_balance: "General earnings bucket.",
  roi_balance: "Daily ROI income bucket.",
  direct_balance: "Direct referral/working income bucket.",
  level_balance: "Level income bucket.",
  withdrawable_balance: "Available for withdrawal.",
  reward_balance: "Rewards and rank bonuses.",
  locked_balance: "Locked/hold amount.",
};

const emptyDraft: DraftWalletType = {
  code: "",
  label: "",
  base_wallet: "reward_balance",
};

function normalizeWalletCode(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function deriveFromSettings(settings: MlmSettings | null): WalletTypeItem[] {
  const fromApi = Array.isArray(settings?.wallet_types) ? settings.wallet_types : [];
  const base = fromApi.map((item) => ({
    code: normalizeWalletCode(item.code || ""),
    label: String(item.label || "").trim() || String(item.code || "").trim(),
    base_wallet: String(item.base_wallet || "").trim().toLowerCase(),
    is_active: Number(item.is_active || 0) ? 1 : 0,
    is_system: Number(item.is_system || 0) ? 1 : 0,
  })).filter((item) => item.code && WALLET_TYPE_KEYS.includes(item.base_wallet as (typeof WALLET_TYPE_KEYS)[number]));

  const seen = new Set(base.map((item) => item.code));
  const labels = settings?.wallet_type_labels && typeof settings.wallet_type_labels === "object"
    ? settings.wallet_type_labels
    : {};

  for (const key of WALLET_TYPE_KEYS) {
    if (seen.has(key)) continue;
    const label = String(labels[key] || DEFAULT_WALLET_TYPE_LABELS[key]).trim() || DEFAULT_WALLET_TYPE_LABELS[key];
    base.push({
      code: key,
      label,
      base_wallet: key,
      is_active: 1,
      is_system: 1,
    });
  }

  return base;
}

function buildLabelMap(items: WalletTypeItem[]): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const item of items) {
    if (!item?.code) continue;
    labels[item.code] = String(item.label || item.code).trim() || item.code;
  }
  return labels;
}

export default function WalletTypesPage() {
  const [walletTypes, setWalletTypes] = useState<WalletTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<DraftWalletType>(emptyDraft);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/settings/mlm");
      const data = (response.data?.data || null) as MlmSettings | null;
      setWalletTypes(deriveFromSettings(data));
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

  const activeCount = useMemo(
    () => walletTypes.filter((item) => Number(item.is_active || 0) === 1).length,
    [walletTypes]
  );

  const addWalletType = () => {
    const code = normalizeWalletCode(draft.code);
    const label = String(draft.label || "").trim();
    const baseWallet = String(draft.base_wallet || "").trim().toLowerCase();

    if (!code) {
      toast.error("Code is required");
      return;
    }
    if (!label) {
      toast.error("Label is required");
      return;
    }
    if (!WALLET_TYPE_KEYS.includes(baseWallet as (typeof WALLET_TYPE_KEYS)[number])) {
      toast.error("Base wallet is invalid");
      return;
    }
    if (walletTypes.some((item) => item.code === code)) {
      toast.error("Code already exists");
      return;
    }

    setWalletTypes((prev) => [
      ...prev,
      {
        code,
        label,
        base_wallet: baseWallet,
        is_active: 1,
        is_system: 0,
      },
    ]);
    setDraft(emptyDraft);
  };

  const removeWalletType = (code: string) => {
    const target = walletTypes.find((item) => item.code === code);
    if (!target) return;
    if (Number(target.is_system || 0) === 1) {
      toast.error("System wallet types cannot be deleted");
      return;
    }
    setWalletTypes((prev) => prev.filter((item) => item.code !== code));
  };

  const toggleActive = (code: string) => {
    setWalletTypes((prev) =>
      prev.map((item) =>
        item.code === code
          ? { ...item, is_active: Number(item.is_active || 0) === 1 ? 0 : 1 }
          : item
      )
    );
  };

  const updateLabel = (code: string, label: string) => {
    setWalletTypes((prev) =>
      prev.map((item) =>
        item.code === code
          ? { ...item, label: label }
          : item
      )
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        wallet_types: walletTypes.map((item) => ({
          code: normalizeWalletCode(item.code),
          label: String(item.label || "").trim() || item.code,
          base_wallet: String(item.base_wallet || "").trim().toLowerCase(),
          is_active: Number(item.is_active || 0) ? 1 : 0,
          is_system: Number(item.is_system || 0) ? 1 : 0,
        })),
        wallet_type_labels: buildLabelMap(walletTypes),
      };
      const response = await api.put("/settings/mlm", payload);
      const data = (response.data?.data || null) as MlmSettings | null;
      setWalletTypes(deriveFromSettings(data));
      toast.success("Wallet types updated");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update wallet types";
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
            Dynamic logical wallet types mapped to physical wallet buckets.
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4"><p className="text-xs text-slate-500">Total Types</p><p className="text-2xl font-semibold">{walletTypes.length}</p></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4"><p className="text-xs text-slate-500">Active Types</p><p className="text-2xl font-semibold">{activeCount}</p></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4"><p className="text-xs text-slate-500">System Types</p><p className="text-2xl font-semibold">{walletTypes.filter((item) => Number(item.is_system || 0) === 1).length}</p></div>
      </div>

      <form onSubmit={(event) => void submit(event)} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Code</span>
              <input
                value={draft.code}
                onChange={(e) => setDraft((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="e.g. rank_bonus_wallet"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Label</span>
              <input
                value={draft.label}
                onChange={(e) => setDraft((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="e.g. Rank Bonus Wallet"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Base Wallet</span>
              <select
                value={draft.base_wallet}
                onChange={(e) => setDraft((prev) => ({ ...prev, base_wallet: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
              >
                {WALLET_TYPE_KEYS.map((key) => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={addWalletType}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {walletTypes.map((item) => (
            <div key={item.code} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Code</span>
                  <div className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono dark:border-slate-700 dark:bg-slate-900">{item.code}</div>
                </div>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Label</span>
                  <input
                    value={item.label}
                    onChange={(e) => updateLabel(item.code, e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                  />
                </label>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Base Wallet</span>
                  <div className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900">
                    {item.base_wallet}
                  </div>
                  <p className="text-[11px] text-slate-500">{baseWalletHelp[item.base_wallet] || ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleActive(item.code)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs hover:border-emerald-500 dark:border-slate-700"
                  >
                    {Number(item.is_active || 0) === 1 ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4 text-slate-400" />}
                    {Number(item.is_active || 0) === 1 ? "Active" : "Inactive"}
                  </button>
                </div>
                <div className="flex justify-end gap-2">
                  {Number(item.is_system || 0) === 1 ? (
                    <span className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-500 dark:border-slate-700">System</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeWalletType(item.code)}
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-300 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
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
