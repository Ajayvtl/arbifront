"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Loader2, Radio, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { fetchWallet, fetchWalletTransactions } from "@/lib/mlmWalletApi";
import api from "@/lib/api";
import { getWalletTypeLabels, WalletTypeKey } from "@/lib/walletTypeLabels";

type WalletSnapshot = {
  main_balance: number;
  earning_balance: number;
  roi_balance: number;
  direct_balance: number;
  level_balance: number;
  withdrawable_balance: number;
  reward_balance: number;
  locked_balance: number;
};

type WalletTransaction = {
  id: number;
  amount: number;
  type: "DEPOSIT" | "WITHDRAW" | "REFERRAL" | "LEVEL" | "ROI" | "ROI_BOOSTER" | "REWARD";
  reference_id: number | null;
  tx_hash: string | null;
  status: string;
  meta?: Record<string, unknown> | string | null;
  created_at: string;
};

type WalletProfileMeta = {
  mlmSettings?: {
    roi_credit_time_utc?: string;
    roi_credit_enabled?: number;
    fast_start_bonus_enabled?: number;
    fast_start_bonus_label?: string;
    fast_start_bonus_amount?: number;
    fast_start_apply_for_inactive?: number;
    wallet_type_labels?: Partial<Record<string, unknown>> | null;
  } | null;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function transactionLabel(tx: WalletTransaction) {
  const meta =
    tx.meta && typeof tx.meta === "object"
      ? (tx.meta as Record<string, unknown>)
      : {};
  const bonusType = String(meta.bonusType || "");
  if (tx.type === "ROI") return "Daily Income Credit";
  if (tx.type === "ROI_BOOSTER") return "Booster Slab Income";
  if (tx.type === "REFERRAL" && bonusType === "FAST_START") return "Fast-Start Bonus";
  if (tx.type === "REFERRAL" && bonusType === "JOINING_BONUS") return "Joining Bonus";
  if (tx.type === "REFERRAL" && bonusType === "DIRECT_INCOME") return "Direct Income";
  if (tx.type === "REFERRAL") return "Working Balance Credit";
  if (tx.type === "LEVEL") return "Level Income";
  if (tx.type === "REWARD") return "Reward";
  if (tx.type === "WITHDRAW") return "Withdrawal";
  return "Deposit";
}

export default function DappWalletPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletSnapshot | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [profileMeta, setProfileMeta] = useState<WalletProfileMeta | null>(null);

  const userId = useMemo(() => Number(user?.id || 0), [user?.id]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(60);
  const countRef = useRef(60);
  const REFRESH_SECS = 60;

  useEffect(() => {
    if (!user) {
      router.replace("/dapp/login?next=%2Fdapp%2Fwallet");
      return;
    }
    if (user.role && user.role !== "USER") {
      router.replace("/login");
      return;
    }
    if (!userId) return;

    let cancelled = false;
    const load = async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const [walletData, txData] = await Promise.all([
          fetchWallet(userId),
          fetchWalletTransactions(userId, 50),
        ]);
        const profileRes = await api.get("/auth/me");
        if (!cancelled) {
          setWallet(walletData as WalletSnapshot);
          setTransactions((txData || []) as WalletTransaction[]);
          setProfileMeta((profileRes.data?.data || null) as WalletProfileMeta | null);
          setLastUpdated(new Date());
          countRef.current = REFRESH_SECS;
          setCountdown(REFRESH_SECS);
        }
      } catch (error: unknown) {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to load wallet";
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    // 60s auto-refresh
    const interval = setInterval(() => { void load(true); }, REFRESH_SECS * 1000);
    // countdown tick
    const tick = setInterval(() => {
      countRef.current = countRef.current > 0 ? countRef.current - 1 : REFRESH_SECS;
      setCountdown(countRef.current);
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      clearInterval(tick);
    };
  }, [router, user, userId]);

  const fastStartTransactions = useMemo(
    () =>
      transactions.filter((tx) => {
        const meta = tx.meta && typeof tx.meta === "object" ? (tx.meta as Record<string, unknown>) : null;
        return tx.type === "REFERRAL" && String(meta?.bonusType || "") === "FAST_START";
      }),
    [transactions]
  );
  const walletTypeLabels = useMemo(
    () => getWalletTypeLabels(profileMeta?.mlmSettings?.wallet_type_labels || null),
    [profileMeta?.mlmSettings?.wallet_type_labels]
  );

  return (
    <div className="min-h-screen bg-[#060b14] p-4 md:p-8">
      <div className="w-full space-y-5">
        <div className="rounded-3xl border border-[#123a62] bg-gradient-to-br from-[#09111c] via-[#0d1726] to-[#10213a] p-5 text-white shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#123a62] bg-[#0b1930] px-3 py-1 text-[11px] font-semibold tracking-wide text-[#5bbcff]">
                <Wallet className="h-3.5 w-3.5" />
                E-WALLET
              </div>
              <h1 className="mt-3 text-2xl font-extrabold">Income Wallet Ledger</h1>
              <p className="mt-2 max-w-3xl text-sm text-[#b0d6f5]">
                View ROI credits, referral income, reward income, and the balances available across each MLM wallet bucket.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-[#7f95ad]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                {lastUpdated ? `Live · updated ${lastUpdated.toLocaleTimeString()} · next in ${countdown}s` : "Connecting…"}
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Link href="/dapp/roi" className="text-[#f0b90b] hover:text-[#f8d45c]">ROI tracker</Link>
              <Link href="/dapp/withdraw" className="text-[#f0b90b] hover:text-[#f8d45c]">Request payout</Link>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#1e2329] bg-[#161a20] p-6 text-[#b7bdc6]">
            <div className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading wallet...
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              {[
                { key: "main_balance" as WalletTypeKey, value: wallet?.main_balance || 0 },
                { key: "earning_balance" as WalletTypeKey, value: wallet?.earning_balance || 0 },
                { key: "roi_balance" as WalletTypeKey, value: wallet?.roi_balance || 0 },
                { key: "direct_balance" as WalletTypeKey, value: wallet?.direct_balance || 0 },
                { key: "level_balance" as WalletTypeKey, value: wallet?.level_balance || 0 },
                { key: "withdrawable_balance" as WalletTypeKey, value: wallet?.withdrawable_balance || 0 },
                { key: "reward_balance" as WalletTypeKey, value: wallet?.reward_balance || 0 },
                { key: "locked_balance" as WalletTypeKey, value: wallet?.locked_balance || 0 },
              ].map(({ key, value }) => (
                <div key={key} className="rounded-2xl border border-[#132235] bg-[#09111c] p-4">
                  <p className="text-[11px] uppercase tracking-wider text-[#7f95ad]">{walletTypeLabels[key]}</p>
                  <p className="mt-2 text-2xl font-bold text-[#f5f5f5]">{Number(value).toFixed(4)}</p>
                  {key === "roi_balance" ? (
                    <p className="mt-1 text-[11px] text-[#848e9c]">
                      {profileMeta?.mlmSettings?.roi_credit_enabled
                        ? `Scheduled credit at ${profileMeta?.mlmSettings?.roi_credit_time_utc || "00:00"} UTC`
                        : `${walletTypeLabels.roi_balance} credit is currently disabled`}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-[#1e2329] bg-[#161a20] p-5 shadow md:p-7">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#f5f5f5]">Wallet Transactions</h2>
                  <p className="text-sm text-[#848e9c]">Every posted ROI and referral credit is logged here.</p>
                </div>
                <Link href="/dapp/transactions" className="inline-flex items-center gap-2 text-sm font-medium text-[#f0b90b] hover:text-[#f8d45c]">
                  Payment log
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              {profileMeta?.mlmSettings?.fast_start_bonus_enabled ? (
                <div className="mb-4 rounded-2xl border border-[#123a62] bg-[#0b1930] p-4 text-sm text-[#dce8f5]">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#5bbcff]">Fast-Start Bonus</p>
                  <p className="mt-2 font-semibold">
                    {profileMeta?.mlmSettings?.fast_start_bonus_label || "Fast-Start Bonus"}:
                    {" "}
                    {Number(profileMeta?.mlmSettings?.fast_start_bonus_amount || 0).toFixed(3)}
                  </p>
                  <p className="mt-1 text-xs text-[#9bb1c7]">
                    Inactive sponsor eligibility: {profileMeta?.mlmSettings?.fast_start_apply_for_inactive ? "allowed" : "requires active package"}
                  </p>
                </div>
              ) : null}

              {fastStartTransactions.length ? (
                <div className="mb-5 rounded-2xl border border-[#132235] bg-[#09111c] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#5bbcff]">Fast-Start Bonus History</p>
                      <p className="mt-1 text-sm text-[#9bb1c7]">Stored bonus entries with qualification details and received amount.</p>
                    </div>
                    <span className="rounded-full border border-[#123a62] bg-[#0b1930] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5bbcff]">
                      {fastStartTransactions.length} entry{fastStartTransactions.length === 1 ? "" : "ies"}
                    </span>
                  </div>

                  <div className="space-y-3 md:hidden">
                    {fastStartTransactions.map((tx) => {
                      const meta = tx.meta as Record<string, unknown>;
                      return (
                        <div key={`fast-start-${tx.id}`} className="rounded-xl border border-[#2b3139] bg-[#111418] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-[#f5f5f5]">{String(meta?.bonusLabel || "Fast-Start Bonus")}</p>
                              <p className="text-xs text-[#848e9c]">{formatDate(tx.created_at)}</p>
                            </div>
                            <span className="rounded-full border border-[#3a2f09] bg-[#201a08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f0b90b]">
                              {Number(tx.amount || 0).toFixed(4)}
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Qualified Directs</p>
                              <p className="text-[#f5f5f5]">
                                {String(meta?.qualifiedDirects || 0)}
                                {meta?.requiredDirects ? ` / ${String(meta.requiredDirects)}` : ""}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Total Volume</p>
                              <p className="text-[#f5f5f5]">{Number(meta?.totalVolume || 0).toFixed(4)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="hidden overflow-auto md:block">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-[#09111c]">
                        <tr className="border-b border-[#2b3139] text-left text-[#848e9c]">
                          <th className="py-2 pr-3">Label</th>
                          <th className="py-2 pr-3">Qualified</th>
                          <th className="py-2 pr-3">Total Volume</th>
                          <th className="py-2 pr-3">Received</th>
                          <th className="py-2 pr-3">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fastStartTransactions.map((tx) => {
                          const meta = tx.meta as Record<string, unknown>;
                          return (
                            <tr key={`fast-start-table-${tx.id}`} className="border-b border-[#1e2329] text-[#f5f5f5]">
                              <td className="py-2 pr-3">{String(meta?.bonusLabel || "Fast-Start Bonus")}</td>
                              <td className="py-2 pr-3">
                                {String(meta?.qualifiedDirects || 0)}
                                {meta?.requiredDirects ? ` / ${String(meta.requiredDirects)}` : ""}
                              </td>
                              <td className="py-2 pr-3">{Number(meta?.totalVolume || 0).toFixed(4)}</td>
                              <td className="py-2 pr-3">{Number(tx.amount || 0).toFixed(4)}</td>
                              <td className="py-2 pr-3">{formatDate(tx.created_at)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {transactions.length === 0 ? (
                <p className="text-sm text-[#b7bdc6]">No wallet transactions posted yet.</p>
              ) : (
                <>
                  <div className="space-y-3 md:hidden">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="rounded-xl border border-[#2b3139] bg-[#111418] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#f5f5f5]">{transactionLabel(tx)}</p>
                            <p className="text-xs text-[#848e9c]">Tx #{tx.id}</p>
                          </div>
                          <span className="rounded-full border border-[#3a2f09] bg-[#201a08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f0b90b]">
                            {tx.type}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Amount</p>
                            <p className="text-[#f5f5f5]">{Number(tx.amount || 0).toFixed(4)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Status</p>
                            <p className="text-[#f5f5f5]">{tx.status}</p>
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-[#848e9c]">{formatDate(tx.created_at)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="hidden md:block overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-[#161a20]">
                        <tr className="border-b border-[#2b3139] text-left text-[#848e9c]">
                          <th className="py-2 pr-3">Txn</th>
                          <th className="py-2 pr-3">Type</th>
                          <th className="py-2 pr-3">Label</th>
                          <th className="py-2 pr-3">Amount</th>
                          <th className="py-2 pr-3">Reference</th>
                          <th className="py-2 pr-3">Status</th>
                          <th className="py-2 pr-3">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx) => (
                          <tr key={tx.id} className="border-b border-[#1e2329] text-[#f5f5f5]">
                            <td className="py-2 pr-3">#{tx.id}</td>
                            <td className="py-2 pr-3">{tx.type}</td>
                            <td className="py-2 pr-3">{transactionLabel(tx)}</td>
                            <td className="py-2 pr-3">{Number(tx.amount || 0).toFixed(4)}</td>
                            <td className="py-2 pr-3">{tx.reference_id ? `#${tx.reference_id}` : "-"}</td>
                            <td className="py-2 pr-3">{tx.status}</td>
                            <td className="py-2 pr-3">{formatDate(tx.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
