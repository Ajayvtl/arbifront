"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { PencilLine, Plus, RefreshCcw } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getCompanyRoleScope } from "@/lib/companyRoleScope";
import { getWalletTypeLabels, WALLET_TYPE_KEYS, WalletTypeKey } from "@/lib/walletTypeLabels";

type PlanItem = {
  id: number;
  name: string;
  min_amount: number;
  max_amount: number;
  roi_percent: number;
  daily_income_percent?: number;
  duration_days: number;
  max_return_multiplier?: number;
  payment_currency?: "AUTO" | "BNB" | "USDT";
  roi_credit_balance_type?: string;
  created_at: string;
};

type PlanForm = {
  name: string;
  minAmount: string;
  maxAmount: string;
  roiPercent: string;
  dailyIncomePercent: string;
  durationDays: string;
  maxReturnMultiplier: string;
  paymentCurrency: "AUTO" | "BNB" | "USDT";
  roiCreditBalanceType: WalletTypeKey;
};

const emptyForm: PlanForm = {
  name: "",
  minAmount: "",
  maxAmount: "",
  roiPercent: "0",
  dailyIncomePercent: "0",
  durationDays: "30",
  maxReturnMultiplier: "2.00",
  paymentCurrency: "AUTO",
  roiCreditBalanceType: "roi_balance",
};

export default function CompanyPlansPage() {
  const { user } = useAuth();
  const companyRoleScope = useMemo(() => getCompanyRoleScope(user), [user]);
  const isReadOnlyAdmin = companyRoleScope === "admin";
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [walletTypeLabels, setWalletTypeLabels] = useState(getWalletTypeLabels(null));

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const [plansResponse, settingsResponse] = await Promise.all([
        api.get("/mlm/plans", { params: { limit: 200 } }),
        api.get("/settings/mlm"),
      ]);
      setPlans((plansResponse.data?.data || []) as PlanItem[]);
      setWalletTypeLabels(getWalletTypeLabels(settingsResponse.data?.data?.wallet_type_labels || null));
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to load plans";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const stats = useMemo(() => {
    const total = plans.length;
    const avgMin = total ? plans.reduce((sum, p) => sum + Number(p.min_amount || 0), 0) / total : 0;
    const avgRoi = total ? plans.reduce((sum, p) => sum + Number(p.roi_percent || 0), 0) / total : 0;
    const avgDailyIncome = total ? plans.reduce((sum, p) => sum + Number((p.daily_income_percent ?? p.roi_percent) || 0), 0) / total : 0;
    const maxTicket = total ? Math.max(...plans.map((p) => Number(p.max_amount || 0))) : 0;
    return { total, avgMin, avgRoi, avgDailyIncome, maxTicket };
  }, [plans]);

  const startCreate = () => {
    if (isReadOnlyAdmin) return;
    setEditingPlanId(null);
    setForm(emptyForm);
  };

  const startEdit = (plan: PlanItem) => {
    if (isReadOnlyAdmin) return;
    const roiWallet = String(plan.roi_credit_balance_type || "roi_balance").trim().toLowerCase() as WalletTypeKey;
    setEditingPlanId(plan.id);
    setForm({
      name: plan.name || "",
      minAmount: String(plan.min_amount ?? ""),
      maxAmount: String(plan.max_amount ?? ""),
      roiPercent: String(plan.roi_percent ?? 0),
      dailyIncomePercent: String(plan.daily_income_percent ?? 0),
      durationDays: String(plan.duration_days ?? 30),
      maxReturnMultiplier: String(plan.max_return_multiplier ?? 2.00),
      paymentCurrency: plan.payment_currency || "AUTO",
      roiCreditBalanceType: WALLET_TYPE_KEYS.includes(roiWallet) ? roiWallet : "roi_balance",
    });
  };

  const computedDurationDays = useMemo(() => {
    const roi = Number(form.roiPercent || 0);
    const daily = Number(form.dailyIncomePercent || 0);
    if (!Number.isFinite(roi) || !Number.isFinite(daily) || roi <= 0 || daily <= 0) {
      return 0;
    }
    return Math.max(1, Math.round(roi / daily));
  }, [form.roiPercent, form.dailyIncomePercent]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (isReadOnlyAdmin) {
      toast.error("Admin role has read-only access to plan catalog");
      return;
    }

    const payload = {
      name: form.name.trim(),
      minAmount: Number(form.minAmount),
      maxAmount: Number(form.maxAmount),
      roiPercent: Number(form.roiPercent || 0),
      dailyIncomePercent: Number(form.dailyIncomePercent || 0),
      durationDays: computedDurationDays > 0 ? computedDurationDays : Number(form.durationDays || 30),
      maxReturnMultiplier: Number(form.maxReturnMultiplier || 2.00),
      paymentCurrency: form.paymentCurrency,
      roiCreditBalanceType: form.roiCreditBalanceType,
    };

    if (!payload.name) {
      toast.error("Plan name is required");
      return;
    }
    if (!Number.isFinite(payload.minAmount) || payload.minAmount <= 0) {
      toast.error("Minimum amount must be a positive number");
      return;
    }
    if (!Number.isFinite(payload.maxAmount) || payload.maxAmount < payload.minAmount) {
      toast.error("Maximum amount must be greater than or equal to minimum amount");
      return;
    }
    if (!Number.isFinite(payload.durationDays) || payload.durationDays <= 0) {
      toast.error("Duration must be a positive number");
      return;
    }
    if (payload.roiPercent > 0 && (!Number.isFinite(payload.dailyIncomePercent) || payload.dailyIncomePercent <= 0)) {
      toast.error("Daily Income % must be greater than 0 when ROI % is greater than 0");
      return;
    }

    setSubmitting(true);
    try {
      if (editingPlanId) {
        await api.put(`/mlm/plans/${editingPlanId}`, payload);
        toast.success("Plan updated");
      } else {
        await api.post("/mlm/plans", payload);
        toast.success("Plan created");
      }
      startCreate();
      await loadPlans();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to save plan";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Company Admin Plans</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">System-wide plan catalog used by package activation and payment flow.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadPlans()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm hover:border-emerald-500"
        >
          <RefreshCcw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4"><p className="text-xs text-slate-500">Total Plans</p><p className="text-2xl font-semibold">{stats.total}</p></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4"><p className="text-xs text-slate-500">Avg Min Ticket</p><p className="text-2xl font-semibold">{stats.avgMin.toFixed(2)}</p></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4"><p className="text-xs text-slate-500">Avg ROI %</p><p className="text-2xl font-semibold">{stats.avgRoi.toFixed(2)}%</p></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4"><p className="text-xs text-slate-500">Avg Daily Income %</p><p className="text-2xl font-semibold">{stats.avgDailyIncome.toFixed(2)}%</p></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4"><p className="text-xs text-slate-500">Max Ticket</p><p className="text-2xl font-semibold">{stats.maxTicket.toFixed(2)}</p></div>
      </div>

      {isReadOnlyAdmin ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
          Fixed Plans
        </div>
      ) : (
        <form onSubmit={submit} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-semibold">{editingPlanId ? `Edit Plan #${editingPlanId}` : "Create Plan"}</h2>
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm hover:border-emerald-500"
            >
              <Plus className="w-4 h-4" /> New
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <label className="md:col-span-2 space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Plan Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Starter, Growth, Pro"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Min Amount</span>
              <input
                type="number"
                min="0"
                step="0.001"
                value={form.minAmount}
                onChange={(e) => setForm((prev) => ({ ...prev, minAmount: e.target.value }))}
                placeholder="10"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Max Amount</span>
              <input
                type="number"
                min="0"
                step="0.001"
                value={form.maxAmount}
                onChange={(e) => setForm((prev) => ({ ...prev, maxAmount: e.target.value }))}
                placeholder="100"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">ROI %</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.roiPercent}
                onChange={(e) => setForm((prev) => ({ ...prev, roiPercent: e.target.value }))}
                placeholder="e.g. 30"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Daily Income %</span>
              <input
                type="number"
                min="0"
                step="0.0001"
                value={form.dailyIncomePercent}
                onChange={(e) => setForm((prev) => ({ ...prev, dailyIncomePercent: e.target.value }))}
                placeholder="e.g. 1"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <p className="mt-1 text-xs text-slate-500">Duration is automatically computed as: (ROI % / Daily Income %)</p>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Max Return Multiplier</span>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={form.maxReturnMultiplier}
                onChange={(e) => setForm((prev) => ({ ...prev, maxReturnMultiplier: e.target.value }))}
                placeholder="e.g. 2.00 for 2x"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Duration (Days)</span>
              <input
                type="number"
                min="1"
                step="1"
                value={computedDurationDays > 0 ? String(computedDurationDays) : form.durationDays}
                readOnly
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <p className="mt-1 text-xs text-slate-500">Auto-calculated from ROI % and Daily Income %.</p>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Payment Currency</span>
              <select
                value={form.paymentCurrency}
                onChange={(e) => setForm((prev) => ({ ...prev, paymentCurrency: e.target.value as "AUTO" | "BNB" | "USDT" }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value="AUTO">Auto (Current active channel)</option>
                <option value="BNB">BNB only</option>
                <option value="USDT">USDT only</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">For testing you can set tiny package values like `0.003` and bind them to a specific payment currency.</p>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">ROI Credit Wallet</span>
              <select
                value={form.roiCreditBalanceType}
                onChange={(e) => setForm((prev) => ({ ...prev, roiCreditBalanceType: e.target.value as WalletTypeKey }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                {WALLET_TYPE_KEYS.map((key) => (
                  <option key={key} value={key}>{walletTypeLabels[key]}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">Daily ROI credits for this plan will go into the selected wallet bucket.</p>
            </label>
            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {editingPlanId ? <PencilLine className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {submitting ? "Saving..." : editingPlanId ? "Update Plan" : "Create Plan"}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500">
            <tr>
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Min</th>
              <th className="text-left px-4 py-3">Max</th>
              {!isReadOnlyAdmin && <th className="text-left px-4 py-3">ROI %</th>}
              <th className="text-left px-4 py-3">Daily Income %</th>
              <th className="text-left px-4 py-3">Duration</th>
              <th className="text-left px-4 py-3">Cap Multiplier</th>
              <th className="text-left px-4 py-3">Currency</th>
              <th className="text-left px-4 py-3">ROI Wallet</th>
              {!isReadOnlyAdmin && <th className="text-left px-4 py-3">Action</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={isReadOnlyAdmin ? 9 : 11}>Loading plans...</td></tr>
            ) : plans.length === 0 ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={isReadOnlyAdmin ? 9 : 11}>No plans available.</td></tr>
            ) : plans.map((plan) => (
              <tr key={plan.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3">#{plan.id}</td>
                <td className="px-4 py-3">{plan.name}</td>
                <td className="px-4 py-3">{Number(plan.min_amount || 0).toFixed(2)}</td>
                <td className="px-4 py-3">{Number(plan.max_amount || 0).toFixed(2)}</td>
                {!isReadOnlyAdmin && <td className="px-4 py-3">{Number(plan.roi_percent || 0).toFixed(2)}%</td>}
                <td className="px-4 py-3">{Number((plan.daily_income_percent ?? plan.roi_percent) || 0).toFixed(2)}%</td>
                <td className="px-4 py-3">{plan.duration_days} days</td>
                <td className="px-4 py-3">{Number(plan.max_return_multiplier || 2).toFixed(2)}x</td>
                <td className="px-4 py-3">{plan.payment_currency || "AUTO"}</td>
                <td className="px-4 py-3">{walletTypeLabels[(String(plan.roi_credit_balance_type || "roi_balance").trim().toLowerCase() as WalletTypeKey)] || String(plan.roi_credit_balance_type || "roi_balance")}</td>
                {!isReadOnlyAdmin && (
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => startEdit(plan)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs hover:border-emerald-500"
                    >
                      <PencilLine className="w-3.5 h-3.5" /> Edit
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
