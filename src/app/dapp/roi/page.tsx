"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, Clock3, Loader2, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
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
  roiCreditBalanceType?: string;
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
  if (!value) return "-";
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

export default function DappRoiPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<RoiProfile | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace("/dapp/login?next=%2Fdapp%2Froi");
      return;
    }
    if (user.role && user.role !== "USER") {
      router.replace("/login");
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await api.get("/auth/me");
        if (!cancelled) {
          setProfile((response.data?.data || null) as RoiProfile | null);
        }
      } catch (error: unknown) {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to load ROI tracker";
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [router, user]);

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
      <div className="min-h-screen bg-[#060b14] flex items-center justify-center">
        <div className="inline-flex items-center gap-2 text-[#b7bdc6]">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading ROI tracker...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060b14] p-4 md:p-8">
      <div className="w-full space-y-5">
        <div className="rounded-3xl border border-[#123a62] bg-gradient-to-br from-[#09111c] via-[#0d1726] to-[#10213a] p-5 text-white shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#123a62] bg-[#0b1930] px-3 py-1 text-[11px] font-semibold tracking-wide text-[#5bbcff]">
                <BarChart3 className="h-3.5 w-3.5" />
                ROI TRACKER
              </div>
              <h1 className="mt-3 text-2xl font-extrabold">Package ROI Schedule</h1>
              {/* <p className="mt-2 max-w-3xl text-sm text-[#b0d6f5]">
                Track all active packages, projected ROI generation, cap remaining, and the configured wallet credit window in one full-width view.
              </p> */}
            </div>
            <div className="rounded-2xl border border-[#1b3452] bg-[#0b1930] px-4 py-3 text-sm text-[#d9efff]">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#5bbcff]">Wallet Credit Time</p>
              <p className="mt-1 font-semibold">{profile?.mlmSettings?.roi_credit_enabled ? nextCreditLabel : "ROI credit visibility is disabled"}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          <div className="rounded-2xl border border-[#132235] bg-[#09111c] p-4">
            <p className="text-[11px] uppercase tracking-wider text-[#5bbcff]">Active Packages</p>
            <p className="mt-2 text-2xl font-bold text-[#f5f5f5]">{subscriptions.length}</p>
          </div>
          <div className="rounded-2xl border border-[#132235] bg-[#09111c] p-4">
            <p className="text-[11px] uppercase tracking-wider text-[#7f95ad]">Total Activated</p>
            <p className="mt-2 text-2xl font-bold text-[#f5f5f5]">{formatTokenAmount(summary.totalInvestment)}</p>
          </div>
          <div className="rounded-2xl border border-[#132235] bg-[#09111c] p-4">
            <p className="text-[11px] uppercase tracking-wider text-[#7f95ad]">Daily ROI Projection</p>
            <p className="mt-2 text-2xl font-bold text-[#f5f5f5]">{formatTokenAmount(summary.dailyIncome)}</p>
          </div>
          <div className="rounded-2xl border border-[#132235] bg-[#09111c] p-4">
            <p className="text-[11px] uppercase tracking-wider text-[#7f95ad]">Remaining ROI Projection</p>
            <p className="mt-2 text-2xl font-bold text-[#f5f5f5]">{formatTokenAmount(summary.remainingIncome)}</p>
          </div>
          <div className="rounded-2xl border border-[#132235] bg-[#09111c] p-4">
            <p className="text-[11px] uppercase tracking-wider text-[#7f95ad]">Daily ROI %</p>
            <p className="mt-2 text-2xl font-bold text-[#f5f5f5]">{formatPercent(summary.avgDailyRoiPercent, 4)}%</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#1e2329] bg-[#161a20] p-5 shadow md:p-7">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-[#f5f5f5]">ROI Ledger View</h2>
              <p className="text-sm text-[#848e9c]">Each package remains independent. A single user can have multiple active ROI schedules running in parallel.</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Link href="/dapp/transactions" className="text-[#f0b90b] hover:text-[#f8d45c]">Payment log</Link>
              <Link href="/dapp/profile" className="text-[#f0b90b] hover:text-[#f8d45c]">Wallet profile</Link>
            </div>
          </div>

          {subscriptions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#2b3139] bg-[#111418] p-6 text-sm text-[#b7bdc6]">
              No active package income schedule is available yet. Activate a package first, then the ROI tracker will show its running schedule here.
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
                  <div key={sub.id} className="rounded-2xl border border-[#2b3139] bg-[#111418] p-4 md:p-5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-lg font-semibold text-[#f5f5f5]">{sub.planName}</p>
                        <p className="mt-1 text-sm text-[#848e9c]">
                          Package #{sub.planId} | Activated {formatTokenAmount(sub.amount)} {sub.tokenSymbol}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {sub.workingGainActive ? (
                          <span className="rounded-full border border-[#123a62] bg-[#0b1930] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5bbcff]">
                            {sub.workingGainLabel || "Booster Gain"} {sub.maxReturnMultiplier ? `${sub.maxReturnMultiplier}X` : ""}
                          </span>
                        ) : null}
                        <span className="rounded-full border border-[#1b3452] bg-[#0b1930] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5bbcff]">
                          {(sub.roiCreditBalanceType || "roi_balance").toUpperCase()}
                        </span>
                        <span className="rounded-full border border-[#3a2f09] bg-[#201a08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f0b90b]">
                          {sub.status}
                        </span>
                        <span className="rounded-full border border-[#1b3452] bg-[#0b1930] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5bbcff]">
                          {sub.maxReturnMultiplier.toFixed(2)}x cap
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 xl:grid-cols-6 gap-3 text-sm">
                      {/* <div className="rounded-xl border border-[#1e2329] bg-[#161a20] p-3">
                        <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">ROI %</p>
                        <p className="mt-1 font-semibold text-[#f5f5f5]">
                          {sub.workingGainActive && sub.baseRoiPercent !== undefined
                            ? `${formatPercent(sub.baseRoiPercent, 2)}% -> ${formatPercent(sub.roiPercent, 2)}%`
                            : `${formatPercent(sub.roiPercent, 2)}%`}
                        </p>
                      </div> */}
                      <div className="rounded-xl border border-[#1e2329] bg-[#161a20] p-3">
                        <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Base Daily ROI %</p>
                        <p className="mt-1 font-semibold text-[#f5f5f5]">
                          {formatPercent(sub.baseDailyIncomePercent ?? sub.dailyIncomePercent, 4)}%
                        </p>
                      </div>
                      {sub.workingGainActive && (
                        <div className="rounded-xl border border-[#123a62]/30 bg-[#0b1930]/40 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-[#5bbcff]">Booster Gain</p>
                          <p className="mt-1 font-semibold text-[#5bbcff]">
                            {sub.maxReturnMultiplier ? `${sub.maxReturnMultiplier}X` : (sub.workingGainLabel || "Active")}
                          </p>
                        </div>
                      )}
                      <div className="rounded-xl border border-[#1e2329] bg-[#161a20] p-3">
                        <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Total Daily %</p>
                        <p className="mt-1 font-semibold text-[#f5f5f5]">
                          {formatPercent(sub.baseDailyIncomePercent ?? sub.dailyIncomePercent, 4)}%
                        </p>
                      </div>
                      <div className="rounded-xl border border-[#1e2329] bg-[#161a20] p-3">
                        <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Daily Payout</p>
                        <p className="mt-1 font-semibold text-[#f5f5f5]">{formatTokenAmount(sub.estimatedDailyIncome)} {sub.tokenSymbol}</p>
                      </div>
                      <div className="rounded-xl border border-[#1e2329] bg-[#161a20] p-3">
                        <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Earned To Date</p>
                        <p className="mt-1 font-semibold text-[#f5f5f5]">{formatTokenAmount(sub.estimatedIncomeToDate)} {sub.tokenSymbol}</p>
                      </div>
                      <div className="rounded-xl border border-[#1e2329] bg-[#161a20] p-3">
                        <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Remaining ROI</p>
                        <p className="mt-1 font-semibold text-[#f5f5f5]">{formatTokenAmount(sub.estimatedRemainingIncome)} {sub.tokenSymbol}</p>
                      </div>
                      <div className="rounded-xl border border-[#1e2329] bg-[#161a20] p-3">
                        <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Income Cap</p>
                        <p className="mt-1 font-semibold text-[#f5f5f5]">
                          {formatTokenAmount(Number(sub.amount || 0) * Number(sub.maxReturnMultiplier || 1))} {sub.tokenSymbol}
                          {sub.workingGainActive && sub.baseMaxReturnMultiplier && sub.baseMaxReturnMultiplier !== sub.maxReturnMultiplier
                            ? ` (${formatPercent(sub.maxReturnMultiplier, 2)}x from ${formatPercent(sub.baseMaxReturnMultiplier, 2)}x)`
                            : ""}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-[#1e2329] bg-[#161a20] p-4">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <p className="font-medium text-[#f5f5f5]">Duration progress</p>
                          <span className="text-[#848e9c]">Day {Math.min(sub.durationDays, Math.floor((Number(sub.elapsedSeconds || 0) / 86400)) + 1)} / {sub.durationDays}</span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-[#0b1930]">
                          <div className="h-2 rounded-full bg-[#5bbcff]" style={{ width: `${progressPercent}%` }} />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-[#b7bdc6]">
                          <p>Started: {formatDate(sub.startedAt)}</p>
                          <p>Expires: {formatDate(sub.expiresAt)}</p>
                          {/* <p>Elapsed days: {(Number(sub.elapsedSeconds || 0) / 86400).toFixed(2)}</p>
                          <p>Remaining days: {sub.remainingDays}</p> */}
                        </div>
                      </div>

                      <div className="rounded-xl border border-[#1e2329] bg-[#161a20] p-4">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <p className="font-medium text-[#f5f5f5]">Income cap progress</p>
                          <span className="text-[#848e9c]">{incomeCapProgress.toFixed(1)}%</span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-[#2b2110]">
                          <div className="h-2 rounded-full bg-[#f0b90b]" style={{ width: `${incomeCapProgress}%` }} />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-[#b7bdc6]">
                          <p>Projected total ROI income: {formatTokenAmount(sub.estimatedTotalIncome)} {sub.tokenSymbol}</p>
                          <p>Total return target: {formatTokenAmount(Number(sub.amount || 0) * Number(sub.maxReturnMultiplier || 1))} {sub.tokenSymbol}</p>
                          {sub.workingGainActive ? <p>Working gain active since: {formatDate(sub.workingGainQualifiedAt || null)}</p> : <p>Working gain status: Not yet qualified</p>}
                          <p className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4 text-[#f0b90b]" /> Credit at {profile?.mlmSettings?.roi_credit_time_utc || "00:00"} UTC</p>
                          {/* <p className="inline-flex items-center gap-1"><Wallet className="h-4 w-4 text-[#5bbcff]" /> Wallet posting follows company ROI settings</p> */}
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
