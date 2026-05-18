"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GitBranch, Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getCompanyRoleScope } from "@/lib/companyRoleScope";
import { getWalletTypeLabels, WALLET_TYPE_KEYS, WalletTypeKey } from "@/lib/walletTypeLabels";

type LevelIncomeRow = {
  level: number;
  percent: number;
  enabled: boolean;
};

type MlmSettingsResponse = {
  level_income_config?: LevelIncomeRow[];
  level_income_balance_type?: string;
  wallet_type_labels?: Partial<Record<string, unknown>> | null;
};

const defaultRows: LevelIncomeRow[] = Array.from({ length: 20 }, (_, index) => ({
  level: index + 1,
  percent: 0,
  enabled: false,
}));

export default function CompanyLevelIncomePage() {
  const { user } = useAuth();
  const companyRoleScope = useMemo(() => getCompanyRoleScope(user), [user]);
  const isReadOnlyAdmin = companyRoleScope === "admin";
  const [rows, setRows] = useState<LevelIncomeRow[]>(defaultRows);
  const [levelIncomeBalanceType, setLevelIncomeBalanceType] = useState<WalletTypeKey>("level_balance");
  const [walletTypeLabels, setWalletTypeLabels] = useState(getWalletTypeLabels(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/settings/mlm");
      const payload = (response.data?.data || {}) as MlmSettingsResponse;
      const incoming = Array.isArray(payload.level_income_config) ? payload.level_income_config : [];
      const labels = getWalletTypeLabels(payload.wallet_type_labels || null);
      setWalletTypeLabels(labels);
      const configuredBalanceType = String(payload.level_income_balance_type || "level_balance").trim().toLowerCase() as WalletTypeKey;
      setLevelIncomeBalanceType(WALLET_TYPE_KEYS.includes(configuredBalanceType) ? configuredBalanceType : "level_balance");

      setRows(
        defaultRows.map((item) => {
          const match = incoming.find((row) => Number(row.level) === item.level);
          return {
            level: item.level,
            percent: Number(match?.percent || 0),
            enabled: Boolean(match?.enabled) && Number(match?.percent || 0) > 0,
          };
        })
      );
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to load level income settings";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPercent = useMemo(() => rows.reduce((sum, row) => sum + (row.enabled ? Number(row.percent || 0) : 0), 0), [rows]);

  const save = async () => {
    if (isReadOnlyAdmin) {
      toast.error("Admin role has read-only access to level income matrix");
      return;
    }
    setSaving(true);
    try {
      const settingsRes = await api.get("/settings/mlm");
      const current = settingsRes.data?.data || {};
      await api.put("/settings/mlm", {
        ...current,
        level_income_balance_type: levelIncomeBalanceType,
        level_income_config: rows.map((row) => ({
          level: row.level,
          percent: Number(row.percent || 0),
          enabled: Boolean(row.enabled) && Number(row.percent || 0) > 0,
        })),
      });
      toast.success("Level income settings updated");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to save level income settings";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Level Income Matrix</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Define up to 20 levels of ROI-on-ROI distribution. Each active percentage is applied when a member receives Daily Income credit.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950">
          Active total: <span className="font-semibold">{totalPercent.toFixed(2)}%</span>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading level matrix...
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-left">Level</th>
                    <th className="px-4 py-3 text-left">{isReadOnlyAdmin ? "Status" : "Enabled"}</th>
                    <th className="px-4 py-3 text-left">Percent</th>
                    <th className="px-4 py-3 text-left">Rule</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.level} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-3 font-medium">Level {row.level}</td>
                      <td className="px-4 py-3">
                        {isReadOnlyAdmin ? (
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.enabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
                            {row.enabled ? "Enabled" : "Disabled"}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setRows((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, enabled: !item.enabled } : item))}
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${row.enabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}
                          >
                            {row.enabled ? "Enabled" : "Disabled"}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isReadOnlyAdmin ? (
                          <span>{Number(row.percent || 0).toFixed(2)}%</span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.percent}
                            onChange={(e) => setRows((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, percent: Number(e.target.value || 0) } : item))}
                            className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {row.enabled && row.percent > 0
                          ? `${row.percent.toFixed(2)}% of member Daily Income credit`
                          : "No payout"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold">How It Works</h2>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <p>When a member receives Daily Income, the system checks the active upline chain up to level 20.</p>
                {!isReadOnlyAdmin && (
                  <label className="space-y-1 block">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Credit Level Income To Wallet Type</span>
                    <select
                      value={levelIncomeBalanceType}
                      onChange={(e) => setLevelIncomeBalanceType(e.target.value as WalletTypeKey)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                      {WALLET_TYPE_KEYS.map((key) => (
                        <option key={key} value={key}>{walletTypeLabels[key]}</option>
                      ))}
                    </select>
                  </label>
                )}
                <p>
                  If a level is enabled, that upline gets the configured percentage of the member&apos;s Daily Income credited into
                  {" "}
                  <span className="font-semibold">{walletTypeLabels[levelIncomeBalanceType]}</span>.
                </p>
                <p>The distribution is idempotent per ROI credit date, so the same level payout is not duplicated on retries.</p>
              </div>
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                Keep the total percentage sensible. This matrix is now live against Daily Income credits, not just a placeholder form.
              </div>
              {!isReadOnlyAdmin && (
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Saving..." : "Save Level Income"}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
