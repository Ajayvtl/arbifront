"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { CalendarDays, TrendingUp, Activity, Wallet, Users } from "lucide-react";
import api from "@/lib/api";

interface CommissionType {
  type: string;
  total_count: number;
  total_amount: number;
}

interface TopEarner {
  user_id: number;
  wallet_address: string;
  total_amount: number;
}

interface Payout {
  id: number;
  user_wallet_address: string | null;
  withdrawal_wallet_address: string | null;
  amount: number;
  net_amount: number;
  charge: number;
  status: string;
  created_at: string;
}

interface Member {
  id: number;
  wallet_address: string;
  status: string;
  is_blocked: number;
  main_balance: number | null;
  earning_balance: number | null;
  direct_count: number;
  created_at: string;
}

function fmt(n: number, d = 2) {
  if (!Number.isFinite(n) || n === 0) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(d)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(d)}K`;
  return n.toFixed(d);
}

function shortWallet(addr: string | null) {
  if (!addr) return "—";
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

function fmtDate(v: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(v));
  } catch { return v; }
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [commission, setCommission] = useState<{ totals: CommissionType[]; topEarners: TopEarner[] } | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const load = useCallback(async (d: number) => {
    setLoading(true);
    try {
      const [cRes, pRes, mRes] = await Promise.all([
        api.get("/mlm/commissions/summary", { params: { days: d } }),
        api.get("/mlm/payouts", { params: { limit: 500 } }),
        api.get("/mlm/members", { params: { limit: 1000 } }),
      ]);
      setCommission((cRes.data?.data || null) as { totals: CommissionType[]; topEarners: TopEarner[] } | null);
      setPayouts((pRes.data?.data || []) as Payout[]);
      setMembers((mRes.data?.data || []) as Member[]);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(days); }, [load, days]);

  const totals = commission?.totals || [];
  const topEarners = commission?.topEarners || [];

  const totalCommission = useMemo(() => totals.reduce((s, t) => s + Number(t.total_amount || 0), 0), [totals]);
  const totalTxns = useMemo(() => totals.reduce((s, t) => s + Number(t.total_count || 0), 0), [totals]);

  const activeMembers = useMemo(() => members.filter((m) => !m.is_blocked && (m.status === "ACTIVE" || m.status === "active")), [members]);
  const tvl = useMemo(() => members.reduce((s, m) => s + Number(m.main_balance || 0) + Number(m.earning_balance || 0), 0), [members]);

  const pendingPayouts = useMemo(() => payouts.filter((p) => p.status === "PENDING"), [payouts]);
  const completedPayouts = useMemo(() => payouts.filter((p) => p.status === "SUCCESS" || p.status === "APPROVED"), [payouts]);
  const totalNetPaid = useMemo(() => completedPayouts.reduce((s, p) => s + Number(p.net_amount || 0), 0), [completedPayouts]);
  const totalFees = useMemo(() => completedPayouts.reduce((s, p) => s + Number(p.charge || 0), 0), [completedPayouts]);

  const barMax = useMemo(() => Math.max(...totals.map((t) => Number(t.total_amount || 0)), 1), [totals]);
  const COLORS: Record<string, string> = {
    ROI: "#f0b90b", DIRECT: "#0ecb81", LEVEL: "#5bbcff",
    FAST_START: "#a855f7", WORKING_GAIN: "#f97316",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400 text-sm animate-pulse">Loading live report data…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 text-white">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {user?.role_id === 1 ? "Global MLM Reports" : "Commission & Payout Reports"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">Live data — {members.length} members · {payouts.length} payout records · {totalTxns} commission transactions</p>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-500" />
            {[7, 30, 90, 180].map((d) => (
              <button key={d} type="button" onClick={() => { setDays(d); void load(d); }}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${days === d ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          {[
            { label: `Total Commission (${days}d)`, value: `$${fmt(totalCommission)}`, sub: `${totalTxns} transactions`, icon: Activity, color: "#f0b90b" },
            { label: "Total Members", value: members.length, sub: `${activeMembers.length} active`, icon: Users, color: "#0ecb81" },
            { label: "Platform TVL", value: `$${fmt(tvl)}`, sub: "All wallet balances", icon: TrendingUp, color: "#5bbcff" },
            { label: "Net Paid Out", value: `$${fmt(totalNetPaid)}`, sub: `Fees collected: $${fmt(totalFees)}`, icon: Wallet, color: "#a855f7" },
            { label: "Pending Queue", value: pendingPayouts.length, sub: `$${fmt(pendingPayouts.reduce((s, p) => s + Number(p.net_amount || 0), 0))} net`, icon: CalendarDays, color: "#f97316" },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-500 leading-tight">{card.label}</p>
                  <div className="rounded-lg p-1.5" style={{ background: `${card.color}22` }}>
                    <Icon className="h-3.5 w-3.5" style={{ color: card.color }} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white">{card.value}</p>
                <p className="text-xs text-slate-600 mt-1">{card.sub}</p>
              </article>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Commission breakdown */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-base font-semibold mb-1">Commission by Type</h2>
            <p className="text-xs text-slate-500 mb-4">Last {days} days — all income types</p>
            {totals.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">No commission data for this period.</p>
            ) : (
              <div className="space-y-3">
                {totals.map((t) => {
                  const pct = barMax > 0 ? Math.max(3, (Number(t.total_amount) / barMax) * 100) : 3;
                  return (
                    <div key={t.type} className="flex items-center gap-3">
                      <span className="w-24 text-right text-xs text-slate-400 shrink-0">{t.type.replace(/_/g, " ")}</span>
                      <div className="flex-1 h-7 rounded-lg bg-slate-800 relative overflow-hidden">
                        <div className="h-full rounded-lg" style={{ width: `${pct}%`, background: COLORS[t.type] || "#64748b", transition: "width 0.6s" }} />
                        <span className="absolute inset-y-0 right-2 flex items-center text-[11px] font-bold text-white/80">${fmt(Number(t.total_amount))}</span>
                      </div>
                      <span className="w-10 text-xs text-slate-500 text-right shrink-0">{t.total_count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Top earners */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-base font-semibold mb-1">Top 10 Earners</h2>
            <p className="text-xs text-slate-500 mb-4">Highest total income — last {days} days</p>
            {topEarners.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">No earnings data for this period.</p>
            ) : (
              <div className="space-y-2">
                {topEarners.slice(0, 10).map((e, i) => (
                  <div key={e.user_id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5">
                    <span className="w-5 text-center text-xs font-bold text-slate-500">{i + 1}</span>
                    <span className="flex-1 font-mono text-xs text-slate-300">{shortWallet(e.wallet_address)}</span>
                    <span className="font-semibold text-emerald-300 text-sm">${fmt(Number(e.total_amount))}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Payout ledger */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-base font-semibold mb-1">Withdrawal Ledger</h2>
          <p className="text-xs text-slate-500 mb-4">All {payouts.length} payout records — most recent first</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="py-2 pr-4">ID</th>
                  <th className="py-2 pr-4">User Wallet</th>
                  <th className="py-2 pr-4">Dest. Wallet</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Fee</th>
                  <th className="py-2 pr-4">Net</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {payouts.slice(0, 50).map((p) => {
                  const statusColor = p.status === "PENDING" ? "text-amber-300" : p.status === "SUCCESS" || p.status === "APPROVED" ? "text-emerald-300" : "text-rose-300";
                  return (
                    <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 pr-4 text-slate-500 text-xs font-mono">#{p.id}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-slate-300">{shortWallet(p.user_wallet_address)}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-slate-400">{shortWallet(p.withdrawal_wallet_address)}</td>
                      <td className="py-2.5 pr-4 text-slate-300">${fmt(Number(p.amount))}</td>
                      <td className="py-2.5 pr-4 text-rose-400/70 text-xs">${fmt(Number(p.charge))}</td>
                      <td className="py-2.5 pr-4 font-semibold text-emerald-300">${fmt(Number(p.net_amount))}</td>
                      <td className={`py-2.5 pr-4 font-semibold text-xs ${statusColor}`}>{p.status}</td>
                      <td className="py-2.5 text-slate-500 text-xs">{fmtDate(p.created_at)}</td>
                    </tr>
                  );
                })}
                {payouts.length === 0 && (
                  <tr><td colSpan={8} className="py-10 text-center text-slate-500 text-sm">No payout records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
