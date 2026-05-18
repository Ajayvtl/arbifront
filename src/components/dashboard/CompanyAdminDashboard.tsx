"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity, AlertCircle, ArrowUpRight, BadgeCheck, BarChart3,
  Clock, Download, Filter, GitBranch, RefreshCw, ShieldCheck, TrendingUp,
  TrendingDown, Upload, Users, Wallet, Zap, Database, Trash2,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { getCompanyRoleScope } from "@/lib/companyRoleScope";
import toast from "react-hot-toast";

// ─── Types ─────────────────────────────────────────────────────────────────
interface Member {
  id: number; wallet_address: string; referral_code: string | null;
  sponsor_id: number | null; status: string; is_blocked: number;
  created_at: string; main_balance: number | null; earning_balance: number | null;
  reward_balance: number | null; rank_name: string | null; direct_count: number;
}
interface CommissionType { type: string; total_count: number; total_amount: number; }
interface TopEarner { user_id: number; wallet_address: string; total_amount: number; }
interface Payout {
  id: number; user_wallet_address: string | null; withdrawal_wallet_address: string | null;
  amount: number; charge: number; net_amount: number; status: string; created_at: string;
}
interface Plan {
  id: number; name: string; min_amount: number; max_amount: number;
  roi_percent: number; daily_income_percent: number; duration_days: number;
  max_return_multiplier: number; payment_currency: string; roi_credit_balance_type: string;
}
interface HistoryPoint {
  ts: number; totalMembers: number; activeMembers: number;
  totalCommission: number; pendingPayouts: number; tvl: number;
}

interface ExchangeActiveSummary {
  profileId: number;
  profileName: string;
  reserveWallet: string;
  assetMode: "TOKEN" | "COIN";
  nativeSymbol: string;
  usdtSymbol: string;
  customSymbol: string;
  balances: { bnb: string; usdt: string; token: string };
  liveRate: { source: string; symbol: string; rateUsd: number };
  chain: { chainId: number | null; explorerUrl: string } | null;
}

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  emerald: "#0ecb81", amber: "#f0b90b", sky: "#5bbcff",
  violet: "#a855f7", rose: "#f6465d", orange: "#f97316",
  teal: "#2dd4bf", pink: "#ec4899",
};

const TYPE_COLORS: Record<string, string> = {
  ROI: C.amber, ROI_BOOSTER: C.pink, DIRECT: C.emerald, LEVEL: C.sky,
  FAST_START: C.violet, WORKING_GAIN: C.orange,
  JOINING_BONUS: C.teal, DEFAULT: "#64748b",
};

// ─── Utility ────────────────────────────────────────────────────────────────
const fmt = (n: number, d = 2) => {
  if (!Number.isFinite(n) || n === 0) return "0";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(d)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(d)}K`;
  return n.toFixed(d);
};
const shortWallet = (a: string | null) => !a ? "—" : a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
const fmtDate = (v: string) => { try { return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(v)); } catch { return v; } };
const pct = (a: number, total: number) => total > 0 ? ((a / total) * 100).toFixed(1) : "0.0";

// ─── SVG Sparkline ──────────────────────────────────────────────────────────
function Sparkline({ points, color, height = 40, width = 120 }: { points: number[]; color: string; height?: number; width?: number; }) {
  if (points.length < 2) return <div style={{ width, height }} />;
  const min = Math.min(...points), max = Math.max(...points), range = max - min || 1;
  const step = width / (points.length - 1);
  const coords = points.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 4) - 2}`);
  const area = `0,${height} ${coords.join(" ")} ${width},${height}`;
  const id = `sp-${color.replace("#", "")}`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline points={coords.join(" ")} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={coords[coords.length - 1].split(",")[0]} cy={coords[coords.length - 1].split(",")[1]} r={3} fill={color} />
    </svg>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, delta, icon: Icon, color, history }: {
  label: string; value: string; sub?: string; delta?: number;
  icon: React.ElementType; color: string; history: number[];
}) {
  const isUp = (delta ?? 0) >= 0;
  return (
    <article className="relative rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0d1626 0%, #111827 100%)", border: `1px solid ${color}28` }}>
      <div className="absolute inset-0 opacity-[0.06]" style={{ background: `radial-gradient(ellipse at top right, ${color}, transparent 70%)` }} />
      <div className="relative p-4 md:p-5 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
          <div className="rounded-xl p-1.5 shrink-0" style={{ background: `${color}18` }}>
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
        </div>
        <p className="text-2xl md:text-3xl font-bold text-white">{value}</p>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
            {delta !== undefined && (
              <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isUp ? "bg-emerald-900/40 text-emerald-400" : "bg-rose-900/40 text-rose-400"}`}>
                {isUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                {Math.abs(delta).toFixed(1)}%
              </span>
            )}
          </div>
          <Sparkline points={history.length >= 2 ? history : [0, 0]} color={color} width={90} height={36} />
        </div>
      </div>
    </article>
  );
}

// ─── Horizontal Bar ─────────────────────────────────────────────────────────
function HBar({ label, value, max, color, count, total }: { label: string; value: number; max: number; color: string; count: number; total: number; }) {
  const w = max > 0 ? Math.max(4, (value / max) * 100) : 4;
  const share = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="group flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-slate-400 truncate max-w-[120px]">{label.replace(/_/g, " ")}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-slate-500">{count} txns</span>
          <span className="font-bold text-white">${fmt(value)}</span>
          <span className="text-slate-600 w-9 text-right">{share.toFixed(1)}%</span>
        </div>
      </div>
      <div className="h-5 rounded-lg bg-slate-800/80 relative overflow-hidden">
        <div className="h-full rounded-lg transition-all duration-700 flex items-center"
          style={{ width: `${w}%`, background: `linear-gradient(90deg, ${color}cc, ${color})` }}>
        </div>
      </div>
    </div>
  );
}

// ─── Donut Chart ────────────────────────────────────────────────────────────
function DonutChart({ slices, size = 100 }: { slices: { label: string; value: number; color: string }[]; size?: number; }) {
  const total = slices.reduce((s, sl) => s + sl.value, 0) || 1;
  const r = size * 0.36, cx = size / 2, cy = size / 2, stroke = size * 0.13, circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <svg width={size} height={size} className="shrink-0">
        {slices.map((sl) => {
          const arc = (sl.value / total) * circ;
          const el = (
            <circle key={sl.label} cx={cx} cy={cy} r={r} fill="none"
              stroke={sl.color} strokeWidth={stroke}
              strokeDasharray={`${arc} ${circ - arc}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dasharray 0.8s ease" }}
            />
          );
          offset += arc;
          return el;
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.11} fontWeight={700} fill="white">
          {total}
        </text>
        <text x={cx} y={cy + size * 0.1} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.08} fill="#64748b">total</text>
      </svg>
      <div className="space-y-2 flex-1 min-w-[120px]">
        {slices.map((sl) => (
          <div key={sl.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: sl.color }} />
            <span className="text-slate-400 flex-1">{sl.label}</span>
            <span className="font-bold text-white">{sl.value}</span>
            <span className="text-slate-600 w-10 text-right">{pct(sl.value, total)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Area SVG Chart (multi-series) ──────────────────────────────────────────
function AreaChart({ series, labels, height = 140 }: {
  series: { label: string; color: string; values: number[] }[];
  labels: string[]; height?: number;
}) {
  const width = 600;
  const n = Math.max(...series.map(s => s.values.length), 2);
  const step = n > 1 ? width / (n - 1) : width;
  const allVals = series.flatMap(s => s.values);
  const minV = Math.min(...allVals, 0), maxV = Math.max(...allVals, 1);
  const range = maxV - minV || 1;
  const yScale = (v: number) => height - 10 - ((v - minV) / range) * (height - 20);
  const xScale = (i: number) => i * step;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: 260 }}>
        <defs>
          {series.map((s, idx) => (
            <linearGradient key={idx} id={`area-${idx}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={0} y1={yScale(minV + f * range)} x2={width} y2={yScale(minV + f * range)}
            stroke="#1e293b" strokeWidth={1} strokeDasharray="4 4" />
        ))}
        {/* X labels */}
        {labels.map((lbl, i) => (
          <text key={i} x={xScale(i)} y={height - 1} textAnchor="middle" fontSize={9} fill="#475569">{lbl}</text>
        ))}
        {series.map((s, idx) => {
          if (s.values.length < 2) return null;
          const pts = s.values.map((v, i) => `${xScale(i)},${yScale(v)}`);
          const area = `${xScale(0)},${height} ${pts.join(" ")} ${xScale(s.values.length - 1)},${height}`;
          return (
            <g key={idx}>
              <polygon points={area} fill={`url(#area-${idx})`} />
              <polyline points={pts.join(" ")} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {s.values.map((v, i) => (
                <circle key={i} cx={xScale(i)} cy={yScale(v)} r={3} fill={s.color} opacity={i === s.values.length - 1 ? 1 : 0.5} />
              ))}
            </g>
          );
        })}
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-2 px-1">
        {series.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="h-2 w-5 rounded" style={{ background: s.color }} />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Live pulse ──────────────────────────────────────────────────────────────
function LiveBadge({ lastUpdated, countdown }: { lastUpdated: Date | null; countdown: number }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      {lastUpdated ? `Live · ${lastUpdated.toLocaleTimeString()} · next in ${countdown}s` : "Connecting…"}
    </div>
  );
}

// ─── Period / Filter selector ────────────────────────────────────────────────
const PERIODS = [
  { label: "7D", days: 7 }, { label: "14D", days: 14 },
  { label: "30D", days: 30 }, { label: "3M", days: 90 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
const REFRESH_SECS = 60;

export default function CompanyAdminDashboard() {
  const { user } = useAuth();
  const { settings: siteSettings } = useSettings();
  const companyRoleScope = useMemo(() => getCompanyRoleScope(user), [user]);
  const companyName = siteSettings.site_name || siteSettings.brand_name || "Admin Dashboard";

  const [members, setMembers] = useState<Member[]>([]);
  const [commission, setCommission] = useState<{ 
    totals: CommissionType[]; 
    topEarners: TopEarner[];
    totalInvestment: number;
    totalInvestmentPeriod: number;
    totalDailyRoiPayout: number;
  } | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_SECS);
  const countRef = useRef(REFRESH_SECS);
  const historyRef = useRef<HistoryPoint[]>([]);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [exchangeSummary, setExchangeSummary] = useState<ExchangeActiveSummary | null>(null);
  const [exchangeLoading, setExchangeLoading] = useState(false);

  const reloadExchangeSummary = useCallback(async () => {
    setExchangeLoading(true);
    try {
      const exchRes = await api.get("/admin/exchange-config/active-summary");
      setExchangeSummary((exchRes.data?.data || null) as ExchangeActiveSummary | null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to load exchange summary";
      toast.error(msg);
      setExchangeSummary(null);
    } finally {
      setExchangeLoading(false);
    }
  }, []);

  // Backup/Restore State
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Active tab
  const [tab, setTab] = useState<"overview" | "commissions" | "payouts" | "plans" | "members">("overview");
  
  // Clear members state
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearConfirmCode, setClearConfirmCode] = useState("");
  const [isClearing, setIsClearing] = useState(false);

  const fetchAll = useCallback(async (d: number, silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const [mRes, cRes, pRes, plRes] = await Promise.all([
        api.get("/mlm/members", { params: { limit: 1000 } }),
        api.get("/mlm/commissions/summary", { params: { days: d } }),
        api.get("/mlm/payouts", { params: { limit: 500 } }),
        api.get("/mlm/plans", { params: { limit: 200 } }),
      ]);
      const m = (mRes.data?.data || []) as Member[];
      const c = (cRes.data?.data || null) as { 
        totals: CommissionType[]; 
        topEarners: TopEarner[]; 
        totalInvestment: number; 
        totalInvestmentPeriod: number; 
        totalDailyRoiPayout: number; 
      } | null;
      const p = (pRes.data?.data || []) as Payout[];
      const pl = (plRes.data?.data || []) as Plan[];
      setMembers(m); setCommission(c); setPayouts(p); setPlans(pl);
      setLastUpdated(new Date());
      countRef.current = REFRESH_SECS; setCountdown(REFRESH_SECS);
      const active = m.filter(mb => !mb.is_blocked && (mb.status === "ACTIVE" || mb.status === "active")).length;
      const commTotal = (c?.totals || []).reduce((s, t) => s + Number(t.total_amount || 0), 0);
      const pending = p.filter(pay => pay.status === "PENDING").length;
      const tvl = m.reduce((s, mb) => s + Number(mb.main_balance || 0) + Number(mb.earning_balance || 0), 0);
      const pt: HistoryPoint = { ts: Date.now(), totalMembers: m.length, activeMembers: active, totalCommission: commTotal, pendingPayouts: pending, tvl };
      historyRef.current = [...historyRef.current.slice(-59), pt];
      setHistory([...historyRef.current]);

      // Load active exchange reserve wallet summary (non-fatal)
      setExchangeLoading(true);
      try {
        const exchRes = await api.get("/admin/exchange-config/active-summary");
        setExchangeSummary((exchRes.data?.data || null) as ExchangeActiveSummary | null);
      } catch {
        setExchangeSummary(null);
      } finally {
        setExchangeLoading(false);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to load dashboard";
      setError(msg);
    } finally { if (!silent) setLoading(false); }
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await api.get("/admin/data/export", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `mlm_backup_${new Date().toISOString().split("T")[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Backup downloaded successfully");
    } catch (err) {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("CRITICAL: This will overwrite ALL existing data. This project is in PRODUCTION. Are you absolutely sure?")) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsImporting(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.post("/admin/data/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("System restored perfectly!");
      void fetchAll(days);
    } catch (err) {
      const msg = (err as any)?.response?.data?.message || "Restore failed";
      toast.error(msg);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClearMembers = async () => {
    if (clearConfirmCode !== "CLEAR") {
      toast.error("Please type CLEAR to confirm");
      return;
    }
    
    setIsClearing(true);
    try {
      await api.post("/admin/data/clear-members");
      toast.success("All member data cleared cleanly!");
      setShowClearModal(false);
      setClearConfirmCode("");
      void fetchAll(days);
    } catch (err) {
      const msg = (err as any)?.response?.data?.message || "Clear failed";
      toast.error(msg);
    } finally {
      setIsClearing(false);
    }
  };

  useEffect(() => { void fetchAll(days); }, [fetchAll, days]);
  useEffect(() => {
    const iv = setInterval(() => void fetchAll(days, true), REFRESH_SECS * 1000);
    return () => clearInterval(iv);
  }, [fetchAll, days]);
  useEffect(() => {
    const tick = setInterval(() => { countRef.current = countRef.current > 0 ? countRef.current - 1 : REFRESH_SECS; setCountdown(countRef.current); }, 1000);
    return () => clearInterval(tick);
  }, []);

  // ── Computed ──────────────────────────────────────────────────────────────
  const totalMembers = members.length;
  const activeMembers = useMemo(() => members.filter(m => !m.is_blocked && (m.status === "ACTIVE" || m.status === "active")).length, [members]);
  const blockedMembers = useMemo(() => members.filter(m => !!m.is_blocked).length, [members]);
  const inactiveMembers = totalMembers - activeMembers - blockedMembers;
  const tvl = useMemo(() => members.reduce((s, m) => s + Number(m.main_balance || 0) + Number(m.earning_balance || 0), 0), [members]);

  const commTotals = useMemo(() => commission?.totals || [], [commission]);
  const topEarners = useMemo(() => (commission?.topEarners || []).slice(0, 10), [commission]);
  const totalInvestment = useMemo(() => commission?.totalInvestment || 0, [commission]);
  const totalInvestmentPeriod = useMemo(() => commission?.totalInvestmentPeriod || 0, [commission]);
  const totalDailyRoiPayout = useMemo(() => commission?.totalDailyRoiPayout || 0, [commission]);
  const totalCommission = useMemo(() => commTotals.reduce((s, t) => s + Number(t.total_amount || 0), 0), [commTotals]);
  const totalTxns = useMemo(() => commTotals.reduce((s, t) => s + Number(t.total_count || 0), 0), [commTotals]);

  const payoutByStatus = useMemo(() => {
    const pending = payouts.filter(p => p.status === "PENDING");
    const approved = payouts.filter(p => p.status === "APPROVED" || p.status === "SUCCESS");
    const rejected = payouts.filter(p => p.status === "REJECTED");
    return {
      pending, approved, rejected,
      pendingNet: pending.reduce((s, p) => s + Number(p.net_amount || 0), 0),
      approvedNet: approved.reduce((s, p) => s + Number(p.net_amount || 0), 0),
      rejectedNet: rejected.reduce((s, p) => s + Number(p.net_amount || 0), 0),
    };
  }, [payouts]);

  // Sparkline histories
  const hMembers = history.map(h => h.totalMembers);
  const hActive = history.map(h => h.activeMembers);
  const hComm = history.map(h => h.totalCommission);
  const hPending = history.map(h => h.pendingPayouts);
  const hTvl = history.map(h => h.tvl);

  // For member rank distribution
  const rankDist = useMemo(() => {
    const map: Record<string, number> = {};
    members.forEach(m => { const k = m.rank_name || "Unranked"; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [members]);

  // Area chart from history
  const areaLabels = history.map((h, i) => {
    if (i === 0 || i === history.length - 1) return new Date(h.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return "";
  });

  const barMax = Math.max(...commTotals.map(t => Number(t.total_amount || 0)), 1);

  if (loading && history.length === 0) {
    return (
      <div className="min-h-screen bg-[#060c14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-emerald-500 animate-spin" style={{ borderTopColor: "transparent" }} />
          </div>
          <p className="text-slate-400 text-sm">Fetching live analytics…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060c14] text-white">
      <div className="p-4 md:p-6 space-y-5">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="rounded-2xl overflow-hidden relative" style={{ background: "linear-gradient(135deg, #071a2e 0%, #0d2040 50%, #071a2e 100%)", border: "1px solid #1a3a5c" }}>
          <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(ellipse at 80% 50%, #0ecb8155, transparent 60%)" }} />
          <div className="relative p-5 md:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Analytics Dashboard · Live</p>
              </div>
              <h1 className="mt-2 text-2xl md:text-3xl font-bold tracking-tight">{companyName}</h1>
              <p className="mt-1 text-sm text-slate-400">
                {totalMembers.toLocaleString()} members · {plans.length} plans · {payouts.length} withdrawals · {totalTxns.toLocaleString()} commission entries
              </p>
              {error && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-700/40 bg-rose-900/20 px-3 py-2 text-xs text-rose-300">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
                </div>
              )}
            </div>
            <div className="flex flex-col items-start md:items-end gap-3">
              {/* Period Selector */}
              <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
                <Filter className="h-3.5 w-3.5 text-slate-500 ml-1 mr-0.5" />
                {PERIODS.map(p => (
                  <button key={p.days} type="button" onClick={() => setDays(p.days)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${days === p.days ? "bg-emerald-600 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 mr-2 border-r border-slate-700/50 pr-4">
                  <button type="button" onClick={handleExport} disabled={isExporting}
                    className="h-8 px-3 rounded-lg border border-slate-700 bg-slate-800/50 text-[10px] font-bold text-slate-300 hover:text-emerald-400 hover:border-emerald-500/50 transition-all flex items-center gap-1.5 disabled:opacity-50">
                    <Download className={`h-3 w-3 ${isExporting ? "animate-pulse" : ""}`} /> 
                    {isExporting ? "Exporting..." : "Export Backup"}
                  </button>
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isImporting}
                    className="h-8 px-3 rounded-lg border border-slate-700 bg-slate-800/50 text-[10px] font-bold text-slate-300 hover:text-rose-400 hover:border-rose-500/50 transition-all flex items-center gap-1.5 disabled:opacity-50">
                    <Upload className={`h-3 w-3 ${isImporting ? "animate-spin" : ""}`} /> 
                    {isImporting ? "Restoring..." : "Restore Data"}
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx" />
                  <button type="button" onClick={() => setShowClearModal(true)}
                    className="h-8 px-3 rounded-lg border border-rose-700/50 bg-rose-900/10 text-[10px] font-bold text-rose-300 hover:text-rose-400 hover:bg-rose-900/30 transition-all flex items-center gap-1.5">
                    <Trash2 className="h-3 w-3" /> Clear Members
                  </button>
                </div>
                <LiveBadge lastUpdated={lastUpdated} countdown={countdown} />
                <button type="button" onClick={() => void fetchAll(days)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-emerald-600 hover:text-white transition-all flex items-center gap-1.5">
                  <RefreshCw className="h-3 w-3" /> Refresh
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ── KPI Row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <KpiCard label="Total Investment" value={`$${fmt(totalInvestment)}`} sub={`$${fmt(totalInvestmentPeriod)} last ${days}d`} icon={BarChart3} color={C.emerald} history={[]} />
          <KpiCard label="Daily ROI Payout" value={`$${fmt(totalDailyRoiPayout)}`} sub="Scheduled today" icon={Zap} color={C.amber} history={[]} />
          <KpiCard label="User Base" value={`${activeMembers} / ${totalMembers}`} sub={`${pct(activeMembers, totalMembers)}% active`} icon={Users} color={C.sky} history={hMembers} />
          <KpiCard label={`Comms ${days}d`} value={`$${fmt(totalCommission)}`} sub={`${totalTxns} entries`} icon={TrendingUp} color={C.amber} history={hComm} />
          <KpiCard label="Pending Payouts" value={payoutByStatus.pending.length.toString()} sub={`$${fmt(payoutByStatus.pendingNet)} net`} icon={Clock} color={C.orange} history={hPending} />
          <KpiCard label="O/S Balances" value={`$${fmt(tvl)}`} sub="User wallet credits" icon={Wallet} color={C.violet} history={hTvl} />
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1 overflow-x-auto">
          {(["overview", "commissions", "payouts", "plans", "members"] as const).map(t => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold capitalize whitespace-nowrap transition-all ${tab === t ? "bg-slate-700 text-white shadow" : "text-slate-400 hover:text-white"}`}>
              {t}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            TAB: OVERVIEW
        ══════════════════════════════════════════════════════════════ */}
        {tab === "overview" && (
          <div className="space-y-5">

            {/* Live trend chart */}
            {history.length >= 3 && (
              <div className="rounded-2xl border border-slate-800 bg-[#0d1626] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold">Live Session Trend</h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">Accumulates every 60s · up to 60 readings</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 border border-slate-800 rounded-lg px-2 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {history.length} readings
                  </div>
                </div>
                <AreaChart
                  series={[
                    { label: "Members", color: C.emerald, values: hMembers },
                    { label: "Active", color: C.sky, values: hActive },
                  ]}
                  labels={areaLabels}
                  height={120}
                />
              </div>
            )}

            {/* 2-col: Commission donut + Member donut */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-[#0d1626] p-5">
                <h2 className="text-sm font-semibold mb-4">Member Health</h2>
                <DonutChart slices={[
                  { label: "Active", value: activeMembers, color: C.emerald },
                  { label: "Inactive", value: inactiveMembers, color: C.amber },
                  { label: "Blocked", value: blockedMembers, color: C.rose },
                ]} size={110} />
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  {[
                    { label: "Active", val: activeMembers, color: C.emerald },
                    { label: "Inactive", val: inactiveMembers, color: C.amber },
                    { label: "Blocked", val: blockedMembers, color: C.rose },
                  ].map(item => (
                    <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-900 p-2">
                      <p className="text-sm font-bold" style={{ color: item.color }}>{item.val}</p>
                      <p className="text-slate-500">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0d1626] p-5">
                <h2 className="text-sm font-semibold mb-4">Withdrawal Queue</h2>
                <DonutChart slices={[
                  { label: "Pending", value: payoutByStatus.pending.length, color: C.amber },
                  { label: "Approved", value: payoutByStatus.approved.length, color: C.emerald },
                  { label: "Rejected", value: payoutByStatus.rejected.length, color: C.rose },
                ]} size={110} />
                <div className="mt-4 space-y-2">
                  {[
                    { label: "Pending Net", val: payoutByStatus.pendingNet, color: C.amber },
                    { label: "Approved Net", val: payoutByStatus.approvedNet, color: C.emerald },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between text-xs rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
                      <span className="text-slate-400">{item.label}</span>
                      <span className="font-bold" style={{ color: item.color }}>${fmt(item.val)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0d1626] p-5">
                <h2 className="text-sm font-semibold mb-4">Rank Distribution</h2>
                {rankDist.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">No rank data</p>
                ) : (
                  <div className="space-y-2">
                    {rankDist.map(([name, count], i) => {
                      const rankColors = [C.amber, C.sky, C.violet, C.emerald, C.orange, C.teal];
                      const col = rankColors[i % rankColors.length];
                      const w = (count / totalMembers) * 100;
                      return (
                        <div key={name}>
                          <div className="flex justify-between text-[11px] mb-0.5">
                            <span className="text-slate-400 truncate">{name}</span>
                            <span className="font-semibold" style={{ color: col }}>{count}</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-800">
                            <div className="h-full rounded-full" style={{ width: `${Math.max(4, w)}%`, background: col }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Exchange Reserve Wallet Summary */}
            <div className="rounded-2xl border border-slate-800 bg-[#0d1626] p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4.5 w-4.5 text-emerald-400" />
                  <div>
                    <h2 className="text-sm font-semibold">Exchange Reserve Wallet</h2>
                    <p className="text-[11px] text-slate-500">Live balances + live rate from configured source</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void reloadExchangeSummary()}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-emerald-600 hover:text-white transition-all flex items-center gap-1.5 disabled:opacity-50"
                  disabled={exchangeLoading}
                >
                  <RefreshCw className={`h-3 w-3 ${exchangeLoading ? "animate-spin" : ""}`} /> Refresh
                </button>
              </div>

              {!exchangeSummary ? (
                <div className="text-xs text-slate-500">
                  No active exchange profile (or insufficient permissions).
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Reserve Address</div>
                    <div className="mt-1 font-mono text-xs text-slate-200 break-all">{exchangeSummary.reserveWallet}</div>
                    <div className="mt-2 text-[11px] text-slate-500">
                      Mode: <span className="font-bold text-slate-300">{exchangeSummary.assetMode}</span>
                      {exchangeSummary.chain?.chainId ? (
                        <>
                          {" "}· Chain: <span className="font-bold text-slate-300">{exchangeSummary.chain.chainId}</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{exchangeSummary.nativeSymbol}</div>
                      <div className="mt-1 font-mono text-sm font-extrabold text-slate-100">{exchangeSummary.balances.bnb}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">USDT</div>
                      <div className="mt-1 font-mono text-sm font-extrabold text-slate-100">{exchangeSummary.balances.usdt}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{exchangeSummary.customSymbol}</div>
                      <div className="mt-1 font-mono text-sm font-extrabold text-emerald-400">{exchangeSummary.assetMode === "TOKEN" ? exchangeSummary.balances.token : exchangeSummary.balances.bnb}</div>
                    </div>
                  </div>

                  <div className="md:col-span-12 rounded-2xl border border-slate-800 bg-slate-900 p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-slate-300">
                      Live Rate:{" "}
                      <span className="font-mono font-extrabold text-emerald-400">
                        {Number(exchangeSummary.liveRate.rateUsd || 0).toFixed(6)} USDT
                      </span>
                      <span className="text-slate-500">
                        {" "}· Source: {exchangeSummary.liveRate.source} · Symbol: {exchangeSummary.liveRate.symbol}
                      </span>
                    </div>
                    <Link
                      href="/developer/company/exch"
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1.5"
                    >
                      Configure Exchange <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Payout flow visual */}
            <div className="rounded-2xl border border-slate-800 bg-[#0d1626] p-5">
              <h2 className="text-sm font-semibold mb-4">Withdrawal Flow Analysis · {days}d window</h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total Requests", val: payouts.length, sub: `$${fmt(payouts.reduce((s, p) => s + Number(p.amount || 0), 0))} gross`, color: C.sky, icon: Wallet },
                  { label: "Pending", val: payoutByStatus.pending.length, sub: `$${fmt(payoutByStatus.pendingNet)} net`, color: C.amber, icon: Clock },
                  { label: "Processed", val: payoutByStatus.approved.length + payoutByStatus.rejected.length, sub: `${payoutByStatus.rejected.length} rejected`, color: C.emerald, icon: BadgeCheck },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-xl border bg-slate-900 p-4 text-center" style={{ borderColor: `${item.color}30` }}>
                      <div className="mx-auto w-fit rounded-xl p-2 mb-2" style={{ background: `${item.color}15` }}>
                        <Icon className="h-5 w-5" style={{ color: item.color }} />
                      </div>
                      <p className="text-xl font-bold text-white">{item.val}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.label}</p>
                      <p className="text-[10px] text-slate-600 mt-1">{item.sub}</p>
                    </div>
                  );
                })}
              </div>
              {/* Progress bar */}
              <div className="mt-4 space-y-2">
                {[
                  { label: "Approval Rate", a: payoutByStatus.approved.length, total: payouts.length, color: C.emerald },
                  { label: "Pending Rate", a: payoutByStatus.pending.length, total: payouts.length, color: C.amber },
                  { label: "Rejection Rate", a: payoutByStatus.rejected.length, total: payouts.length, color: C.rose },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 text-xs">
                    <span className="w-24 text-slate-400 shrink-0">{item.label}</span>
                    <div className="flex-1 h-3 rounded-full bg-slate-800">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.max(4, (item.a / (item.total || 1)) * 100)}%`, background: `linear-gradient(90deg, ${item.color}88, ${item.color})` }} />
                    </div>
                    <span className="w-10 text-right font-bold" style={{ color: item.color }}>
                      {pct(item.a, item.total)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Earners + Recent Members side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-[#0d1626] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold">Top Earners · {days}d</h2>
                  <Link href="/developer/company/commissions" className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5">
                    View all <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
                {topEarners.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">No earners in this period</p>
                ) : topEarners.map((e, i) => {
                  const maxEarning = Number(topEarners[0]?.total_amount || 1);
                  const w = (Number(e.total_amount) / maxEarning) * 100;
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                    <div key={e.user_id} className="flex items-center gap-3 py-2 border-b border-slate-800 last:border-0">
                      <span className="text-sm shrink-0 w-5">{medals[i] || <span className="text-slate-600 text-xs">{i + 1}</span>}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-slate-300 truncate">{shortWallet(e.wallet_address)}</p>
                        <div className="mt-1 h-1.5 rounded-full bg-slate-800">
                          <div className="h-full rounded-full" style={{ width: `${w}%`, background: `linear-gradient(90deg, ${C.amber}88, ${C.amber})` }} />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-amber-400 shrink-0">${fmt(Number(e.total_amount))}</span>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0d1626] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold">Recent Registrations</h2>
                  <Link href="/developer/company/members" className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5">
                    All members <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
                {[...members].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8).map(m => {
                  const isActive = !m.is_blocked && (m.status === "ACTIVE" || m.status === "active");
                  return (
                    <div key={m.id} className="flex items-center gap-3 py-2 border-b border-slate-800 last:border-0">
                      <div className="h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold"
                        style={{ background: isActive ? `${C.emerald}20` : `${C.amber}20`, color: isActive ? C.emerald : C.amber }}>
                        #{m.id}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-slate-300 truncate">{shortWallet(m.wallet_address)}</p>
                        <p className="text-[10px] text-slate-600">{fmtDate(m.created_at)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${isActive ? "border-emerald-800 text-emerald-400 bg-emerald-900/30" : "border-amber-800 text-amber-400 bg-amber-900/30"}`}>
                          {isActive ? "Active" : "Inactive"}
                        </span>
                        <p className="text-[10px] text-slate-500 mt-0.5">${fmt(Number(m.main_balance || 0))}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: COMMISSIONS
        ══════════════════════════════════════════════════════════════ */}
        {tab === "commissions" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Distributed", val: `$${fmt(totalCommission)}`, color: C.amber },
                { label: "Total Transactions", val: totalTxns.toString(), color: C.sky },
                { label: "Income Types", val: commTotals.length.toString(), color: C.violet },
                { label: "Avg per Txn", val: totalTxns > 0 ? `$${fmt(totalCommission / totalTxns)}` : "$0", color: C.emerald },
              ].map(item => (
                <div key={item.label} className="rounded-2xl border bg-[#0d1626] p-4 text-center" style={{ borderColor: `${item.color}30` }}>
                  <p className="text-2xl font-bold" style={{ color: item.color }}>{item.val}</p>
                  <p className="text-xs text-slate-400 mt-1">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Commission type breakdown */}
            <div className="rounded-2xl border border-slate-800 bg-[#0d1626] p-5">
              <h2 className="text-sm font-semibold mb-1">Commission Breakdown by Type · {days}d</h2>
              <p className="text-[11px] text-slate-500 mb-5">Total distributed amount per income engine</p>
              {commTotals.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-10">No commission data in this period</p>
              ) : (
                <div className="space-y-3">
                  {[...commTotals].sort((a, b) => Number(b.total_amount) - Number(a.total_amount)).map(t => (
                    <HBar key={t.type} label={t.type} value={Number(t.total_amount)} max={barMax} color={TYPE_COLORS[t.type] || TYPE_COLORS.DEFAULT} count={Number(t.total_count)} total={totalCommission} />
                  ))}
                </div>
              )}
            </div>

            {/* Commission type cards grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {commTotals.map(t => {
                const color = TYPE_COLORS[t.type] || TYPE_COLORS.DEFAULT;
                const share = totalCommission > 0 ? (Number(t.total_amount) / totalCommission) * 100 : 0;
                return (
                  <div key={t.type} className="rounded-2xl border bg-[#0d1626] p-4 relative overflow-hidden" style={{ borderColor: `${color}30` }}>
                    <div className="absolute inset-0 opacity-[0.04]" style={{ background: `radial-gradient(ellipse at top right, ${color}, transparent 70%)` }} />
                    <div className="relative">
                      <div className="flex items-start justify-between gap-2">
                        <div className="h-2 w-2 rounded-full mt-1" style={{ background: color }} />
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>{share.toFixed(1)}%</span>
                      </div>
                      <p className="mt-2 text-[11px] text-slate-400">{t.type.replace(/_/g, " ")}</p>
                      <p className="text-xl font-bold text-white mt-1">${fmt(Number(t.total_amount))}</p>
                      <p className="text-[10px] text-slate-600 mt-1">{t.total_count} transactions</p>
                      <p className="text-[10px] text-slate-600">avg ${totalTxns > 0 ? fmt(Number(t.total_amount) / Number(t.total_count || 1)) : "0"}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Top earners table */}
            <div className="rounded-2xl border border-slate-800 bg-[#0d1626] p-5">
              <h2 className="text-sm font-semibold mb-4">Top 10 Earners · {days}d Period</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <th className="py-2 pr-3">Rank</th>
                      <th className="py-2 pr-3">Wallet</th>
                      <th className="py-2 pr-3">Total Earned</th>
                      <th className="py-2">Distribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topEarners.map((e, i) => {
                      const maxE = Number(topEarners[0]?.total_amount || 1);
                      const w = (Number(e.total_amount) / maxE) * 100;
                      return (
                        <tr key={e.user_id} className="border-b border-slate-900 hover:bg-slate-800/30">
                          <td className="py-2.5 pr-3 font-bold" style={{ color: i < 3 ? C.amber : "#64748b" }}>#{i + 1}</td>
                          <td className="py-2.5 pr-3 font-mono text-slate-300">{shortWallet(e.wallet_address)}</td>
                          <td className="py-2.5 pr-3 font-bold text-amber-400">${fmt(Number(e.total_amount))}</td>
                          <td className="py-2.5">
                            <div className="h-2 rounded-full bg-slate-800 w-full">
                              <div className="h-full rounded-full" style={{ width: `${w}%`, background: `linear-gradient(90deg, ${C.amber}66, ${C.amber})` }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {topEarners.length === 0 && (
                      <tr><td colSpan={4} className="py-10 text-center text-slate-500">No earners in selected period</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: PAYOUTS
        ══════════════════════════════════════════════════════════════ */}
        {tab === "payouts" && (
          <div className="space-y-5">
            {/* Status breakdown */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Pending", count: payoutByStatus.pending.length, net: payoutByStatus.pendingNet, color: C.amber, icon: Clock },
                { label: "Approved", count: payoutByStatus.approved.length, net: payoutByStatus.approvedNet, color: C.emerald, icon: BadgeCheck },
                { label: "Rejected", count: payoutByStatus.rejected.length, net: payoutByStatus.rejectedNet, color: C.rose, icon: AlertCircle },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl border bg-[#0d1626] p-4 text-center" style={{ borderColor: `${item.color}30` }}>
                    <div className="mx-auto w-fit rounded-xl p-2 mb-2" style={{ background: `${item.color}15` }}>
                      <Icon className="h-5 w-5" style={{ color: item.color }} />
                    </div>
                    <p className="text-2xl font-bold" style={{ color: item.color }}>{item.count}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.label}</p>
                    <p className="text-[11px] text-slate-600 mt-1">${fmt(item.net)} net</p>
                  </div>
                );
              })}
            </div>

            {/* Charge analysis */}
            <div className="rounded-2xl border border-slate-800 bg-[#0d1626] p-5">
              <h2 className="text-sm font-semibold mb-4">Fee & Net Analysis</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Total Gross", val: `$${fmt(payouts.reduce((s, p) => s + Number(p.amount || 0), 0))}`, color: C.sky },
                  { label: "Total Charges", val: `$${fmt(payouts.reduce((s, p) => s + Number(p.charge || 0), 0))}`, color: C.rose },
                  { label: "Total Net", val: `$${fmt(payouts.reduce((s, p) => s + Number(p.net_amount || 0), 0))}`, color: C.emerald },
                  { label: "Avg Charge %", val: (() => { const g = payouts.reduce((s, p) => s + Number(p.amount || 0), 0); const c = payouts.reduce((s, p) => s + Number(p.charge || 0), 0); return g > 0 ? `${((c / g) * 100).toFixed(1)}%` : "0%"; })(), color: C.amber },
                ].map(item => (
                  <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <p className="text-xs text-slate-400">{item.label}</p>
                    <p className="text-lg font-bold mt-1" style={{ color: item.color }}>{item.val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending queue */}
            <div className="rounded-2xl border border-slate-800 bg-[#0d1626] p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold">Pending Queue</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">{payoutByStatus.pending.length} withdrawals awaiting approval</p>
                </div>
                <Link href="/developer/company/payouts" className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5">
                  Manage <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {payoutByStatus.pending.slice(0, 25).map(p => (
                  <div key={p.id} className="rounded-xl border border-amber-800/30 bg-amber-900/10 px-3 py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-slate-300 truncate">{shortWallet(p.withdrawal_wallet_address)}</p>
                      <p className="text-[10px] text-slate-600">{fmtDate(p.created_at)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-amber-400">${fmt(Number(p.net_amount))}</p>
                      <p className="text-[10px] text-slate-600">fee ${fmt(Number(p.charge))}</p>
                    </div>
                  </div>
                ))}
                {payoutByStatus.pending.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-10 text-slate-500">
                    <BadgeCheck className="h-8 w-8 text-emerald-700" />
                    <p className="text-sm">All clear — no pending payouts</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: PLANS
        ══════════════════════════════════════════════════════════════ */}
        {tab === "plans" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Plans", val: plans.length.toString(), color: C.sky },
                { label: "Avg ROI %", val: plans.length ? `${(plans.reduce((s, p) => s + Number(p.roi_percent || 0), 0) / plans.length).toFixed(2)}%` : "0%", color: C.amber },
                { label: "Min Entry", val: plans.length ? `$${fmt(Math.min(...plans.map(p => Number(p.min_amount))))}` : "—", color: C.emerald },
                { label: "Max Cap", val: plans.length ? `${Math.max(...plans.map(p => Number(p.max_return_multiplier)))}x` : "—", color: C.violet },
              ].map(item => (
                <div key={item.label} className="rounded-2xl border bg-[#0d1626] p-4 text-center" style={{ borderColor: `${item.color}30` }}>
                  <p className="text-2xl font-bold" style={{ color: item.color }}>{item.val}</p>
                  <p className="text-xs text-slate-400 mt-1">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Visual plan comparison */}
            <div className="rounded-2xl border border-slate-800 bg-[#0d1626] p-5">
              <h2 className="text-sm font-semibold mb-5">Plan Performance Matrix</h2>
              {plans.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-10">No plans configured</p>
              ) : (
                <div className="space-y-4">
                  {plans.map((plan, i) => {
                    const planColors = [C.emerald, C.amber, C.sky, C.violet, C.orange, C.teal, C.pink, C.rose];
                    const col = planColors[i % planColors.length];
                    const roiMax = Math.max(...plans.map(p => Number(p.roi_percent)));
                    const roiW = roiMax > 0 ? (Number(plan.roi_percent) / roiMax) * 100 : 0;
                    return (
                      <div key={plan.id} className="rounded-xl border bg-slate-900 p-4" style={{ borderColor: `${col}25` }}>
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ background: col }} />
                            <span className="text-sm font-semibold text-white">{plan.name}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${col}20`, color: col }}>{plan.payment_currency}</span>
                            <span className="text-[10px] text-slate-400">{plan.duration_days}d duration</span>
                            <span className="text-[10px] font-bold text-white">{plan.max_return_multiplier}x cap</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-3 text-center text-xs">
                          <div>
                            <p className="text-slate-500">Entry Range</p>
                            <p className="font-bold text-white mt-0.5">${fmt(plan.min_amount)}–{plan.max_amount > 0 ? `$${fmt(plan.max_amount)}` : "∞"}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Daily ROI</p>
                            <p className="font-bold mt-0.5" style={{ color: col }}>{Number(plan.daily_income_percent).toFixed(4)}%</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Total ROI</p>
                            <p className="font-bold mt-0.5" style={{ color: col }}>{Number(plan.roi_percent).toFixed(2)}%</p>
                          </div>
                        </div>
                        {/* ROI bar */}
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span className="w-12 shrink-0">ROI</span>
                          <div className="flex-1 h-2 rounded-full bg-slate-800">
                            <div className="h-full rounded-full" style={{ width: `${roiW}%`, background: `linear-gradient(90deg, ${col}88, ${col})` }} />
                          </div>
                          <span className="w-10 text-right" style={{ color: col }}>{Number(plan.roi_percent).toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB: MEMBERS
        ══════════════════════════════════════════════════════════════ */}
        {tab === "members" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total", val: totalMembers, color: C.sky },
                { label: "Active", val: activeMembers, color: C.emerald },
                { label: "Inactive", val: inactiveMembers, color: C.amber },
                { label: "Blocked", val: blockedMembers, color: C.rose },
              ].map(item => (
                <div key={item.label} className="rounded-2xl border bg-[#0d1626] p-4 text-center" style={{ borderColor: `${item.color}30` }}>
                  <p className="text-2xl font-bold" style={{ color: item.color }}>{item.val}</p>
                  <p className="text-xs text-slate-400 mt-1">{item.label}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">{pct(item.val, totalMembers)}% of total</p>
                </div>
              ))}
            </div>

            {/* TVL breakdown */}
            <div className="rounded-2xl border border-slate-800 bg-[#0d1626] p-5">
              <h2 className="text-sm font-semibold mb-4">User Balance Breakdown</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: "Main Balance", val: members.reduce((s, m) => s + Number(m.main_balance || 0), 0), color: C.emerald },
                  { label: "Earning Balance", val: members.reduce((s, m) => s + Number(m.earning_balance || 0), 0), color: C.sky },
                  { label: "Reward Balance", val: members.reduce((s, m) => s + Number(m.reward_balance || 0), 0), color: C.violet },
                  { label: "Total Balances", val: tvl, color: C.amber },
                  { label: "Direct Refs Total", val: members.reduce((s, m) => s + Number(m.direct_count || 0), 0), color: C.teal },
                  { label: "Avg Balance/User", val: totalMembers > 0 ? tvl / totalMembers : 0, color: C.orange },
                ].map(item => (
                  <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-center">
                    <p className="text-xs text-slate-400">{item.label}</p>
                    <p className="text-lg font-bold mt-1" style={{ color: item.color }}>${fmt(item.val)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Member table */}
            <div className="rounded-2xl border border-slate-800 bg-[#0d1626] p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">Recent Members</h2>
                <Link href="/developer/company/members" className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5">
                  Full registry <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <th className="py-2 pr-3">ID</th>
                      <th className="py-2 pr-3">Wallet</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Directs</th>
                      <th className="py-2 pr-3">Main Bal</th>
                      <th className="py-2">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...members].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 15).map(m => {
                      const isActive = !m.is_blocked && (m.status === "ACTIVE" || m.status === "active");
                      return (
                        <tr key={m.id} className="border-b border-slate-900 hover:bg-slate-800/20">
                          <td className="py-2.5 pr-3 text-slate-500">#{m.id}</td>
                          <td className="py-2.5 pr-3 font-mono text-slate-300">{shortWallet(m.wallet_address)}</td>
                          <td className="py-2.5 pr-3">
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${m.is_blocked ? "border-rose-800 text-rose-400 bg-rose-900/30" : isActive ? "border-emerald-800 text-emerald-400 bg-emerald-900/30" : "border-slate-700 text-slate-400 bg-slate-800"}`}>
                              {m.is_blocked ? "Blocked" : isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 text-slate-300">{m.direct_count}</td>
                          <td className="py-2.5 pr-3 text-emerald-400 font-semibold">${fmt(Number(m.main_balance || 0))}</td>
                          <td className="py-2.5 text-slate-600">{fmtDate(m.created_at)}</td>
                        </tr>
                      );
                    })}
                    {members.length === 0 && (
                      <tr><td colSpan={6} className="py-10 text-center text-slate-500">No members yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Quick nav ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-800 bg-[#0d1626] p-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Operational Modules</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { name: "Member Registry", href: "/developer/company/members", icon: Users, sub: `${totalMembers} total`, color: C.emerald },
              { name: "Commission Logs", href: "/developer/company/commissions", icon: Activity, sub: `${days}d summary`, color: C.amber },
              { name: "Payout Queue", href: "/developer/company/payouts", icon: Wallet, sub: `${payoutByStatus.pending.length} pending`, color: C.orange },
              { name: "Plan Catalog", href: "/developer/company/plans", icon: BarChart3, sub: `${plans.length} plans`, color: C.sky },
              { name: "Level Income", href: "/developer/company/level-income", icon: GitBranch, sub: "Upline credits", color: C.violet },
              { name: "KYC Review", href: "/developer/company/kyc", icon: ShieldCheck, sub: "Identity queue", color: C.teal },
              { name: "Network Map", href: "/developer/company/network-settings", icon: Zap, sub: "Config", color: C.pink },
              { name: "Settings", href: "/developer/settings/general", icon: Activity, sub: "MLM config", color: "#64748b" },
            ]
              .filter((mod) => (
                companyRoleScope !== "admin" ||
                !["KYC Review", "Network Map", "Settings"].includes(mod.name)
              ))
              .map(mod => {
              const Icon = mod.icon;
              return (
                <Link key={mod.name} href={mod.href}
                  className="group rounded-xl border border-slate-800 bg-slate-900 p-3 hover:border-opacity-60 transition-all"
                  style={{ ["--hover-color" as string]: mod.color }}>
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-lg p-1.5 shrink-0 transition-colors" style={{ background: `${mod.color}15` }}>
                      <Icon className="h-3.5 w-3.5" style={{ color: mod.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-300 group-hover:text-white truncate">{mod.name}</p>
                      <p className="text-[10px] text-slate-600">{mod.sub}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── Clear Members Modal ─────────────────────────────────────── */}
      {showClearModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1626] p-6 shadow-2xl shadow-black/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/20 text-rose-500">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Clear All Members?</h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              This will permanently delete ALL end-user accounts, MLM tree positions, wallets, and financial records for your company. 
              <span className="text-rose-400 font-semibold block mt-2 underline italic">Admins and system settings will remain intact.</span>
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                  Type <span className="text-white">CLEAR</span> to confirm
                </label>
                <input
                  type="text"
                  value={clearConfirmCode}
                  onChange={(e) => setClearConfirmCode(e.target.value.toUpperCase())}
                  placeholder="CLEAR"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-600 focus:border-rose-500/50 focus:outline-none transition-all"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowClearModal(false); setClearConfirmCode(""); }}
                  className="flex-1 rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold text-white hover:bg-slate-700 transition-all font-sans"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearMembers}
                  disabled={isClearing || clearConfirmCode !== "CLEAR"}
                  className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-50 disabled:grayscale transition-all font-sans flex items-center justify-center gap-2"
                >
                  {isClearing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    "Reset Data"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
