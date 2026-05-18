"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Filter, GitBranch, Loader2, Minus, Plus, Search } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getWalletTypeLabel } from "@/lib/walletTypeLabels";

type SessionProfile = {
  mlmSettings?: {
    wallet_type_labels?: Partial<Record<string, unknown>> | null;
  } | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  activeDirectCount?: number;
};

type LevelIncomeRow = {
  id: number;
  source_order_id: number | null;
  received_amount: number;
  created_at: string;
  credited_balance?: string | null;
  level?: number | null;
  level_percent?: number | null;
  source_user_id?: number | null;
  source_wallet?: string | null;
  source_referral_code?: string | null;
  package_amount?: number | null;
  token_symbol?: string | null;
  configured_level_percent?: number | null;
  source_daily_roi_estimate?: number | null;
  source_estimated_total_roi?: number | null;
  source_total_roi_credited?: number | null;
  payout_status?: "CREDITED" | "MISSED" | "PARTIAL" | "NONE" | string;
};

function shortAddress(value?: string | null) {
  const wallet = String(value || "");
  if (!wallet) return "-";
  if (wallet.length <= 12) return wallet;
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function formatAmount(value?: number | null) {
  const amount = Number(value || 0);
  if (amount === 0) return "0";
  if (Math.abs(amount) < 0.0001) return amount.toFixed(8);
  if (Math.abs(amount) < 1) return amount.toFixed(6);
  return amount.toFixed(2);
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function payoutBadgeClass(status: string) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "CREDITED") return "border-emerald-700/40 bg-emerald-900/30 text-emerald-300";
  if (normalized === "MISSED") return "border-rose-700/40 bg-rose-900/30 text-rose-300";
  if (normalized === "PARTIAL") return "border-amber-700/40 bg-amber-900/30 text-amber-300";
  return "border-slate-700/40 bg-slate-900/30 text-slate-300";
}

export default function DappLevelIncomePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [rows, setRows] = useState<LevelIncomeRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    activeDirectCount: 0,
  });
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const totalReceived = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.received_amount || 0), 0),
    [rows]
  );

  useEffect(() => {
    if (!user) {
      router.replace("/dapp/login?next=%2Fdapp%2Flevel-income");
      return;
    }
    if (user.role && user.role !== "USER") {
      router.replace("/login");
      return;
    }
  }, [router, user]);

  useEffect(() => {
    if (!user || (user.role && user.role !== "USER")) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [profileRes, ledgerRes] = await Promise.all([
          api.get("/auth/me"),
          api.get("/mlm/commissions/my-level-income", {
            params: {
              page: pagination.page,
              limit: pagination.limit,
              level: levelFilter || undefined,
              search: appliedSearch || undefined,
              dateFrom: dateFrom || undefined,
              dateTo: dateTo ? `${dateTo} 23:59:59` : undefined,
            },
          }),
        ]);

        if (cancelled) return;
        setProfile((profileRes.data?.data || null) as SessionProfile | null);
        setRows((ledgerRes.data?.data?.items || []) as LevelIncomeRow[]);
        setPagination((prev) => ({
          ...prev,
          ...(ledgerRes.data?.data?.pagination || {}),
        }));
      } catch (error: unknown) {
        if (cancelled) return;
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to load level income";
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [appliedSearch, dateFrom, dateTo, levelFilter, pagination.limit, pagination.page, user]);

  const applyFilters = () => {
    setAppliedSearch(search.trim());
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const resetFilters = () => {
    setSearch("");
    setAppliedSearch("");
    setDateFrom("");
    setDateTo("");
    setLevelFilter("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const toggleRow = (rowId: number, levelValue?: number | null) => {
    const key = `${rowId}-${levelValue || 0}`;
    setExpandedRows((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  };

  return (
    <main className="min-h-screen bg-[#060b14] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex w-full flex-col gap-6">
        <section className="overflow-hidden rounded-[30px] border border-[#123a62] bg-[radial-gradient(circle_at_top_left,_rgba(30,160,255,0.16),_transparent_38%),linear-gradient(135deg,#0b1320_0%,#09111c_46%,#060b14_100%)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#123a62] bg-[#0b1930] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5bbcff]">
                <GitBranch className="h-3.5 w-3.5" />
                Level Income
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Team ROI Level Credits</h1>
              <p className="mt-3 text-sm leading-6 text-[#8aa4bf]">
                This ledger shows level-wise income credited from your network members&apos; ROI.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="rounded-2xl border border-[#1b3452] bg-[#0b1930] px-4 py-3 text-sm text-[#d9efff]">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#5bbcff]">Active Directs</p>
                <p className="mt-1 font-semibold text-lg">{pagination.activeDirectCount ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-[#1b3452] bg-[#0b1930] px-4 py-3 text-sm text-[#d9efff]">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#a066ff]">Max Eligible Level</p>
                <p className="mt-1 font-semibold text-lg">Level {pagination.activeDirectCount ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-[#1b3452] bg-[#0b1930] px-4 py-3 text-sm text-[#d9efff]">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#5bbcff]">This Page Total</p>
                <p className="mt-1 font-semibold text-lg">{formatAmount(totalReceived)}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href="/dapp/network" className="rounded-xl border border-[#123a62] bg-[#0b1930] px-3 py-2 text-[#dce8f5] hover:bg-[#132033]">Network</Link>
            <Link href="/dapp/roi" className="rounded-xl border border-[#123a62] bg-[#0b1930] px-3 py-2 text-[#dce8f5] hover:bg-[#132033]">ROI Tracker</Link>
          </div>
        </section>

        <section className="rounded-[30px] border border-[#132235] bg-[#09111c] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f738c]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search wallet, referral"
                className="h-11 w-full rounded-2xl border border-[#24364a] bg-[#0d1726] pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-[#5f738c] focus:border-[#5bbcff]"
              />
            </label>

            <label className="relative block">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f738c]" />
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="h-11 w-full rounded-2xl border border-[#24364a] bg-[#0d1726] pl-9 pr-3 text-sm text-white outline-none transition focus:border-[#5bbcff]"
              />
            </label>

            <label className="relative block">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f738c]" />
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="h-11 w-full rounded-2xl border border-[#24364a] bg-[#0d1726] pl-9 pr-3 text-sm text-white outline-none transition focus:border-[#5bbcff]"
              />
            </label>

            <label className="relative block">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f738c]" />
              <select
                value={levelFilter}
                onChange={(event) => {
                  setLevelFilter(event.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="h-11 w-full appearance-none rounded-2xl border border-[#24364a] bg-[#0d1726] pl-9 pr-3 text-sm text-white outline-none transition focus:border-[#5bbcff]"
              >
                <option value="">All Levels</option>
                {Array.from({ length: 20 }, (_, index) => (
                  <option key={index + 1} value={index + 1}>
                    Level {index + 1}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={applyFilters}
                className="flex-1 rounded-2xl border border-[#123a62] bg-[#0b1930] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#132033]"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="flex-1 rounded-2xl border border-[#24364a] bg-[#0d1726] px-4 py-3 text-sm font-semibold text-[#dce8f5] transition hover:border-[#35506b] hover:bg-[#122033]"
              >
                Reset
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-[#132235] bg-[#09111c] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-6">
          <div className="hidden overflow-x-auto xl:block">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-[#132235] text-xs uppercase tracking-[0.16em] text-[#5bbcff]">
                  <th className="px-4 py-4">Date</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Level</th>
                  <th className="px-4 py-4">% (Configured)</th>
                  <th className="px-4 py-4">Referral</th>
                  <th className="px-4 py-4">Member Daily ROI</th>
                  <th className="px-4 py-4">Member Est. Total ROI</th>
                  <th className="px-4 py-4">Member Credited ROI</th>
                  <th className="px-4 py-4">Received</th>
                  <th className="px-4 py-4">Credited To</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-[#8aa4bf]">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading level income...
                      </span>
                    </td>
                  </tr>
                ) : rows.length ? (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-[#101b2a] text-sm text-[#dce8f5]">
                      <td className="px-4 py-4">{formatDateTime(row.created_at)}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${payoutBadgeClass(String(row.payout_status || "NONE"))}`}>
                            {String(row.payout_status || "NONE")}
                          </span>
                          {row.payout_status === "MISSED" && Number(row.level || 0) > Number(pagination.activeDirectCount || 0) && (
                            <span className="text-[9px] text-rose-400/80 font-medium">Insufficient Directs</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">Level {row.level || "-"}</td>
                      <td className="px-4 py-4">{Number(row.configured_level_percent || 0).toFixed(2)}%</td>
                      <td className="px-4 py-4">{row.source_referral_code || `User #${row.source_user_id || "-"}`}</td>
                      <td className="px-4 py-4 font-medium text-[#dce8f5]">{formatAmount(row.source_daily_roi_estimate)}</td>
                      <td className="px-4 py-4">{formatAmount(row.source_estimated_total_roi)}</td>
                      <td className="px-4 py-4">{formatAmount(row.source_total_roi_credited)}</td>
                      <td className="px-4 py-4 font-semibold text-white">{formatAmount(row.received_amount)}</td>
                      <td className="px-4 py-4">{getWalletTypeLabel(row.credited_balance, profile?.mlmSettings?.wallet_type_labels || null)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-[#8aa4bf]">
                      No level income found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 xl:hidden">
            {loading ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-[24px] border border-[#132235] bg-[#0a1420]">
                <span className="inline-flex items-center gap-2 text-[#8aa4bf]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading level income...
                </span>
              </div>
            ) : rows.length ? (
              rows.map((row) => (
                <article key={`${row.id}-${row.level || 0}`} className="rounded-[24px] border border-[#132235] bg-[#0a1420] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5bbcff]">Level Income</p>
                      <h2 className="mt-2 text-lg font-semibold text-white">Level {row.level || "-"}</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleRow(row.id, row.level)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#123a62] bg-[#0b1930] text-[#5bbcff]"
                      aria-label="Toggle level income details"
                    >
                      {expandedRows.includes(`${row.id}-${row.level || 0}`) ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-[#6f8aa5]">Received Amount</p>
                      <p className="mt-1 text-sm font-medium text-white">{formatAmount(row.received_amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-[#6f8aa5]">Credited To</p>
                      <p className="mt-1 text-sm font-medium text-[#dce8f5]">{getWalletTypeLabel(row.credited_balance, profile?.mlmSettings?.wallet_type_labels || null)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-[#6f8aa5]">Status</p>
                    <div className="mt-1 flex flex-col gap-1 items-start">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${payoutBadgeClass(String(row.payout_status || "NONE"))}`}>
                        {String(row.payout_status || "NONE")}
                      </span>
                      {row.payout_status === "MISSED" && Number(row.level || 0) > Number(pagination.activeDirectCount || 0) && (
                        <span className="text-[9px] text-rose-400/80 font-medium">Insufficient Directs</span>
                      )}
                    </div>
                    </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-[#6f8aa5]">% (Configured)</p>
                        <p className="mt-1 text-sm font-medium text-[#dce8f5]">{Number(row.configured_level_percent || 0).toFixed(2)}%</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-[#6f8aa5]">Member Daily ROI</p>
                        <p className="mt-1 text-sm font-medium text-[#dce8f5]">{formatAmount(row.source_daily_roi_estimate)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-[#6f8aa5]">Member Est. Total ROI</p>
                        <p className="mt-1 text-sm font-medium text-[#dce8f5]">{formatAmount(row.source_estimated_total_roi)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-[#6f8aa5]">Member Credited ROI</p>
                        <p className="mt-1 text-sm font-medium text-[#dce8f5]">{formatAmount(row.source_total_roi_credited)}</p>
                      </div>
                    </div>
                  {expandedRows.includes(`${row.id}-${row.level || 0}`) ? (
                    <div className="mt-4 grid gap-3 border-t border-[#132235] pt-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-[#6f8aa5]">Referral</p>
                        <p className="mt-1 text-sm font-medium text-[#dce8f5]">{row.source_referral_code || `User #${row.source_user_id || "-"}`}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-[#6f8aa5]">Level %</p>
                        <p className="mt-1 text-sm font-medium text-[#dce8f5]">{row.level_percent ? `${row.level_percent}%` : "-"}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-[#6f8aa5]">Date</p>
                        <p className="mt-1 text-sm font-medium text-[#dce8f5]">{formatDateTime(row.created_at)}</p>
                      </div>
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="flex min-h-[220px] items-center justify-center rounded-[24px] border border-dashed border-[#123a62] bg-[#0a1420] px-6 text-center text-[#8aa4bf]">
                No level income found for the selected filters.
              </div>
            )}
          </div>
        </section>

        <section className="flex items-center justify-between gap-3 rounded-[24px] border border-[#132235] bg-[#09111c] px-4 py-4">
          <button
            type="button"
            onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            disabled={pagination.page <= 1 || loading}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#24364a] bg-[#0d1726] px-4 py-2.5 text-sm font-semibold text-[#dce8f5] transition hover:border-[#35506b] hover:bg-[#122033] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <p className="text-sm font-medium text-[#8aa4bf]">
            Page {pagination.page} of {Math.max(1, pagination.totalPages)}
          </p>
          <button
            type="button"
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page < prev.totalPages ? prev.page + 1 : prev.page }))}
            disabled={pagination.page >= pagination.totalPages || loading}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#24364a] bg-[#0d1726] px-4 py-2.5 text-sm font-semibold text-[#dce8f5] transition hover:border-[#35506b] hover:bg-[#122033] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </section>
      </div>
    </main>
  );
}
