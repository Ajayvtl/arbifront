"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Search, Users, Shield, ShieldOff, ChevronLeft, ChevronRight, RefreshCw, BarChart3 } from "lucide-react";

interface Member {
  id: number;
  wallet_address: string;
  referral_code: string | null;
  sponsor_id: number | null;
  status: string;
  is_blocked: number;
  created_at: string;
  main_balance: number | null;
  earning_balance: number | null;
  reward_balance: number | null;
  rank_name: string | null;
  direct_count: number;
}

function shortWallet(addr: string | null) {
  if (!addr) return "—";
  return addr.length > 16 ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : addr;
}

function fmt(n: number) {
  if (!Number.isFinite(n) || n === 0) return "0";
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(2);
}

function fmtDate(v: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(v));
  } catch { return v; }
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await api.get("/mlm/members", { params: { limit: 500, search: q || undefined } });
      setMembers((res.data?.data || []) as Member[]);
    } catch {
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(appliedSearch); }, [load, appliedSearch]);

  const totalMembers = members.length;
  const activeMembers = useMemo(() => members.filter((m) => !m.is_blocked && (m.status === "ACTIVE" || m.status === "active")).length, [members]);
  const blockedMembers = useMemo(() => members.filter((m) => !!m.is_blocked).length, [members]);
  const totalTvl = useMemo(() => members.reduce((s, m) => s + Number(m.main_balance || 0) + Number(m.earning_balance || 0), 0), [members]);

  const totalPages = Math.max(1, Math.ceil(totalMembers / PAGE_SIZE));
  const paginated = useMemo(() => members.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [members, page]);

  const updateStatus = async (member: Member) => {
    const newBlocked = member.is_blocked ? 0 : 1;
    const newStatus = newBlocked ? "REJECTED" : "VERIFIED";
    try {
      await api.patch(`/mlm/kyc/${member.id}`, { status: newStatus });
      toast.success(newBlocked ? "Member blocked" : "Member unblocked");
      void load(appliedSearch);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to update status";
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 text-white">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Member Registry</h1>
            <p className="text-sm text-slate-500 mt-1">Live from database · {totalMembers} total members</p>
          </div>
          <button type="button" onClick={() => void load(appliedSearch)}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Members", value: totalMembers, color: "#5bbcff" },
            { label: "Active", value: activeMembers, color: "#0ecb81" },
            { label: "Blocked", value: blockedMembers, color: "#f6465d" },
            { label: "Platform TVL", value: `$${fmt(totalTvl)}`, color: "#f0b90b" },
          ].map((c) => (
            <article key={c.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs text-slate-500">{c.label}</p>
              <p className="mt-2 text-2xl font-bold" style={{ color: c.color }}>{c.value}</p>
            </article>
          ))}
        </div>

        {/* Search */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setAppliedSearch(search.trim()); setPage(1); } }}
              placeholder="Search wallet or referral code…"
              className="h-11 w-full rounded-2xl border border-slate-700 bg-slate-900 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
            />
          </div>
          <button type="button"
            onClick={() => { setAppliedSearch(search.trim()); setPage(1); }}
            className="rounded-2xl border border-slate-700 bg-slate-800 px-5 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors">
            Search
          </button>
          {appliedSearch && (
            <button type="button"
              onClick={() => { setSearch(""); setAppliedSearch(""); setPage(1); }}
              className="rounded-2xl border border-rose-800 bg-rose-900/30 px-5 py-2 text-sm font-medium text-rose-300 hover:bg-rose-900/50 transition-colors">
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-500 text-sm animate-pulse">
              Loading members…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-800 bg-slate-950">
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Wallet</th>
                    <th className="px-4 py-3">Referral Code</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Direct Refs</th>
                    <th className="px-4 py-3">Main Balance</th>
                    <th className="px-4 py-3">Earning</th>
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((m) => {
                    const isActive = !m.is_blocked && (m.status === "ACTIVE" || m.status === "active");
                    return (
                      <tr key={m.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-300">{shortWallet(m.wallet_address)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{m.referral_code || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            m.is_blocked
                              ? "border-rose-700/40 bg-rose-900/30 text-rose-300"
                              : isActive
                              ? "border-emerald-700/40 bg-emerald-900/30 text-emerald-300"
                              : "border-slate-700 bg-slate-800 text-slate-400"
                          }`}>
                            {m.is_blocked ? "Blocked" : isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{m.direct_count}</td>
                        <td className="px-4 py-3 text-emerald-300 font-semibold">${fmt(Number(m.main_balance || 0))}</td>
                        <td className="px-4 py-3 text-amber-300">${fmt(Number(m.earning_balance || 0))}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{m.rank_name || "—"}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(m.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Link href={`/admin/users/${m.wallet_address}/roi`} className="rounded-lg border border-sky-700 bg-sky-900/30 px-3 py-1 text-xs font-medium text-sky-300 hover:bg-sky-900/50 transition-colors inline-flex items-center">
                              <BarChart3 className="h-3 w-3 mr-1" /> ROI
                            </Link>
                            <button
                              type="button"
                              onClick={() => void updateStatus(m)}
                              title={m.is_blocked ? "Unblock member" : "Block member"}
                              className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${
                                m.is_blocked
                                  ? "border-emerald-700 bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50"
                                  : "border-rose-700 bg-rose-900/30 text-rose-300 hover:bg-rose-900/50"
                              }`}
                            >
                              {m.is_blocked ? <><ShieldOff className="inline h-3 w-3 mr-1" />Unblock</> : <><Shield className="inline h-3 w-3 mr-1" />Block</>}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-500 text-sm">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No members found{appliedSearch ? ` for "${appliedSearch}"` : ""}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
              <p className="text-xs text-slate-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalMembers)} of {totalMembers}
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 disabled:opacity-40 transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-slate-400">Page {page} of {totalPages}</span>
                <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 disabled:opacity-40 transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
