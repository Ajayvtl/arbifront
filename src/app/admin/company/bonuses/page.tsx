"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Clock3, Loader2, Save, Settings2, Zap } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getWalletTypeLabels, WALLET_TYPE_KEYS } from "@/lib/walletTypeLabels";

type MlmSettings = {
  roi_credit_time_utc: string;
  roi_credit_enabled: number;
  direct_income_enabled: number;
  direct_income_percent: number;
  direct_income_min_package_amount: number;
  direct_income_balance_type: string;
  payment_mode: "REAL" | "SIMULATED";
  joining_bonus_enabled: number;
  joining_bonus_label: string;
  joining_bonus_amount: number;
  joining_bonus_condition: "NONE" | "PAYMENT" | "DOWNLINE" | "BOTH";
  joining_bonus_min_downline_members: number;
  joining_bonus_balance_type: string;
  fast_start_bonus_enabled: number;
  fast_start_bonus_label: string;
  fast_start_window_hours: number;
  fast_start_direct_referrals: number;
  fast_start_min_package_amount: number;
  fast_start_min_total_volume: number;
  fast_start_bonus_amount: number;
  fast_start_bonus_balance_type: string;
  fast_start_apply_for_inactive: number;
  working_gain_enabled: number;
  working_gain_label: string;
  working_gain_direct_referrals: number;
  working_gain_min_direct_volume: number;
  working_gain_extra_roi_percent: number;
  working_gain_boosted_cap_multiplier: number;
  direct_income_rules?: DirectIncomeRule[];
  working_gain_rules?: WorkingGainRule[];
  wallet_type_labels?: Partial<Record<string, unknown>> | null;
};

type DirectIncomeRule = {
  code: string;
  name: string;
  minAmount: number;
  maxAmount: number;
  percent: number;
  balanceType: string;
  enabled: boolean;
};

type WorkingGainRule = {
  code: string;
  name: string;
  minAmount: number;
  maxAmount: number;
  directReferrals: number;
  minDirectVolume: number;
  extraRoiPercent: number;
  boostedCapMultiplier: number;
  enabled: boolean;
};

const defaultForm: MlmSettings = {
  roi_credit_time_utc: "00:00",
  roi_credit_enabled: 1,
  direct_income_enabled: 0,
  direct_income_percent: 0,
  direct_income_min_package_amount: 0,
  direct_income_balance_type: "direct_balance",
  payment_mode: "REAL",
  joining_bonus_enabled: 0,
  joining_bonus_label: "Joining Bonus",
  joining_bonus_amount: 0,
  joining_bonus_condition: "PAYMENT",
  joining_bonus_min_downline_members: 1,
  joining_bonus_balance_type: "direct_balance",
  fast_start_bonus_enabled: 0,
  fast_start_bonus_label: "72 Hour Fast Start",
  fast_start_window_hours: 72,
  fast_start_direct_referrals: 3,
  fast_start_min_package_amount: 100,
  fast_start_min_total_volume: 300,
  fast_start_bonus_amount: 0,
  fast_start_bonus_balance_type: "direct_balance",
  fast_start_apply_for_inactive: 1,
  working_gain_enabled: 0,
  working_gain_label: "ROI Increment (Working)",
  working_gain_direct_referrals: 0,
  working_gain_min_direct_volume: 0,
  working_gain_extra_roi_percent: 0,
  working_gain_boosted_cap_multiplier: 2,
  direct_income_rules: [],
  working_gain_rules: [],
};

export default function CompanyBonusesPage() {
  const [form, setForm] = useState<MlmSettings>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const addDirectIncomeRule = () => {
    setForm((prev) => ({
      ...prev,
      direct_income_rules: [
        ...(prev.direct_income_rules || []),
        {
          code: `direct_income_${(prev.direct_income_rules || []).length + 1}`,
          name: `Direct Income ${(prev.direct_income_rules || []).length + 1}`,
          minAmount: 0,
          maxAmount: 0,
          percent: 0,
          balanceType: "direct_balance",
          enabled: true,
        },
      ],
    }));
  };

  const addWorkingGainRule = () => {
    setForm((prev) => ({
      ...prev,
      working_gain_rules: [
        ...(prev.working_gain_rules || []),
        {
          code: `working_gain_${(prev.working_gain_rules || []).length + 1}`,
          name: `ROI Increment (Working) ${(prev.working_gain_rules || []).length + 1}`,
          minAmount: 0,
          maxAmount: 0,
          directReferrals: 0,
          minDirectVolume: 0,
          extraRoiPercent: 0,
          boostedCapMultiplier: 2,
          enabled: true,
        },
      ],
    }));
  };

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

  const qualificationPreview = useMemo(() => {
    const qualifyingVolume = Number(form.fast_start_direct_referrals || 0) * Number(form.fast_start_min_package_amount || 0);
    return Math.max(qualifyingVolume, Number(form.fast_start_min_total_volume || 0));
  }, [form.fast_start_direct_referrals, form.fast_start_min_package_amount, form.fast_start_min_total_volume]);

  const directIncomePreview = useMemo(() => {
    const firstRule = (form.direct_income_rules || [])[0];
    if (!firstRule) return 0;
    return (Number(firstRule.minAmount || 0) * Number(firstRule.percent || 0)) / 100;
  }, [form.direct_income_rules]);
  const walletTypeLabels = useMemo(
    () => getWalletTypeLabels(form.wallet_type_labels || null),
    [form.wallet_type_labels]
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        roi_credit_enabled: form.roi_credit_enabled ? 1 : 0,
        direct_income_enabled: form.direct_income_enabled ? 1 : 0,
        joining_bonus_enabled: form.joining_bonus_enabled ? 1 : 0,
        working_gain_enabled: form.working_gain_enabled ? 1 : 0,
        fast_start_bonus_enabled: form.fast_start_bonus_enabled ? 1 : 0,
      };
      const response = await api.put("/settings/mlm", payload);
      setForm({ ...defaultForm, ...(response.data?.data || payload) });
      toast.success("MLM settings updated");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update MLM settings";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Bonus Campaigns & ROI Timing</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Configure ROI timing, direct referral income, working-gain ROI uplift, and fast-start bonus rules from one company control panel.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadSettings()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:border-emerald-500 dark:border-slate-700"
        >
          <Settings2 className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading company MLM settings...
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-cyan-500" />
                <h2 className="text-lg font-semibold">Payment Mode</h2>
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Control whether end users perform real wallet payments or use simulated package activation for dummy testing.
              </p>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Mode</span>
                  <select
                    value={form.payment_mode}
                    onChange={(e) => setForm((prev) => ({ ...prev, payment_mode: e.target.value as MlmSettings["payment_mode"] }))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="REAL">Real Payment</option>
                    <option value="SIMULATED">Simulated Payment</option>
                  </select>
                </label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Current Behavior</p>
                  <p className="mt-2 text-slate-600 dark:text-slate-300">
                    {form.payment_mode === "SIMULATED"
                      ? "Real wallet transfer and backend verification are disabled. End users can activate dummy paid orders with a simulate button."
                      : "Real wallet transfer and backend chain verification are enabled."}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <Clock3 className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-semibold">ROI Wallet Credit Window</h2>
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                This sets the daily time reference the end-user ROI page shows for wallet credit visibility. The scheduling engine can consume the same setting later.
              </p>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Credit Time (UTC)</span>
                  <input
                    type="time"
                    value={form.roi_credit_time_utc}
                    onChange={(e) => setForm((prev) => ({ ...prev, roi_credit_time_utc: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                  />
                </label>
                <label className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">ROI Credit Visibility</span>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, roi_credit_enabled: prev.roi_credit_enabled ? 0 : 1 }))}
                    className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${form.roi_credit_enabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}
                  >
                    {form.roi_credit_enabled ? "Enabled" : "Disabled"}
                  </button>
                  <p className="text-xs text-slate-500">When enabled, the dapp ROI page shows this wallet posting window to members.</p>
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-sky-500" />
                <h2 className="text-lg font-semibold">Direct Income Rule</h2>
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Credit the sponsor a percentage of each direct referral package payment. This is the ongoing direct commission, separate from fast-start bonus campaigns.
              </p>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">Define multiple slabs by sponsor order amount range. The first matching enabled rule is applied.</p>
                  <button type="button" onClick={addDirectIncomeRule} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium dark:border-slate-700">Add Rule</button>
                </div>
                {(form.direct_income_rules || []).map((rule, index) => (
                  <div key={rule.code || index} className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <label className="space-y-1">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Rule Name</span>
                        <input
                          value={rule.name}
                          onChange={(e) => setForm((prev) => ({ ...prev, direct_income_rules: (prev.direct_income_rules || []).map((item, itemIndex) => itemIndex === index ? { ...item, name: e.target.value } : item) }))}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Min Paid Amount</span>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={rule.minAmount}
                          onChange={(e) => setForm((prev) => ({ ...prev, direct_income_rules: (prev.direct_income_rules || []).map((item, itemIndex) => itemIndex === index ? { ...item, minAmount: Number(e.target.value || 0) } : item) }))}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Max Paid Amount</span>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={rule.maxAmount}
                          onChange={(e) => setForm((prev) => ({ ...prev, direct_income_rules: (prev.direct_income_rules || []).map((item, itemIndex) => itemIndex === index ? { ...item, maxAmount: Number(e.target.value || 0) } : item) }))}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Percent</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={rule.percent}
                          onChange={(e) => setForm((prev) => ({ ...prev, direct_income_rules: (prev.direct_income_rules || []).map((item, itemIndex) => itemIndex === index ? { ...item, percent: Number(e.target.value || 0) } : item) }))}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Credit To Balance</span>
                        <select
                          value={rule.balanceType}
                          onChange={(e) => setForm((prev) => ({ ...prev, direct_income_rules: (prev.direct_income_rules || []).map((item, itemIndex) => itemIndex === index ? { ...item, balanceType: e.target.value } : item) }))}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                        >
                          {WALLET_TYPE_KEYS.map((walletKey) => (
                            <option key={walletKey} value={walletKey}>{walletTypeLabels[walletKey]}</option>
                          ))}
                        </select>
                      </label>
                      <div className="space-y-2">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Status</span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, direct_income_rules: (prev.direct_income_rules || []).map((item, itemIndex) => itemIndex === index ? { ...item, enabled: !item.enabled } : item) }))}
                            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${rule.enabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}
                          >
                            {rule.enabled ? "Enabled" : "Disabled"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, direct_income_rules: (prev.direct_income_rules || []).filter((_, itemIndex) => itemIndex !== index) }))}
                            className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-medium text-rose-600 dark:border-rose-900/60 dark:text-rose-300"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <label className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Direct Income Status</span>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, direct_income_enabled: prev.direct_income_enabled ? 0 : 1 }))}
                    className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${form.direct_income_enabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}
                  >
                    {form.direct_income_enabled ? "Enabled" : "Disabled"}
                  </button>
                  <p className="text-xs text-slate-500">Every paid direct order will credit this percentage to the sponsor when the package amount qualifies.</p>
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-violet-500" />
                <h2 className="text-lg font-semibold">ROI Increment (Working) Rule</h2>
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Upgrade ROI and cap once a member builds enough direct business. The engine applies boosted ROI only from the moment the qualification was actually achieved.
              </p>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">Define multiple working-gain slabs by member package amount range. The matching slab controls the ROI and cap upgrade for that package.</p>
                  <button type="button" onClick={addWorkingGainRule} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium dark:border-slate-700">Add Rule</button>
                </div>
                {(form.working_gain_rules || []).map((rule, index) => (
                  <div key={rule.code || index} className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <label className="space-y-1 md:col-span-2">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Rule Name</span>
                        <input
                          value={rule.name}
                          onChange={(e) => setForm((prev) => ({ ...prev, working_gain_rules: (prev.working_gain_rules || []).map((item, itemIndex) => itemIndex === index ? { ...item, name: e.target.value } : item) }))}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Min Paid Amount</span>
                        <input type="number" min="0" step="0.001" value={rule.minAmount} onChange={(e) => setForm((prev) => ({ ...prev, working_gain_rules: (prev.working_gain_rules || []).map((item, itemIndex) => itemIndex === index ? { ...item, minAmount: Number(e.target.value || 0) } : item) }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900" />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Max Paid Amount</span>
                        <input type="number" min="0" step="0.001" value={rule.maxAmount} onChange={(e) => setForm((prev) => ({ ...prev, working_gain_rules: (prev.working_gain_rules || []).map((item, itemIndex) => itemIndex === index ? { ...item, maxAmount: Number(e.target.value || 0) } : item) }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900" />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Minimum Direct Referrals</span>
                        <input type="number" min="0" step="1" value={rule.directReferrals} onChange={(e) => setForm((prev) => ({ ...prev, working_gain_rules: (prev.working_gain_rules || []).map((item, itemIndex) => itemIndex === index ? { ...item, directReferrals: Number(e.target.value || 0) } : item) }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900" />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Minimum Direct Business</span>
                        <input type="number" min="0" step="0.001" value={rule.minDirectVolume} onChange={(e) => setForm((prev) => ({ ...prev, working_gain_rules: (prev.working_gain_rules || []).map((item, itemIndex) => itemIndex === index ? { ...item, minDirectVolume: Number(e.target.value || 0) } : item) }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900" />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Extra ROI %</span>
                        <input type="number" min="0" step="0.01" value={rule.extraRoiPercent} onChange={(e) => setForm((prev) => ({ ...prev, working_gain_rules: (prev.working_gain_rules || []).map((item, itemIndex) => itemIndex === index ? { ...item, extraRoiPercent: Number(e.target.value || 0) } : item) }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900" />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Boosted Cap Multiplier</span>
                        <input type="number" min="0" step="0.01" value={rule.boostedCapMultiplier} onChange={(e) => setForm((prev) => ({ ...prev, working_gain_rules: (prev.working_gain_rules || []).map((item, itemIndex) => itemIndex === index ? { ...item, boostedCapMultiplier: Number(e.target.value || 0) } : item) }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900" />
                      </label>
                      <div className="space-y-2">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Status</span>
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => setForm((prev) => ({ ...prev, working_gain_rules: (prev.working_gain_rules || []).map((item, itemIndex) => itemIndex === index ? { ...item, enabled: !item.enabled } : item) }))} className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${rule.enabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>{rule.enabled ? "Enabled" : "Disabled"}</button>
                          <button type="button" onClick={() => setForm((prev) => ({ ...prev, working_gain_rules: (prev.working_gain_rules || []).filter((_, itemIndex) => itemIndex !== index) }))} className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-medium text-rose-600 dark:border-rose-900/60 dark:text-rose-300">Remove</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <label className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2 dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">ROI Increment (Working) Status</span>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, working_gain_enabled: prev.working_gain_enabled ? 0 : 1 }))}
                    className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${form.working_gain_enabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}
                  >
                    {form.working_gain_enabled ? "Enabled" : "Disabled"}
                  </button>
                  <p className="text-xs text-slate-500">Qualified members switch from their base plan ROI/cap to this boosted model from the qualification timestamp onward.</p>
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-fuchsia-500" />
                <h2 className="text-lg font-semibold">Joining Bonus Rule</h2>
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Credit a fixed joining bonus to the sponsor when a new direct member qualifies by payment, downline join count, or both conditions together.
              </p>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1 md:col-span-2">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Bonus Label</span>
                  <input
                    value={form.joining_bonus_label}
                    onChange={(e) => setForm((prev) => ({ ...prev, joining_bonus_label: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                    placeholder="Joining Bonus"
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
                    onChange={(e) => setForm((prev) => ({ ...prev, joining_bonus_min_downline_members: Number(e.target.value || 1) }))}
                    disabled={form.joining_bonus_condition === "NONE" || form.joining_bonus_condition === "PAYMENT"}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                  />
                  <p className="text-xs text-slate-500">
                    {form.joining_bonus_condition === "DOWNLINE" || form.joining_bonus_condition === "BOTH"
                      ? "Used only when the bonus depends on downline count."
                      : "Ignored for this condition mode."}
                  </p>
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
                  <p className="text-xs text-slate-500">
                    `None` pays on direct join. `Payment Required` waits for a paid package. `Downline Required` can pay on join once the sponsor has enough directs. `Both Required` waits until both are true.
                  </p>
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold">Fast-Start Bonus Rule</h2>
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Define a dynamic qualification rule based on registration window, minimum direct count, qualifying payment amount, and total referred volume.
              </p>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1 md:col-span-2">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Rule Label</span>
                  <input
                    value={form.fast_start_bonus_label}
                    onChange={(e) => setForm((prev) => ({ ...prev, fast_start_bonus_label: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                    placeholder="72 Hour Fast Start"
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
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                  >
                    {WALLET_TYPE_KEYS.map((walletKey) => (
                      <option key={walletKey} value={walletKey}>{walletTypeLabels[walletKey]}</option>
                    ))}
                  </select>
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
                  <p className="text-xs text-slate-500">This stores the rule configuration. The payout engine can evaluate it consistently against registration and payment events.</p>
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
                  <p className="text-xs text-slate-500">
                    When unchecked, only sponsors with at least one active subscription can qualify for fast-start.
                  </p>
                </label>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <h2 className="text-lg font-semibold">Qualification Preview</h2>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-xs text-slate-500">Payment Mode</p>
                  <p className="mt-2 text-xl font-semibold">{form.payment_mode}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-xs text-slate-500">Window</p>
                  <p className="mt-2 text-xl font-semibold">{form.fast_start_window_hours} hrs</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-xs text-slate-500">Directs Needed</p>
                  <p className="mt-2 text-xl font-semibold">{form.fast_start_direct_referrals}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-xs text-slate-500">Inactive Sponsor</p>
                  <p className="mt-2 text-xl font-semibold">{form.fast_start_apply_for_inactive ? "Allowed" : "Blocked"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-xs text-slate-500">Fast-Start Volume</p>
                  <p className="mt-2 text-xl font-semibold">{qualificationPreview.toFixed(3)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-xs text-slate-500">Joining Bonus</p>
                  <p className="mt-2 text-xl font-semibold">{Number(form.joining_bonus_amount || 0).toFixed(3)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-xs text-slate-500">Direct Income on Min Order</p>
                  <p className="mt-2 text-xl font-semibold">{directIncomePreview.toFixed(3)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-xs text-slate-500">ROI Increment Boost</p>
                  <p className="mt-2 text-xl font-semibold">+{Number(form.working_gain_extra_roi_percent || 0).toFixed(2)}%</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-xs text-slate-500">ROI Increment Cap</p>
                  <p className="mt-2 text-xl font-semibold">{Number(form.working_gain_boosted_cap_multiplier || 0).toFixed(2)}x</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                A member qualifies when they register and, within <strong>{form.fast_start_window_hours} hours</strong>, add at least <strong>{form.fast_start_direct_referrals} direct referrals</strong> whose qualifying package amount is at least <strong>{Number(form.fast_start_min_package_amount || 0).toFixed(3)}</strong> each, or whose combined referred payment volume reaches <strong>{Number(form.fast_start_min_total_volume || 0).toFixed(3)}</strong>.
              </div>
              <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-200">
                Direct income currently has <strong>{(form.direct_income_rules || []).length}</strong> rule(s). ROI increment currently has <strong>{(form.working_gain_rules || []).length}</strong> rule(s). Each engine run chooses the matching enabled slab by paid-amount range.
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <h2 className="text-lg font-semibold">Stored Outcome</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-xs text-slate-500">Bonus Credit</p>
                  <p className="mt-2 font-semibold">{Number(form.fast_start_bonus_amount || 0).toFixed(3)} into `{form.fast_start_bonus_balance_type}`</p>
                  <p className="mt-1 text-xs text-slate-500">Inactive sponsor: {form.fast_start_apply_for_inactive ? "allowed" : "not allowed"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-xs text-slate-500">Joining Bonus</p>
                  <p className="mt-2 font-semibold">
                    {form.joining_bonus_enabled ? "enabled" : "disabled"} | {form.joining_bonus_condition} | {Number(form.joining_bonus_amount || 0).toFixed(3)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-xs text-slate-500">Direct Income</p>
                  <p className="mt-2 font-semibold">{(form.direct_income_rules || []).length} rules | {form.direct_income_enabled ? "enabled" : "disabled"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-xs text-slate-500">ROI Time</p>
                  <p className="mt-2 font-semibold">{form.roi_credit_time_utc} UTC</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-xs text-slate-500">ROI Increment (Working)</p>
                  <p className="mt-2 font-semibold">{(form.working_gain_rules || []).length} rules | {form.working_gain_enabled ? "enabled" : "disabled"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-xs text-slate-500">Current Status</p>
                  <p className="mt-2 font-semibold">
                    Payment {form.payment_mode.toLowerCase()} | ROI {form.roi_credit_enabled ? "enabled" : "disabled"} | Joining bonus {form.joining_bonus_enabled ? "enabled" : "disabled"} | Direct income {form.direct_income_enabled ? "enabled" : "disabled"} | ROI increment {form.working_gain_enabled ? "enabled" : "disabled"} | Fast-start {form.fast_start_bonus_enabled ? "enabled" : "disabled"}
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save MLM Settings"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
