"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Clock, TrendingUp, Users, Wallet } from "lucide-react";
import api from "@/lib/api";

interface Member {
  id: number;
  status: string;
  is_blocked: number;
  main_balance: number | null;
  earning_balance: number | null;
}

interface CommissionType {
  type: string;
  total_count: number;
  total_amount: number;
}

interface Payout {
  id: number;
  amount: number;
  net_amount: number;
  status: string;
}

function fmt(n: number) {
  if (!Number.isFinite(n) || n === 0) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(2);
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(3, (value / max) * 100) : 3;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 text-right text-xs text-slate-400 shrink-0">{label}</span>
      <div className="flex-1 h-7 rounded-lg bg-slate-800 relative overflow-hidden">
        <div className="h-full rounded-lg" style={{ width: `${pct}%`, background: color, transition: "width 0.6s" }} />
        <span className="absolute inset-y-0 right-2 flex items-center text-[11px] font-bold text-white/80">${fmt(value)}</span>
      </div>
    </div>
  );
}

export default function AdminFinancePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [commission, setCommission] = useState<{ totals: CommissionType[] } | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const load = useCallback(async (d: number) => {
    setLoading(true);
    try {
      const [mRes, cRes, pRes] = await Promise.all([
        api.get("/mlm/members", { params: { limit: 1000 } }),
        api.get("/mlm/commissions/summary", { params: { days: d } }),
        api.get("/mlm/payouts", { params: { limit: 500 } }),
      ]);
      setMembers((mRes.data?.data || []) as Member[]);
      setCommission((cRes.data?.data || null) as { totals: CommissionType[] } | null);
      setPayouts((pRes.data?.data || []) as Payout[]);
    } catch {
      /* silent — individual sections handle empty state */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(days); }, [load, days]);

  const totalMembers = members.length;
  const activeMembers = useMemo(() => members.filter((m) => !m.is_blocked && (m.status === "ACTIVE" || m.status === "active")).length, [members]);
  const tvl = useMemo(() => members.reduce((s, m) => s + Number(m.main_balance || 0) + Number(m.earning_balance || 0), 0), [members]);

  const commTotals = useMemo(() => (commission?.totals || []), [commission]);
  const totalPaid = useMemo(() => commTotals.reduce((s, t) => s + Number(t.total_amount || 0), 0), [commTotals]);
  const totalTxns = useMemo(() => commTotals.reduce((s, t) => s + Number(t.total_count || 0), 0), [commTotals]);

  const pendingNet = useMemo(() => payouts.filter((p) => p.status === "PENDING").reduce((s, p) => s + Number(p.net_amount || 0), 0), [payouts]);
  const paidNet = useMemo(() => payouts.filter((p) => p.status === "SUCCESS" || p.status === "APPROVED").reduce((s, p) => s + Number(p.net_amount || 0), 0), [payouts]);

  const barMax = useMemo(() => Math.max(...commTotals.map((t) => Number(t.total_amount || 0)), 1), [commTotals]);

  const COLORS: Record<string, string> = {
    ROI: "#f0b90b", DIRECT: "#0ecb81", LEVEL: "#5bbcff",
    FAST_START: "#a855f7", WORKING_GAIN: "#f97316",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-sm animate-pulse">Loading live finance data…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 text-white">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Platform Finance</h1>
            <p className="text-sm text-slate-500 mt-1">Live data from members, commissions, and withdrawals</p>
          </div>
          <div className="flex gap-2">
            {[7, 30, 90].map((d) => (
              <button key={d} type="button" onClick={() => { setDays(d); void load(d); }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${days === d ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          {[
            { label: "Total Members", value: totalMembers, sub: `${activeMembers} active`, icon: Users, color: "#0ecb81" },
            { label: `Commission Paid (${days}d)`, value: `$${fmt(totalPaid)}`, sub: `${totalTxns} transactions`, icon: Activity, color: "#f0b90b" },
            { label: "Platform TVL", value: `$${fmt(tvl)}`, sub: "Main + earning balances", icon: TrendingUp, color: "#5bbcff" },
            { label: "Pending Withdrawals", value: `$${fmt(pendingNet)}`, sub: "Net awaiting payout", icon: Clock, color: "#f97316" },
            { label: "Total Paid Out", value: `$${fmt(paidNet)}`, sub: "Net settled payouts", icon: Wallet, color: "#a855f7" },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">{card.label}</p>
                  <div className="rounded-lg p-2" style={{ background: `${card.color}22` }}>
                    <Icon className="h-4 w-4" style={{ color: card.color }} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white">{card.value}</p>
                <p className="text-xs text-slate-600">{card.sub}</p>
              </article>
            );
          })}
        </div>

        {/* Commission Chart */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6">
          <h2 className="text-base font-semibold mb-1">Commission Distribution</h2>
          <p className="text-xs text-slate-500 mb-5">Real income by type — last {days} days</p>
          {commTotals.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No commission data for this period.</p>
          ) : (
            <div className="space-y-3">
              {commTotals.map((t) => (
                <BarRow key={t.type} label={t.type.replace(/_/g, " ")} value={Number(t.total_amount)} max={barMax} color={COLORS[t.type] || "#64748b"} />
              ))}
            </div>
          )}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {commTotals.map((t) => (
              <div key={t.type} className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs">
                <p className="text-slate-500 truncate">{t.type.replace(/_/g, " ")}</p>
                <p className="mt-1 font-bold text-white">${fmt(Number(t.total_amount))}</p>
                <p className="text-slate-600">{t.total_count} txns</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
