"use client";

import { useCallback, useEffect, useState, FormEvent, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  Loader2, 
  Wallet, 
  ArrowRight, 
  ShieldCheck, 
  Info, 
  History, 
  CheckCircle2, 
  Clock, 
  XCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Rocket
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { formatTokenAmount } from "@/lib/numberFormat";

type WithdrawalSettings = {
  min_withdrawal: number;
  withdrawal_fee_percent: number;
  max_withdrawal_per_day: number;
  withdrawal_limit_per_user: number;
  is_withdrawal_enabled: number;
  processing_time: string;
};

type WithdrawalRecord = {
  id: number;
  amount: number;
  charge: number;
  net_amount: number;
  wallet_address: string;
  status: "PENDING" | "APPROVED" | "FAILED" | "REJECTED";
  remark: string | null;
  processed_at: string | null;
  created_at: string;
};

export default function DappWithdrawPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState("");
  const [settings, setSettings] = useState<WithdrawalSettings | null>(null);
  const [history, setHistory] = useState<WithdrawalRecord[]>([]);
  const [profile, setProfile] = useState<any>(null);

  const walletAddress = useMemo(() => {
    return (user as { walletAddress?: string; wallet_address?: string } | null)?.walletAddress ||
    (user as { walletAddress?: string; wallet_address?: string } | null)?.wallet_address ||
    "";
  }, [user]);
    
  // Same logic as the dashboard WITHDRAWABLE card:
  // getCardData checks dashboardConfig for a Flow override, else uses raw wallet value; clamp < 0 to 0.
  const config = profile?.dashboardConfig?.WITHDRAWABLE;
  const rawValue = profile?.wallet?.withdrawableBalance ?? 0;
  const resolvedValue = (config?.overrideValue !== undefined && config?.overrideValue !== "")
    ? config.overrideValue
    : rawValue;
  const numericValue = Number(resolvedValue);
  const withdrawableBalance = (!isNaN(numericValue) && numericValue < 0) ? 0 : numericValue;

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Run each request independently so a failure in one doesn't block the others
      const [settingsRes, profileRes] = await Promise.all([
        api.get("/settings/public"),
        api.get("/user/profile/summary"),
      ]);

      if (settingsRes.data?.data?.withdrawal_settings) {
        setSettings(settingsRes.data.data.withdrawal_settings);
      }
      if (profileRes.data?.data) {
        setProfile(profileRes.data.data);
      }
    } catch (e) {
      console.error("Failed to load withdrawal data", e);
    } finally {
      setLoading(false);
    }

    // Withdrawal history is non-critical — load separately so its failure doesn't affect balance display
    try {
      const historyRes = await api.get(`/wallets/${user.id}/withdrawals`);
      if (historyRes.data?.data) {
        setHistory(historyRes.data.data);
      }
    } catch (e) {
      console.error("Failed to load withdrawal history", e);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleWithdraw = async (e: FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    
    if (!numAmount || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    if (numAmount > withdrawableBalance) {
      toast.error("Insufficient withdrawable balance");
      return;
    }
    
    if (settings && numAmount < settings.min_withdrawal) {
      toast.error(`Minimum withdrawal is ${settings.min_withdrawal} USDT`);
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/wallets/withdraw", {
        amount: numAmount,
        walletAddress: walletAddress
      });
      toast.success("Withdrawal requested successfully");
      setAmount("");
      void loadData();
      // Optionally reload to update global context balances
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to process withdrawal";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const calculateFee = () => {
    const numAmount = Number(amount);
    if (!numAmount || !settings) return 0;
    return (numAmount * settings.withdrawal_fee_percent) / 100;
  };

  const calculateNet = () => {
    const numAmount = Number(amount);
    if (!numAmount) return 0;
    return numAmount - calculateFee();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="flex items-center gap-1 rounded-full bg-[#0ecb81]/10 px-2 py-0.5 text-xs font-medium text-[#0ecb81]">
            <CheckCircle2 className="h-3 w-3" /> Completed
          </span>
        );
      case "PENDING":
        return (
          <span className="flex items-center gap-1 rounded-full bg-[#f0b90b]/10 px-2 py-0.5 text-xs font-medium text-[#f0b90b]">
            <Clock className="h-3 w-3" /> Pending
          </span>
        );
      case "FAILED":
      case "REJECTED":
        return (
          <span className="flex items-center gap-1 rounded-full bg-[#f6465d]/10 px-2 py-0.5 text-xs font-medium text-[#f6465d]">
            <XCircle className="h-3 w-3" /> Failed
          </span>
        );
      default:
        return <span className="text-xs text-[#848e9c]">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#f0b90b]" />
        <p className="text-sm text-[#848e9c] animate-pulse">Syncing secure vault...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      {/* Header Section */}
      <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#f5f5f5] md:text-3xl">Secure Withdrawal</h1>
          <p className="text-sm text-[#848e9c]">Move your earnings to your personal Web3 wallet.</p>
        </div>
        <div className="hidden items-center gap-3 rounded-2xl border border-[#2b3139] bg-[#181a20]/50 px-4 py-2 md:flex">
          <ShieldCheck className="h-5 w-5 text-[#0ecb81]" />
          <span className="text-xs font-medium text-[#b7bdc6]">Audit Protected</span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column: Form and Balance */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-8">
          {/* Main Card */}
          <div className="overflow-hidden rounded-3xl border border-[#2b3139] bg-[#0b0e11] shadow-2xl transition-all hover:border-[#3a414b]">
            {/* Balance Header */}
            <div className="relative border-b border-[#2b3139] bg-gradient-to-br from-[#1e2329] to-[#0b0e11] p-6 md:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-[#0ecb81]" />
                    <p className="text-xs font-bold uppercase tracking-wider text-[#848e9c]">Available to Withdraw</p>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-4xl font-extrabold text-[#f0b90b] md:text-5xl">
                      {withdrawableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h2>
                    <span className="text-xl font-medium text-[#f5f5f5]">USDT</span>
                  </div>
                  <p className="mt-1 text-[10px] text-[#848e9c]">Live Wallet Balance</p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0b90b]/10 backdrop-blur-sm">
                  <Wallet className="h-7 w-7 text-[#f0b90b]" />
                </div>
              </div>
              
              {/* Animated Background Element */}
              <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-[#f0b90b]/5 blur-3xl" />
            </div>

            {/* Withdrawal Form */}
            <div className="p-6 md:p-8">
              <form onSubmit={handleWithdraw} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-[#b7bdc6]">Withdrawal Amount</label>
                    <span className="text-xs text-[#848e9c]">Max: {withdrawableBalance.toFixed(2)} USDT</span>
                  </div>
                  <div className="group relative">
                    <input
                      type="number"
                      step="0.01"
                      min={settings?.min_withdrawal || 0.01}
                      max={withdrawableBalance}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={`Minimum ${settings?.min_withdrawal || 10} USDT`}
                      className="w-full rounded-2xl border border-[#2b3139] bg-[#181a20] px-5 py-4 pr-24 text-lg font-medium text-[#f5f5f5] outline-none transition-all placeholder:text-[#474d57] focus:border-[#f0b90b] focus:ring-1 focus:ring-[#f0b90b]/20 group-hover:border-[#474d57]"
                      required
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setAmount(String(withdrawableBalance))}
                        className="rounded-lg bg-[#f0b90b]/10 px-2.5 py-1 text-xs font-bold text-[#f0b90b] transition hover:bg-[#f0b90b]/20 active:scale-95"
                      >
                        MAX
                      </button>
                      <div className="h-6 w-px bg-[#2b3139]" />
                      <span className="text-sm font-bold text-[#848e9c]">USDT</span>
                    </div>
                  </div>
                </div>

                {/* Summary Box */}
                <div className="rounded-2xl bg-[#1e2329]/30 p-5 space-y-4 border border-[#2b3139]/50">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#848e9c] flex items-center gap-2">
                      <Info className="h-3.5 w-3.5" />
                      Platform Fee ({settings?.withdrawal_fee_percent || 0}%)
                    </span>
                    <span className="text-[#f5f5f5] font-semibold">-{calculateFee().toFixed(2)} USDT</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#848e9c]">Network Destination</span>
                    <span className="text-[#f5f5f5] font-mono font-medium tracking-tight" title={walletAddress}>
                      {walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}` : "Not Connected"}
                    </span>
                  </div>
                  <div className="pt-4 border-t border-[#2b3139] flex justify-between items-end">
                    <div>
                      <p className="text-xs font-bold uppercase text-[#848e9c] mb-1">Final Disbursement</p>
                      <p className="text-2xl font-black text-[#5bbcff]">
                        {calculateNet().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="ml-1.5 text-sm font-medium">USDT</span>
                      </p>
                    </div>
                    <ArrowRight className="h-6 w-6 text-[#5bbcff] opacity-50 mb-1" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !amount || Number(amount) < (settings?.min_withdrawal || 0) || Number(amount) > withdrawableBalance}
                  className="relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-[#f0b90b] py-4 font-bold text-[#181a20] transition-all hover:bg-[#f8d45c] hover:shadow-[0_8px_25px_rgba(240,185,11,0.3)] active:scale-[0.98] disabled:opacity-40 disabled:hover:shadow-none disabled:active:scale-100"
                >
                  {submitting ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      Execute Withdrawal
                      <ChevronRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* History Section */}
          <div className="rounded-3xl border border-[#2b3139] bg-[#0b0e11] p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1e2329]">
                  <History className="h-5 w-5 text-[#b7bdc6]" />
                </div>
                <h3 className="text-lg font-bold text-[#f5f5f5]">Recent Requests</h3>
              </div>
              <span className="text-xs font-medium text-[#848e9c]">{history.length} Transactions</span>
            </div>

            {history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#2b3139] text-xs font-bold uppercase tracking-wider text-[#474d57]">
                      <th className="pb-4 pl-2">Time</th>
                      <th className="pb-4">Net Amount</th>
                      <th className="pb-4">Status</th>
                      <th className="pb-4 pr-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2329]">
                    {history.map((tx) => (
                      <tr key={tx.id} className="group transition hover:bg-[#181a20]/30">
                        <td className="py-4 pl-2">
                          <p className="text-sm font-medium text-[#f5f5f5]">
                            {new Date(tx.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </p>
                          <p className="text-[10px] text-[#474d57]">
                            {new Date(tx.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>
                        <td className="py-4">
                          <p className="text-sm font-bold text-[#f5f5f5]">{Number(tx.net_amount).toFixed(2)} USDT</p>
                          <p className="text-[10px] text-[#474d57]">Fee: {Number(tx.charge).toFixed(2)}</p>
                        </td>
                        <td className="py-4">
                          {getStatusBadge(tx.status)}
                        </td>
                        <td className="py-4 pr-2 text-right">
                          <button className="rounded-lg p-2 text-[#474d57] transition hover:bg-[#2b3139] hover:text-[#f5f5f5]">
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 rounded-full bg-[#181a20] p-4 text-[#2b3139]">
                  <AlertCircle className="h-8 w-8" />
                </div>
                <p className="text-sm font-medium text-[#474d57]">No withdrawal records found yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Rules and Info */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* Rules Card */}
          <div className="rounded-3xl border border-[#2b3139] bg-[#0b0e11] p-6 shadow-sm md:p-8">
            <h3 className="flex items-center gap-3 text-lg font-bold text-[#f5f5f5] mb-6">
              <ShieldCheck className="h-5 w-5 text-[#5bbcff]" />
              Policy & Protocol
            </h3>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f0b90b]/10 text-xs font-bold text-[#f0b90b]">
                  01
                </div>
                <div>
                  <p className="text-sm font-bold text-[#f5f5f5]">Minimum Threshold</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#848e9c]">
                    Withdrawals require a minimum of <span className="text-[#f0b90b] font-semibold">{settings?.min_withdrawal || 10} USDT</span> to ensure network efficiency.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#5bbcff]/10 text-xs font-bold text-[#5bbcff]">
                  02
                </div>
                <div>
                  <p className="text-sm font-bold text-[#f5f5f5]">Processing Window</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#848e9c]">
                    Current protocol is set to <span className="text-[#5bbcff] font-semibold">{settings?.processing_time === 'INSTANT' ? 'Instant' : 'Manual (within 24h)'}</span>. Security audits are performed on all high-value requests.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0ecb81]/10 text-xs font-bold text-[#0ecb81]">
                  03
                </div>
                <div>
                  <p className="text-sm font-bold text-[#f5f5f5]">Target Wallet</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#848e9c]">
                    Funds are exclusively disbursed to the authenticated wallet ending in <span className="text-[#f5f5f5] font-mono">{walletAddress.slice(-6)}</span>.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl bg-[#f6465d]/5 p-4 border border-[#f6465d]/10">
              <div className="flex gap-3 text-[#f6465d]">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="text-xs leading-relaxed font-medium">
                  Ensure your wallet is active and compatible with the BEP-20 network. Incorrect network selection may lead to permanent loss of funds.
                </p>
              </div>
            </div>
          </div>

          {/* Help Card */}
          <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#123a62] to-[#0b0e11] p-6 text-white md:p-8">
            <h4 className="relative z-10 text-lg font-black tracking-tight mb-2">Need Assistance?</h4>
            <p className="relative z-10 text-xs text-[#8aa4bf] leading-relaxed mb-6">
              Our specialized support team is available 24/7 to help you with your withdrawal and financial inquiries.
            </p>
            <button className="relative z-10 flex items-center gap-2 text-sm font-bold text-[#5bbcff] transition-all group-hover:gap-3">
              Open Support Ticket <ArrowRight className="h-4 w-4" />
            </button>
            <div className="absolute -bottom-6 -right-6 opacity-10 transition-all group-hover:scale-110">
              <Rocket className="h-32 w-32" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
