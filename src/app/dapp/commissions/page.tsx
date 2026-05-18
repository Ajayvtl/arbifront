"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  BarChart3, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Filter, 
  History, 
  Loader2, 
  Minus, 
  Plus, 
  Rocket, 
  Trophy, 
  Wallet,
  Landmark,
  Layers,
  Sparkles,
  Merge
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getWalletTypeLabel } from "@/lib/walletTypeLabels";

type SessionProfile = {
  mlmSettings?: {
    wallet_type_labels?: Partial<Record<string, unknown>> | null;
  } | null;
};

type IncomeLog = {
  id: number;
  amount: number;
  status: string;
  type: string;
  level: number | null;
  createdAt: string;
  fromWalletAddress: string | null;
  fromReferralCode: string | null;
};

function formatAmount(value?: number | null) {
  const amount = Number(value || 0);
  if (amount === 0) return "0.00";
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

function typeBadgeClass(type: string) {
  const normalized = String(type || "").toUpperCase();
  if (normalized.includes("ROI")) return "border-blue-700/40 bg-blue-900/30 text-blue-300";
  if (normalized === "LEVEL") return "border-purple-700/40 bg-purple-900/30 text-purple-300";
  if (normalized === "REFERRAL") return "border-emerald-700/40 bg-emerald-900/30 text-emerald-300";
  if (normalized === "REWARD") return "border-amber-700/40 bg-amber-900/30 text-amber-300";
  if (normalized === "MATCHING_INC") return "border-cyan-700/40 bg-cyan-900/30 text-cyan-300";
  return "border-slate-700/40 bg-slate-900/30 text-slate-300";
}

function getTypeIcon(type: string) {
  const normalized = String(type || "").toUpperCase();
  if (normalized === "ROI_BOOSTER") return Rocket;
  if (normalized === "ROI") return Landmark;
  if (normalized === "LEVEL") return Layers;
  if (normalized === "REFERRAL") return Trophy;
  if (normalized === "REWARD") return Sparkles;
  if (normalized === "MATCHING_INC") return Merge;
  return History;
}

export default function DappCommissionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") || "";

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [logs, setLogs] = useState<IncomeLog[]>([]);
  const [filterType, setFilterType] = useState(initialType);
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  useEffect(() => {
    const type = searchParams.get("type");
    if (type) {
      setFilterType(type);
    }
  }, [searchParams]);

  const filteredLogs = useMemo(() => {
    if (!filterType) return logs;
    return logs.filter(log => log.type.toUpperCase() === filterType.toUpperCase());
  }, [logs, filterType]);

  const stats = useMemo(() => {
    const credited = logs.filter((l) => String(l.status || "").toUpperCase() === "CREDITED");
    const sumByType = (t: string) =>
      credited.filter((l) => String(l.type || "").toUpperCase() === t).reduce((sum, l) => sum + Number(l.amount || 0), 0);

    const roi = sumByType("ROI");
    const booster = sumByType("ROI_BOOSTER");
    // Lvl. ROI: LEVEL entries where level > 0 — "Level X Commission", excludes Personal Return
    const levelRoi = credited
      .filter((l) => String(l.type || "").toUpperCase() === "LEVEL" && Number(l.level || 0) > 0)
      .reduce((sum, l) => sum + Number(l.amount || 0), 0);
    // Team Bonuses: same LEVEL + level > 0 pool — kept as a distinct card
    const team = credited
      .filter((l) => String(l.type || "").toUpperCase() === "LEVEL" && Number(l.level || 0) > 0)
      .reduce((sum, l) => sum + Number(l.amount || 0), 0);
    const rewards = sumByType("REWARD");
    const matchingInc = sumByType("MATCHING_INC");
    const total = credited.reduce((sum, l) => sum + Number(l.amount || 0), 0);

    return { total, roi, booster, levelRoi, team, rewards, matchingInc };
  }, [logs]);

  useEffect(() => {
    if (!user) {
      router.replace("/dapp/login?next=%2Fdapp%2Fcommissions");
      return;
    }
    if (user.role && user.role !== "USER") {
      router.replace("/login");
      return;
    }
  }, [router, user]);

  useEffect(() => {
    if (!user || (user.role && user.role !== "USER")) return;

    const load = async () => {
      setLoading(true);
      try {
        const [profileRes, incomeRes] = await Promise.all([
          api.get("/auth/me"),
          api.get(`/wallets/${user.id}/incomes`, {
            params: { limit: 200 } // Fetch more for local filtering since the endpoint supports it but we want a unified feel
          })
        ]);

        setProfile(profileRes.data?.data as SessionProfile);
        setLogs((incomeRes.data?.data || []) as IncomeLog[]);
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to load commissions");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user]);

  const toggleRow = (id: number) => {
    setExpandedRows(prev => 
      prev.includes(id) ? prev.filter(reqId => reqId !== id) : [...prev, id]
    );
  };

  return (
    <main className="min-h-screen bg-[#060b14] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header Section */}
        <section className="relative overflow-hidden rounded-[32px] border border-[#123a62] bg-[#09111c] p-8 shadow-2xl">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-[100px]" />
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[100px]" />
          
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#123a62] bg-[#0b1930] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#5bbcff]">
                <BarChart3 className="h-3.5 w-3.5" />
                Earnings Ledger
              </div>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">Commissions Overview</h1>
              {/* <p className="mt-4 text-base leading-relaxed text-[#8aa4bf]">
                A unified timeline of every profit credited to your account. Monitor your ROI, Team Levels, and promotional bonuses in real-time.
              </p> */}
            </div>
            
            {/* TEMP HIDE: Total Profits */}
          </div>
        </section>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="group rounded-[24px] border border-[#132235] bg-[#09111c] p-6 transition hover:border-[#203a5c]">
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
                <Landmark className="h-6 w-6" />
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-widest text-[#5bbcff]">ROI Earnings</p>
                <p className="mt-1 text-2xl font-black text-white">{formatAmount(stats.roi)}</p>
              </div>
            </div>
          </div>
          <div className="group rounded-[24px] border border-[#132235] bg-[#09111c] p-6 transition hover:border-[#203a5c]">
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-teal-500/10 p-3 text-teal-400">
                <Layers className="h-6 w-6" />
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-widest text-teal-400">Lvl. ROI</p>
                <p className="mt-1 text-2xl font-black text-white">{formatAmount(stats.levelRoi)}</p>
                <p className="mt-0.5 text-[10px] text-teal-700">Total Level Commission</p>
              </div>
            </div>
          </div>
          <div className="group rounded-[24px] border border-[#132235] bg-[#09111c] p-6 transition hover:border-[#203a5c]">
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-purple-500/10 p-3 text-purple-400">
                <Trophy className="h-6 w-6" />
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-widest text-purple-400">Team Bonuses</p>
                <p className="mt-1 text-2xl font-black text-white">{formatAmount(stats.team)}</p>
              </div>
            </div>
          </div>
          <div className="group rounded-[24px] border border-[#132235] bg-[#09111c] p-6 transition hover:border-[#203a5c]">
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-amber-500/10 p-3 text-amber-400">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-400">Rewards</p>
                <p className="mt-1 text-2xl font-black text-white">{formatAmount(stats.rewards)}</p>
              </div>
            </div>
          </div>
          <div className="group rounded-[24px] border border-[#132235] bg-[#09111c] p-6 transition hover:border-[#203a5c]">
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400">
                <Merge className="h-6 w-6" />
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">Matching INC</p>
                <p className="mt-1 text-2xl font-black text-white">{formatAmount(stats.matchingInc)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:rounded-[24px] lg:border lg:border-[#132235] lg:bg-[#09111c] lg:p-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "", label: "All Income", icon: History },
              { id: "ROI", label: "ROI", icon: Landmark },
              { id: "LEVEL", label: "Level", icon: Layers },
              { id: "REFERRAL", label: "Referral", icon: Trophy },
              { id: "ROI_BOOSTER", label: "Booster", icon: Rocket },
              { id: "REWARD", label: "Rewards", icon: Sparkles },
              { id: "MATCHING_INC", label: "Matching INC", icon: Merge }
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setFilterType(type.id)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                  filterType === type.id 
                    ? "border-[#5bbcff] bg-[#5bbcff]/10 text-[#5bbcff] shadow-[0_0_20px_rgba(91,188,255,0.2)]"
                    : "border-[#1e2d3d] bg-[#0d1726]/50 text-[#8aa4bf] hover:border-[#35506b] hover:bg-[#122033]"
                }`}
              >
                <type.icon className="h-4 w-4" />
                {type.label}
              </button>
            ))}
          </div>
        </section>

        {/* Unified Ledger Table */}
        <section className="rounded-[32px] border border-[#132235] bg-[#09111c] p-4 shadow-sm sm:p-6 lg:p-8">
          <div className="hidden overflow-x-auto xl:block">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-[#132235] text-[10px] font-bold uppercase tracking-[0.2em] text-[#5bbcff]">
                  <th className="pb-6 pl-4">Timestamp</th>
                  <th className="pb-6 px-4 text-center">Income Type</th>
                  <th className="pb-6 px-4">Source Member</th>
                  <th className="pb-6 px-4">Commission</th>
                  <th className="pb-6 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-[#8aa4bf]">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-[#5bbcff]" />
                        <p className="text-sm font-medium tracking-wide">Syncing ledger records...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredLogs.length ? (
                  filteredLogs.map((log) => {
                    const Icon = getTypeIcon(log.type);
                    return (
                      <tr key={log.id} className="group border-b border-[#101b2a] transition-colors hover:bg-white/[0.02]">
                        <td className="py-6 pl-4 font-medium text-[#dce8f5]">{formatDateTime(log.createdAt)}</td>
                        <td className="py-6 px-4 text-center">
                          <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${typeBadgeClass(log.type)}`}>
                            <Icon className="h-3 w-3" />
                            {log.type.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-6 px-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">
                              {log.type === "ROI_BOOSTER" ? "Booster Allocation" : log.type === "MATCHING_INC" ? "Matching Qualification" : (log.fromReferralCode || "SELF")}
                            </span>
                            <span className="text-[10px] text-[#5bbcff]/60 uppercase tracking-tighter">
                              {log.type === "ROI_BOOSTER"
                                ? "ROI + Working Gain"
                                : log.type === "MATCHING_INC"
                                ? "Team Leg Match"
                                : log.fromWalletAddress ? `${log.fromWalletAddress.slice(0, 6)}...${log.fromWalletAddress.slice(-4)}` : "ROI Credit"}
                            </span>
                          </div>
                        </td>
                        <td className="py-6 px-4">
                           {log.type === "ROI_BOOSTER" ? (
                            <span className="text-xs font-semibold text-blue-400">Booster Gain</span>
                           ) : log.type === "MATCHING_INC" ? (
                            <span className="text-xs font-semibold text-cyan-400">Matching Income</span>
                           ) : log.level ? (
                            <span className="text-xs font-semibold text-purple-400">Level {log.level} Commission</span>
                           ) : (
                            <span className="text-xs font-medium text-[#84a3c2]">Personal Return</span>
                           )}
                        </td>
                        <td className="py-6 px-4 text-right">
                          <span className="text-lg font-black text-white">{formatAmount(log.amount)}</span>
                          <span className="ml-1 text-[10px] font-bold text-[#5bbcff]">USDT</span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-[#8aa4bf]">
                      <div className="flex flex-col items-center gap-4">
                        <div className="rounded-full bg-[#111827] p-6 text-[#1f2937]">
                           <History className="h-12 w-12" />
                        </div>
                        <p className="max-w-[200px] text-sm leading-relaxed">No commission logs found for the selected category.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="grid gap-4 xl:hidden">
            {loading ? (
              <div className="flex h-64 items-center justify-center rounded-[32px] border border-[#132235] bg-[#0a1420]">
                <Loader2 className="h-8 w-8 animate-spin text-[#5bbcff]" />
              </div>
            ) : filteredLogs.length ? (
              filteredLogs.map((log) => {
                const Icon = getTypeIcon(log.type);
                return (
                  <article key={log.id} className="rounded-[28px] border border-[#132235] bg-[#0a1420] p-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${typeBadgeClass(log.type)}`}>
                        <Icon className="h-3 w-3" />
                        {log.type.replace("_", " ")}
                      </span>
                      <p className="text-[10px] font-bold text-[#5f738c]">{formatDateTime(log.createdAt)}</p>
                    </div>
                    <div className="mt-6 flex items-end justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#5bbcff]/60">Source Member</p>
                        <p className="mt-1 text-base font-black text-white">
                          {log.type === "ROI_BOOSTER" ? "Booster Allocation" : log.type === "MATCHING_INC" ? "Matching Qualification" : (log.fromReferralCode || "SELF")}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {log.type === "ROI_BOOSTER" ? "Booster Gain" : log.type === "MATCHING_INC" ? "Matching Income" : log.level ? `Level ${log.level} Commission` : "Personal Return"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#5bbcff]/60">Amount</p>
                        <p className="mt-1 text-2xl font-black text-white">{formatAmount(log.amount)} <span className="text-xs text-[#5bbcff]">USDT</span></p>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
               <div className="flex h-64 items-center justify-center rounded-[32px] border-2 border-dashed border-[#132235] bg-[#0a1420] px-8 text-center">
                 <p className="text-sm text-[#8aa4bf]">No detailed logs for this category yet.</p>
               </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
