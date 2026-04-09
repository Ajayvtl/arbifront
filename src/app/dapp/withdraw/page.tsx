"use client";

import { useCallback, useEffect, useState, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Wallet, ArrowRight, ShieldCheck, Info } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

type WithdrawalSettings = {
  min_withdrawal: number;
  withdrawal_fee_percent: number;
  max_withdrawal_per_day: number;
  withdrawal_limit_per_user: number;
  is_withdrawal_enabled: number;
  processing_time: string;
};

export default function DappWithdrawPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState("");
  const [settings, setSettings] = useState<WithdrawalSettings | null>(null);

  const walletAddress =
    (user as { walletAddress?: string; wallet_address?: string } | null)?.walletAddress ||
    (user as { walletAddress?: string; wallet_address?: string } | null)?.wallet_address ||
    "";
    
  const withdrawableBalance = Number(
    (user as any)?.wallet?.withdrawableBalance || 
    (user as any)?.wallet?.withdrawable_balance || 
    0
  );

  const loadSettings = useCallback(async () => {
    try {
      const res = await api.get("/settings/public"); 
      if (res.data?.data?.withdrawal_settings) {
        setSettings(res.data.data.withdrawal_settings);
      } else {
        setSettings({
          min_withdrawal: 10,
          withdrawal_fee_percent: 5,
          max_withdrawal_per_day: 1000,
          withdrawal_limit_per_user: 1,
          is_withdrawal_enabled: 1,
          processing_time: "MANUAL"
        });
      }
    } catch (e) {
      setSettings({
        min_withdrawal: 10,
        withdrawal_fee_percent: 5,
        max_withdrawal_per_day: 1000,
        withdrawal_limit_per_user: 1,
        is_withdrawal_enabled: 1,
        processing_time: "MANUAL"
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

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
      toast.error(`Minimum withdrawal is ${settings.min_withdrawal}`);
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/wallet/withdraw", {
        amount: numAmount,
        walletAddress: walletAddress
      });
      toast.success("Withdrawal requested successfully");
      setAmount("");
      // Need to refresh user context to update balance
      window.location.reload();
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#f0b90b]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 md:px-8 xl:max-w-4xl xl:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f5f5f5]">Withdraw Funds</h1>
        <p className="mt-1 text-sm text-[#848e9c]">Request a withdrawal to your connected wallet.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-3">
          <div className="rounded-2xl border border-[#2b3139] bg-[#0b0e11] p-5 md:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm font-medium text-[#848e9c]">Available to Withdraw</p>
                <p className="mt-1 text-3xl font-bold text-[#f0b90b]">
                  {withdrawableBalance.toFixed(2)} <span className="text-lg font-medium text-[#f5f5f5]">USDT</span>
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-[#20252b] flex items-center justify-center">
                <Wallet className="h-6 w-6 text-[#5bbcff]" />
              </div>
            </div>

            <form onSubmit={handleWithdraw} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#b7bdc6] mb-1.5">Amount to Withdraw</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min={settings?.min_withdrawal || 0.01}
                    max={withdrawableBalance}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`Min. ${settings?.min_withdrawal || 10}`}
                    className="w-full rounded-xl border border-[#2b3139] bg-[#181a20] px-4 py-3.5 pr-20 text-[#f5f5f5] outline-none transition focus:border-[#f0b90b]"
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAmount(String(withdrawableBalance))}
                      className="text-xs font-semibold text-[#f0b90b] hover:text-[#f8d45c]"
                    >
                      MAX
                    </button>
                    <span className="text-sm font-medium text-[#848e9c]">USDT</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-[#181a20] p-4 space-y-3 border border-[#2b3139]">
                <div className="flex justify-between text-sm">
                  <span className="text-[#848e9c]">Withdrawal Fee ({settings?.withdrawal_fee_percent || 0}%)</span>
                  <span className="text-[#f5f5f5] font-medium">{calculateFee().toFixed(2)} USDT</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#848e9c]">Receiving Address</span>
                  <span className="text-[#f5f5f5] font-medium truncate max-w-[150px] md:max-w-[200px]" title={walletAddress}>
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                </div>
                <div className="pt-3 border-t border-[#2b3139] flex justify-between">
                  <span className="font-medium text-[#f5f5f5]">You Will Receive</span>
                  <span className="font-bold text-[#5bbcff]">{calculateNet().toFixed(2)} USDT</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || Number(amount) <= 0 || Number(amount) > withdrawableBalance}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f0b90b] py-3.5 font-semibold text-[#181a20] shadow-[0_4px_14px_rgba(240,185,11,0.2)] transition hover:bg-[#f8d45c] disabled:opacity-50 disabled:shadow-none"
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Confirm Withdrawal <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="xl:col-span-2 space-y-4">
          <div className="rounded-2xl border border-[#2b3139] bg-[#0b0e11] p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-[#f5f5f5] flex items-center gap-2 mb-4">
              <ShieldCheck className="h-4 w-4 text-[#5bbcff]" />
              Withdrawal Rules
            </h3>
            <ul className="space-y-3 text-sm text-[#b7bdc6]">
              <li className="flex items-start gap-2">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-[#f0b90b] shrink-0" />
                <p>Minimum withdrawal amount is <span className="font-medium text-[#f5f5f5]">{settings?.min_withdrawal || 10} USDT</span>.</p>
              </li>
              <li className="flex items-start gap-2">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-[#f0b90b] shrink-0" />
                <p>A standard network/processing fee of <span className="font-medium text-[#f5f5f5]">{settings?.withdrawal_fee_percent || 5}%</span> applies to all withdrawals.</p>
              </li>
              <li className="flex items-start gap-2">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-[#f0b90b] shrink-0" />
                <p>Processing time is typically <span className="font-medium text-[#f5f5f5]">{settings?.processing_time === 'INSTANT' ? 'Instant' : settings?.processing_time === 'MANUAL' ? 'within 24 hours' : 'T+1 Days'}</span>.</p>
              </li>
              <li className="flex items-start gap-2">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-[#f0b90b] shrink-0" />
                <p>Funds will be sent directly to your connected Web3 wallet address.</p>
              </li>
            </ul>
          </div>
          
          <div className="rounded-2xl bg-[#0f1722] border border-[#123a62] p-4 flex gap-3">
            <Info className="h-5 w-5 text-[#5bbcff] shrink-0 mt-0.5" />
            <p className="text-xs text-[#8aa4bf] leading-relaxed">
              For security reasons, withdrawals can only be processed to the wallet address originally used to register and authenticate this account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
