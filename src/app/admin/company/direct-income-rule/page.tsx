"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, Settings2, Wallet, Zap, PencilLine, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getWalletTypeLabels, WALLET_TYPE_KEYS } from "@/lib/walletTypeLabels";

type DirectIncomeRule = {
  code: string;
  name: string;
  minAmount: number;
  maxAmount: number;
  percent: number;
  balanceType: string;
  enabled: boolean;
  planId?: string | null;
};

type MlmSettings = {
  direct_income_enabled: number;
  direct_income_percent: number;
  direct_income_min_package_amount: number;
  direct_income_balance_type: string;
  direct_income_apply_for_inactive?: number;
  direct_income_rules?: DirectIncomeRule[];
  wallet_type_labels?: Partial<Record<string, unknown>> | null;
};

const defaultForm: MlmSettings = {
  direct_income_enabled: 0,
  direct_income_percent: 0,
  direct_income_min_package_amount: 0,
  direct_income_balance_type: "direct_balance",
  direct_income_apply_for_inactive: 0,
  direct_income_rules: [],
};

type PlanItem = {
  id: string | number;
  name: string;
  min_amount: number;
  max_amount: number;
};

const defaultRuleForm: DirectIncomeRule = {
  code: "",
  name: "",
  minAmount: 0,
  maxAmount: 0,
  percent: 0,
  balanceType: "direct_balance",
  enabled: true,
  planId: null,
};

export default function DirectIncomeRulePage() {
  const [form, setForm] = useState<MlmSettings>(defaultForm);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingGlobal, setSavingGlobal] = useState(false);
  
  // Rule CRUD state
  const [ruleForm, setRuleForm] = useState<DirectIncomeRule>(defaultRuleForm);
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [submittingRule, setSubmittingRule] = useState(false);

  const walletTypeLabels = useMemo(
    () => getWalletTypeLabels(form.wallet_type_labels || null),
    [form.wallet_type_labels]
  );

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, plansRes] = await Promise.all([
        api.get("/settings/mlm"),
        api.get("/mlm/plans", { params: { limit: 200 } }).catch(() => ({ data: { data: { items: [] } } }))
      ]);
      setForm({ ...defaultForm, ...(settingsRes.data?.data || {}) });
      
      const plansData = plansRes.data?.data;
      setPlans(Array.isArray(plansData) ? plansData : plansData?.items || []);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to load Sponsor Income settings";
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
      direct_income_enabled: payloadOverride?.direct_income_enabled ?? (form.direct_income_enabled ? 1 : 0),
      direct_income_percent: Number((payloadOverride?.direct_income_percent ?? form.direct_income_percent) || 0),
      direct_income_min_package_amount: Number((payloadOverride?.direct_income_min_package_amount ?? form.direct_income_min_package_amount) || 0),
      direct_income_balance_type: String((payloadOverride?.direct_income_balance_type ?? form.direct_income_balance_type) || "direct_balance"),
      direct_income_apply_for_inactive: payloadOverride?.direct_income_apply_for_inactive ?? (form.direct_income_apply_for_inactive ? 1 : 0),
      direct_income_rules: payloadOverride?.direct_income_rules ?? form.direct_income_rules ?? [],
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
      toast.success("Global Sponsor Income settings updated");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update rules";
      toast.error(message);
    } finally {
      setSavingGlobal(false);
    }
  };

  const startCreateRule = () => {
    setEditingRuleIndex(null);
    setRuleForm({
      ...defaultRuleForm,
      code: `direct_income_${(form.direct_income_rules || []).length + 1}`,
      name: `Sponsor Income ${(form.direct_income_rules || []).length + 1}`,
      balanceType: form.direct_income_balance_type || "direct_balance"
    });
  };

  const startEditRule = (rule: DirectIncomeRule, index: number) => {
    setEditingRuleIndex(index);
    setRuleForm({ ...rule });
  };

  const deleteRule = async (index: number) => {
    if (!window.confirm("Are you sure you want to remove this slab?")) return;
    try {
      toast.loading("Removing slab...", { id: "deleting-rule" });
      const newRules = (form.direct_income_rules || []).filter((_, i) => i !== index);
      await saveSettingsToServer({ direct_income_rules: newRules });
      if (editingRuleIndex === index) startCreateRule();
      toast.success("Slab removed successfully", { id: "deleting-rule" });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to remove slab";
      toast.error(message, { id: "deleting-rule" });
    }
  };

  const submitRule = async (event: FormEvent) => {
    event.preventDefault();
    
    if (!ruleForm.name.trim()) {
      toast.error("Slab name is required");
      return;
    }
    if (ruleForm.maxAmount > 0 && ruleForm.maxAmount < ruleForm.minAmount) {
      toast.error("Max amount cannot be less than Min amount");
      return;
    }

    setSubmittingRule(true);
    try {
      const activeRules = [...(form.direct_income_rules || [])];
      
      const configuredRule = {
         ...ruleForm,
         code: ruleForm.code || `direct_income_${activeRules.length + 1}`,
      };

      if (editingRuleIndex !== null && editingRuleIndex >= 0) {
        activeRules[editingRuleIndex] = configuredRule;
      } else {
        activeRules.push(configuredRule);
      }

      await saveSettingsToServer({ direct_income_rules: activeRules });
      toast.success(editingRuleIndex !== null ? "Slab updated successfully" : "Slab created successfully");
      startCreateRule();
    } catch (error: unknown) {
       const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to save slab";
       toast.error(message);
    } finally {
      setSubmittingRule(false);
    }
  };

  const handlePlanSelect = (selectedPlanId: string) => {
    const selectedPlan = plans.find(p => String(p.id) === selectedPlanId);
    if (!selectedPlan) {
      setRuleForm(prev => ({ ...prev, planId: null }));
      return;
    }
    setRuleForm(prev => ({
      ...prev,
      planId: selectedPlanId,
      name: `Sponsor - ${selectedPlan.name}`,
      minAmount: Number(selectedPlan.min_amount || 0),
      maxAmount: Number(selectedPlan.max_amount || 0)
    }));
  };

  if (loading) {
     return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading sponsor income settings...
            </div>
          </div>
        </div>
     );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Sponsor Income(pkg)</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Configure global default percentages or create highly specialized payout slabs based on specific package purchases.
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
            <Zap className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold">Global Fallback Settings</h2>
          </div>
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, direct_income_enabled: prev.direct_income_enabled ? 0 : 1 }))}
            className={`inline-flex w-fit rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${form.direct_income_enabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}
          >
            {form.direct_income_enabled ? "System Enabled" : "System Disabled"}
          </button>
        </div>
        
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          If an activated package doesn't match any custom slab in the table below, it will default to these standard values.
        </p>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Base Income %</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.direct_income_percent}
              onChange={(e) => setForm((prev) => ({ ...prev, direct_income_percent: Number(e.target.value || 0) }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Global Min Package Amount</span>
            <input
              type="number"
              min="0"
              step="0.001"
              value={form.direct_income_min_package_amount}
              onChange={(e) => setForm((prev) => ({ ...prev, direct_income_min_package_amount: Number(e.target.value || 0) }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </label>
          <label className="space-y-1 md:col-span-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Default Credit Wallet</span>
            <select
              value={form.direct_income_balance_type}
              onChange={(e) => setForm((prev) => ({ ...prev, direct_income_balance_type: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              {WALLET_TYPE_KEYS.map((walletKey) => (
                <option key={walletKey} value={walletKey}>{(walletTypeLabels as any)[walletKey]} ({walletKey})</option>
              ))}
            </select>
          </label>
          <div className="flex justify-end h-full">
            <button
              type="submit"
              disabled={savingGlobal}
              className="h-full w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {savingGlobal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Global
            </button>
          </div>
        </div>

        <label className="mt-4 flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={Boolean(form.direct_income_apply_for_inactive)}
            onChange={(e) => setForm((prev) => ({ ...prev, direct_income_apply_for_inactive: e.target.checked ? 1 : 0 }))}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700"
          />
          <span>
            <span className="font-semibold">Apply for inactive</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              When enabled, Sponsor/Direct income is credited even if the sponsor has no active subscription.
            </span>
          </span>
        </label>
      </form>

      <form onSubmit={submitRule} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/30">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold">{editingRuleIndex !== null ? "Edit Plan Slab" : "Create Plan Slab"}</h2>
          </div>
          {editingRuleIndex !== null && (
            <button
              type="button"
              onClick={startCreateRule}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 px-3 py-1.5 text-xs hover:border-emerald-500"
            >
              <Plus className="w-3.5 h-3.5" /> Start New
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <label className="space-y-1 md:col-span-12 lg:col-span-4">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Apply to Plan (Auto Snapshot API)</span>
            <select
              value={ruleForm.planId || ""}
              onChange={(e) => handlePlanSelect(e.target.value)}
              className="w-full rounded-lg border border-indigo-200 bg-indigo-50/30 px-3 py-2 dark:border-indigo-900/60 dark:bg-indigo-950/20 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
            >
              <option value="">-- Custom Static Bounds (Freeform) --</option>
              {plans.map(p => (
                <option key={p.id} value={String(p.id)}>{p.name} (${Number(p.min_amount).toFixed(2)} - ${Number(p.max_amount).toFixed(2)})</option>
              ))}
              {ruleForm.planId && !plans.find(p => String(p.id) === String(ruleForm.planId)) && (
                <option value={String(ruleForm.planId)} disabled className="text-rose-500">
                  Archived Plan ID: {ruleForm.planId} (Deprecated Snapshot)
                </option>
              )}
            </select>
          </label>

          <label className="space-y-1 md:col-span-6 lg:col-span-4">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Slab Title</span>
            <input
              value={ruleForm.name}
              onChange={(e) => setRuleForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
              placeholder="e.g. VIP Sponsor Bonus"
            />
          </label>
          
          <label className="space-y-1 md:col-span-6 lg:col-span-4">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Target Credit Wallet</span>
            <select
              value={ruleForm.balanceType}
              onChange={(e) => setRuleForm((prev) => ({ ...prev, balanceType: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
            >
              {WALLET_TYPE_KEYS.map((walletKey) => (
                <option key={walletKey} value={walletKey}>{(walletTypeLabels as any)[walletKey]} ({walletKey})</option>
              ))}
            </select>
          </label>

          <label className="space-y-1 md:col-span-4 lg:col-span-3">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Min Package Amount</span>
            <input
              type="number"
              min="0"
              step="0.001"
              value={ruleForm.minAmount}
              onChange={(e) => setRuleForm((prev) => ({ ...prev, minAmount: Number(e.target.value || 0) }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <label className="space-y-1 md:col-span-4 lg:col-span-3">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Max Package Amount <span className="text-slate-400 font-normal">(0 = ∞)</span></span>
            <input
              type="number"
              min="0"
              step="0.001"
              value={ruleForm.maxAmount}
              onChange={(e) => setRuleForm((prev) => ({ ...prev, maxAmount: Number(e.target.value || 0) }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <label className="space-y-1 md:col-span-4 lg:col-span-3">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Sponsor Payout %</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={ruleForm.percent}
              onChange={(e) => setRuleForm((prev) => ({ ...prev, percent: Number(e.target.value || 0) }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <div className="md:col-span-12 lg:col-span-3 flex items-end justify-between lg:justify-end gap-3 h-full pt-4 lg:pt-0">
             <button
                type="button"
                onClick={() => setRuleForm((prev) => ({ ...prev, enabled: !prev.enabled }))}
                className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold ${ruleForm.enabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}
              >
                {ruleForm.enabled ? "Active" : "Disabled"}
              </button>
            <button
              type="submit"
              disabled={submittingRule}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60 transition-all"
            >
              {submittingRule ? <Loader2 className="h-4 w-4 animate-spin" /> : editingRuleIndex !== null ? <PencilLine className="h-4 w-4"/> : <Plus className="h-4 w-4" />}
              {editingRuleIndex !== null ? "Update Slab" : "Create Slab"}
            </button>
          </div>
        </div>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 overflow-hidden">
         <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Slab Name</th>
              <th className="text-left px-4 py-3 font-medium">Plan Target</th>
              <th className="text-left px-4 py-3 font-medium">Bounds (Min-Max)</th>
              <th className="text-left px-4 py-3 font-medium">Reward %</th>
              <th className="text-left px-4 py-3 font-medium">Wallet Bucket</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
             {(form.direct_income_rules || []).length === 0 ? (
                <tr>
                   <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                      No active package slabs. <br/><span className="text-xs">The system will use the Global Fallback Settings exclusively.</span>
                   </td>
                </tr>
             ) : (
                (form.direct_income_rules || []).map((rule, index) => {
                   let targetBadge = "-- Default --";
                   let targetBadgeColor = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
                   
                   if (rule.planId) {
                      const matched = plans.find(p => String(p.id) === String(rule.planId));
                      if (matched) {
                         targetBadge = matched.name;
                         targetBadgeColor = "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300";
                      } else {
                         targetBadge = "Archived Plan Snapshot";
                         targetBadgeColor = "bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-300";
                      }
                   }

                   return (
                      <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                         <td className="px-4 py-3">
                            <span className="font-medium text-slate-900 dark:text-white">{rule.name}</span>
                         </td>
                         <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${targetBadgeColor}`}>
                              {targetBadge}
                            </span>
                         </td>
                         <td className="px-4 py-3 font-mono text-xs">
                            ${Number(rule.minAmount || 0).toFixed(2)} - {rule.maxAmount > 0 ? `$${Number(rule.maxAmount).toFixed(2)}` : "∞"}
                         </td>
                         <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                            {Number(rule.percent || 0).toFixed(2)}%
                         </td>
                         <td className="px-4 py-3 text-xs">
                            {(walletTypeLabels as any)[rule.balanceType] || rule.balanceType}
                         </td>
                         <td className="px-4 py-3">
                           <span className={`inline-flex h-2 w-2 rounded-full ${rule.enabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                         </td>
                         <td className="px-4 py-3">
                           <div className="flex items-center gap-2">
                             <button
                               onClick={() => startEditRule(rule, index)}
                               className="inline-flex items-center justify-center p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800 rounded-md transition-colors"
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
