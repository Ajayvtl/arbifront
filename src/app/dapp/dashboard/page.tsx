"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity, AlertTriangle, ArrowUpRight, BadgeCheck, BarChart3, Copy, Gift, Loader2, Network, QrCode, Sparkles, Wallet, X, Rocket, GitBranch, Trophy, UserPlus, Check, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { formatPercent, formatTokenAmount } from "@/lib/numberFormat";
import DappWalletChip from "@/components/dapp/DappWalletChip";
import BrandLogo from "@/components/dapp/BrandLogo";
import { getWalletTypeLabels } from "@/lib/walletTypeLabels";
// Hidden (requested): dashboard graph
// import CryptoChart from "@/components/dapp/CryptoChart";

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
  exch_tx_hash?: string | null;
  exch_amount?: string | null;
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
    totalBoosterCredit?: number;
    activeWorkingIncome?: number;
    totalWithdrawn?: number;
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
    estimatedDailyIncome: number;
    estimatedIncomeToDate: number;
    creditedBoosterBalance?: number;
    estimatedRemainingIncome: number;
    estimatedTotalIncome: number;
    estimatedTotalReturn?: number;
    maxReturnMultiplier?: number;
    baseMaxReturnMultiplier?: number;
    workingGainActive?: boolean;
    workingGainLabel?: string;
    workingGainExtraRoiPercent?: number;
    exchTxHash?: string | null;
    exchAmount?: string | null;
  }>;
  dashboardConfig?: Record<string, {
    label?: string;
    isVisible: boolean;
    overrideValue?: string | number;
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

  const getCardData = useCallback((key: string, defaultLabel: string, currentValue: string | number) => {
    const config = profile?.dashboardConfig?.[key];
    if (config?.isVisible === false) return null;
    return {
      label: config?.label || defaultLabel,
      value: (config?.overrideValue !== undefined && config?.overrideValue !== "") ? config.overrideValue : currentValue
    };
  }, [profile?.dashboardConfig]);

  // Derived stat: sum of all active subscription estimated total ROI
  const totalEstimatedRoi = useMemo(
    () => activeSubscriptions.reduce((sum, s) => sum + Number(s.estimatedTotalIncome || 0), 0),
    [activeSubscriptions]
  );


  const estWorkingBalance = useMemo(() => {
    const activeSubs = activeSubscriptions.filter(
      (s) => String(s.status || "").toUpperCase() === "ACTIVE"
    );
    if (activeSubs.length === 0) return 0;

    // Use actual booster credit total from income_logs (ROI_BOOSTER entries)
    const totalBooster = Number(profile?.metrics?.totalBoosterCredit || 0);
    if (totalBooster <= 0) return 0;

    // LEVEL, REFERRAL income gets deducted from the booster allocation
    const activeWorkingIncome = Number(profile?.metrics?.activeWorkingIncome || 0);

    return Math.max(0, totalBooster - activeWorkingIncome);
  }, [activeSubscriptions, profile?.metrics]);

  // Note: additional derived stats (DEL_ROI, DEL_WORKING) are intentionally omitted from the UI.
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
        api.get("/user/profile/summary"),
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

  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);
  const handleCopyExplorerLink = async (txHash: string, uniqueId: string) => {
    if (!txHash) return;
    const fullLink = `https://bscscan.com/tx/${txHash}`;
    try {
      await navigator.clipboard.writeText(fullLink);
      setCopiedTxId(uniqueId);
      toast.success("BscScan link copied!");
      setTimeout(() => setCopiedTxId(null), 2000);
    } catch {
      toast.error("Failed to copy link");
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

        {/* Hidden (requested): graph */}
        {/* <div className="w-full">
          <CryptoChart symbol="ARBUSDT" interval="15m" height={350} />
        </div> */}

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
          {/* <div className="rounded-2xl border border-[#132235] bg-[#09111c] p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider text-[#7f95ad]">My Level</p>
            <p className="mt-2 text-2xl font-bold text-[#f5f5f5]">{profile?.metrics?.networkLevel ?? 0}</p>
          </div> */}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-[#132235] bg-[#09111c] p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider text-[#7f95ad]">My Active Referrals</p>
            <p className="mt-2 text-2xl font-bold text-[#f5f5f5]">{profile?.metrics?.directReferrals ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-[#132235] bg-[#09111c] p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider text-[#7f95ad]">My Team</p>
            <p className="mt-2 text-2xl font-bold text-[#f5f5f5]">{profile?.metrics?.teamMembers ?? 0}</p>
          </div>

          {/* Total Earning Card — calculated directly from Available to Withdraw + Total Withdrawn */}
          <div className="rounded-2xl border border-[#132235] bg-[#09111c] p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider text-[#a066ff]">Total Earning</p>
            <p className="mt-2 text-2xl font-bold text-[#f5f5f5]">
              {formatTokenAmount(Number(profile?.wallet?.withdrawableBalance ?? 0) + Number(profile?.metrics?.totalWithdrawn ?? 0))}
            </p>
            <p className="mt-1 text-[10px] text-[#848e9c]">EST. Total Earning</p>
          </div>

          <div className="rounded-2xl border border-[#132235] bg-[#09111c] p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider text-[#7f95ad]">Team Investment</p>
            <p className="mt-2 text-2xl font-bold text-[#f5f5f5]">{formatTokenAmount(profile?.metrics?.teamInvestment ?? 0)}</p>
          </div>

          {(() => {
            const data = getCardData('EST_TOTAL_ROI', 'Est. Total ROI', totalEstimatedRoi);
            if (!data) return null;
            return (
              <div className="rounded-2xl border border-[#132235] bg-[#09111c] p-4 shadow-sm">
                <p className="text-[11px] uppercase tracking-wider text-[#f0b90b]">{data.label}</p>
                <p className="mt-2 text-2xl font-bold text-[#f5f5f5]">
                  {typeof data.value === 'string' ? data.value : formatTokenAmount(Number(data.value))}
                </p>
              </div>
            );
          })()}

          {/* Est. Working — calculated directly, NOT via Flow/dashboardConfig */}
          {hasActivePackage && (
            <div className="rounded-2xl border border-[#132235] bg-[#09111c] p-4 shadow-sm">
              <p className="text-[11px] uppercase tracking-wider text-[#0ecb81]">Est. Working</p>
              <p className="mt-2 text-2xl font-bold text-[#f5f5f5]">
                {formatTokenAmount(estWorkingBalance)}
              </p>
              <p className="mt-1 text-[10px] text-[#848e9c]">Booster balance remaining</p>
            </div>
          )}

          {/* {(() => {
            const data = getCardData('DEL_ROI', 'Del. ROI', delROI);
            if (!data) return null;
            return (
              <div className="rounded-2xl border border-[#132235] bg-[#09111c] p-4 shadow-sm">
                <p className="text-[11px] uppercase tracking-wider text-[#a066ff]">{data.label}</p>
                <p className="mt-2 text-2xl font-bold text-[#f5f5f5]">
                   {typeof data.value === 'string' ? data.value : formatTokenAmount(Number(data.value))}
                </p>
                <p className="mt-1 text-[10px] text-[#848e9c]">Earned to Date (ROI)</p>
              </div>
            );
          })()}

          {(() => {
            const data = getCardData('DEL_WORKING', 'Del. Working', delWorking);
            if (!data) return null;
            return (
              <div className="rounded-2xl border border-[#132235] bg-[#09111c] p-4 shadow-sm">
                <p className="text-[11px] uppercase tracking-wider text-[#a066ff]">{data.label}</p>
                <p className="mt-2 text-2xl font-bold text-[#f5f5f5]">
                   {typeof data.value === 'string' ? data.value : formatTokenAmount(Number(data.value))}
                </p>
                <p className="mt-1 text-[10px] text-[#848e9c]">Est. Working – Level Balance</p>
              </div>
            );
          })()} */}

          {(() => {
            const data = getCardData('WITHDRAWABLE', 'Available to Withdraw', profile?.wallet?.withdrawableBalance ?? 0);
            if (!data) return null;

            const numericValue = Number(data.value);
            const finalValue = (!isNaN(numericValue) && numericValue < 0) ? 0 : data.value;

            return (
              <div className="rounded-2xl border border-[#132235] bg-[#09111c] p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-wider text-[#5bbcff]">{data.label}</p>
                  <Link href="/dapp/withdraw" className="text-[10px] font-bold text-[#f0b90b] hover:underline">Withdraw</Link>
                </div>
                <p className="mt-2 text-2xl font-bold text-[#f5f5f5]">
                  {typeof finalValue === 'string' ? finalValue : formatTokenAmount(Number(finalValue))}
                </p>
                <p className="mt-1 text-[10px] text-[#848e9c]">Live Wallet Balance</p>
              </div>
            );
          })()}
        </div>


        <div className="rounded-2xl border border-[#1e2329] bg-[#161a20] p-5 shadow md:p-6">
          <h2 className="text-lg font-semibold text-[#f5f5f5]">Quick Actions</h2>
          <p className="mt-1 text-sm text-[#848e9c]">Direct access to your earning streams and network.</p>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Link href="/dapp/roi" className="flex flex-col items-center justify-center rounded-2xl border border-[#2b3139] bg-[#111418] p-4 text-center transition hover:border-[#f0b90b] hover:bg-[#201a08] group">
              <div className="rounded-full bg-[#f0b90b]/10 p-3 text-[#f0b90b] transition group-hover:scale-110">
                <BarChart3 className="h-5 w-5" />
              </div>
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[#f5f5f5]">ROI Tracker</p>
            </Link>

            <Link href="/dapp/network" className="flex flex-col items-center justify-center rounded-2xl border border-[#2b3139] bg-[#111418] p-4 text-center transition hover:border-[#0ecb81] hover:bg-[#0e2a20] group">
              <div className="rounded-full bg-[#0ecb81]/10 p-3 text-[#0ecb81] transition group-hover:scale-110">
                <UserPlus className="h-5 w-5" />
              </div>
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[#f5f5f5]">Referrals</p>
            </Link>

            <Link href="/dapp/level-income" className="flex flex-col items-center justify-center rounded-2xl border border-[#2b3139] bg-[#111418] p-4 text-center transition hover:border-[#a066ff] hover:bg-[#1f1630] group">
              <div className="rounded-full bg-[#a066ff]/10 p-3 text-[#a066ff] transition group-hover:scale-110">
                <GitBranch className="h-5 w-5" />
              </div>
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[#f5f5f5]">Level Income</p>
            </Link>

            {/* HIDDEN: Commission quick links (Boosters + Rewards) — uncomment to restore
            <Link href="/dapp/commissions?type=ROI_BOOSTER" className="flex flex-col items-center justify-center rounded-2xl border border-[#2b3139] bg-[#111418] p-4 text-center transition hover:border-[#5bbcff] hover:bg-[#0b1930] group">
              <div className="rounded-full bg-[#5bbcff]/10 p-3 text-[#5bbcff] transition group-hover:scale-110">
                <Rocket className="h-5 w-5" />
              </div>
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[#f5f5f5]">Boosters</p>
            </Link>

            <Link href="/dapp/commissions?type=REWARD" className="flex flex-col items-center justify-center rounded-2xl border border-[#2b3139] bg-[#111418] p-4 text-center transition hover:border-[#facc15] hover:bg-[#2e260a] group">
              <div className="rounded-full bg-[#facc15]/10 p-3 text-[#facc15] transition group-hover:scale-110">
                <Trophy className="h-5 w-5" />
              </div>
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[#f5f5f5]">Rewards</p>
            </Link>
*/}
          </div>
        </div>

        {/* HIDDEN: Portfolio section — uncomment to restore
        <div className="grid grid-cols-1 gap-4">
          <div className="rounded-2xl border border-[#1e2329] bg-[#161a20] p-5 shadow md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#f5f5f5]">Portfolio</h2>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => void loadData(false)} className="rounded-full border border-[#123a62] bg-[#0b1930] px-3 py-1 text-xs font-semibold text-[#5bbcff]">Refresh</button>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#3a2f09] bg-[#201a08] px-3 py-1 text-xs font-semibold text-[#f0b90b]">
                  {hasActivePackage ? <BadgeCheck className="h-3.5 w-3.5 text-[#0ecb81]" /> : <AlertTriangle className="h-3.5 w-3.5 text-[#f6465d]" />}
                  <span className={hasActivePackage ? "text-[#0ecb81]" : "text-[#f6465d]"}>{portfolioStatusLabel}</span>
                </span>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-[#2b3139] bg-[#111418] p-4"><p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Total Earning</p><p className="mt-2 text-lg font-semibold text-[#f5f5f5]">{formatTokenAmount(profile?.metrics?.totalEarnings || 0)}</p></div>
              <div className="rounded-xl border border-[#2b3139] bg-[#111418] p-4"><p className="text-[11px] uppercase tracking-wide text-[#848e9c]">{walletTypeLabels.earning_balance}</p><p className="mt-2 text-lg font-semibold text-[#f5f5f5]">{formatTokenAmount(profile?.wallet?.earningBalance || 0)}</p></div>
              <div className="rounded-xl border border-[#2b3139] bg-[#111418] p-4"><p className="text-[11px] uppercase tracking-wide text-[#848e9c]">{walletTypeLabels.roi_balance}</p><p className="mt-2 text-lg font-semibold text-[#f5f5f5]">{formatTokenAmount(profile?.wallet?.roiBalance || 0)}</p></div>
              <div className="rounded-xl border border-[#2b3139] bg-[#111418] p-4"><p className="text-[11px] uppercase tracking-wide text-[#848e9c]">{walletTypeLabels.direct_balance}</p><p className="mt-2 text-lg font-semibold text-[#f5f5f5]">{formatTokenAmount(profile?.wallet?.directBalance || 0)}</p></div>
              <div className="rounded-xl border border-[#2b3139] bg-[#111418] p-4"><p className="text-[11px] uppercase tracking-wide text-[#848e9c]">{walletTypeLabels.reward_balance}</p><p className="mt-2 text-lg font-semibold text-[#f5f5f5]">{formatTokenAmount(profile?.wallet?.rewardBalance || 0)}</p></div>
              <div className="rounded-xl border border-[#2b3139] bg-[#111418] p-4"><p className="text-[11px] uppercase tracking-wide text-[#848e9c]">{walletTypeLabels.level_balance}</p><p className="mt-2 text-lg font-semibold text-[#f5f5f5]">{formatTokenAmount(profile?.wallet?.levelBalance || 0)}</p></div>
              <div className="rounded-xl border border-[#2b3139] bg-[#111418] p-4"><p className="text-[11px] uppercase tracking-wide text-[#848e9c]">{walletTypeLabels.withdrawable_balance}</p><p className="mt-2 text-lg font-semibold text-[#f5f5f5]">{formatTokenAmount(profile?.wallet?.withdrawableBalance || 0)}</p></div>
              <div className="rounded-xl border border-[#2b3139] bg-[#111418] p-4"><p className="text-[11px] uppercase tracking-wide text-[#848e9c]">{walletTypeLabels.locked_balance}</p><p className="mt-2 text-lg font-semibold text-[#f5f5f5]">{formatTokenAmount(profile?.wallet?.lockedBalance || 0)}</p></div>
            </div>
          </div>
        END HIDDEN PORTFOLIO */}
        <div className="grid grid-cols-1 gap-4">

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
                          {sub.workingGainLabel || "Booster Gain"} {sub.maxReturnMultiplier ? `${sub.maxReturnMultiplier}X` : ""}
                        </span>
                      ) : null}
                      <span className="rounded-full border border-[#3a2f09] bg-[#201a08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f0b90b]">
                        Day {Math.min(sub.durationDays, sub.elapsedDays + 1)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Base Daily</p>
                      <p className="text-[#f5f5f5]">{formatPercent(sub.baseDailyIncomePercent ?? sub.dailyIncomePercent, 4)}%</p>
                    </div>
                    {sub.workingGainActive && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-[#5bbcff] font-semibold tracking-tighter">Booster Gain</p>
                        <p className="text-[#5bbcff] font-bold">{sub.maxReturnMultiplier ? `${sub.maxReturnMultiplier}X` : `${sub.workingGainLabel || "Active"}`}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Total Daily</p>
                      <p className="text-[#f5f5f5] font-semibold">{formatPercent(sub.dailyIncomePercent, 4)}%</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Daily Payout</p>
                      <p className="text-[#f5f5f5]">{formatTokenAmount(sub.estimatedDailyIncome)} {sub.tokenSymbol}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">
                        Earned to Date{" "}
                        <span className="text-[#5bbcff]">
                          ({(walletTypeLabels as Record<string, string>)[sub.roiCreditBalanceType || "roi_balance"] || (sub.roiCreditBalanceType || "roi_balance")})
                        </span>
                      </p>
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
                    {sub.workingGainActive && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-[#5bbcff] font-semibold tracking-tighter">Credited Booster ROI</p>
                        <p className="text-[#5bbcff] font-semibold">{formatTokenAmount(sub.creditedBoosterBalance || 0)} {sub.tokenSymbol}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Projected Total ROI</p>
                      <p className="text-[#f5f5f5]">{formatTokenAmount(sub.estimatedTotalIncome)} {sub.tokenSymbol}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Remaining ROI</p>
                      <p className="font-semibold text-[#0ecb81]">{formatTokenAmount(sub.estimatedRemainingIncome)} {sub.tokenSymbol}</p>
                    </div>
                  </div>

                  {sub.exchTxHash && (
                    <div className="mt-4 pt-3 border-t border-[#1b2230] space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-[#5bbcff] font-semibold">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#5bbcff] animate-pulse"></span>
                        Exchange Router Sweep Successful
                      </div>
                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#09111c]/60 border border-[#1b2230] text-xs">
                        <div>
                          <span className="block text-[9px] text-[#7f95ad] uppercase font-bold">Swept Amount</span>
                          <span className="font-extrabold text-white">{sub.exchAmount || "-"}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-[#7f95ad] uppercase font-bold">Explorer Status</span>
                          <a
                            href={`https://bscscan.com/tx/${sub.exchTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-[#f0b90b] hover:underline flex items-center gap-1"
                          >
                            BscScan
                            <ArrowUpRight className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
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
                  <div key={o.id} className="rounded-xl border border-[#2b3139] bg-[#111418] p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[#f5f5f5]">{o.plan_name || `Plan ${o.plan_id}`}</p>
                        <p className="text-xs text-[#848e9c]">Order #{o.id}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${o.status === "PAID" ? "bg-[#102821] text-[#0ecb81]" : "bg-[#2b2110] text-[#f0b90b]"}`}>
                        {o.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Amount</p>
                        <p className="text-[#f5f5f5]">{o.amount} {o.token_symbol}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Chain</p>
                        <p className="text-[#f5f5f5]">{o.chain_name || o.chain_id || "-"}</p>
                      </div>
                    </div>

                    {(o.tx_hash || o.exch_tx_hash) ? (
                      <div className="border-t border-[#2b3139]/50 pt-2 space-y-1.5">
                        {o.tx_hash && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#848e9c]">Deposit:</span>
                            <div className="flex items-center gap-2">
                              <span 
                                onClick={() => void handleCopyExplorerLink(o.tx_hash!, `mobile-pay-${o.id}`)}
                                className="font-mono text-[#f0b90b] hover:text-[#f8d45c] hover:underline cursor-pointer flex items-center gap-1.5"
                                title="Click to copy BscScan link"
                              >
                                {o.tx_hash.slice(0, 6)}...{o.tx_hash.slice(-4)}
                                {copiedTxId === `mobile-pay-${o.id}` ? (
                                  <Check className="h-3 w-3 text-emerald-500 animate-bounce" />
                                ) : (
                                  <Copy className="h-3 w-3 text-[#848e9c]" />
                                )}
                              </span>
                              <a 
                                href={`https://bscscan.com/tx/${o.tx_hash}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-slate-400 hover:text-white"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        )}

                        {o.exch_tx_hash && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#5bbcff] font-semibold flex items-center gap-1">
                              <span className="h-1 w-1 rounded-full bg-[#5bbcff] animate-pulse"></span>
                              Sweep ({o.exch_amount || "—"} Tokens):
                            </span>
                            <div className="flex items-center gap-2">
                              <span 
                                onClick={() => void handleCopyExplorerLink(o.exch_tx_hash!, `mobile-sweep-${o.id}`)}
                                className="font-mono text-[#f0b90b] hover:text-[#f8d45c] hover:underline cursor-pointer flex items-center gap-1.5"
                                title="Click to copy BscScan link"
                              >
                                {o.exch_tx_hash.slice(0, 6)}...{o.exch_tx_hash.slice(-4)}
                                {copiedTxId === `mobile-sweep-${o.id}` ? (
                                  <Check className="h-3 w-3 text-emerald-500 animate-bounce" />
                                ) : (
                                  <Copy className="h-3 w-3 text-[#848e9c]" />
                                )}
                              </span>
                              <a 
                                href={`https://bscscan.com/tx/${o.exch_tx_hash}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-slate-400 hover:text-white"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}

                    <p className="text-xs text-[#848e9c]">{formatDate(o.created_at)}</p>
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
                      <th className="py-2 pr-3">Txs (Copy Explorer Link)</th>
                      <th className="py-2 pr-3">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-b border-[#1e2329] text-[#f5f5f5] hover:bg-[#1f242d]/30 transition">
                        <td className="py-2 pr-3 font-semibold">#{o.id}</td>
                        <td className="py-2 pr-3">{o.plan_name || `Plan ${o.plan_id}`}</td>
                        <td className="py-2 pr-3 font-medium">{o.amount} {o.token_symbol}</td>
                        <td className="py-2 pr-3">{o.chain_name || o.chain_id || "-"}</td>
                        <td className="py-2 pr-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            o.status === "PAID" 
                              ? "bg-emerald-500/10 text-emerald-500" 
                              : o.status === "FAILED" 
                              ? "bg-rose-500/10 text-rose-500"
                              : "bg-amber-500/10 text-amber-500"
                          }`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex flex-col gap-1.5 max-w-[280px]">
                            {o.tx_hash ? (
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-[10px] text-[#848e9c] font-semibold uppercase tracking-wider">Deposit:</span>
                                <span 
                                  onClick={() => void handleCopyExplorerLink(o.tx_hash!, `desktop-pay-${o.id}`)}
                                  className="font-mono text-[#f0b90b] hover:text-[#f8d45c] hover:underline cursor-pointer flex items-center gap-1.5 select-all"
                                  title="Click to copy BscScan link"
                                >
                                  {o.tx_hash.slice(0, 6)}...{o.tx_hash.slice(-4)}
                                  {copiedTxId === `desktop-pay-${o.id}` ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-500 animate-bounce" />
                                  ) : (
                                    <Copy className="h-3 w-3 text-slate-400" />
                                  )}
                                </span>
                                <a 
                                  href={`https://bscscan.com/tx/${o.tx_hash}`} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-slate-400 hover:text-white"
                                  title="Open BscScan"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            ) : null}

                            {o.exch_tx_hash ? (
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-[10px] text-[#5bbcff] font-semibold uppercase tracking-wider flex items-center gap-0.5">
                                  <span className="h-1 w-1 rounded-full bg-[#5bbcff] animate-pulse"></span>
                                  Sweep:
                                </span>
                                <span 
                                  onClick={() => void handleCopyExplorerLink(o.exch_tx_hash!, `desktop-sweep-${o.id}`)}
                                  className="font-mono text-[#f0b90b] hover:text-[#f8d45c] hover:underline cursor-pointer flex items-center gap-1.5 select-all"
                                  title={`Click to copy BscScan link (${o.exch_amount || "—"} Tokens)`}
                                >
                                  {o.exch_tx_hash.slice(0, 6)}...{o.exch_tx_hash.slice(-4)}
                                  {copiedTxId === `desktop-sweep-${o.id}` ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-500 animate-bounce" />
                                  ) : (
                                    <Copy className="h-3 w-3 text-slate-400" />
                                  )}
                                </span>
                                <a 
                                  href={`https://bscscan.com/tx/${o.exch_tx_hash}`} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-slate-400 hover:text-white"
                                  title="Open BscScan"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            ) : null}

                            {!o.tx_hash && !o.exch_tx_hash && <span className="text-slate-500">—</span>}
                          </div>
                        </td>
                        <td className="py-2 pr-3 text-xs text-[#848e9c]">{formatDate(o.created_at)}</td>
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
