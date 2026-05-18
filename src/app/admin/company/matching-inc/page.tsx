"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Check, Loader2, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import api from "@/lib/api";

type MatchingIncRule = {
  id: number;
  min_leg_a_income: number;
  min_leg_b_income: number;
  min_leg_c_income: number;
  reward_amount: number;
  reward_wallet: string;
  is_active: number;
  is_achieved: number;
  created_at?: string;
  updated_at?: string;
};

type Paginated<T> = {
  items: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type DraftRule = {
  min_leg_a_income: string;
  min_leg_b_income: string;
  min_leg_c_income: string;
  reward_amount: string;
  reward_wallet: string;
  is_active: boolean;
  is_achieved: boolean;
};

const emptyDraft: DraftRule = {
  min_leg_a_income: "0",
  min_leg_b_income: "0",
  min_leg_c_income: "0",
  reward_amount: "0",
  reward_wallet: "earning_balance",
  is_active: true,
  is_achieved: false,
};

function toNumber(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function formatMoney(value: unknown): string {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0.000000";
  return n.toFixed(6);
}

export default function MatchingIncPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<MatchingIncRule>>({ items: [] });

  const [draft, setDraft] = useState<DraftRule>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);

  const activeCount = useMemo(
    () => data.items.filter((item) => Number(item.is_active || 0) === 1).length,
    [data.items]
  );

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get("/mlm/matching-inc", { params: { page, limit: 50 } });
      setData((response.data?.data || { items: [] }) as Paginated<MatchingIncRule>);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to load Matching Inc rules";
      toast.error(message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const startCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft);
  };

  const startEdit = (rule: MatchingIncRule) => {
    setEditingId(rule.id);
    setDraft({
      min_leg_a_income: String(rule.min_leg_a_income ?? 0),
      min_leg_b_income: String(rule.min_leg_b_income ?? 0),
      min_leg_c_income: String(rule.min_leg_c_income ?? 0),
      reward_amount: String(rule.reward_amount ?? 0),
      reward_wallet: String(rule.reward_wallet || 'earning_balance'),
      is_active: Number(rule.is_active || 0) === 1,
      is_achieved: Number(rule.is_achieved || 0) === 1,
    });
  };

  const submitDraft = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        min_leg_a_income: toNumber(draft.min_leg_a_income),
        min_leg_b_income: toNumber(draft.min_leg_b_income),
        min_leg_c_income: toNumber(draft.min_leg_c_income),
        reward_amount: toNumber(draft.reward_amount),
        reward_wallet: draft.reward_wallet || 'earning_balance',
        is_active: draft.is_active ? 1 : 0,
        is_achieved: draft.is_achieved ? 1 : 0,
      };

      if (editingId) {
        await api.put(`/mlm/matching-inc/${editingId}`, payload);
        toast.success("Rule updated");
      } else {
        await api.post("/mlm/matching-inc", payload);
        toast.success("Rule created");
      }

      await load(true);
      startCreate();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to save rule";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const quickToggle = async (id: number, patch: Partial<Pick<MatchingIncRule, "is_active" | "is_achieved">>) => {
    setSaving(true);
    try {
      await api.put(`/mlm/matching-inc/${id}`, patch);
      await load(true);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update rule";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this rule?")) return;
    setSaving(true);
    try {
      await api.delete(`/mlm/matching-inc/${id}`);
      toast.success("Rule deleted");
      await load(true);
      if (editingId === id) startCreate();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to delete rule";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Matching Inc</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Configure Matching Inc thresholds (Leg A/B/C). Toggle Active and mark rules as Achieved when needed.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Active rules: <span className="font-semibold">{activeCount}</span> / {data.items.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:border-emerald-500 dark:border-slate-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            New Rule
          </button>
        </div>
      </div>

      <form onSubmit={submitDraft} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {editingId ? `Edit Rule #${editingId}` : "Create Rule"}
            </h2>
            <p className="text-xs text-slate-500">All amounts are numeric; use 0 to disable a leg constraint.</p>
          </div>
          <div className="flex gap-2">
            {editingId && (
              <button
                type="button"
                onClick={startCreate}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-7 gap-3">
          <label className="block">
            <span className="text-xs text-slate-500">Min Leg A Income</span>
            <input
              value={draft.min_leg_a_income}
              onChange={(e) => setDraft((p) => ({ ...p, min_leg_a_income: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              inputMode="decimal"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">Min Leg B Income</span>
            <input
              value={draft.min_leg_b_income}
              onChange={(e) => setDraft((p) => ({ ...p, min_leg_b_income: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              inputMode="decimal"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">Min Leg C Income</span>
            <input
              value={draft.min_leg_c_income}
              onChange={(e) => setDraft((p) => ({ ...p, min_leg_c_income: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              inputMode="decimal"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">Reward Amount</span>
            <input
              value={draft.reward_amount}
              onChange={(e) => setDraft((p) => ({ ...p, reward_amount: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              inputMode="decimal"
              placeholder="0"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">Reward Wallet</span>
            <select
              value={draft.reward_wallet}
              onChange={(e) => setDraft((p) => ({ ...p, reward_wallet: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="earning_balance">Earning</option>
              <option value="roi_balance">ROI</option>
              <option value="direct_balance">Direct</option>
              <option value="level_balance">Level</option>
              <option value="reward_balance">Reward</option>
              <option value="withdrawable_balance">Withdrawable</option>
            </select>
          </label>
          <label className="flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(e) => setDraft((p) => ({ ...p, is_active: e.target.checked }))}
              className="h-4 w-4"
            />
            <span className="text-sm">Active</span>
          </label>
          <label className="flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              checked={draft.is_achieved}
              onChange={(e) => setDraft((p) => ({ ...p, is_achieved: e.target.checked }))}
              className="h-4 w-4"
            />
            <span className="text-sm">Achieved</span>
          </label>
        </div>
      </form>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Min A</th>
              <th className="px-4 py-3 text-left">Min B</th>
              <th className="px-4 py-3 text-left">Min C</th>
              <th className="px-4 py-3 text-left">Reward</th>
              <th className="px-4 py-3 text-left">Wallet</th>
              <th className="px-4 py-3 text-left">Active</th>
              <th className="px-4 py-3 text-left">Achieved</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={9}>Loading rules...</td></tr>
            ) : data.items.length === 0 ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={9}>No rules yet.</td></tr>
            ) : data.items.map((rule) => (
              <tr key={rule.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3 font-medium">{rule.id}</td>
                <td className="px-4 py-3">{formatMoney(rule.min_leg_a_income)}</td>
                <td className="px-4 py-3">{formatMoney(rule.min_leg_b_income)}</td>
                <td className="px-4 py-3">{formatMoney(rule.min_leg_c_income)}</td>
                <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">{formatMoney(rule.reward_amount)}</td>
                <td className="px-4 py-3 text-xs">{String(rule.reward_wallet || 'earning_balance').replace('_', ' ')}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void quickToggle(rule.id, { is_active: Number(rule.is_active || 0) === 1 ? 0 : 1 })}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                      Number(rule.is_active || 0) === 1
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                        : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {Number(rule.is_active || 0) === 1 ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                    {Number(rule.is_active || 0) === 1 ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void quickToggle(rule.id, { is_achieved: Number(rule.is_achieved || 0) === 1 ? 0 : 1 })}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                      Number(rule.is_achieved || 0) === 1
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300"
                        : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {Number(rule.is_achieved || 0) === 1 ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                    {Number(rule.is_achieved || 0) === 1 ? "Achieved" : "Not yet"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(rule)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:border-emerald-500 dark:border-slate-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(rule.id)}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 hover:border-red-300 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>Page {data.pagination?.page || 1} of {data.pagination?.totalPages || 1}</span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-50 dark:border-slate-700"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= Number(data.pagination?.totalPages || 1)}
            onClick={() => setPage((value) => value + 1)}
            className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-50 dark:border-slate-700"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

