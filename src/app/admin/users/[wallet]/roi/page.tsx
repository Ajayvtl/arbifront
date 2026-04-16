"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { BarChart3, Clock3, Loader2, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { formatPercent, formatTokenAmount } from "@/lib/numberFormat";

type RoiSubscription = {
  id: number;
  planId: number;
  planName: string;
  amount: number;
  tokenSymbol: string;
  status: string;
  startedAt: string;
  expiresAt: string | null;
  roiPercent: number;
  dailyIncomePercent: number;
  baseRoiPercent?: number;
  baseDailyIncomePercent?: number;
  durationDays: number;
  elapsedDays: number;
  elapsedSeconds?: number;
  remainingDays: number;
  remainingSeconds?: number;
  maxReturnMultiplier: number;
  baseMaxReturnMultiplier?: number;
  cappedReturnAmount: number;
  maxIncomeCap: number;
  estimatedDailyIncome: number;
  estimatedIncomeToDate: number;
  estimatedTotalIncome: number;
  estimatedTotalReturn?: number;
  estimatedRemainingIncome: number;
  workingGainActive?: boolean;
  workingGainLabel?: string;
  workingGainExtraRoiPercent?: number;
  workingGainQualifiedAt?: string | null;
};

type RoiSettings = {
  roi_credit_time_utc: string;
  roi_credit_enabled: number;
};

type RoiProfile = {
  activeSubscriptions?: RoiSubscription[];
  mlmSettings?: RoiSettings | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function buildNextCreditLabel(utcClock: string) {
  if (!utcClock || !/^\d{2}:\d{2}$/.test(utcClock)) return "Not configured";
  const [hours, minutes] = utcClock.split(":").map(Number);
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(hours, minutes, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return `${next.toLocaleString()} (next credit window, configured ${utcClock} UTC)`;
}

export default function AdminRoiLedgerPage() {
  const router = useRouter();
  const params = useParams();
  const walletAddress = typeof params.wallet === "string" ? params.wallet : "";
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<RoiProfile | null>(null);

  useEffect(() => {
    if (!walletAddress) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/admin/users/${walletAddress}/subscriptions`);
        if (!cancelled) {
          setProfile((response.data?.data || null) as RoiProfile | null);
        }
      } catch (error: any) {
        const message =
          error?.response?.data?.message ||
          "Failed to load user ROI tracker";
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  const subscriptions = useMemo(() => profile?.activeSubscriptions || [], [profile?.activeSubscriptions]);
  const summary = useMemo(() => {
    const aggregated = subscriptions.reduce(
      (acc, sub) => {
        acc.totalInvestment += Number(sub.amount || 0);
        acc.dailyIncome += Number(sub.estimatedDailyIncome || 0);
        acc.earnedToDate += Number(sub.estimatedIncomeToDate || 0);
        acc.remainingIncome += Number(sub.estimatedRemainingIncome || 0);
        acc.dailyRoiWeightedSum += Number(sub.dailyIncomePercent || 0) * Number(sub.amount || 0);
        return acc;
      },
      { totalInvestment: 0, dailyIncome: 0, earnedToDate: 0, remainingIncome: 0, dailyRoiWeightedSum: 0 }
    );
    const avgDailyRoiPercent = aggregated.totalInvestment > 0
      ? aggregated.dailyRoiWeightedSum / aggregated.totalInvestment
      : 0;
    return {
      ...aggregated,
      avgDailyRoiPercent,
    };
  }, [subscriptions]);

  const nextCreditLabel = useMemo(() => {
    return buildNextCreditLabel(profile?.mlmSettings?.roi_credit_time_utc || "");
  }, [profile?.mlmSettings?.roi_credit_time_utc]);

  if (loading) {
    return (
      <div className="min-h-[500px] bg-slate-950 flex items-center justify-center rounded-2xl">
        <div className="inline-flex items-center gap-2 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading ROI ledger for {walletAddress}...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 text-slate-200">
      <div className="max-w-7xl mx-auto space-y-6">
      
        <div className="flex items-center gap-4">
          <Link href="/admin/users" className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Admin ROI Ledger</h1>
            <p className="text-sm text-slate-500 font-mono mt-1">{walletAddress}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-5 shadow-lg">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-[11px] font-semibold tracking-wide text-emerald-400">
                <BarChart3 className="h-3.5 w-3.5" />
                LIVE TRACKER
              </div>
              <h2 className="mt-3 text-xl font-bold text-white">Member Package Schedule</h2>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm text-slate-300">
              <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-500">Wallet Credit Time</p>
              <p className="mt-1 font-semibold">{profile?.mlmSettings?.roi_credit_enabled ? nextCreditLabel : "ROI credit visibility is disabled by company"}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-[11px] uppercase tracking-wider text-emerald-500">Active Packages</p>
            <p className="mt-2 text-2xl font-bold text-white">{subscriptions.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-[11px] uppercase tracking-wider text-slate-400">Total Activated</p>
            <p className="mt-2 text-2xl font-bold text-white">{formatTokenAmount(summary.totalInvestment)}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-[11px] uppercase tracking-wider text-slate-400">Daily Projection</p>
            <p className="mt-2 text-2xl font-bold text-white">{formatTokenAmount(summary.dailyIncome)}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-[11px] uppercase tracking-wider text-slate-400">Remaining ROI</p>
            <p className="mt-2 text-2xl font-bold text-white">{formatTokenAmount(summary.remainingIncome)}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0b101a] p-5 shadow-lg md:p-7">
          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            <div>
              <h3 className="text-lg font-semibold text-white">Individual Package Ledger</h3>
              <p className="text-sm text-slate-400 mt-1">Read-only view of exactly what the member sees dynamically calculated up to this second.</p>
            </div>
          </div>

          {subscriptions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-400 text-center flex flex-col items-center">
              <BarChart3 className="h-8 w-8 mb-3 opacity-30" />
              This member has no active packages in their ROI schedule.
            </div>
          ) : (
            <div className="space-y-4">
              {subscriptions.map((sub) => {
                const totalSeconds = Math.max(1, Number(sub.durationDays || 0) * 86400);
                const progressPercent = sub.durationDays > 0
                  ? Math.min(100, ((Number(sub.elapsedSeconds || 0) / totalSeconds) * 100))
                  : 0;
                const incomeCapProgress = sub.maxIncomeCap > 0 ? Math.min(100, (sub.estimatedIncomeToDate / sub.maxIncomeCap) * 100) : 0;

                return (
                  <div key={sub.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 md:p-5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-lg font-semibold text-white">{sub.planName}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          Package #{sub.planId} | Activated {formatTokenAmount(sub.amount)} {sub.tokenSymbol}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {sub.workingGainActive ? (
                          <span className="rounded-full border border-emerald-900/50 bg-emerald-950/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                            {sub.workingGainLabel || "Working Gain"} +{formatPercent(sub.workingGainExtraRoiPercent, 2)}%
                          </span>
                        ) : null}
                        <span className="rounded-full border border-amber-900/50 bg-amber-950/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                          {sub.status}
                        </span>
                        <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                          {sub.maxReturnMultiplier.toFixed(2)}x cap
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 xl:grid-cols-5 gap-3 text-sm">
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Base Daily ROI %</p>
                        <p className="mt-1 font-semibold text-slate-200">
                          {formatPercent(sub.baseDailyIncomePercent ?? sub.dailyIncomePercent, 4)}%
                        </p>
                      </div>
                      {sub.workingGainActive && (
                        <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/20 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-emerald-500">Booster Gain %</p>
                          <p className="mt-1 font-semibold text-emerald-400">
                            +{formatPercent(sub.workingGainExtraRoiPercent, 4)}%
                          </p>
                        </div>
                      )}
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Total Daily %</p>
                        <p className="mt-1 font-semibold text-slate-200">
                          {formatPercent(sub.dailyIncomePercent, 4)}%
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Daily Amount</p>
                        <p className="mt-1 font-semibold text-slate-200">{formatTokenAmount(sub.estimatedDailyIncome)} {sub.tokenSymbol}</p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Earned To Date</p>
                        <p className="mt-1 font-semibold text-emerald-400">{formatTokenAmount(sub.estimatedIncomeToDate)} {sub.tokenSymbol}</p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Remaining ROI</p>
                        <p className="mt-1 font-semibold text-amber-400">{formatTokenAmount(sub.estimatedRemainingIncome)} {sub.tokenSymbol}</p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Income Cap</p>
                        <p className="mt-1 font-semibold text-slate-200">
                          {formatTokenAmount(sub.maxIncomeCap)} {sub.tokenSymbol}
                          {sub.workingGainActive && sub.baseMaxReturnMultiplier && sub.baseMaxReturnMultiplier !== sub.maxReturnMultiplier
                            ? ` (${formatPercent(sub.maxReturnMultiplier, 2)}x)`
                            : ""}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <p className="font-medium text-slate-300">Duration progress</p>
                          <span className="text-slate-500">Day {Math.min(sub.durationDays, Math.floor((Number(sub.elapsedSeconds || 0) / 86400)) + 1)} / {sub.durationDays}</span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-slate-800">
                          <div className="h-2 rounded-full bg-sky-500 transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs md:text-sm text-slate-400">
                          <p>Started: {formatDate(sub.startedAt)}</p>
                          <p>Expires: {formatDate(sub.expiresAt)}</p>
                          <p>Elapsed: {(Number(sub.elapsedSeconds || 0) / 86400).toFixed(2)} days</p>
                          <p>Remaining: {sub.remainingDays} days</p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <p className="font-medium text-slate-300">Income cap progress</p>
                          <span className="text-slate-500">{incomeCapProgress.toFixed(1)}%</span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-slate-800">
                          <div className="h-2 rounded-full bg-amber-500 transition-all duration-1000" style={{ width: `${incomeCapProgress}%` }} />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs md:text-sm text-slate-400">
                          <p>Projected total: {formatTokenAmount(sub.estimatedTotalIncome)} {sub.tokenSymbol}</p>
                          <p>Gross target: {formatTokenAmount(Number(sub.estimatedTotalReturn || (sub.amount + sub.estimatedTotalIncome)))} {sub.tokenSymbol}</p>
                          {sub.workingGainActive ? <p className="text-emerald-400/80">Working gain: {formatDate(sub.workingGainQualifiedAt || null)}</p> : <p>Working gain: Not qualified</p>}
                          <p className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5 text-amber-500" /> Credit at {profile?.mlmSettings?.roi_credit_time_utc || "00:00"} UTC</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
