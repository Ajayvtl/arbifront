"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, QrCode, Send, ShieldCheck, UserCircle2, Wallet, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { DAPP_CHAIN } from "@/lib/dappConfig";
import { formatPercent, formatTokenAmount } from "@/lib/numberFormat";
import DappWalletChip from "@/components/dapp/DappWalletChip";
import { getWalletTypeLabels } from "@/lib/walletTypeLabels";

type UserProfile = {
  actorType: "USER";
  id: number;
  companyId: number;
  role: "USER";
  walletAddress: string;
  referralCode: string | null;
  sponsorId: number | null;
  status: string;
  isBlocked: boolean;
  createdAt: string;
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
    levelBalance: number;
    withdrawableBalance: number;
    rewardBalance: number;
    lockedBalance: number;
  };
  metrics?: {
    directReferrals: number;
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
    durationDays: number;
    elapsedDays: number;
    elapsedSeconds?: number;
    remainingDays: number;
    remainingSeconds?: number;
    estimatedDailyIncome: number;
    estimatedIncomeToDate: number;
    estimatedTotalIncome: number;
  }>;
};

function formatDate(value?: string) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatNum(value: number | undefined) {
  return formatTokenAmount(value);
}

export default function DappProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const usdtBnb = useMemo(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("walletUsdtBnb");
  }, []);

  const referralLink = useMemo(() => {
    if (!profile?.referralCode || typeof window === "undefined") return "";
    return `${window.location.origin}/dapp/login?ref=${encodeURIComponent(profile.referralCode)}`;
  }, [profile?.referralCode]);

  const referralMessage = useMemo(() => {
    if (!referralLink || !profile?.referralCode) return "";
    return `Join with my referral code ${profile.referralCode}: ${referralLink}`;
  }, [profile?.referralCode, referralLink]);

  const qrCodeUrl = useMemo(() => {
    if (!referralLink) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(referralLink)}`;
  }, [referralLink]);
  const walletTypeLabels = useMemo(
    () => getWalletTypeLabels(profile?.mlmSettings?.wallet_type_labels || null),
    [profile?.mlmSettings?.wallet_type_labels]
  );

  useEffect(() => {
    if (!user) {
      router.replace("/dapp/login?next=%2Fdapp%2Fprofile");
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
        const data = (response.data?.data || null) as UserProfile | null;
        if (!cancelled) setProfile(data);
      } catch (error: unknown) {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to load profile";
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

  const shareViaNavigator = async () => {
    if (!referralLink || !referralMessage || typeof navigator === "undefined" || !navigator.share) {
      return false;
    }

    try {
      await navigator.share({
        title: "Join my referral link",
        text: referralMessage,
        url: referralLink,
      });
      return true;
    } catch {
      return false;
    }
  };

  const openShareTarget = async (platform: "whatsapp" | "telegram" | "facebook" | "x" | "email") => {
    if (!referralLink || !referralMessage) return;

    if (await shareViaNavigator()) {
      return;
    }

    const encodedLink = encodeURIComponent(referralLink);
    const encodedMessage = encodeURIComponent(referralMessage);

    const targets: Record<typeof platform, string> = {
      whatsapp: `https://wa.me/?text=${encodedMessage}`,
      telegram: `https://t.me/share/url?url=${encodedLink}&text=${encodedMessage}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`,
      x: `https://twitter.com/intent/tweet?text=${encodedMessage}`,
      email: `mailto:?subject=${encodeURIComponent("Join my referral link")}&body=${encodedMessage}`,
    };

    window.open(targets[platform], "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0e11]">
        <div className="inline-flex items-center gap-2 text-[#b7bdc6]">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading profile...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0b0e11] p-4 md:p-8">
        <div className="w-full rounded-2xl border border-[#1e2329] bg-[#161a20] p-6">
          <p className="text-sm text-[#b7bdc6]">Profile not available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0e11] p-4 md:p-8">
      <div className="w-full space-y-5">
        <div className="rounded-2xl border border-[#2b3139] bg-gradient-to-r from-[#161a20] via-[#1d232a] to-[#242b33] p-6 text-white">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#f0b90b]">Member Profile</p>
              <h1 className="mt-2 text-2xl font-bold inline-flex items-center gap-2">
                <UserCircle2 className="w-6 h-6" />
                Wallet Account
              </h1>
              <div className="mt-3">
                <DappWalletChip
                  address={profile.walletAddress}
                  compact
                  className="border-white/20 bg-white/10 text-white hover:border-white/30 hover:bg-white/15"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-[#3a2f09] bg-[#201a08] px-4 py-2 text-sm font-medium text-[#f0b90b] hover:bg-[#2b2110]"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-[#1e2329] bg-[#161a20] p-4">
            <p className="text-xs text-[#848e9c]">{walletTypeLabels.main_balance}</p>
            <p className="text-xl font-semibold text-[#f5f5f5]">{formatNum(profile.wallet?.mainBalance)}</p>
          </div>
          <div className="rounded-xl border border-[#1e2329] bg-[#161a20] p-4">
            <p className="text-xs text-[#848e9c]">{walletTypeLabels.earning_balance}</p>
            <p className="text-xl font-semibold text-[#f5f5f5]">{formatNum(profile.wallet?.earningBalance)}</p>
          </div>
          <div className="rounded-xl border border-[#1e2329] bg-[#161a20] p-4">
            <p className="text-xs text-[#848e9c]">{walletTypeLabels.roi_balance}</p>
            <p className="text-xl font-semibold text-[#f5f5f5]">{formatNum(profile.wallet?.roiBalance)}</p>
            <p className="mt-1 text-[11px] text-[#848e9c]">
              {profile?.mlmSettings?.roi_credit_enabled
                ? `Posted on schedule at ${profile?.mlmSettings?.roi_credit_time_utc || "00:00"} UTC`
                : `${walletTypeLabels.roi_balance} credit is currently disabled`}
            </p>
          </div>
          <div className="rounded-xl border border-[#1e2329] bg-[#161a20] p-4">
            <p className="text-xs text-[#848e9c]">{walletTypeLabels.direct_balance}</p>
            <p className="text-xl font-semibold text-[#f5f5f5]">{formatNum(profile.wallet?.directBalance)}</p>
          </div>
          <div className="rounded-xl border border-[#1e2329] bg-[#161a20] p-4">
            <p className="text-xs text-[#848e9c]">{walletTypeLabels.level_balance}</p>
            <p className="text-xl font-semibold text-[#f5f5f5]">{formatNum(profile.wallet?.levelBalance)}</p>
          </div>
          <div className="rounded-xl border border-[#1e2329] bg-[#161a20] p-4">
            <p className="text-xs text-[#848e9c]">{walletTypeLabels.withdrawable_balance}</p>
            <p className="text-xl font-semibold text-[#f5f5f5]">{formatNum(profile.wallet?.withdrawableBalance)}</p>
          </div>
          <div className="rounded-xl border border-[#1e2329] bg-[#161a20] p-4">
            <p className="text-xs text-[#848e9c]">{walletTypeLabels.reward_balance}</p>
            <p className="text-xl font-semibold text-[#f5f5f5]">{formatNum(profile.wallet?.rewardBalance)}</p>
          </div>
          <div className="rounded-xl border border-[#1e2329] bg-[#161a20] p-4">
            <p className="text-xs text-[#848e9c]">{DAPP_CHAIN.usdtSymbol} ({DAPP_CHAIN.nativeSymbol})</p>
            <p className="text-xl font-semibold text-[#f5f5f5]">{usdtBnb ? formatTokenAmount(Number(usdtBnb)) : "-"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[#1e2329] bg-[#161a20] p-5 space-y-3">
            <h2 className="text-lg font-semibold inline-flex items-center gap-2 text-[#f5f5f5]">
              <ShieldCheck className="w-5 h-5 text-[#f0b90b]" />
              Account Summary
            </h2>
            <div className="text-sm space-y-2 text-[#eaecef]">
              <p><span className="text-[#848e9c]">User ID:</span> #{profile.id}</p>
              <p><span className="text-[#848e9c]">Company ID:</span> #{profile.companyId}</p>
              <p><span className="text-[#848e9c]">Status:</span> {String(profile.status || "").toUpperCase()}</p>
              <p><span className="text-[#848e9c]">Blocked:</span> {profile.isBlocked ? "Yes" : "No"}</p>
              {/* <p><span className="text-[#848e9c]">Sponsor ID:</span> {profile.sponsorId || "-"}</p> */}
              <p><span className="text-[#848e9c]">Sponsors:</span> {profile.metrics?.directReferrals ?? 0}</p>
              <p><span className="text-[#848e9c]">Joined:</span> {formatDate(profile.createdAt)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#1e2329] bg-[#161a20] p-5 space-y-3">
            <h2 className="text-lg font-semibold inline-flex items-center gap-2 text-[#f5f5f5]">
              <Wallet className="w-5 h-5 text-[#f0b90b]" />
              Referral Identity
            </h2>
            <div className="space-y-4 text-sm">
              <div className="rounded-xl border border-[#2b3139] bg-[#111418] p-4">
                <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Referral Code</p>
                <p className="mt-2 text-base font-semibold text-[#f5f5f5] break-all">
                  {profile.referralCode || "-"}
                </p>
                <button
                  type="button"
                  onClick={copyReferralCode}
                  disabled={!profile.referralCode}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#2b3139] bg-[#161a20] px-3 py-2 text-xs font-medium text-[#f5f5f5] disabled:opacity-50"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy code
                </button>
              </div>

              <div className="rounded-xl border border-[#2b3139] bg-[#111418] p-4">
                <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Referral Link</p>
                <p className="mt-2 text-sm font-medium text-[#f5f5f5] break-all">
                  {referralLink || "-"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={copyReferralLink}
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

              <div className="rounded-xl border border-[#2b3139] bg-[#111418] p-4">
                <p className="text-[11px] uppercase tracking-wide text-[#848e9c]">Share</p>
                <p className="mt-2 text-sm text-[#b7bdc6]">
                  Share through installed apps where supported, or fall back to direct social links.
                </p>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { key: "whatsapp", label: "WhatsApp" },
                    { key: "telegram", label: "Telegram" },
                    { key: "facebook", label: "Facebook" },
                    { key: "x", label: "X / Twitter" },
                    { key: "email", label: "Email" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => void openShareTarget(item.key as "whatsapp" | "telegram" | "facebook" | "x" | "email")}
                      disabled={!referralLink}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#2b3139] bg-[#161a20] px-3 py-2 text-xs font-medium text-[#f5f5f5] disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#1e2329] bg-[#161a20] p-5 space-y-3">
          <h2 className="text-lg font-semibold text-[#f5f5f5]">Package ROI Progress</h2>
          {profile.activeSubscriptions && profile.activeSubscriptions.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {profile.activeSubscriptions.map((sub) => (
                <div key={sub.id} className="rounded-xl border border-[#2b3139] bg-[#111418] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#f5f5f5]">{sub.planName}</p>
                      <p className="text-xs text-[#848e9c]">{formatTokenAmount(sub.amount)} {sub.tokenSymbol}</p>
                    </div>
                    <span className="rounded-full border border-[#3a2f09] bg-[#201a08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f0b90b]">
                      Day {Math.min(sub.durationDays, sub.elapsedDays + 1)} / {sub.durationDays}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-[#eaecef]">
                    <p><span className="text-[#848e9c]">ROI:</span> {formatPercent(sub.roiPercent, 2)}%</p>
                    <p><span className="text-[#848e9c]">Daily ROI:</span> {formatPercent(sub.dailyIncomePercent, 4)}%</p>
                    <p><span className="text-[#848e9c]">Per Day Income:</span> {formatTokenAmount(sub.estimatedDailyIncome)} {sub.tokenSymbol}</p>
                    <p><span className="text-[#848e9c]">Earned To Date:</span> {formatTokenAmount(sub.estimatedIncomeToDate)} {sub.tokenSymbol}</p>
                    <p><span className="text-[#848e9c]">Started:</span> {formatDate(sub.startedAt)}</p>
                    <p><span className="text-[#848e9c]">Expires:</span> {formatDate(sub.expiresAt || undefined)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#b7bdc6]">No active package income schedule available yet.</p>
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
              <p className="mt-4 break-all text-xs text-[#848e9c]">{referralLink}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
