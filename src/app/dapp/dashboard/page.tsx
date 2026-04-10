"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity, AlertTriangle, ArrowUpRight, BadgeCheck, BarChart3, Copy, Gift, Loader2, Network, QrCode, Sparkles, Wallet, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { formatPercent, formatTokenAmount } from "@/lib/numberFormat";
import DappWalletChip from "@/components/dapp/DappWalletChip";
import BrandLogo from "@/components/dapp/BrandLogo";
import { getWalletTypeLabels } from "@/lib/walletTypeLabels";

interface PlanItem {
  id: number;
  name: string;
  min_amount: number;
  max_amount: number;
  roi_percent: number;
  daily_income_percent?: number;
  duration_days: number;
  max_return_multiplier?: number;
  payment_currency?: "AUTO" | "BNB" | "USDT";
}

interface OrderItem {
  id: number;
  plan_id: number;
  plan_name: string;
  amount: number;
  token_symbol: string;
  chain_id: number | null;
  chain_name: string;
  receiver_address: string;
  tx_hash: string | null;
  status: "INITIATED" | "PENDING" | "PAID" | "FAILED";
  created_at: string;
  paid_at: string | null;
}

interface PaginatedOrders {
  items: OrderItem[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ProfileSummary {
  referralCode: string | null;
  status: string;
  mlmSettings?: {
    roi_credit_time_utc?: string;
    roi_credit_enabled?: number;
    wallet_type_labels?: Partial<Record<string, unknown>> | null;
  } | null;
  wallet?: {
    mainBalance: number;
    earningBalance: number;
    roiBalance: number;
    directBalance: number;
    levelBalance?: number;
    withdrawableBalance: number;
    rewardBalance: number;
    lockedBalance?: number;
  };
  metrics?: {
    directReferrals: number;
    networkLevel?: number;
    sponsorCount?: number;
    teamMembers?: number;
    teamInvestment?: number;
    totalEarnings?: number;
  };
  activeSubscriptions?: Array<{
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
    estimatedDailyIncome: number;
    estimatedIncomeToDate: number;
    estimatedTotalIncome: number;
    estimatedTotalReturn?: number;
    maxReturnMultiplier?: number;
    baseMaxReturnMultiplier?: number;
    workingGainActive?: boolean;
    workingGainLabel?: string;
    workingGainExtraRoiPercent?: number;
  }>;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function DappDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);

  const walletAddress = useMemo(() => {
    return (user as { walletAddress?: string; wallet_address?: string } | null)?.walletAddress
      || (user as { walletAddress?: string; wallet_address?: string } | null)?.wallet_address
      || "";
  }, [user]);

  const paidOrders = useMemo(() => orders.filter((order) => order.status === "PAID"), [orders]);
  const totalPaidAmount = useMemo(() => paidOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0), [paidOrders]);
  const latestPlans = useMemo(() => plans.slice(0, 3), [plans]);
  const activeSubscriptions = useMemo(() => profile?.activeSubscriptions || [], [profile?.activeSubscriptions]);
  const currentActivePackageName = useMemo(() => {
    const active = activeSubscriptions.find((item) => String(item.status || "").toUpperCase() === "ACTIVE");
    return active?.planName || "Inactive";
  }, [activeSubscriptions]);
  const hasActivePackage = currentActivePackageName !== "Inactive";
  const portfolioStatusLabel = hasActivePackage ? "ACTIVE" : "INACTIVE";
  const referralLink = useMemo(() => {
    if (!profile?.referralCode || typeof window === "undefined") return "";
    return `${window.location.origin}/dapp/login?ref=${encodeURIComponent(profile.referralCode)}`;
  }, [profile?.referralCode]);
  const qrCodeUrl = useMemo(() => {
    if (!referralLink) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(referralLink)}`;
  }, [referralLink]);
  const walletTypeLabels = useMemo(
    () => getWalletTypeLabels(profile?.mlmSettings?.wallet_type_labels || null),
    [profile?.mlmSettings?.wallet_type_labels]
  );

  const loadData = useCallback(async (showErrors = true) => {
    setLoading(true);
    try {
      const [plansRes, ordersRes, profileRes] = await Promise.all([
        api.get("/payments/plans"),
        api.get("/payments/orders", { params: { limit: 20 } }),
        api.get("/auth/me"),
      ]);
      setPlans((plansRes.data?.data || []) as PlanItem[]);
      setOrders(((ordersRes.data?.data || { items: [] }) as PaginatedOrders).items || []);
      setProfile((profileRes.data?.data || null) as ProfileSummary | null);
    } catch (error: unknown) {
      if (showErrors) {
        const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed to load dashboard";
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      router.replace("/dapp/login");
      return;
    }
    if (user.role && user.role !== "USER") {
      router.replace("/login");
      return;
    }
    void loadData();
    const interval = window.setInterval(() => {
      void loadData(false);
    }, 15000);
    return () => {
      window.clearInterval(interval);
    };
  }, [user, router, loadData]);

  const copyReferralCode = async () => {
    if (!profile?.referralCode) return;
    try {
      await navigator.clipboard.writeText(profile.referralCode);
      toast.success("Referral code copied");
    } catch {
      toast.error("Failed to copy referral code");
    }
  };

  const copyReferralLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success("Referral link copied");
    } catch {
      toast.error("Failed to copy referral link");
    }
  };

  return (
    <div className="min-h-screen bg-[#060b14] p-4 md:p-8">
      <div className="w-full space-y-5">
        <div className="relative overflow-hidden rounded-3xl border border-[#123a62] bg-gradient-to-br from-[#09111c] via-[#0d1726] to-[#10213a] p-5 text-white shadow-[0_24px_60px_rgba(0,0,0,0.35)] md:hidden">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#1ea0ff]/15 blur-2xl" />
          <div className="absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-[#5bbcff]/10 blur-2xl" />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div>
              <BrandLogo compact className="max-w-[220px]" />
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#123a62] bg-[#0b1930] px-3 py-1 text-[11px] font-semibold tracking-wide text-[#5bbcff]">
                <Sparkles className="h-3.5 w-3.5" />
                MEMBER DASHBOARD
              </div>
              <h1 className="mt-3 text-2xl md:text-3xl font-extrabold">Account Overview</h1>
              <p className="mt-2 max-w-2xl text-sm text-[#b0d6f5]">Track plans, payouts, referrals, and account activity with a branded mobile-first member dashboard.</p>
            </div>
            <div className="w-full sm:w-auto">
              <DappWalletChip
                address={walletAddress || "No wallet"}
                compact
                className="w-full justify-start border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10 sm:w-auto"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          <div className="rounded-2xl border border-[#132235] bg-[#09111c] p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider text-[#5bbcff]">Active Package</p>
            <div className="mt-2 flex items-center gap-2">
              {hasActivePackage ? (
                <BadgeCheck className="h-5 w-5 text-[#0ecb81]" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-[#f6465d]" />
              )}
              <p className={`text-lg font-bold break-words ${hasActivePackage ? "text-[#f5f5f5]" : "text-[#f6465d]"}`}>
                {hasActivePackage ? currentActivePackageName : "INACTIVE"}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-[#132235] bg-[#09111c] p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider text-[#7f95ad]">Total Plans</p>
            <p className="mt-2 text-2xl font-bold text-[#f5f5f5]">{paidOrders.length}</p>
          </div>
          <div className="rounded-2xl border border-[#132235] bg-[#09111c] p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider text-[#7f95ad]">Total Invested</p>
            <p className="mt-2 text-2xl font-bold text-[#f5f5f5]">{formatTokenAmount(totalPaidAmount)}</p>
          </div>
          <div className="rounded-2xl border border-[#132235] bg-[#09111c] p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider text-[#7f95ad]">My Level</p>
            <p className="mt-2 text-2xl font-bold text-[#f5f5f5]">{profile?.metrics?.networkLevel ?? 0}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          <div className="rounded-2xl border border-[#132235] bg-[#09111c] p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider text-[#7f95ad]">My Sponsor</p>
            <p className="mt-2 text-2xl font-bold text-[#f5f5f5]">{profile?.metrics?.directReferrals ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-[#132235] bg-[#09111c] p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider text-[#7f95ad]">My Team</p>
            <p className="mt-2 text-2xl font-bold text-[#f5f5f5]">{profile?.metrics?.teamMembers ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-[#132235] bg-[#09111c] p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider text-[#7f95ad]">Total Earning</p>
            <p className="mt-2 text-2xl font-bold text-[#f5f5f5]">{formatTokenAmount(profile?.metrics?.totalEarnings ?? 0)}</p>
          </div>
          <div className="rounded-2xl border border-[#132235] bg-[#09111c] p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider text-[#7f95ad]">Team Investment</p>
            <p className="mt-2 text-2xl font-bold text-[#f5f5f5]">{formatTokenAmount(profile?.metrics?.teamInvestment ?? 0)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4">
          <div className="rounded-2xl border border-[#1e2329] bg-[#161a20] p-5 shadow md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#f5f5f5]">Portfolio</h2>
                <p className="text-sm text-[#848e9c]">Live user balances and referral identity. Auto refreshes every 15 seconds.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void loadData(false)}
                  className="rounded-full border border-[#123a62] bg-[#0b1930] px-3 py-1 text-xs font-semibold text-[#5bbcff]"
                >
                  Refresh
                </button>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#3a2f09] bg-[#201a08] px-3 py-1 text-xs font-semibold text-[#f0b90b]">
                  {hasActivePackage ? (
                    <BadgeCheck className="h-3.5 w-3.5 text-[#0ecb81]" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-[#f6465d]" />
                  )}
                  <span className={hasActivePackage ? "text-[#0ecb81]" : "text-[#f6465d]"}>{portfolioStatusLabel}</span>
                </span>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-[#2b3139] bg-[#111418] p-4">
                <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Total Earning</p>
                <p className="mt-2 text-lg font-semibold text-[#f5f5f5]">{formatTokenAmount(profile?.metrics?.totalEarnings || 0)}</p>
              </div>
              <div className="rounded-xl border border-[#2b3139] bg-[#111418] p-4">
                <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">{walletTypeLabels.earning_balance}</p>
                <p className="mt-2 text-lg font-semibold text-[#f5f5f5]">{formatTokenAmount(profile?.wallet?.earningBalance || 0)}</p>
              </div>
              <div className="rounded-xl border border-[#2b3139] bg-[#111418] p-4">
                <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">{walletTypeLabels.roi_balance}</p>
                <p className="mt-2 text-lg font-semibold text-[#f5f5f5]">{formatTokenAmount(profile?.wallet?.roiBalance || 0)}</p>
                <p className="mt-1 text-[11px] text-[#848e9c]">
                  {profile?.mlmSettings?.roi_credit_enabled
                    ? `Time-based credit at ${profile?.mlmSettings?.roi_credit_time_utc || "00:00"} UTC`
                    : `${walletTypeLabels.roi_balance} credit is currently disabled`}
                </p>
              </div>
              <div className="rounded-xl border border-[#2b3139] bg-[#111418] p-4">
                <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">{walletTypeLabels.direct_balance}</p>
                <p className="mt-2 text-lg font-semibold text-[#f5f5f5]">{formatTokenAmount(profile?.wallet?.directBalance || 0)}</p>
              </div>
              <div className="rounded-xl border border-[#2b3139] bg-[#111418] p-4">
                <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">{walletTypeLabels.reward_balance}</p>
                <p className="mt-2 text-lg font-semibold text-[#f5f5f5]">{formatTokenAmount(profile?.wallet?.rewardBalance || 0)}</p>
              </div>
              <div className="rounded-xl border border-[#2b3139] bg-[#111418] p-4">
                <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">{walletTypeLabels.level_balance}</p>
                <p className="mt-2 text-lg font-semibold text-[#f5f5f5]">{formatTokenAmount(profile?.wallet?.levelBalance || 0)}</p>
              </div>
              <div className="rounded-xl border border-[#2b3139] bg-[#111418] p-4">
                <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">{walletTypeLabels.withdrawable_balance}</p>
                <p className="mt-2 text-lg font-semibold text-[#f5f5f5]">{formatTokenAmount(profile?.wallet?.withdrawableBalance || 0)}</p>
              </div>
              <div className="rounded-xl border border-[#2b3139] bg-[#111418] p-4">
                <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">{walletTypeLabels.locked_balance}</p>
                <p className="mt-2 text-lg font-semibold text-[#f5f5f5]">{formatTokenAmount(profile?.wallet?.lockedBalance || 0)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#1e2329] bg-[#161a20] p-5 shadow md:p-6">
            <h2 className="text-lg font-semibold text-[#f5f5f5]">Referral Identity</h2>
            <p className="mt-1 text-sm text-[#848e9c]">Core profile data used across your company system.</p>
            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-[#2b3139] bg-[#111418] p-4">
                <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Referral Code</p>
                <p className="mt-2 text-base font-semibold text-[#f5f5f5] break-all">{profile?.referralCode || "-"}</p>
              </div>
              <div className="rounded-xl border border-[#2b3139] bg-[#111418] p-4">
                <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Referral Link</p>
                <p className="mt-2 break-all text-sm font-medium text-[#f5f5f5]">{referralLink || "-"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copyReferralCode()}
                    disabled={!profile?.referralCode}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#2b3139] bg-[#161a20] px-3 py-2 text-xs font-medium text-[#f5f5f5] disabled:opacity-50"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy code
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyReferralLink()}
                    disabled={!referralLink}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#2b3139] bg-[#161a20] px-3 py-2 text-xs font-medium text-[#f5f5f5] disabled:opacity-50"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy link
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    disabled={!referralLink}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#3a2f09] bg-[#201a08] px-3 py-2 text-xs font-medium text-[#f0b90b] disabled:opacity-50"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    QR code
                  </button>
                </div>
              </div>
              <Link
                href="/dapp/profile"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#f0b90b] hover:text-[#f8d45c]"
              >
                Open full profile
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#1e2329] bg-[#161a20] p-5 shadow md:p-7">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-[#f5f5f5]">ROI Progress</h2>
            <div className="flex items-center gap-3">
              <Link href="/dapp/roi" className="text-xs font-medium text-[#f0b90b] hover:text-[#f8d45c]">Open ROI page</Link>
              <span className="text-xs text-[#848e9c]">{activeSubscriptions.length} active package(s)</span>
            </div>
          </div>
          {activeSubscriptions.length === 0 ? (
            <p className="text-sm text-[#848e9c]">No active package income schedule available yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeSubscriptions.slice(0, 4).map((sub) => (
                <div key={sub.id} className="rounded-2xl border border-[#2b3139] bg-[#111418] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#f5f5f5]">{sub.planName}</p>
                      <p className="text-xs text-[#848e9c]">{formatTokenAmount(sub.amount)} {sub.tokenSymbol} | Daily Income {formatPercent(sub.dailyIncomePercent, 4)}%</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {sub.workingGainActive ? (
                        <span className="rounded-full border border-[#123a62] bg-[#0b1930] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5bbcff]">
                          {sub.workingGainLabel || "Working Gain"} +{formatPercent(sub.workingGainExtraRoiPercent, 2)}%
                        </span>
                      ) : null}
                      <span className="rounded-full border border-[#3a2f09] bg-[#201a08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f0b90b]">
                        Day {Math.min(sub.durationDays, sub.elapsedDays + 1)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Daily ROI</p>
                      <p className="text-[#f5f5f5]">{formatPercent(sub.dailyIncomePercent, 4)}%</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Per Day Income</p>
                      <p className="text-[#f5f5f5]">{formatTokenAmount(sub.estimatedDailyIncome)} {sub.tokenSymbol}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Earned to Date</p>
                      <p className="text-[#f5f5f5]">{formatTokenAmount(sub.estimatedIncomeToDate)} {sub.tokenSymbol}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Cap</p>
                      <p className="text-[#f5f5f5]">
                        {formatPercent(sub.maxReturnMultiplier, 2)}x
                        {sub.workingGainActive && sub.baseMaxReturnMultiplier && sub.baseMaxReturnMultiplier !== sub.maxReturnMultiplier
                          ? ` from ${formatPercent(sub.baseMaxReturnMultiplier, 2)}x`
                          : ""}
                      </p>
                    </div>
                    {/* <div>
                      <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">ROI Mode</p>
                      <p className="text-[#f5f5f5]">
                        {sub.workingGainActive && sub.baseRoiPercent !== undefined
                          ? `${formatPercent(sub.baseRoiPercent, 2)}% -> ${formatPercent(sub.roiPercent, 2)}%`
                          : `${formatPercent(sub.roiPercent, 2)}% base`}
                      </p>
                    </div> */}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#1e2329] bg-[#161a20] p-5 shadow md:p-7">
          <h2 className="mb-4 text-lg font-semibold text-[#f5f5f5]">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "ROI Tracker", href: "/dapp/roi", icon: BarChart3 },
              { label: "My Network", href: "/dapp/network", icon: Network },
              { label: "Commissions", href: "/dapp/commissions", icon: Activity },
              { label: "Payout Requests", href: "/dapp/payouts", icon: Wallet },
              { label: "Ranks & Rewards", href: "/dapp/ranks", icon: Gift },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="group rounded-xl border border-[#2b3139] bg-[#111418] px-4 py-3 transition-all hover:border-[#f0b90b] hover:bg-[#181d24]"
              >
                <div className="flex items-center justify-between gap-2 text-sm font-medium">
                  <div className="flex items-center gap-2">
                  <item.icon className="w-4 h-4 text-[#f0b90b]" />
                  <span className="text-[#f5f5f5]">{item.label}</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#848e9c] group-hover:text-[#f0b90b]" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#1e2329] bg-[#161a20] p-5 shadow md:p-7" id="packages">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-[#f5f5f5]">Available Packages</h2>
            <div className="flex items-center gap-3">
              <Link href="/dapp/transactions" className="text-xs font-medium text-[#f0b90b] hover:text-[#f8d45c]">View payments</Link>
              <span className="text-xs text-[#848e9c]">{plans.length} packages</span>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-[#848e9c]"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
          ) : plans.length === 0 ? (
            <p className="text-sm text-[#848e9c]">No plans configured yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {latestPlans.map((plan) => (
                <div key={plan.id} className="rounded-2xl border border-[#2b3139] bg-[#111418] p-4 shadow-sm">
                  <div className="inline-flex rounded-full border border-[#3a2f09] bg-[#201a08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f0b90b]">
                    Plan
                  </div>
                  <h3 className="mt-3 font-semibold text-[#f5f5f5]">{plan.name}</h3>
                  <p className="mt-2 text-sm text-[#b7bdc6]">
                    Investment: {formatTokenAmount(plan.min_amount)} - {formatTokenAmount(plan.max_amount || plan.min_amount || 0)} {plan.payment_currency && plan.payment_currency !== "AUTO" ? plan.payment_currency : "ACTIVE ASSET"}
                  </p>
                  <p className="text-sm text-[#b7bdc6]">
                    ROI: {formatPercent(plan.roi_percent, 2)}%
                  </p>
                  <p className="text-sm text-[#b7bdc6]">
                    Daily Income: {formatPercent((plan.daily_income_percent ?? plan.roi_percent) || 0, 4)}%
                  </p>
                  {/* <p className="text-sm text-[#b7bdc6]">Duration: {plan.duration_days || 30} days</p> */}
                  {/* <p className="text-xs text-[#848e9c] mt-1">
                    Projected ROI on min amount:{" "}
                    {formatTokenAmount(Number(plan.min_amount || 0) * (Number(plan.roi_percent || 0) / 100))}
                  </p> */}
                  <p className="text-xs text-[#848e9c] mt-1">
                    Total return cap on min amount:{" "}
                    {formatTokenAmount(Number(plan.min_amount || 0) * Number(plan.max_return_multiplier || 2))}
                  </p>
                  <button type="button" onClick={() => router.push(`/dapp/pay/${plan.id}`)} className="mt-4 w-full rounded-lg bg-[#f0b90b] px-3 py-2 font-medium text-[#181a20] hover:bg-[#f8d45c]">
                    Activate Plan
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#1e2329] bg-[#161a20] p-5 shadow md:p-7">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#f5f5f5]">Recent Payment Orders</h2>
            <Link href="/dapp/transactions" className="text-sm font-medium text-[#f0b90b] hover:text-[#f8d45c]">Open full log</Link>
          </div>
          {orders.length === 0 ? (
            <p className="text-sm text-[#848e9c]">No orders yet.</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {orders.slice(0, 5).map((o) => (
                  <div key={o.id} className="rounded-xl border border-[#2b3139] bg-[#111418] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[#f5f5f5]">{o.plan_name || `Plan ${o.plan_id}`}</p>
                        <p className="text-xs text-[#848e9c]">Order #{o.id}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${o.status === "PAID" ? "bg-[#102821] text-[#0ecb81]" : "bg-[#2b2110] text-[#f0b90b]"}`}>
                        {o.status}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Amount</p>
                        <p className="text-[#f5f5f5]">{o.amount} {o.token_symbol}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Chain</p>
                        <p className="text-[#f5f5f5]">{o.chain_name || o.chain_id || "-"}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-[#848e9c]">{formatDate(o.created_at)}</p>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#161a20]">
                  <tr className="text-left text-[#848e9c] border-b border-[#2b3139]">
                    <th className="py-2 pr-3">Order</th>
                    <th className="py-2 pr-3">Plan</th>
                    <th className="py-2 pr-3">Amount</th>
                    <th className="py-2 pr-3">Chain</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Tx</th>
                    <th className="py-2 pr-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-[#1e2329] text-[#f5f5f5]">
                      <td className="py-2 pr-3">#{o.id}</td>
                      <td className="py-2 pr-3">{o.plan_name || `Plan ${o.plan_id}`}</td>
                      <td className="py-2 pr-3">{o.amount} {o.token_symbol}</td>
                      <td className="py-2 pr-3">{o.chain_name || o.chain_id || "-"}</td>
                      <td className="py-2 pr-3">{o.status}</td>
                      <td className="py-2 pr-3 break-all">{o.tx_hash || "-"}</td>
                      <td className="py-2 pr-3">{formatDate(o.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </div>

        {showQrModal && referralLink ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-[#2b3139] bg-[#161a20] p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-[#f5f5f5]">Referral QR Code</h3>
                  <p className="mt-1 text-sm text-[#848e9c]">Scan to open your referral link directly.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="rounded-lg border border-[#2b3139] p-2 text-[#848e9c] hover:bg-[#1e2329]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 rounded-2xl border border-[#2b3139] bg-[#111418] p-4">
                <img src={qrCodeUrl} alt="Referral QR code" className="mx-auto h-64 w-64 rounded-xl bg-white p-2" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyReferralLink()}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#2b3139] bg-[#161a20] px-3 py-2 text-xs font-medium text-[#f5f5f5]"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy link
                </button>
              </div>
              <p className="mt-4 break-all text-xs text-[#848e9c]">{referralLink}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
