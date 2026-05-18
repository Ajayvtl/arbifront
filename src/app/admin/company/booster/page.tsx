"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Save, Settings2, Rocket, PencilLine, Trash2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

type WorkingGainRule = {
  code: string;
  name: string;
  minAmount: number;
  maxAmount: number;
  directReferrals: number;
  minDirectVolume: number;
  extraRoiPercent: number;
  boostedCapMultiplier: number;
  creditToWallet: string;
  convertToRoi: boolean;
  isSingleUse: boolean;
  enabled: boolean;
};

type MlmSettings = {
  working_gain_enabled: number;
  working_gain_label: string;
  working_gain_direct_referrals: number;
  working_gain_min_direct_volume: number;
  working_gain_extra_roi_percent: number;
  working_gain_boosted_cap_multiplier: number;
  working_gain_rules?: WorkingGainRule[];
  wallet_type_labels?: Record<string, string>;
};

const defaultForm: MlmSettings = {
  working_gain_enabled: 0,
  working_gain_label: "Booster",
  working_gain_direct_referrals: 0,
  working_gain_min_direct_volume: 0,
  working_gain_extra_roi_percent: 0,
  working_gain_boosted_cap_multiplier: 2,
  working_gain_rules: [],
};

const defaultRuleForm: WorkingGainRule = {
  code: "",
  name: "",
  minAmount: 0,
  maxAmount: 0,
  directReferrals: 0,
  minDirectVolume: 0,
  extraRoiPercent: 0,
  boostedCapMultiplier: 2,
  creditToWallet: "roi_balance",
  convertToRoi: false,
  isSingleUse: false,
  enabled: true,
};

export default function BoosterRulePage() {
  const [form, setForm] = useState<MlmSettings>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [savingGlobal, setSavingGlobal] = useState(false);
  
  // Rule CRUD state
  const [ruleForm, setRuleForm] = useState<WorkingGainRule>(defaultRuleForm);
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [submittingRule, setSubmittingRule] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const settingsRes = await api.get("/settings/mlm");
      setForm({ ...defaultForm, ...(settingsRes.data?.data || {}) });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to load Booster settings";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const saveSettingsToServer = async (payloadOverride?: Partial<MlmSettings>) => {
    const finalPayload = {
      working_gain_enabled: payloadOverride?.working_gain_enabled ?? (form.working_gain_enabled ? 1 : 0),
      working_gain_label: String((payloadOverride?.working_gain_label ?? form.working_gain_label) || "Booster"),
      working_gain_direct_referrals: Number((payloadOverride?.working_gain_direct_referrals ?? form.working_gain_direct_referrals) || 0),
      working_gain_min_direct_volume: Number((payloadOverride?.working_gain_min_direct_volume ?? form.working_gain_min_direct_volume) || 0),
      working_gain_extra_roi_percent: Number((payloadOverride?.working_gain_extra_roi_percent ?? form.working_gain_extra_roi_percent) || 0),
      working_gain_boosted_cap_multiplier: Number((payloadOverride?.working_gain_boosted_cap_multiplier ?? form.working_gain_boosted_cap_multiplier) || 2),
      working_gain_rules: payloadOverride?.working_gain_rules ?? form.working_gain_rules ?? [],
    };
    
    const response = await api.put("/settings/mlm", finalPayload);
    setForm((prev) => ({ ...prev, ...(response.data?.data || {}) }));
    return response.data?.data;
  };

  const submitGlobal = async (event: FormEvent) => {
    event.preventDefault();
    setSavingGlobal(true);
    try {
      await saveSettingsToServer();
      toast.success("Global Booster settings updated");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update global logic";
      toast.error(message);
    } finally {
      setSavingGlobal(false);
    }
  };

  const startCreateRule = () => {
    setEditingRuleIndex(null);
    setRuleForm({
      ...defaultRuleForm,
      code: `working_gain_${(form.working_gain_rules || []).length + 1}`,
      name: `Booster Slab ${(form.working_gain_rules || []).length + 1}`,
    });
  };

  const startEditRule = (rule: WorkingGainRule, index: number) => {
    setEditingRuleIndex(index);
    setRuleForm({ ...rule });
  };

  const deleteRule = async (index: number) => {
    if (!window.confirm("Are you sure you want to remove this booster slab?")) return;
    try {
      toast.loading("Removing slab...", { id: "deleting-rule" });
      const newRules = (form.working_gain_rules || []).filter((_, i) => i !== index);
      await saveSettingsToServer({ working_gain_rules: newRules });
      if (editingRuleIndex === index) startCreateRule();
      toast.success("Booster Slab removed successfully", { id: "deleting-rule" });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to remove slab";
      toast.error(message, { id: "deleting-rule" });
    }
  };

  const submitRule = async (event: FormEvent) => {
    event.preventDefault();
    
    if (!ruleForm.name.trim()) {
      toast.error("Booster name is required");
      return;
    }
    if (ruleForm.maxAmount > 0 && ruleForm.maxAmount < ruleForm.minAmount) {
      toast.error("Max amount cannot be less than Min amount");
      return;
    }
    if (ruleForm.extraRoiPercent <= 0 && ruleForm.boostedCapMultiplier <= 0) {
       toast.error("Booster needs to actually boost something! Set an Extra ROI % or a Cap Multiplier > 0.");
       return;
    }

    setSubmittingRule(true);
    try {
      const activeRules = [...(form.working_gain_rules || [])];
      const configuredRule = {
         ...ruleForm,
         code: ruleForm.code || `working_gain_${activeRules.length + 1}`,
      };

      if (editingRuleIndex !== null && editingRuleIndex >= 0) {
        activeRules[editingRuleIndex] = configuredRule;
      } else {
        activeRules.push(configuredRule);
      }

      await saveSettingsToServer({ working_gain_rules: activeRules });
      toast.success(editingRuleIndex !== null ? "Booster Slab updated" : "Booster Slab created");
      startCreateRule();
    } catch (error: unknown) {
       const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to save booster";
       toast.error(message);
    } finally {
      setSubmittingRule(false);
    }
  };

  if (loading) {
     return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading Booster configurations...
            </div>
          </div>
        </div>
     );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Booster Configurations</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage global defaults or discrete slabs giving high-performing users an ROI increment or cap multiplier.
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

      <form onSubmit={submitGlobal} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold">Global Fallback Booster</h2>
          </div>
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, working_gain_enabled: prev.working_gain_enabled ? 0 : 1 }))}
            className={`inline-flex w-fit rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${form.working_gain_enabled ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}
          >
            {form.working_gain_enabled ? "System Enabled" : "System Disabled"}
          </button>
        </div>
        
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          This serves as the "Base Booster" if no custom slabs in the table below match a user's total active package sum.
        </p>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Minimum Directs <span className="text-slate-400 font-normal">(Users)</span></span>
            <input
              type="number"
              min="0"
              step="1"
              value={form.working_gain_direct_referrals}
              onChange={(e) => setForm((prev) => ({ ...prev, working_gain_direct_referrals: Number(e.target.value || 0) }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Min Business Volume</span>
            <input
              type="number"
              min="0"
              step="0.001"
              value={form.working_gain_min_direct_volume}
              onChange={(e) => setForm((prev) => ({ ...prev, working_gain_min_direct_volume: Number(e.target.value || 0) }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Base Extra Reward %</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.working_gain_extra_roi_percent}
              onChange={(e) => setForm((prev) => ({ ...prev, working_gain_extra_roi_percent: Number(e.target.value || 0) }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Base Cap Multiplier</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.working_gain_boosted_cap_multiplier}
              onChange={(e) => setForm((prev) => ({ ...prev, working_gain_boosted_cap_multiplier: Number(e.target.value || 0) }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </label>
          <div className="flex justify-end h-full">
            <button
              type="submit"
              disabled={savingGlobal}
              className="h-full w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {savingGlobal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Global
            </button>
          </div>
        </div>
      </form>

      <form onSubmit={submitRule} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/30">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold">{editingRuleIndex !== null ? "Edit Booster Slab" : "Create Booster Slab"}</h2>
          </div>
          {editingRuleIndex !== null && (
            <button
              type="button"
              onClick={startCreateRule}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 px-3 py-1.5 text-xs hover:border-indigo-500"
            >
              <Plus className="w-3.5 h-3.5" /> Start New
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <label className="space-y-1 md:col-span-12 lg:col-span-4">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Slab Title</span>
            <input
              value={ruleForm.name}
              onChange={(e) => setRuleForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
              placeholder="e.g. Diamond Executive Booster"
            />
          </label>

          <label className="space-y-1 md:col-span-6 lg:col-span-4">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">User's Package Amount Bounds</span>
            <div className="flex items-center gap-2">
               <input
                 type="number"
                 placeholder="Min $"
                 min="0"
                 step="0.001"
                 value={ruleForm.minAmount}
                 onChange={(e) => setRuleForm((prev) => ({ ...prev, minAmount: Number(e.target.value || 0) }))}
                 className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
               />
               <span className="text-slate-400">-</span>
               <input
                 type="number"
                 placeholder="Max $"
                 min="0"
                 step="0.001"
                 value={ruleForm.maxAmount}
                 onChange={(e) => setRuleForm((prev) => ({ ...prev, maxAmount: Number(e.target.value || 0) }))}
                 className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
               />
            </div>
            <p className="text-[10px] text-slate-400">(0 max = infinite)</p>
          </label>
          
          <label className="space-y-1 md:col-span-6 lg:col-span-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Sponsor Needed</span>
             <input
                 type="number"
                 min="0"
                 step="1"
                 value={ruleForm.directReferrals}
                 onChange={(e) => setRuleForm((prev) => ({ ...prev, directReferrals: Number(e.target.value || 0) }))}
                 className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
               />
            <p className="text-[10px] text-slate-400">Total active directs</p>
          </label>

          <label className="space-y-1 md:col-span-6 lg:col-span-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Volume Needed</span>
            <input
                 type="number"
                 min="0"
                 step="0.001"
                 value={ruleForm.minDirectVolume}
                 onChange={(e) => setRuleForm((prev) => ({ ...prev, minDirectVolume: Number(e.target.value || 0) }))}
                 className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
               />
               <p className="text-[10px] text-slate-400">Sum of sponsor purchases</p>
          </label>

          <label className="space-y-1 md:col-span-6 lg:col-span-4 border-t pt-3 border-slate-200 dark:border-slate-800 mt-2">
             <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Addition: Extra ROI Payout %</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={ruleForm.extraRoiPercent}
              onChange={(e) => setRuleForm((prev) => ({ ...prev, extraRoiPercent: Number(e.target.value || 0) }))}
              className="w-full rounded-lg border border-slate-300 bg-emerald-50 px-3 py-2 dark:border-slate-700 dark:bg-emerald-950/20"
            />
          </label>

          <label className="space-y-1 md:col-span-6 lg:col-span-4 border-t pt-3 border-slate-200 dark:border-slate-800 mt-2">
            <span className="text-xs font-bold text-sky-600 dark:text-sky-400">Addition: Max Income Cap Mult</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={ruleForm.boostedCapMultiplier}
              onChange={(e) => setRuleForm((prev) => ({ ...prev, boostedCapMultiplier: Number(e.target.value || 0) }))}
              className="w-full rounded-lg border border-slate-300 bg-sky-50 px-3 py-2 dark:border-slate-700 dark:bg-sky-950/20"
            />
          </label>

          <label className="space-y-1 md:col-span-6 lg:col-span-4 border-t pt-3 border-slate-200 dark:border-slate-800 mt-2">
            <span className={`text-xs font-bold ${ruleForm.convertToRoi ? "text-slate-400" : "text-indigo-600 dark:text-indigo-400"}`}>Credit To Wallet</span>
            <select
              disabled={ruleForm.convertToRoi}
              value={ruleForm.convertToRoi ? "" : (ruleForm.creditToWallet || "roi_balance")}
              onChange={(e) => setRuleForm((prev) => ({ ...prev, creditToWallet: e.target.value }))}
              className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ${ruleForm.convertToRoi ? "bg-slate-100 dark:bg-slate-800/50 text-slate-400 border-slate-200 dark:border-slate-800" : "bg-indigo-50 dark:border-slate-700 dark:bg-indigo-950/20"}`}
            >
              {ruleForm.convertToRoi ? (
                <option value="">N/A - Converting to ROI</option>
              ) : (
                Object.entries(form.wallet_type_labels || {}).map(([key, label]) => (
                  <option key={key} value={key}>{String(label)} ({key})</option>
                ))
              )}
            </select>
          </label>

          <div className="md:col-span-12 lg:col-span-8 flex items-end justify-between lg:justify-end gap-3 h-full pt-4 lg:pt-0 mt-2">
              <button
                type="button"
                onClick={() => setRuleForm((prev) => ({ ...prev, convertToRoi: !prev.convertToRoi }))}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all shadow-sm ${ruleForm.convertToRoi ? "bg-emerald-600 text-white shadow-emerald-500/20" : "bg-white text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:border-emerald-500"}`}
                title="When enabled, the calculated bonus amount will be automatically converted into a new ROI package for the member."
              >
                <RefreshCw className={`w-3.5 h-3.5 ${ruleForm.convertToRoi ? "animate-spin-slow" : ""}`} />
                {ruleForm.convertToRoi ? "Convert to ROI: ON" : "Convert to ROI: OFF"}
              </button>

              <button
                type="button"
                onClick={() => setRuleForm((prev) => ({ ...prev, isSingleUse: !prev.isSingleUse }))}
                className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${ruleForm.isSingleUse ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200"}`}
                title="When enabled, this booster rule can only be triggered once per user across all their subscriptions."
              >
                {ruleForm.isSingleUse ? "Single Use: ON" : "Single Use: OFF"}
              </button>
             <button
                type="button"
                onClick={() => setRuleForm((prev) => ({ ...prev, enabled: !prev.enabled }))}
                className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold ${ruleForm.enabled ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}
              >
                {ruleForm.enabled ? "Active Slab" : "Disabled Slab"}
              </button>
             <button
              type="submit"
              disabled={submittingRule}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 transition-all"
            >
              {submittingRule ? <Loader2 className="h-4 w-4 animate-spin" /> : editingRuleIndex !== null ? <PencilLine className="h-4 w-4"/> : <Plus className="h-4 w-4" />}
              {editingRuleIndex !== null ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 overflow-hidden">
         <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Slab Name</th>
              <th className="text-left px-4 py-3 font-medium">Applicable User Range</th>
              <th className="text-left px-4 py-3 font-medium">Required Sponsoring</th>
              <th className="text-left px-4 py-3 font-medium">Earned Extra ROI%</th>
              <th className="text-left px-4 py-3 font-medium">Boosted Cap Limit</th>
              <th className="text-left px-4 py-3 font-medium">Payout Mode</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
             {(form.working_gain_rules || []).length === 0 ? (
                <tr>
                   <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                      No active booster slabs. <br/><span className="text-xs">The system maintains fallback bounds entirely.</span>
                   </td>
                </tr>
             ) : (
                (form.working_gain_rules || []).map((rule, index) => {
                   return (
                      <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                         <td className="px-4 py-3">
                            <span className="font-medium text-slate-900 dark:text-white">{rule.name}</span>
                         </td>
                         <td className="px-4 py-3 font-mono text-xs text-slate-500">
                            ${Number(rule.minAmount || 0).toFixed(2)} - {rule.maxAmount > 0 ? `$${Number(rule.maxAmount).toFixed(2)}` : "∞"}
                         </td>
                         <td className="px-4 py-3 font-mono text-xs">
                             {rule.directReferrals} units / ${Number(rule.minDirectVolume).toFixed(2)} PV
                         </td>
                         <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                            +{Number(rule.extraRoiPercent || 0).toFixed(2)}%
                         </td>
                         <td className="px-4 py-3 font-bold text-sky-600 dark:text-sky-400">
                            x{Number(rule.boostedCapMultiplier || 0).toFixed(2)}
                         </td>
                         <td className="px-4 py-3 text-xs">
                             {rule.convertToRoi ? (
                                <div className="font-bold text-emerald-600 flex items-center gap-1 uppercase">
                                  <RefreshCw className="w-3 h-3" /> ROI Conversion
                                </div>
                             ) : (
                                <div className="font-medium text-indigo-600 dark:text-indigo-400">{rule.creditToWallet || "roi_balance"}</div>
                             )}
                             {rule.isSingleUse && <div className="text-[10px] text-amber-600 font-bold uppercase mt-0.5 whitespace-nowrap">Single Use Trigger</div>}
                         </td>
                         <td className="px-4 py-3">
                           <span className={`inline-flex h-2 w-2 rounded-full ${rule.enabled ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                         </td>
                         <td className="px-4 py-3">
                           <div className="flex items-center gap-2">
                             <button
                               onClick={() => startEditRule(rule, index)}
                               className="inline-flex items-center justify-center p-1.5 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600 dark:hover:bg-slate-800 rounded-md transition-colors"
                               title="Edit Slab"
                             >
                                <PencilLine className="w-4 h-4" />
                             </button>
                             <button
                               onClick={() => deleteRule(index)}
                               className="inline-flex items-center justify-center p-1.5 text-slate-500 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/30 rounded-md transition-colors"
                               title="Remove Slab"
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                           </div>
                         </td>
                      </tr>
                   );
                })
             )}
          </tbody>
         </table>
      </div>
    </div>
  );
}
