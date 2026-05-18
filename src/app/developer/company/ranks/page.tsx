"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { PencilLine, Plus, RefreshCcw } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getCompanyRoleScope } from "@/lib/companyRoleScope";

type RankItem = {
  id: number;
  name: string;
  min_self_deposit: number;
  directs: number;
  min_team_business: number;
  reward: number;
  days: number;
  is_active: number;
  created_at: string;
};

type WalletTypeItem = {
  code: string;
  label: string;
  is_active: number;
};

type MlmSettingsResponse = {
  wallet_types?: WalletTypeItem[] | null;
  rank_reward_wallet_type?: string | null;
};

type RankForm = {
  name: string;
  minSelfDeposit: string;
  directs: string;
  minTeamBusiness: string;
  reward: string;
  days: string;
  isActive: "1" | "0";
};

const emptyForm: RankForm = {
  name: "",
  minSelfDeposit: "0",
  directs: "0",
  minTeamBusiness: "0",
  reward: "0",
  days: "0",
  isActive: "1",
};

export default function CompanyRanksPage() {
  const { user } = useAuth();
  const companyRoleScope = useMemo(() => getCompanyRoleScope(user), [user]);
  const isReadOnlyAdmin = companyRoleScope === "admin";

  const [ranks, setRanks] = useState<RankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingRankId, setEditingRankId] = useState<number | null>(null);
  const [form, setForm] = useState<RankForm>(emptyForm);
  const [walletTypes, setWalletTypes] = useState<WalletTypeItem[]>([]);
  const [rankRewardWalletType, setRankRewardWalletType] = useState("reward_balance");
  const [savingRewardWallet, setSavingRewardWallet] = useState(false);
  const effectiveRewardWallet = useMemo(() => {
    const matched = walletTypes.find((w) => w.code === rankRewardWalletType);
    if (matched) return { code: matched.code, label: matched.label };
    return { code: "reward_balance", label: "Reward Balance" };
  }, [walletTypes, rankRewardWalletType]);

  const loadRanks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/mlm/ranks", { params: { limit: 500 } });
      setRanks((response.data?.data || []) as RankItem[]);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to load ranks";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMlmSettings = useCallback(async () => {
    try {
      const response = await api.get("/settings/mlm");
      const data = (response.data?.data || {}) as MlmSettingsResponse;
      const available = Array.isArray(data.wallet_types)
        ? data.wallet_types.filter((item) => Number(item?.is_active || 0) === 1)
        : [];
      setWalletTypes(available);
      setRankRewardWalletType(String(data.rank_reward_wallet_type || "reward_balance").trim().toLowerCase() || "reward_balance");
    } catch {
      setWalletTypes([]);
      setRankRewardWalletType("reward_balance");
    }
  }, []);

  useEffect(() => {
    void loadRanks();
    void loadMlmSettings();
  }, [loadRanks, loadMlmSettings]);

  const startCreate = () => {
    if (isReadOnlyAdmin) return;
    setEditingRankId(null);
    setForm(emptyForm);
  };

  const startEdit = (rank: RankItem) => {
    if (isReadOnlyAdmin) return;
    setEditingRankId(rank.id);
    setForm({
      name: rank.name || "",
      minSelfDeposit: String(rank.min_self_deposit ?? 0),
      directs: String(rank.directs ?? 0),
      minTeamBusiness: String(rank.min_team_business ?? 0),
      reward: String(rank.reward ?? 0),
      days: String(rank.days ?? 0),
      isActive: Number(rank.is_active || 0) === 1 ? "1" : "0",
    });
  };

  const stats = useMemo(() => {
    const total = ranks.length;
    const maxReward = total ? Math.max(...ranks.map((r) => Number(r.reward || 0))) : 0;
    const maxDirects = total ? Math.max(...ranks.map((r) => Number(r.directs || 0))) : 0;
    const maxTeamBusiness = total ? Math.max(...ranks.map((r) => Number(r.min_team_business || 0))) : 0;
    const maxDays = total ? Math.max(...ranks.map((r) => Number(r.days || 0))) : 0;
    const activeCount = ranks.filter((r) => Number(r.is_active || 0) === 1).length;
    return { total, maxReward, maxDirects, maxTeamBusiness, maxDays, activeCount };
  }, [ranks]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (isReadOnlyAdmin) {
      toast.error("Admin role has read-only access to rank configuration");
      return;
    }

    const payload = {
      name: form.name.trim(),
      minSelfDeposit: Number(form.minSelfDeposit || 0),
      directs: Number(form.directs || 0),
      minTeamBusiness: Number(form.minTeamBusiness || 0),
      reward: Number(form.reward || 0),
      days: Number(form.days || 0),
      isActive: form.isActive === "1",
    };

    if (!payload.name) {
      toast.error("Rank name is required");
      return;
    }
    if (!Number.isFinite(payload.minSelfDeposit) || payload.minSelfDeposit < 0) {
      toast.error("Min Self Deposit must be a non-negative number");
      return;
    }
    if (!Number.isFinite(payload.directs) || payload.directs < 0) {
      toast.error("Directs must be a non-negative number");
      return;
    }
    if (!Number.isFinite(payload.minTeamBusiness) || payload.minTeamBusiness < 0) {
      toast.error("Min Team Business must be a non-negative number");
      return;
    }
    if (!Number.isFinite(payload.reward) || payload.reward < 0) {
      toast.error("Reward must be a non-negative number");
      return;
    }
    if (!Number.isFinite(payload.days) || payload.days < 0) {
      toast.error("Days must be a non-negative number");
      return;
    }

    setSubmitting(true);
    try {
      if (editingRankId) {
        await api.put(`/mlm/ranks/${editingRankId}`, payload);
        toast.success("Rank updated");
      } else {
        await api.post("/mlm/ranks", payload);
        toast.success("Rank created");
      }
      startCreate();
      await loadRanks();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to save rank";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const saveRewardWallet = async () => {
    if (isReadOnlyAdmin) {
      toast.error("Admin role has read-only access to rank configuration");
      return;
    }
    setSavingRewardWallet(true);
    try {
      await api.put("/settings/mlm", {
        rank_reward_wallet_type: rankRewardWalletType,
      });
      toast.success("Reward wallet target updated");
      await loadMlmSettings();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update reward wallet target";
      toast.error(message);
    } finally {
      setSavingRewardWallet(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Rank & Reward</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure qualification thresholds and one-time reward by rank.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadRanks()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm hover:border-emerald-500"
        >
          <RefreshCcw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4"><p className="text-xs text-slate-500">Total Ranks</p><p className="text-2xl font-semibold">{stats.total}</p></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4"><p className="text-xs text-slate-500">Active Ranks</p><p className="text-2xl font-semibold">{stats.activeCount}</p></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4"><p className="text-xs text-slate-500">Top Reward</p><p className="text-2xl font-semibold">{stats.maxReward.toFixed(2)}</p></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4"><p className="text-xs text-slate-500">Max Directs Rule</p><p className="text-2xl font-semibold">{stats.maxDirects}</p></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4"><p className="text-xs text-slate-500">Max Team Business Rule</p><p className="text-2xl font-semibold">{stats.maxTeamBusiness.toFixed(2)}</p></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4"><p className="text-xs text-slate-500">Max Days Rule</p><p className="text-2xl font-semibold">{stats.maxDays}</p></div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 md:p-5 space-y-3">
        <h2 className="text-lg font-semibold">Reward Credit Wallet</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Daily rank reward credits will go to this active wallet type.
        </p>
        <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
          Effective Backend Wallet: <span className="font-semibold">{effectiveRewardWallet.label}</span> ({effectiveRewardWallet.code})
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={rankRewardWalletType}
            disabled={isReadOnlyAdmin}
            onChange={(e) => setRankRewardWalletType(e.target.value)}
            className="min-w-[240px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            {walletTypes.map((wallet) => (
              <option key={wallet.code} value={wallet.code}>
                {wallet.label} ({wallet.code})
              </option>
            ))}
            {!walletTypes.length && <option value="reward_balance">Reward Balance (reward_balance)</option>}
          </select>
          {!isReadOnlyAdmin && (
            <button
              type="button"
              onClick={() => void saveRewardWallet()}
              disabled={savingRewardWallet}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {savingRewardWallet ? "Saving..." : "Save Wallet Target"}
            </button>
          )}
        </div>
      </div>

      {isReadOnlyAdmin ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
          Admin role has read-only access to rank configuration.
        </div>
      ) : (
        <form onSubmit={submit} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-semibold">{editingRankId ? `Edit Rank #${editingRankId}` : "Create Rank"}</h2>
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm hover:border-emerald-500"
            >
              <Plus className="w-4 h-4" /> New
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Rank Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Silver, Gold, Diamond"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Min Self Deposit</span>
              <input
                type="number"
                min="0"
                step="0.001"
                value={form.minSelfDeposit}
                onChange={(e) => setForm((prev) => ({ ...prev, minSelfDeposit: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Directs</span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.directs}
                onChange={(e) => setForm((prev) => ({ ...prev, directs: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Min Team Business</span>
              <input
                type="number"
                min="0"
                step="0.001"
                value={form.minTeamBusiness}
                onChange={(e) => setForm((prev) => ({ ...prev, minTeamBusiness: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Reward</span>
              <input
                type="number"
                min="0"
                step="0.001"
                value={form.reward}
                onChange={(e) => setForm((prev) => ({ ...prev, reward: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Days</span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.days}
                onChange={(e) => setForm((prev) => ({ ...prev, days: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Status</span>
              <select
                value={form.isActive}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.value as "1" | "0" }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </label>
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {editingRankId ? <PencilLine className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {submitting ? "Saving..." : editingRankId ? "Update Rank" : "Create Rank"}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/60">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">Rank</th>
                <th className="px-4 py-3 font-medium">Min Self Deposit</th>
                <th className="px-4 py-3 font-medium">Directs</th>
                <th className="px-4 py-3 font-medium">Min Team Business</th>
                <th className="px-4 py-3 font-medium">Reward</th>
                <th className="px-4 py-3 font-medium">Days</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                {!isReadOnlyAdmin && <th className="px-4 py-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isReadOnlyAdmin ? 8 : 9} className="px-4 py-6 text-center text-slate-500">Loading ranks...</td>
                </tr>
              ) : ranks.length === 0 ? (
                <tr>
                  <td colSpan={isReadOnlyAdmin ? 8 : 9} className="px-4 py-6 text-center text-slate-500">No ranks configured yet.</td>
                </tr>
              ) : (
                ranks.map((rank) => (
                  <tr key={rank.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-4 py-3 font-medium">{rank.name}</td>
                    <td className="px-4 py-3">{Number(rank.min_self_deposit || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">{Number(rank.directs || 0)}</td>
                    <td className="px-4 py-3">{Number(rank.min_team_business || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">{Number(rank.reward || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">{Number(rank.days || 0)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${Number(rank.is_active || 0) === 1 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                        {Number(rank.is_active || 0) === 1 ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{rank.created_at ? new Date(rank.created_at).toLocaleString() : "-"}</td>
                    {!isReadOnlyAdmin && (
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => startEdit(rank)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs hover:border-emerald-500"
                        >
                          <PencilLine className="w-3 h-3" /> Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
