"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeDollarSign, CalendarDays, ChevronLeft, ChevronRight, Filter, Loader2, Minus, Network, Plus, Search, Users } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getWalletTypeLabel } from "@/lib/walletTypeLabels";

type SessionProfile = {
  mlmSettings?: {
    wallet_type_labels?: Partial<Record<string, unknown>> | null;
  } | null;
  metrics?: {
    directReferrals?: number;
    teamMembers?: number;
    teamInvestment?: number;
  };
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type DirectIncomeRow = {
  id: number;
  order_id: number | null;
  received_amount: number;
  created_at: string;
  source_status?: string | null;
  credited_balance?: string | null;
  rule_name?: string | null;
  amount_paid?: number | null;
  token_symbol?: string | null;
  source_user_id?: number | null;
  source_wallet?: string | null;
  source_referral_code?: string | null;
};

type LevelIncomeRow = {
  id: number;
  source_order_id: number | null;
  received_amount: number;
  created_at: string;
  source_status?: string | null;
  credited_balance?: string | null;
  level?: number | null;
  level_percent?: number | null;
  source_user_id?: number | null;
  source_wallet?: string | null;
  source_referral_code?: string | null;
  source_daily_roi_estimate?: number | null;
  token_symbol?: string | null;
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

function balanceLabel(value: string | null | undefined, walletLabels?: Partial<Record<string, unknown>> | null) {
  return getWalletTypeLabel(value, walletLabels);
}

function statusPillClass(status?: string | null) {
  return String(status || "").toUpperCase() === "ACTIVE"
    ? "border-emerald-700/40 bg-emerald-900/30 text-emerald-300"
    : "border-rose-700/40 bg-rose-900/30 text-rose-300";
}

export default function DappNetworkPage() {
  const [tab, setTab] = useState<"direct" | "level">("direct");
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [directPage, setDirectPage] = useState(1);
  const [levelPage, setLevelPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [directLoading, setDirectLoading] = useState(true);
  const [levelLoading, setLevelLoading] = useState(true);
  const [expandedDirectRows, setExpandedDirectRows] = useState<number[]>([]);
  const [expandedLevelRows, setExpandedLevelRows] = useState<string[]>([]);
  const [directData, setDirectData] = useState<{ items: DirectIncomeRow[]; pagination: Pagination }>({
    items: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
  });
  const [levelData, setLevelData] = useState<{ items: LevelIncomeRow[]; pagination: Pagination }>({
    items: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
  });

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const response = await api.get("/auth/me");
        setProfile((response.data?.data || null) as SessionProfile | null);
      } catch (error: unknown) {
        const message =
          (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
          (error as { message?: string }).message ||
          "Failed to load network summary";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, []);

  useEffect(() => {
    const loadDirectIncome = async () => {
      setDirectLoading(true);
      try {
        const response = await api.get("/mlm/commissions/my-direct-income", {
          params: {
            page: directPage,
            limit: 10,
            search: appliedSearch || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo ? `${dateTo} 23:59:59` : undefined,
          },
        });
        setDirectData(response.data?.data || { items: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } });
      } catch (error: unknown) {
        const message =
          (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
          (error as { message?: string }).message ||
          "Failed to load direct referral income";
        toast.error(message);
      } finally {
        setDirectLoading(false);
      }
    };

    void loadDirectIncome();
  }, [appliedSearch, dateFrom, dateTo, directPage]);

  useEffect(() => {
    const loadLevelIncome = async () => {
      setLevelLoading(true);
      try {
        const response = await api.get("/mlm/commissions/my-level-income", {
          params: {
            page: levelPage,
            limit: 10,
            level: levelFilter || undefined,
            search: appliedSearch || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo ? `${dateTo} 23:59:59` : undefined,
          },
        });
        setLevelData(response.data?.data || { items: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } });
      } catch (error: unknown) {
        const message =
          (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
          (error as { message?: string }).message ||
          "Failed to load level income";
        toast.error(message);
      } finally {
        setLevelLoading(false);
      }
    };

    void loadLevelIncome();
  }, [appliedSearch, dateFrom, dateTo, levelFilter, levelPage]);

  const stats = useMemo(
    () => [
      {
        label: "Direct Referrals",
        value: Number(profile?.metrics?.directReferrals || 0),
        icon: Users,
      },
      {
        label: "Total Network",
        value: Number(profile?.metrics?.teamMembers || 0),
        icon: Network,
      },
      {
        label: "Team Investment",
        value: formatAmount(Number(profile?.metrics?.teamInvestment || 0)),
        icon: BadgeDollarSign,
      },
    ],
    [profile]
  );

  const applyFilters = () => {
    setAppliedSearch(search.trim());
    setDirectPage(1);
    setLevelPage(1);
  };

  const resetFilters = () => {
    setSearch("");
    setAppliedSearch("");
    setDateFrom("");
    setDateTo("");
    setLevelFilter("");
    setDirectPage(1);
    setLevelPage(1);
  };

  const currentPagination = tab === "direct" ? directData.pagination : levelData.pagination;
  const toggleDirectRow = (rowId: number) => {
    setExpandedDirectRows((current) =>
      current.includes(rowId) ? current.filter((item) => item !== rowId) : [...current, rowId]
    );
  };
  const toggleLevelRow = (rowId: number, levelValue?: number | null) => {
    const key = `${rowId}-${levelValue || 0}`;
    setExpandedLevelRows((current) =>
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
                <Network className="h-3.5 w-3.5" />
                Network Income
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Direct And Level Earnings</h1>
              {/* <p className="mt-3 max-w-3xl text-sm leading-6 text-[#8aa4bf]">
                Track direct referral income and level income from team ROI in a searchable, paginated, mobile-friendly ledger.
              </p> */}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {stats.map((item) => (
            <div
              key={item.label}
              className="rounded-[24px] border border-[#132235] bg-[#09111c] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5bbcff]">{item.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{loading ? "-" : item.value}</p>
                </div>
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#123a62] bg-[#0b1930] text-[#5bbcff]">
                  <item.icon className="h-5 w-5" />
                </span>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-[30px] border border-[#132235] bg-[#09111c] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex w-full rounded-[20px] border border-[#123a62] bg-[#0b1930] p-1 lg:w-auto">
              {[
                { key: "direct" as const, label: "Direct Referrals", icon: Users },
                { key: "level" as const, label: "Level Income", icon: BadgeDollarSign },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-[16px] px-4 py-3 text-sm font-semibold transition ${tab === item.key ? "bg-[#132033] text-white" : "text-[#8aa4bf] hover:text-white"
                    }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f738c]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search wallet, referral, order"
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
                    setLevelPage(1);
                  }}
                  disabled={tab !== "level"}
                  className="h-11 w-full appearance-none rounded-2xl border border-[#24364a] bg-[#0d1726] pl-9 pr-3 text-sm text-white outline-none transition focus:border-[#5bbcff] disabled:cursor-not-allowed disabled:opacity-50"
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
          </div>
        </section>

        <section className="rounded-[30px] border border-[#132235] bg-[#09111c] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-6">
          {tab === "direct" ? (
            <>
              <div className="hidden overflow-x-auto xl:block">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="border-b border-[#132235] text-xs uppercase tracking-[0.16em] text-[#5bbcff]">
                      <th className="px-4 py-4">Date</th>
                      <th className="px-4 py-4">Referral</th>
                      <th className="px-4 py-4">Paid Amount</th>
                      <th className="px-4 py-4">%</th>
                      <th className="px-4 py-4">Received</th>
                      <th className="px-4 py-4">Credited To</th>
                      <th className="px-4 py-4">Rule</th>
                      <th className="px-4 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {directLoading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-[#8aa4bf]">
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading direct referral income...
                          </span>
                        </td>
                      </tr>
                    ) : directData.items.length ? (
                      directData.items.map((row) => (
                        <tr key={row.id} className="border-b border-[#101b2a] text-sm text-[#dce8f5]">
                          <td className="px-4 py-4">{formatDateTime(row.created_at)}</td>
                          <td className="px-4 py-4">{row.source_referral_code || `User #${row.source_user_id || "-"}`}</td>
                          <td className="px-4 py-4">{formatAmount(row.amount_paid)} {row.token_symbol || ""}</td>
                          <td className="px-4 py-4">{row.amount_paid && row.amount_paid > 0 ? ((row.received_amount / row.amount_paid) * 100).toFixed(2) : "0.00"}%</td>
                          <td className="px-4 py-4 font-semibold text-white">{formatAmount(row.received_amount)}</td>
                          <td className="px-4 py-4">{balanceLabel(row.credited_balance, profile?.mlmSettings?.wallet_type_labels || null)}</td>
                          <td className="px-4 py-4">{row.rule_name || "Direct Income"}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusPillClass(row.source_status)}`}>
                              {String(row.source_status || "INACTIVE")}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-[#8aa4bf]">
                          No direct referral income found for the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 xl:hidden">
                {directLoading ? (
                  <div className="flex min-h-[220px] items-center justify-center rounded-[24px] border border-[#132235] bg-[#0a1420]">
                    <span className="inline-flex items-center gap-2 text-[#8aa4bf]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading direct referral income...
                    </span>
                  </div>
                ) : directData.items.length ? (
                  directData.items.map((row) => (
                    <article key={row.id} className="rounded-[24px] border border-[#132235] bg-[#0a1420] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5bbcff]">Direct Referral</p>
                          <h2 className="mt-2 text-lg font-semibold text-white">{row.source_referral_code || `User #${row.source_user_id || "-"}`}</h2>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleDirectRow(row.id)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#123a62] bg-[#0b1930] text-[#5bbcff]"
                          aria-label="Toggle direct referral details"
                        >
                          {expandedDirectRows.includes(row.id) ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-[#6f8aa5]">Received Amount</p>
                          <p className="mt-1 text-sm font-medium text-white">{formatAmount(row.received_amount)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-[#6f8aa5]">Status</p>
                          <p className="mt-1">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusPillClass(row.source_status)}`}>
                              {String(row.source_status || "INACTIVE")}
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-[#6f8aa5]">Credited To</p>
                          <p className="mt-1 text-sm font-medium text-[#dce8f5]">{balanceLabel(row.credited_balance, profile?.mlmSettings?.wallet_type_labels || null)}</p>
                        </div>
                      </div>
                      {expandedDirectRows.includes(row.id) ? (
                        <div className="mt-4 grid gap-3 border-t border-[#132235] pt-4 sm:grid-cols-2">
                          <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-[#6f8aa5]">Date</p>
                            <p className="mt-1 text-sm font-medium text-[#dce8f5]">{formatDateTime(row.created_at)}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-[#6f8aa5]">Amount Paid</p>
                            <p className="mt-1 text-sm font-medium text-white">{formatAmount(row.amount_paid)} {row.token_symbol || ""}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-[#6f8aa5]">Rule</p>
                            <p className="mt-1 text-sm font-medium text-[#dce8f5]">{row.rule_name || "Direct Income"}</p>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <div className="flex min-h-[220px] items-center justify-center rounded-[24px] border border-dashed border-[#123a62] bg-[#0a1420] px-6 text-center text-[#8aa4bf]">
                    No direct referral income found for the selected filters.
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="hidden overflow-x-auto xl:block">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="border-b border-[#132235] text-xs uppercase tracking-[0.16em] text-[#5bbcff]">
                      <th className="px-4 py-4">Date</th>
                      <th className="px-4 py-4">Level</th>

                      {/* <th className="px-4 py-4">Referral</th> */}
                      <th className="px-4 py-4">Member Daily ROI</th>
                      <th className="px-4 py-4">commission(%)</th>
                      <th className="px-4 py-4">Received</th>
                      <th className="px-4 py-4">Credited To</th>
                      <th className="px-4 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {levelLoading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-[#8aa4bf]">
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading level income...
                          </span>
                        </td>
                      </tr>
                    ) : levelData.items.length ? (
                      levelData.items.map((row) => (
                        <tr key={row.id} className="border-b border-[#101b2a] text-sm text-[#dce8f5]">
                          <td className="px-4 py-4">{formatDateTime(row.created_at)}</td>
                          <td className="px-4 py-4">Level {row.level || "-"}</td>
                          {/* <td className="px-4 py-4">{row.source_referral_code || `User #${row.source_user_id || "-"}`}</td> */}


                          <td className="px-4 py-4 font-medium text-[#dce8f5]">{formatAmount(row.source_daily_roi_estimate)}</td>
                          <td className="px-4 py-4">{Number(row.level_percent || 0).toFixed(2)}%</td>
                          <td className="px-4 py-4 font-semibold text-white">{formatAmount(row.received_amount)}</td>
                          <td className="px-4 py-4">{balanceLabel(row.credited_balance, profile?.mlmSettings?.wallet_type_labels || null)}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusPillClass(row.source_status)}`}>
                              {String(row.source_status || "INACTIVE")}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-[#8aa4bf]">
                          No level income found for the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 xl:hidden">
                {levelLoading ? (
                  <div className="flex min-h-[220px] items-center justify-center rounded-[24px] border border-[#132235] bg-[#0a1420]">
                    <span className="inline-flex items-center gap-2 text-[#8aa4bf]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading level income...
                    </span>
                  </div>
                ) : levelData.items.length ? (
                  levelData.items.map((row) => (
                    <article key={`${row.id}-${row.level || 0}`} className="rounded-[24px] border border-[#132235] bg-[#0a1420] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5bbcff]">Level Income</p>
                          <h2 className="mt-2 text-lg font-semibold text-white">Level {row.level || "-"}</h2>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleLevelRow(row.id, row.level)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#123a62] bg-[#0b1930] text-[#5bbcff]"
                          aria-label="Toggle level income details"
                        >
                          {expandedLevelRows.includes(`${row.id}-${row.level || 0}`) ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-[#6f8aa5]">Received Amount</p>
                          <p className="mt-1 text-sm font-medium text-white">{formatAmount(row.received_amount)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-[#6f8aa5]">Status</p>
                          <p className="mt-1">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusPillClass(row.source_status)}`}>
                              {String(row.source_status || "INACTIVE")}
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-[#6f8aa5]">Credited To</p>
                          <p className="mt-1 text-sm font-medium text-[#dce8f5]">{balanceLabel(row.credited_balance, profile?.mlmSettings?.wallet_type_labels || null)}</p>
                        </div>
                      </div>
                      {expandedLevelRows.includes(`${row.id}-${row.level || 0}`) ? (
                        <div className="mt-4 grid gap-3 border-t border-[#132235] pt-4 sm:grid-cols-2">
                          <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-[#6f8aa5]">Referral</p>
                            <p className="mt-1 text-sm font-medium text-[#dce8f5]">{row.source_referral_code || `User #${row.source_user_id || "-"}`}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-[#6f8aa5]">Member Daily ROI</p>
                            <p className="mt-1 text-sm font-medium text-white">{formatAmount(row.source_daily_roi_estimate)}</p>
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
            </>
          )}
        </section>

        <section className="flex items-center justify-between gap-3 rounded-[24px] border border-[#132235] bg-[#09111c] px-4 py-4">
          <button
            type="button"
            onClick={() => (tab === "direct" ? setDirectPage((current) => Math.max(1, current - 1)) : setLevelPage((current) => Math.max(1, current - 1)))}
            disabled={currentPagination.page <= 1 || (tab === "direct" ? directLoading : levelLoading)}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#24364a] bg-[#0d1726] px-4 py-2.5 text-sm font-semibold text-[#dce8f5] transition hover:border-[#35506b] hover:bg-[#122033] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <p className="text-sm font-medium text-[#8aa4bf]">
            Page {currentPagination.page} of {Math.max(1, currentPagination.totalPages)}
          </p>
          <button
            type="button"
            onClick={() =>
              tab === "direct"
                ? setDirectPage((current) => (current < directData.pagination.totalPages ? current + 1 : current))
                : setLevelPage((current) => (current < levelData.pagination.totalPages ? current + 1 : current))
            }
            disabled={currentPagination.page >= currentPagination.totalPages || (tab === "direct" ? directLoading : levelLoading)}
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
