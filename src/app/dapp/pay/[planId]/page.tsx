"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, CreditCard, Loader2, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { BrowserProvider, Contract, parseEther, parseUnits, TransactionResponse } from "ethers";
import { getInjectedProvider } from "@/lib/injectedWallet";
import { formatPercent, formatTokenAmount } from "@/lib/numberFormat";
import DappWalletChip from "@/components/dapp/DappWalletChip";
import BrandLogo from "@/components/dapp/BrandLogo";

interface PlanItem {
  id: number;
  name: string;
  min_amount: number;
  max_amount: number;
  roi_percent: number;
  daily_income_percent?: number;
  duration_days: number;
  payment_currency?: "AUTO" | "BNB" | "USDT";
}

interface PaymentChannel {
  environment: "production" | "developer";
  chainId: number | null;
  chainName: string;
  rpcUrl: string;
  receiverAddress: string;
  paymentAssetType: "native" | "erc20";
  tokenSymbol: string;
  tokenAddress: string | null;
  tokenDecimals: number;
}

interface MlmSettings {
  payment_mode?: "REAL" | "SIMULATED";
}

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

const ERC20_TRANSFER_ABI = [
  "function transfer(address to, uint256 value) returns (bool)",
];

function amountFallsWithinPlan(amount: number, plan: PlanItem) {
  const min = Number(plan.min_amount || 0);
  const max = Number(plan.max_amount || plan.min_amount || 0);
  return amount >= min && amount <= max;
}

function planRangeWidth(plan: PlanItem) {
  return Number(plan.max_amount || plan.min_amount || 0) - Number(plan.min_amount || 0);
}

async function verifyPaymentWithRetry(orderId: number, txHash: string, maxAttempts = 5) {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      await api.post("/payments/verify", { orderId, txHash });
      return;
    } catch (error: unknown) {
      lastError = error;
      if (attempt === maxAttempts - 1) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  throw lastError;
}

function formatAmount(value: number) {
  return formatTokenAmount(value);
}

export default function DappPlanPaymentPage() {
  const params = useParams<{ planId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [initialPlanId, setInitialPlanId] = useState<number>(0);
  const [amount, setAmount] = useState("");
  const [channel, setChannel] = useState<PaymentChannel | null>(null);
  const [mlmSettings, setMlmSettings] = useState<MlmSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentStep, setPaymentStep] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);

  const parsedPlanId = useMemo(() => Number(params?.planId || 0), [params?.planId]);
  const paymentEnvironment = useMemo(() => {
    if (typeof window === "undefined") return "production";

    const hostname = window.location.hostname.toLowerCase();
    const isLocalHost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.endsWith(".local");

    return process.env.NODE_ENV !== "production" || isLocalHost ? "developer" : "production";
  }, []);
  const walletAddress = useMemo(() => {
    return (user as { walletAddress?: string; wallet_address?: string } | null)?.walletAddress
      || (user as { walletAddress?: string; wallet_address?: string } | null)?.wallet_address
      || "";
  }, [user]);

  const matchedPlan = useMemo(() => {
    const numericAmount = Number(amount);
    const activeCurrency = String(channel?.tokenSymbol || "").toUpperCase();
    const compatiblePlans = plans.filter((item) => {
      const planCurrency = String(item.payment_currency || "AUTO").toUpperCase();
      return planCurrency === "AUTO" || !activeCurrency || planCurrency === activeCurrency;
    });
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return compatiblePlans.find((item) => item.id === initialPlanId) || compatiblePlans[0] || null;
    }

    const selectedPlan = compatiblePlans.find((item) => item.id === initialPlanId) || null;
    if (selectedPlan && amountFallsWithinPlan(numericAmount, selectedPlan)) {
      return selectedPlan;
    }

    const matches = compatiblePlans
      .filter((item) => amountFallsWithinPlan(numericAmount, item))
      .sort((a, b) => {
        const widthDiff = planRangeWidth(a) - planRangeWidth(b);
        if (widthDiff !== 0) return widthDiff;
        return Number(a.min_amount || 0) - Number(b.min_amount || 0);
      });

    return matches[0] || null;
  }, [amount, channel?.tokenSymbol, initialPlanId, plans]);

  const compatiblePlans = useMemo(() => {
    const activeCurrency = String(channel?.tokenSymbol || "").toUpperCase();
    return plans.filter((item) => {
      const planCurrency = String(item.payment_currency || "AUTO").toUpperCase();
      return planCurrency === "AUTO" || !activeCurrency || planCurrency === activeCurrency;
    });
  }, [channel?.tokenSymbol, plans]);

  const packageMinimumAmount = useMemo(() => {
    if (compatiblePlans.length === 0) {
      return 0;
    }

    return compatiblePlans.reduce((lowest, item) => {
      const value = Number(item.min_amount || 0);
      if (!Number.isFinite(value) || value <= 0) {
        return lowest;
      }
      return lowest === 0 ? value : Math.min(lowest, value);
    }, 0);
  }, [compatiblePlans]);

  const loadContext = useCallback(async () => {
    if (!Number.isFinite(parsedPlanId) || parsedPlanId <= 0) {
      toast.error("Invalid plan");
      router.replace("/dapp/dashboard");
      return;
    }

    setLoading(true);
    try {
      const [plansRes, channelRes, mlmRes] = await Promise.all([
        api.get("/payments/plans"),
        api.get("/payments/channel", { params: { environment: paymentEnvironment } }),
        api.get("/settings/mlm"),
      ]);

      const allPlans = (plansRes.data?.data || []) as PlanItem[];
      const selectedPlan = allPlans.find((item) => Number(item.id) === parsedPlanId) || null;
      if (!selectedPlan) {
        toast.error("Plan not found");
        router.replace("/dapp/dashboard");
        return;
      }

      setPlans(allPlans);
      setInitialPlanId(selectedPlan.id);
      setAmount(String(Number(selectedPlan.min_amount || 0)));
      setChannel((channelRes.data?.data || null) as PaymentChannel | null);
      setMlmSettings((mlmRes.data?.data || null) as MlmSettings | null);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
        "Failed to load payment context";
      toast.error(message);
      router.replace("/dapp/dashboard");
    } finally {
      setLoading(false);
    }
  }, [parsedPlanId, paymentEnvironment, router]);

  const paymentMode = String(mlmSettings?.payment_mode || "REAL").toUpperCase() === "SIMULATED" ? "SIMULATED" : "REAL";

  useEffect(() => {
    if (!user) {
      router.replace(`/dapp/login?next=${encodeURIComponent(`/dapp/pay/${params?.planId || ""}`)}`);
      return;
    }
    if (user.role && user.role !== "USER") {
      router.replace("/login");
      return;
    }
    void loadContext();
  }, [loadContext, params?.planId, router, user]);

  const handleConfirmPayment = async () => {
    if (!matchedPlan || !channel) {
      toast.error("Payment channel or matched package is not available");
      return;
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (packageMinimumAmount > 0 && numericAmount < packageMinimumAmount) {
      toast.error(`Minimum package amount is ${packageMinimumAmount} ${channel.tokenSymbol}`);
      return;
    }
    if (numericAmount < Number(matchedPlan.min_amount || 0) || numericAmount > Number(matchedPlan.max_amount || matchedPlan.min_amount || 0)) {
      toast.error("Entered amount is outside the matched package range");
      return;
    }

    const logToTerminal = async (step: string, orderId?: number, data?: unknown, error?: unknown) => {
      try {
        await api.post("/payments/log-step", {
          step,
          orderId,
          data,
          error: error ? (typeof error === "object" ? JSON.stringify(error) : String(error)) : undefined,
        });
      } catch (err) {
        console.warn("Failed to write to terminal log:", err);
      }
    };

    setPaying(true);
    setPaymentStep(paymentMode === "SIMULATED" ? "Creating simulated payment intent..." : "Preparing wallet session...");
    let activeOrderId: number | undefined = undefined;

    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem("isPaying", "true");
      }
      await logToTerminal("1. Payment Flow Initiated", undefined, {
        planId: matchedPlan.id,
        planName: matchedPlan.name,
        amount: numericAmount,
        mode: paymentMode,
        environment: paymentEnvironment,
      });

      setPaymentStep("Creating payment intent...");
      const intentRes = await api.post("/payments/intent", {
        planId: matchedPlan.id,
        amount: numericAmount,
        environment: paymentEnvironment,
      });
      const intent = intentRes.data?.data || {};
      activeOrderId = intent.orderId;

      await logToTerminal("2. Payment Intent Created", activeOrderId, intent);

      if (paymentMode === "SIMULATED") {
        setPaymentStep("Marking test payment as paid...");
        await api.post("/payments/simulate", { orderId: intent.orderId });
        await logToTerminal("3. Simulated Payment Processed", activeOrderId);
        toast.success("Simulated payment completed and package activated");
        router.replace("/dapp/transactions");
        return;
      }

      const provider = getInjectedProvider() as Eip1193Provider | null;
      await logToTerminal("4. Check Wallet Provider Status", activeOrderId, {
        hasProvider: !!provider,
      });

      if (!provider) {
        throw new Error("No injected wallet detected. Open this page in your wallet browser or enable your wallet extension.");
      }

      let accounts = (await provider.request({ method: "eth_accounts" })) as string[] | undefined;
      if (!Array.isArray(accounts) || accounts.length === 0) {
        accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[] | undefined;
      }
      const from = accounts?.[0];
      if (!from) {
        throw new Error("Wallet account not available");
      }

      const requiredAmount = Number(intent.amount || numericAmount);
      if (!Number.isFinite(requiredAmount) || requiredAmount <= 0) {
        throw new Error("Invalid payment amount");
      }

      setPaymentStep("Switching network...");
      const targetChainIdHex = intent.chainId ? `0x${Number(intent.chainId).toString(16)}` : "0x38";
      const currentChainId = await provider.request({ method: "eth_chainId" });
      const hexChainId = typeof currentChainId === "number" ? `0x${currentChainId.toString(16)}` : String(currentChainId).toLowerCase();

      await logToTerminal("5. Target Network Switch Request", activeOrderId, {
        targetChainIdHex,
        currentChainId,
        hexChainId,
        fromAddress: from,
      });

      if (hexChainId !== targetChainIdHex) {
        try {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: targetChainIdHex }],
          });
        } catch (switchError: unknown) {
          const switchErr = switchError as { code?: number; message?: string };
          if (switchErr.code === 4902 || switchErr.message?.includes("unrecognized chain ID") || switchErr.message?.includes("not added")) {
            await provider.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: targetChainIdHex,
                  chainName: intent.chainName || channel.chainName || "BNB Smart Chain",
                  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
                  rpcUrls: [intent.rpcUrl || channel.rpcUrl || "https://bsc-dataseed.binance.org/"],
                },
              ],
            });
          } else {
            throw switchErr;
          }
        }
      }

      // Re-instantiate ethers BrowserProvider and signer after network switch to avoid stale refs
      const ethersProvider = new BrowserProvider(provider as unknown as never);
      const signer = await ethersProvider.getSigner();

      setPaymentStep(
        intent.paymentAssetType === "erc20"
          ? `Waiting for wallet confirmation (${String(intent.tokenSymbol || channel.tokenSymbol)} transfer)...`
          : "Waiting for wallet confirmation..."
      );

      await logToTerminal("6. Sending Transaction to Wallet", activeOrderId, {
        receiverAddress: intent.receiverAddress,
        amount: requiredAmount,
        assetType: intent.paymentAssetType,
        tokenAddress: intent.tokenAddress,
        tokenDecimals: intent.tokenDecimals,
        signerAddress: await signer.getAddress(),
      });

      let tx: TransactionResponse;
      if (intent.paymentAssetType === "erc20") {
        if (!intent.tokenAddress) {
          throw new Error("Token contract address is missing for this payment channel.");
        }
        const tokenDecimals = Number(intent.tokenDecimals ?? 18) || 18;
        const tokenContract = new Contract(intent.tokenAddress, ERC20_TRANSFER_ABI, signer);
        tx = await tokenContract.transfer(intent.receiverAddress, parseUnits(String(requiredAmount), tokenDecimals));
      } else {
        tx = await signer.sendTransaction({
          to: intent.receiverAddress,
          value: parseEther(String(requiredAmount)),
        });
      }

      await logToTerminal("7. Transaction Signed & Submitted by Wallet", activeOrderId, {
        txHash: tx.hash,
        from: tx.from,
        to: tx.to,
        gasPrice: tx.gasPrice?.toString(),
        nonce: tx.nonce,
      });

      // Save transaction hash to backend immediately
      try {
        await api.post("/payments/update-hash", { orderId: intent.orderId, txHash: tx.hash });
        await logToTerminal("8. Transaction Hash Registered in DB", activeOrderId, { txHash: tx.hash });
      } catch (hashError) {
        console.warn("Failed to save transaction hash on backend:", hashError);
        await logToTerminal("8. Warning: Hash registration failed", activeOrderId, { error: String(hashError) });
      }

      setPaymentStep("Confirming transaction on-chain...");
      try {
        await Promise.race([
          tx.wait(1),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000))
        ]);
      } catch (err) {
        console.warn("On-chain wait timed out or failed on client, proceeding directly to backend verification.", err);
      }

      setPaymentStep("Verifying payment... (you can check back later)");
      await logToTerminal("9. On-Chain Verification Request Started", activeOrderId, { txHash: tx.hash });

      setCountdown(20);

      let verified = false;
      const orderIdForVerify = intent.orderId;
      const hashForVerify = tx.hash;

      const verifyLoop = async () => {
        for (let secondsElapsed = 0; secondsElapsed < 20; secondsElapsed += 4) {
          try {
            await api.post("/payments/verify", { orderId: orderIdForVerify, txHash: hashForVerify });
            verified = true;
            break;
          } catch (e) {
            await new Promise((resolve) => setTimeout(resolve, 4000));
          }
        }
      };

      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      await verifyLoop();
      
      clearInterval(countdownInterval);
      setCountdown(null);

      if (verified) {
        await logToTerminal("10. Payment Verification Success", activeOrderId);
        toast.success("Payment verified and package activated!");
        router.replace("/dapp/transactions");
      } else {
        await logToTerminal("10. Verification Incomplete after 20s", activeOrderId);
        toast.success("Payment is being verified. You can check the status on the transactions log shortly.");
        router.replace("/dapp/transactions");
      }
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message ||
        (error as { message?: string }).message ||
        "Payment failed";
      
      await logToTerminal("ERROR. Payment Flow Failed", activeOrderId, { message, step: paymentStep }, error);
      toast.error(message);
    } finally {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem("isPaying");
      }
      setPaying(false);
      setPaymentStep("");
    }
  };

  return (
    <div className="min-h-screen bg-[#060b14] p-4 md:p-8">
      <div className="w-full space-y-5">
        <button
          type="button"
          onClick={() => router.push("/dapp/dashboard")}
          className="inline-flex items-center gap-2 text-sm text-[#b0d6f5] hover:text-[#f0b90b]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </button>

        <div className="relative overflow-hidden rounded-3xl border border-[#123a62] bg-gradient-to-br from-[#09111c] via-[#0d1726] to-[#10213a] p-5 text-white shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#1ea0ff]/15 blur-2xl" />
          <div className="absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-[#5bbcff]/10 blur-2xl" />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div>
              <BrandLogo compact className="max-w-[220px]" />
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#123a62] bg-[#0b1930] px-3 py-1 text-[11px] font-semibold tracking-wide text-[#5bbcff]">
                <CreditCard className="h-3.5 w-3.5" />
                PACKAGE PAYMENT
              </div>
              <h1 className="mt-3 text-2xl md:text-3xl font-extrabold">Confirm Package Payment</h1>
              {/* <p className="mt-2 max-w-3xl text-sm text-[#b0d6f5]">
                Enter an amount and the system will match it against your configured package ranges, active chain, and payment asset.
              </p> */}
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



        <div className="rounded-2xl border border-[#1e2329] bg-[#161a20] p-5 shadow md:p-7">
          {loading ? (
            <div className="flex items-center gap-2 text-[#848e9c]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading payment context...
            </div>
          ) : channel ? (
            <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#2b3139] bg-[#111418] p-4">
                  <label className="block text-sm font-medium text-[#f5f5f5]">Enter Amount</label>
                  <div className="mt-2 flex items-center rounded-2xl border border-[#2b3139] bg-[#161a20] px-4 py-3">
                    <input
                      type="number"
                      min={packageMinimumAmount || undefined}
                      step="0.0001"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-transparent text-lg font-semibold text-[#f5f5f5] outline-none"
                      placeholder={`Enter amount in ${channel.tokenSymbol}`}
                    />
                    <span className="text-sm font-semibold text-[#f0b90b]">{channel.tokenSymbol}</span>
                  </div>
                  <p className="mt-2 text-xs text-[#848e9c]">
                    Smallest package amount for {channel.tokenSymbol}: {packageMinimumAmount > 0 ? packageMinimumAmount : "-"}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#2b3139] bg-[#111418] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#848e9c]">Current Default Chain</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-[#848e9c]">Chain</p>
                      <p className="font-semibold text-[#f5f5f5]">{channel.chainName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#848e9c]">Chain ID</p>
                      <p className="font-semibold text-[#f5f5f5]">{channel.chainId ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#848e9c]">Checkout Mode</p>
                      <p className={`font-semibold ${paymentMode === "SIMULATED" ? "text-[#f0b90b]" : "text-[#f5f5f5]"}`}>{paymentMode}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#848e9c]">Asset</p>
                      <p className="font-semibold text-[#f5f5f5]">{channel.tokenSymbol} ({channel.paymentAssetType === "erc20" ? "ERC-20" : "Native"})</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#848e9c]">Environment</p>
                      <p className="font-semibold capitalize text-[#f5f5f5]">{channel.environment}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-[#848e9c]">Token Contract</p>
                    <p className="break-all text-sm text-[#b7bdc6]">{channel.tokenAddress || "Native coin payment"}</p>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-[#848e9c]">Receiver Address</p>
                    <p className="break-all text-sm text-[#b7bdc6]">{channel.receiverAddress}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-[#2b3139] bg-[#111418] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#848e9c]">Matched Package</p>
                  {matchedPlan ? (
                    <>
                      <p className="mt-1 text-lg font-semibold text-[#f5f5f5]">{matchedPlan.name}</p>
                      <p className="mt-2 text-xs uppercase tracking-wide text-[#848e9c]">Plan Currency: {matchedPlan.payment_currency || "AUTO"}</p>
                      <p className="mt-2 text-sm text-[#b7bdc6]">
                        Investment Range: {formatAmount(Number(matchedPlan.min_amount || 0))} - {formatAmount(Number(matchedPlan.max_amount || matchedPlan.min_amount || 0))} {channel.tokenSymbol}
                      </p>
                      <p className="text-sm text-[#b7bdc6]">ROI: {formatPercent(Number(matchedPlan.roi_percent || 0) / 2, 2)}%</p>
                      <p className="text-sm text-[#b7bdc6]">
                        Daily Income: {formatPercent((matchedPlan.daily_income_percent ?? matchedPlan.roi_percent) || 0, 4)}%
                      </p>
                      {/* <p className="text-sm text-[#b7bdc6]">Duration: {matchedPlan.duration_days || 30} days</p> */}
                      <p className="mt-3 text-xs text-[#848e9c]">
                        Estimated payout on entered amount: {formatTokenAmount(Number(amount || 0) * (Number(matchedPlan.roi_percent || 0) / 100))} {channel.tokenSymbol}
                      </p>
                    </>
                  ) : (
                    <div className="mt-3 rounded-xl border border-[#3a2f09] bg-[#201a08] p-3 text-sm text-[#f0b90b]">
                      No package matches this amount. Enter a value inside one of the configured package ranges.
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-[#2b3139] bg-[#111418] p-4">
                  {paymentMode === "SIMULATED" ? (
                    <div className="mb-4 rounded-xl border border-[#3a2f09] bg-[#201a08] p-3 text-sm text-[#f0b90b]">
                      Simulated payment is active. Real wallet transfer is disabled by admin for testing.
                    </div>
                  ) : null}
                  <p className="text-xs uppercase tracking-wide text-[#848e9c]">Payment Summary</p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-[#848e9c]">Entered amount</span>
                    <span className="font-semibold text-[#f5f5f5]">{formatAmount(Number(amount || 0))} {channel.tokenSymbol}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-[#848e9c]">Package range</span>
                    <span className="font-semibold text-[#f5f5f5]">
                      {matchedPlan
                        ? `${formatAmount(Number(matchedPlan.min_amount || 0))} - ${formatAmount(Number(matchedPlan.max_amount || matchedPlan.min_amount || 0))}`
                        : "Not matched"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-[#848e9c]">Payment mode</span>
                    <span className="font-semibold text-[#f5f5f5]">
                      {paymentMode === "SIMULATED"
                        ? "Simulated activation"
                        : channel.paymentAssetType === "erc20"
                          ? "Token transfer"
                          : "Native transfer"}
                    </span>
                  </div>
                </div>

                {paymentStep && countdown === null ? (
                  <p className="text-xs text-[#5bbcff]">{paymentStep}</p>
                ) : null}

                {countdown !== null ? (
                  <div className="rounded-2xl border border-[#1e3a5f] bg-[#0c1a30] p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-white">Verifying payment...</span>
                      <span className="text-[#5bbcff] font-mono font-bold">{countdown}s</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#162a45]">
                      <div
                        className="h-full bg-gradient-to-r from-[#5bbcff] to-[#f0b90b] transition-all duration-1000"
                        style={{ width: `${(countdown / 20) * 100}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-[#8aa4bf] leading-normal">
                      Connecting to the blockchain network to index your transfer. (You can check back later)
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={paying || !amount || Number(amount) <= 0 || !matchedPlan}
                    onClick={() => void handleConfirmPayment()}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f0b90b] px-4 py-3 font-semibold text-[#181a20] hover:bg-[#f8d45c] disabled:opacity-60"
                  >
                    {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                    {paying ? "Processing..." : paymentMode === "SIMULATED" ? "Simulate Payment" : `Pay ${channel.tokenSymbol}`}
                  </button>
                )}

                <p className="text-xs text-[#848e9c] inline-flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0ecb81]" />
                  {paymentMode === "SIMULATED"
                    ? "This creates a dummy paid order for testing and skips the real wallet transfer."
                    : "You will approve exactly one on-chain payment transaction."}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#848e9c]">Payment context unavailable.</p>
          )}
        </div>
      </div>
    </div>
  );
}
