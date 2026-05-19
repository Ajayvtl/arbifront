"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { AxiosError } from "axios";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { hasDeveloperScope } from "@/lib/companyRoleScope";
import { Wallet as EthersWallet } from "ethers";
import { 
  ArrowLeftRight, Wallet, ShieldAlert, Sparkles, CheckCircle2, 
  Trash2, Edit3, Power, RefreshCw, Layers, Coins, Key,
  Eye, EyeOff, Settings, ShieldCheck, ToggleLeft, ToggleRight,
  TrendingUp, Activity, Code
} from "lucide-react";

interface RoutingWallet {
  key: string;
  address: string;
  limit: number;
  minBalance: number;
  privateKey: string;
}

interface ExchangeProfile {
  id?: number;
  companyId: number;
  profileName: string;
  reserveWallet: string;
  reservePrivateKey: string;
  withdrawWallet?: string;
  withdrawPrivateKey?: string;
  routingWallets: RoutingWallet[];
  isActive: boolean;
  exchAssetMode: "TOKEN" | "COIN";
  
  exchTokenName: string;
  exchTokenSymbol: string;
  exchTokenContractAddress: string;
  exchTokenDecimals: number;
  exchTokenAbi: string;
  exchMultiplier: number;
  isEnabled: boolean;
  liveRateSource: "STATIC" | "BINANCE" | "PUBLIC_DEX";
  liveRateStatic: number;
  liveRateIntervalMinutes: number;

  createdAt?: string;
  updatedAt?: string;
}

type ChainEnvironment = "production" | "developer";
type ChainStatus = "active" | "inactive";
type PaymentAssetType = "native" | "erc20";

interface ChainProfile {
  id: string;
  chainKey: string;
  chainName: string;
  chainId: number | null;
  rpcUrl: string;
  explorerUrl: string;
  contractAddress?: string;
  receiverAddress?: string;
  paymentAssetType?: PaymentAssetType;
  paymentAssetSymbol?: string;
  tokenAddress?: string;
  tokenDecimals?: number;
  isTestnet?: boolean;
  status?: ChainStatus;
}

interface ChainConfig {
  version: number;
  production: { activeProfileId: string | null; profiles: ChainProfile[] };
  developer: { activeProfileId: string | null; profiles: ChainProfile[] };
}

const emptyRoutingWallet = (index: number): RoutingWallet => ({
  key: `Exchange Route ${index + 1}`,
  address: "",
  limit: 0,
  minBalance: 0,
  privateKey: "",
});

const defaultProfile = (companyId: number): ExchangeProfile => ({
  companyId,
  profileName: "",
  reserveWallet: "",
  reservePrivateKey: "",
  withdrawWallet: "",
  withdrawPrivateKey: "",
  routingWallets: Array.from({ length: 5 }, (_, i) => emptyRoutingWallet(i)),
  isActive: false,
  exchAssetMode: "TOKEN",
  
  exchTokenName: "My Exchange Token",
  exchTokenSymbol: "EXCH",
  exchTokenContractAddress: "",
  exchTokenDecimals: 18,
  exchTokenAbi: "",
  exchMultiplier: 1.0,
  isEnabled: false,
  liveRateSource: "STATIC",
  liveRateStatic: 1.0,
  liveRateIntervalMinutes: 15,
});

export default function ExchangeRoutingPage() {
  const { user } = useAuth();
  const authCompanyId = Number(user?.company_id || 0) || 1;
  const canAccess = hasDeveloperScope(user);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [profiles, setProfiles] = useState<ExchangeProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ExchangeProfile>(defaultProfile(authCompanyId));

  // Live balance check states
  const [balances, setBalances] = useState<{ bnb: string; usdt: string; token: string } | null>(null);
  const [checkingBalances, setCheckingBalances] = useState(false);

  // Withdraw wallet live balance check states
  const [withdrawBalances, setWithdrawBalances] = useState<{ bnb: string; usdt: string; token: string } | null>(null);
  const [checkingWithdrawBalances, setCheckingWithdrawBalances] = useState(false);

  // Per-route live balance check states
  const [routeBalances, setRouteBalances] = useState<Record<number, { bnb: string; usdt: string; token: string } | null>>({});
  const [checkingRouteBalances, setCheckingRouteBalances] = useState<Record<number, boolean>>({});

  // Custom network helpers (stored in chain_rpc_profiles settings via /admin/chain-config/*)
  const [chainConfig, setChainConfig] = useState<ChainConfig | null>(null);
  const [chainConfigLoading, setChainConfigLoading] = useState(false);
  const [customNetworkEnabled, setCustomNetworkEnabled] = useState(false);
  const [customNetworkSaving, setCustomNetworkSaving] = useState(false);
  const [customNetworkTesting, setCustomNetworkTesting] = useState(false);
  const [customNetworkForm, setCustomNetworkForm] = useState<{ chainId: string; rpcUrl: string; explorerUrl: string }>({
    chainId: "",
    rpcUrl: "",
    explorerUrl: "",
  });

  const pickActiveChainProfile = useCallback((config: ChainConfig | null) => {
    if (!config) return null;

    const pick = (profiles: ChainProfile[], activeId: string | null) => {
      const list = Array.isArray(profiles) ? profiles : [];
      if (!list.length) return null;
      if (activeId) {
        const byId = list.find((p) => String(p.id) === String(activeId));
        if (byId) return byId;
      }
      const byStatus = list.find((p) => String(p.status || "inactive").toLowerCase() === "active");
      return byStatus || list[0] || null;
    };

    return (
      pick(config.production?.profiles || [], config.production?.activeProfileId || null) ||
      pick(config.developer?.profiles || [], config.developer?.activeProfileId || null)
    );
  }, []);

  const activeChainProfile = useMemo(() => pickActiveChainProfile(chainConfig), [chainConfig, pickActiveChainProfile]);
  const nativeSymbol = useMemo(() => {
    const sym = String(activeChainProfile?.paymentAssetSymbol || "").trim().toUpperCase();
    return sym || "BNB";
  }, [activeChainProfile]);

  // Test transfer states
  const [testAsset, setTestAsset] = useState<"native" | "usdt" | "custom">("native");
  const [testSourceKind, setTestSourceKind] = useState<"reserve" | "route">("reserve");
  const [testRouteIndex, setTestRouteIndex] = useState<number>(0);
  const [testReceiver, setTestReceiver] = useState("");
  const [testAmount, setTestAmount] = useState("");
  const [testEstimate, setTestEstimate] = useState<any | null>(null);
  const [estimatingTestTx, setEstimatingTestTx] = useState(false);
  const [sendingTestTx, setSendingTestTx] = useState(false);

  const deriveAddressFromPrivateKey = useCallback((privateKey: string) => {
    const raw = String(privateKey || "").trim();
    if (!raw) {
      throw new Error("Private key is empty");
    }
    const normalized = raw.startsWith("0x") ? raw : `0x${raw}`;
    if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
      throw new Error("Private key must be 64 hex characters");
    }
    return new EthersWallet(normalized).address;
  }, []);

  const [liveRateNow, setLiveRateNow] = useState<number | null>(null);
  const [liveRateLoading, setLiveRateLoading] = useState(false);

  const fetchLiveRateNow = useCallback(async (profileId?: number) => {
    if (!canAccess) return;
    setLiveRateLoading(true);
    try {
      const res = await api.get("/admin/exchange-config/live-rate", {
        params: {
          companyId: authCompanyId,
          profileId: profileId || form.id || undefined,
          _t: Date.now(),
        },
      });
      const rate = Number(res.data?.data?.rateUsd ?? 0);
      setLiveRateNow(Number.isFinite(rate) && rate > 0 ? rate : null);
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to fetch live rate");
      setLiveRateNow(null);
    } finally {
      setLiveRateLoading(false);
    }
  }, [authCompanyId, canAccess, form.id]);

  const loadChainConfig = useCallback(async () => {
    if (!canAccess) return;
    setChainConfigLoading(true);
    try {
      const res = await api.get("/admin/chain-config", { params: { companyId: authCompanyId } });
      const cfg = (res.data?.data?.config || null) as ChainConfig | null;
      setChainConfig(cfg);

      const active = pickActiveChainProfile(cfg);
      if (active?.rpcUrl && !customNetworkEnabled) {
        setCustomNetworkForm((p) => ({
          chainId: active.chainId ? String(active.chainId) : p.chainId,
          rpcUrl: active.rpcUrl || p.rpcUrl,
          explorerUrl: active.explorerUrl || p.explorerUrl,
        }));
      }
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to load chain network settings");
    } finally {
      setChainConfigLoading(false);
    }
  }, [authCompanyId, canAccess, customNetworkEnabled, pickActiveChainProfile]);

  useEffect(() => {
    void loadChainConfig();
  }, [loadChainConfig]);

  useEffect(() => {
    void fetchLiveRateNow();
  }, [fetchLiveRateNow]);

  const testCustomNetworkRpc = async () => {
    if (!customNetworkForm.rpcUrl.trim()) {
      toast.error("RPC URL is required to test the network connection.");
      return;
    }
    setCustomNetworkTesting(true);
    try {
      const res = await api.post("/admin/chain-config/test", { rpcUrl: customNetworkForm.rpcUrl.trim() });
      const probe = res.data?.data;
      const chainId = probe?.chainId ? String(probe.chainId) : "";
      if (chainId && !customNetworkForm.chainId.trim()) {
        setCustomNetworkForm((p) => ({ ...p, chainId }));
      }
      toast.success(`RPC reachable${chainId ? ` (chainId ${chainId})` : ""}`);
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "RPC test failed");
    } finally {
      setCustomNetworkTesting(false);
    }
  };

  const saveCustomNetworkAsActive = async () => {
    const rpcUrl = customNetworkForm.rpcUrl.trim();
    const explorerUrl = customNetworkForm.explorerUrl.trim();
    const chainIdNum = Number(customNetworkForm.chainId);

    if (!rpcUrl) {
      toast.error("RPC URL is required");
      return;
    }
    if (!Number.isFinite(chainIdNum) || chainIdNum <= 0) {
      toast.error("Valid chainId is required");
      return;
    }

    setCustomNetworkSaving(true);
    try {
      const profile: Partial<ChainProfile> = {
        id: "",
        chainKey: "custom",
        chainName: `Custom Network (${chainIdNum})`,
        chainId: chainIdNum,
        rpcUrl,
        explorerUrl,
        status: "active",
        paymentAssetType: "native",
        paymentAssetSymbol: "BNB",
      };

      const res = await api.post("/admin/chain-config/profile", {
        companyId: authCompanyId,
        environment: "production" as ChainEnvironment,
        profile,
      });

      const cfg = (res.data?.data?.config || null) as ChainConfig | null;
      setChainConfig(cfg);
      toast.success("Custom network saved and set active");
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to save custom network");
    } finally {
      setCustomNetworkSaving(false);
    }
  };

  const checkBalances = async () => {
    if (!form.reserveWallet.trim()) {
      toast.error("Please enter a reserve wallet address to check balances.");
      return;
    }
    setCheckingBalances(true);
    try {
      const res = await api.post("/admin/exchange-config/check-balance", {
        companyId: authCompanyId,
        reserveWallet: form.reserveWallet,
        tokenContractAddress: form.exchAssetMode === "TOKEN" ? form.exchTokenContractAddress : "",
        tokenDecimals: form.exchTokenDecimals
      });
      setBalances((res.data?.data || null) as { bnb: string; usdt: string; token: string } | null);
      toast.success("Wallet balances updated live!");
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to load wallet balances from RPC.");
    } finally {
      setCheckingBalances(false);
    }
  };

  const checkWithdrawBalances = async () => {
    if (!form.withdrawWallet?.trim()) {
      toast.error("Please enter a withdraw wallet address to check balances.");
      return;
    }
    setCheckingWithdrawBalances(true);
    try {
      const res = await api.post("/admin/exchange-config/check-balance", {
        companyId: authCompanyId,
        reserveWallet: form.withdrawWallet,
        tokenContractAddress: form.exchAssetMode === "TOKEN" ? form.exchTokenContractAddress : "",
        tokenDecimals: form.exchTokenDecimals
      });
      setWithdrawBalances((res.data?.data || null) as { bnb: string; usdt: string; token: string } | null);
      toast.success("Withdraw wallet balances updated live!");
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to load withdraw wallet balances from RPC.");
    } finally {
      setCheckingWithdrawBalances(false);
    }
  };

  const checkRouteBalances = async (index: number) => {
    const addr = String(form.routingWallets?.[index]?.address || "").trim();
    if (!addr) {
      toast.error("Please enter a routing wallet address first.");
      return;
    }

    setCheckingRouteBalances((p) => ({ ...p, [index]: true }));
    try {
      const res = await api.post("/admin/exchange-config/check-balance", {
        companyId: authCompanyId,
        reserveWallet: addr,
        tokenContractAddress: form.exchAssetMode === "TOKEN" ? form.exchTokenContractAddress : "",
        tokenDecimals: form.exchTokenDecimals,
      });
      setRouteBalances((p) => ({ ...p, [index]: (res.data?.data || null) as { bnb: string; usdt: string; token: string } | null }));
      toast.success(`Route ${index + 1} balances updated`);
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to load wallet balances from RPC.");
    } finally {
      setCheckingRouteBalances((p) => ({ ...p, [index]: false }));
    }
  };

  useEffect(() => {
    setBalances(null);
    setWithdrawBalances(null);
  }, [form.reserveWallet, form.withdrawWallet, form.exchTokenContractAddress]);

  useEffect(() => {
    // reset route balances whenever routing addresses or token changes
    setRouteBalances({});
  }, [form.routingWallets, form.exchTokenContractAddress]);

  // Visibility state for private keys in form
  const [showReserveKey, setShowReserveKey] = useState(false);
  const [showWithdrawKey, setShowWithdrawKey] = useState(false);
  const [showRouteKeys, setShowRouteKeys] = useState<boolean[]>(Array(5).fill(false));

  // Visibility state for saved cards
  const [showSavedReserveKeys, setShowSavedReserveKeys] = useState<Record<number, boolean>>({});
  const [showSavedWithdrawKeys, setShowSavedWithdrawKeys] = useState<Record<number, boolean>>({});
  const [showSavedRouteKeys, setShowSavedRouteKeys] = useState<Record<string, boolean>>({});

  // Load all profiles
  const loadProfiles = useCallback(async () => {
    if (!canAccess) return;
    setLoading(true);
    try {
      const res = await api.get("/admin/exchange-config", {
        params: { companyId: authCompanyId },
      });
      setProfiles((res.data?.data || []) as ExchangeProfile[]);
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to load exchange profiles");
    } finally {
      setLoading(false);
    }
  }, [canAccess, authCompanyId]);

  const [failures, setFailures] = useState<any[]>([]);
  const [failuresLoading, setFailuresLoading] = useState(false);
  const [retryingFailureId, setRetryingFailureId] = useState<number | null>(null);

  const loadFailures = useCallback(async () => {
    if (!canAccess) return;
    setFailuresLoading(true);
    try {
      const res = await api.get("/admin/exchange-config/failures", {
        params: { companyId: authCompanyId }
      });
      setFailures((res.data?.data || []) as any[]);
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to load failed sweeps");
    } finally {
      setFailuresLoading(false);
    }
  }, [canAccess, authCompanyId]);

  const handleRetryFailure = async (failureId: number) => {
    setRetryingFailureId(failureId);
    try {
      await api.post(`/admin/exchange-config/failures/${failureId}/retry`, {
        companyId: authCompanyId
      });
      toast.success("Sweep retried successfully!");
      void loadFailures();
      void loadProfiles();
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to retry sweep transfer");
    } finally {
      setRetryingFailureId(null);
    }
  };

  useEffect(() => {
    void loadProfiles();
    void loadFailures();
  }, [loadProfiles, loadFailures]);

  const resetForm = () => {
    setForm(defaultProfile(authCompanyId));
    setShowReserveKey(false);
    setShowWithdrawKey(false);
    setShowRouteKeys(Array(5).fill(false));
  };

  const handleWalletChange = (index: number, field: keyof RoutingWallet, value: string | number) => {
    setForm((prev) => {
      const updatedWallets = [...prev.routingWallets];
      updatedWallets[index] = {
        ...updatedWallets[index],
        [field]: value,
      };
      return {
        ...prev,
        routingWallets: updatedWallets,
      };
    });
  };

  const toggleRouteKeyVisibility = (index: number) => {
    setShowRouteKeys((prev) => {
      const copy = [...prev];
      copy[index] = !copy[index];
      return copy;
    });
  };

  const toggleSavedRouteKeyVisibility = (profileId: number, index: number) => {
    const key = `${profileId}-${index}`;
    setShowSavedRouteKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    if (!form.profileName.trim()) {
      toast.error("Profile Name is required to identify this configuration");
      return;
    }
    if (!form.reserveWallet.trim()) {
      toast.error("Reserve Wallet Address is required");
      return;
    }
    if (form.exchAssetMode === "TOKEN" && !form.exchTokenContractAddress.trim()) {
      toast.error("Token Contract Address is required");
      return;
    }

    setSaving(true);
    try {
      await api.post("/admin/exchange-config/profile", {
        companyId: authCompanyId,
        profile: form,
      });
      toast.success(form.id ? "Exchange routing configuration updated successfully" : "Exchange routing configuration created successfully");
      await loadProfiles();
      resetForm();
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to save exchange profile");
    } finally {
      setSaving(false);
    }
  };

  const estimateTestTransfer = async () => {
    if (!form.id) {
      toast.error("Please save this exchange profile first, then run a test transfer.");
      return;
    }
    if (!testReceiver.trim()) {
      toast.error("Receiver address is required.");
      return;
    }
    if (!testAmount.trim() || Number(testAmount) <= 0) {
      toast.error("Amount must be greater than 0.");
      return;
    }
    if (form.exchAssetMode === "TOKEN" && testAsset === "custom" && !form.exchTokenContractAddress.trim()) {
      toast.error("Custom token contract address is missing.");
      return;
    }

    setEstimatingTestTx(true);
    try {
      const source =
        testSourceKind === "reserve"
          ? { kind: "reserve" }
          : { kind: "route", routeIndex: testRouteIndex };

      const res = await api.post("/admin/exchange-config/test-transfer/estimate", {
        companyId: authCompanyId,
        profileId: form.id,
        source,
        asset: testAsset,
        toAddress: testReceiver.trim(),
        amount: testAmount.trim(),
      });

      setTestEstimate(res.data?.data || null);
      toast.success("Gas estimate calculated");
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to estimate transfer");
    } finally {
      setEstimatingTestTx(false);
    }
  };

  const sendTestTransfer = async () => {
    if (!form.id) {
      toast.error("Please save this exchange profile first, then run a test transfer.");
      return;
    }
    if (!testEstimate) {
      toast.error("Please estimate gas first.");
      return;
    }
    if (!confirm("Confirm sending this test transfer now?")) {
      return;
    }

    setSendingTestTx(true);
    try {
      const source =
        testSourceKind === "reserve"
          ? { kind: "reserve" }
          : { kind: "route", routeIndex: testRouteIndex };

      const res = await api.post("/admin/exchange-config/test-transfer/send", {
        companyId: authCompanyId,
        profileId: form.id,
        source,
        asset: testAsset,
        toAddress: testReceiver.trim(),
        amount: testAmount.trim(),
      });

      const data = res.data?.data;
      setTestEstimate((p: any) => ({ ...(p || {}), sent: data }));
      toast.success(`Transaction submitted: ${data?.txHash || "OK"}`);
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to send transfer");
    } finally {
      setSendingTestTx(false);
    }
  };

  const handleSetStatus = async (profileId: number, currentActive: boolean) => {
    try {
      await api.patch(`/admin/exchange-config/profile/${profileId}/status`, {
        companyId: authCompanyId,
        status: !currentActive,
      });
      toast.success(!currentActive ? "Exchange routing activated successfully" : "Exchange routing deactivated");
      await loadProfiles();
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to update status");
    }
  };

  const handleDelete = async (profileId: number) => {
    if (!confirm("Are you sure you want to delete this exchange configuration? Private keys associated with this profile will be permanently deleted.")) {
      return;
    }
    try {
      await api.delete(`/admin/exchange-config/profile/${profileId}`, {
        params: { companyId: authCompanyId },
      });
      toast.success("Exchange profile deleted");
      await loadProfiles();
      if (form.id === profileId) {
        resetForm();
      }
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to delete exchange profile");
    }
  };

  const handleEdit = (profile: ExchangeProfile) => {
    // Fill in empty routes if profile has less than 5 routes
    const filledWallets = Array.from({ length: 5 }, (_, i) => {
      const w = profile.routingWallets[i] || emptyRoutingWallet(i);
      return {
        ...w,
        privateKey: w.privateKey || "",
      };
    });
    setForm({
      ...profile,
      reservePrivateKey: profile.reservePrivateKey || "",
      withdrawWallet: profile.withdrawWallet || "",
      withdrawPrivateKey: profile.withdrawPrivateKey || "",
      routingWallets: filledWallets,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!mounted) {
    return (
      <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-pulse">
        <div className="h-44 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 h-96 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="lg:col-span-5 h-96 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 shadow-sm">
          <ShieldAlert className="h-6 w-6 flex-shrink-0 text-red-600" />
          <div>
            <h3 className="font-semibold">Access Denied</h3>
            <p className="text-sm text-red-700">You do not have developer permissions to configure Exchange Routing.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-fadeIn">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-8 shadow-xl text-white">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <ArrowLeftRight className="h-40 w-40" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center rounded-lg bg-indigo-500/20 p-2 text-indigo-400 backdrop-blur-sm">
              <Coins className="h-6 w-6" />
            </span>
            <span className="text-xs font-semibold tracking-wider text-indigo-400 uppercase">Developer Console</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Exchange Sweeper & Token Router</h1>
          <p className="text-slate-300 max-w-3xl text-sm leading-relaxed">
            Provision advanced wallet-routing networks, customize automated multipliers, define live price feeds, and configure secure private keys for automated sweep, routing, and payout algorithms.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* FORM PANEL - 7 cols */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-100 dark:border-slate-800 p-6 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-blue-500 to-indigo-600"></div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-500" />
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                  {form.id ? "Update Exchange Profile" : "Create Exchange Profile"}
                </h2>
              </div>
              {form.id && (
                <button 
                  onClick={resetForm}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition"
                >
                  Create New Instead
                </button>
              )}
            </div>

            {/* Profile Identifiers & Enable Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Profile Identifier Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Binance Liquid Routing"
                  value={form.profileName}
                  onChange={(e) => setForm(p => ({ ...p, profileName: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/40">
                <div>
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Enable Token Sweeper</span>
                  <span className="text-[10px] text-slate-400">Trigger on-chain sweeps on package activation</span>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, isEnabled: !p.isEnabled }))}
                  className="text-indigo-600 hover:text-indigo-700 transition"
                >
                  {form.isEnabled ? (
                    <ToggleRight className="h-10 w-10 text-indigo-600" />
                  ) : (
                    <ToggleLeft className="h-10 w-10 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* TOKEN SETTINGS SECTION */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold text-sm uppercase tracking-wider mb-2">
                <Settings className="h-4.5 w-4.5 text-indigo-500" />
                <span>Exchange Asset Mode</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, exchAssetMode: "TOKEN" }))}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider border transition ${
                    form.exchAssetMode === "TOKEN"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  Token
                </button>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, exchAssetMode: "COIN" }))}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider border transition ${
                    form.exchAssetMode === "COIN"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  Coin
                </button>

                <div className="ml-auto text-[11px] text-slate-500 dark:text-slate-400">
                  Active network:{" "}
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {activeChainProfile?.chainId ? `chainId ${activeChainProfile.chainId}` : "chainId ?"} · {activeChainProfile?.rpcUrl || "default"}
                  </span>
                </div>
              </div>

              {form.exchAssetMode === "TOKEN" ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Token Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. PancakeSwap Token"
                        value={form.exchTokenName}
                        onChange={(e) => setForm(p => ({ ...p, exchTokenName: e.target.value }))}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Token Symbol
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. CAKE"
                        value={form.exchTokenSymbol}
                        onChange={(e) => setForm(p => ({ ...p, exchTokenSymbol: e.target.value }))}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-white uppercase font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Token Decimals
                      </label>
                      <input
                        type="number"
                        value={form.exchTokenDecimals}
                        onChange={(e) => setForm(p => ({ ...p, exchTokenDecimals: Number(e.target.value) || 18 }))}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-white font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Token Contract Address
                      </label>
                      <input
                        type="text"
                        placeholder="0x..."
                        value={form.exchTokenContractAddress}
                        onChange={(e) => setForm(p => ({ ...p, exchTokenContractAddress: e.target.value }))}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Value Multiplier (0.01 - 100)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.exchMultiplier}
                        onChange={(e) => setForm(p => ({ ...p, exchMultiplier: Number(e.target.value) || 0.1 }))}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-extrabold text-indigo-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Custom Contract ABI (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Paste ERC-20 contract JSON ABI string here..."
                      value={form.exchTokenAbi}
                      onChange={(e) => setForm(p => ({ ...p, exchTokenAbi: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                </>
              ) : (
                <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-slate-950/30">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">Custom Network (RPC)</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Uses the active `chain_rpc_profiles` for balance checks. Enable to create/activate a custom profile.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomNetworkEnabled((p) => !p)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                    >
                      {customNetworkEnabled ? <ToggleRight className="h-4.5 w-4.5 text-emerald-500" /> : <ToggleLeft className="h-4.5 w-4.5 text-slate-400" />}
                      {customNetworkEnabled ? "Enabled" : "Disabled"}
                    </button>
                  </div>

                  {customNetworkEnabled && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Chain ID</label>
                        <input
                          type="text"
                          value={customNetworkForm.chainId}
                          onChange={(e) => setCustomNetworkForm((p) => ({ ...p, chainId: e.target.value }))}
                          placeholder="56"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      <div className="md:col-span-6">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">RPC URL</label>
                        <input
                          type="text"
                          value={customNetworkForm.rpcUrl}
                          onChange={(e) => setCustomNetworkForm((p) => ({ ...p, rpcUrl: e.target.value }))}
                          placeholder="https://..."
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      <div className="md:col-span-4">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Explorer URL</label>
                        <input
                          type="text"
                          value={customNetworkForm.explorerUrl}
                          onChange={(e) => setCustomNetworkForm((p) => ({ ...p, explorerUrl: e.target.value }))}
                          placeholder="https://..."
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      <div className="md:col-span-12 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={testCustomNetworkRpc}
                          disabled={customNetworkTesting}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition disabled:opacity-50 active:scale-95"
                        >
                          <Activity className={`h-3.5 w-3.5 ${customNetworkTesting ? "animate-pulse" : ""}`} />
                          Test RPC
                        </button>

                        <button
                          type="button"
                          onClick={saveCustomNetworkAsActive}
                          disabled={customNetworkSaving}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition disabled:opacity-50 active:scale-95 shadow-md shadow-emerald-500/10"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Save & Set Active
                        </button>

                        <button
                          type="button"
                          onClick={loadChainConfig}
                          disabled={chainConfigLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition disabled:opacity-50"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${chainConfigLoading ? "animate-spin" : ""}`} />
                          Reload Active
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* LIVE RATE FEED CONFIGURATION */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold text-sm uppercase tracking-wider mb-2">
                <TrendingUp className="h-4.5 w-4.5 text-indigo-500" />
                <span>Live Rates Fetch Controller</span>
              </div>

              <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-slate-950/30 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Current Live Rate (USDT)</div>
                  <div className="font-mono text-lg font-extrabold text-emerald-600">
                    {liveRateNow !== null ? liveRateNow.toFixed(6) : "—"}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Source: <span className="font-bold">{form.liveRateSource}</span> · Symbol: <span className="font-bold">{form.exchTokenSymbol || "EXCH"}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void fetchLiveRateNow()}
                  disabled={liveRateLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold transition disabled:opacity-50 active:scale-95"
                >
                  <RefreshCw className={`h-4 w-4 ${liveRateLoading ? "animate-spin" : ""}`} />
                  Refresh Rate
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Rate Feed Source
                  </label>
                  <select
                    value={form.liveRateSource}
                    onChange={(e) => setForm(p => ({ ...p, liveRateSource: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    <option value="STATIC">Static Manual Value</option>
                    <option value="BINANCE">Binance Spot Markets API</option>
                    <option value="PUBLIC_DEX">PancakeSwap BSC DEX Tracker</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Static Rate (USDT)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    disabled={form.liveRateSource !== "STATIC"}
                    value={form.liveRateStatic}
                    onChange={(e) => setForm(p => ({ ...p, liveRateStatic: Number(e.target.value) || 1.0 }))}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold text-slate-800 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Fetch Interval
                  </label>
                  <select
                    disabled={form.liveRateSource === "STATIC"}
                    value={form.liveRateIntervalMinutes}
                    onChange={(e) => setForm(p => ({ ...p, liveRateIntervalMinutes: Number(e.target.value) || 15 }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold text-slate-800 focus:outline-none disabled:opacity-50"
                  >
                    <option value="5">Every 5 Minutes</option>
                    <option value="15">Every 15 Minutes</option>
                    <option value="30">Every 30 Minutes</option>
                    <option value="60">Every 60 Minutes</option>
                  </select>
                </div>
              </div>
            </div>

            {/* RESERVE WALLET SECTION */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold text-sm uppercase tracking-wider mb-2">
                <ShieldCheck className="h-4.5 w-4.5 text-indigo-500" />
                <span>Reserve Funding Wallet Credentials</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Reserve Wallet Address
                  </label>
                  <div className="relative">
                    <Wallet className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="0x..."
                      value={form.reserveWallet}
                      onChange={(e) => setForm(p => ({ ...p, reserveWallet: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Reserve Wallet Private Key
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type={showReserveKey ? "text" : "password"}
                      placeholder="Enter 64-character private key"
                      value={form.reservePrivateKey}
                      onChange={(e) => setForm(p => ({ ...p, reservePrivateKey: e.target.value }))}
                      onBlur={() => {
                        try {
                          if (!form.reservePrivateKey.trim()) return;
                          if (form.reserveWallet.trim()) return;
                          const addr = deriveAddressFromPrivateKey(form.reservePrivateKey);
                          setForm((p) => ({ ...p, reserveWallet: addr }));
                          toast.success("Reserve wallet address derived from private key");
                        } catch {
                          // ignore on blur; explicit button handles errors
                        }
                      }}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const addr = deriveAddressFromPrivateKey(form.reservePrivateKey);
                          setForm((p) => ({ ...p, reserveWallet: addr }));
                          toast.success("Reserve wallet address updated from private key");
                        } catch (err: any) {
                          toast.error(err?.message || "Failed to derive wallet address from private key");
                        }
                      }}
                      className="absolute right-10 top-3 text-slate-400 hover:text-slate-600"
                      title="Derive address from private key"
                    >
                      <Code className="h-4.5 w-4.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowReserveKey(!showReserveKey)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showReserveKey ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Balance Check Panel */}
              {form.reserveWallet && (
                <div className="mt-4 p-5 rounded-2xl border border-indigo-100/80 dark:border-slate-850 bg-indigo-50/10 dark:bg-slate-950/40 space-y-4 shadow-inner">
                  {/* Custom Network Toggle */}
                  <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/30">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4.5 w-4.5 text-indigo-600" />
                        <div>
                          <div className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">Custom Network (RPC)</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Uses the active `chain_rpc_profiles` for balance checks. Enable to create/activate a custom profile.
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setCustomNetworkEnabled((p) => !p)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                      >
                        {customNetworkEnabled ? <ToggleRight className="h-4.5 w-4.5 text-emerald-500" /> : <ToggleLeft className="h-4.5 w-4.5 text-slate-400" />}
                        {customNetworkEnabled ? "Enabled" : "Disabled"}
                      </button>
                    </div>

                    {customNetworkEnabled && (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Chain ID</label>
                          <input
                            type="text"
                            value={customNetworkForm.chainId}
                            onChange={(e) => setCustomNetworkForm((p) => ({ ...p, chainId: e.target.value }))}
                            placeholder="56"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>

                        <div className="md:col-span-6">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">RPC URL</label>
                          <input
                            type="text"
                            value={customNetworkForm.rpcUrl}
                            onChange={(e) => setCustomNetworkForm((p) => ({ ...p, rpcUrl: e.target.value }))}
                            placeholder="https://..."
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>

                        <div className="md:col-span-4">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Explorer URL</label>
                          <input
                            type="text"
                            value={customNetworkForm.explorerUrl}
                            onChange={(e) => setCustomNetworkForm((p) => ({ ...p, explorerUrl: e.target.value }))}
                            placeholder="https://..."
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>

                        <div className="md:col-span-12 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={testCustomNetworkRpc}
                            disabled={customNetworkTesting}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition disabled:opacity-50 active:scale-95"
                          >
                            <Activity className={`h-3.5 w-3.5 ${customNetworkTesting ? "animate-pulse" : ""}`} />
                            Test RPC
                          </button>

                          <button
                            type="button"
                            onClick={saveCustomNetworkAsActive}
                            disabled={customNetworkSaving}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition disabled:opacity-50 active:scale-95 shadow-md shadow-emerald-500/10"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Save & Set Active
                          </button>

                          <button
                            type="button"
                            onClick={loadChainConfig}
                            disabled={chainConfigLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition disabled:opacity-50"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${chainConfigLoading ? "animate-spin" : ""}`} />
                            Reload Active
                          </button>

                          {(() => {
                            const active = pickActiveChainProfile(chainConfig);
                            if (!active) return null;
                            return (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                Active:{" "}
                                <span className="font-mono text-slate-700 dark:text-slate-300">
                                  {active.chainId ? `chainId ${active.chainId}` : "chainId ?"} · {active.rpcUrl}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Live Reserve Balances</span>
                    </div>
                    <button
                      type="button"
                      onClick={checkBalances}
                      disabled={checkingBalances}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition disabled:opacity-50 active:scale-95 shadow-md shadow-indigo-500/10"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${checkingBalances ? "animate-spin" : ""}`} />
                      Check Balances
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center shadow-sm">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gas Token</span>
                      <span className="font-mono text-sm font-extrabold text-slate-800 dark:text-white break-all block">
                        {balances ? `${balances.bnb} ${nativeSymbol}` : "—"}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center shadow-sm">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">USDT Balance</span>
                      <span className="font-mono text-sm font-extrabold text-slate-800 dark:text-white break-all block">
                        {balances ? `${balances.usdt} USDT` : "—"}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center shadow-sm">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        {form.exchAssetMode === "TOKEN" ? (form.exchTokenSymbol || "Token") : nativeSymbol}
                      </span>
                      <span className="font-mono text-sm font-extrabold text-indigo-600 dark:text-indigo-400 break-all block">
                        {balances
                          ? form.exchAssetMode === "TOKEN"
                            ? `${balances.token} ${form.exchTokenSymbol}`
                            : `${balances.bnb} ${nativeSymbol}`
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* WITHDRAW WALLET SECTION */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold text-sm uppercase tracking-wider mb-2">
                <Wallet className="h-4.5 w-4.5 text-indigo-500" />
                <span>Company Withdraw Wallet Credentials</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Withdraw Wallet Address
                  </label>
                  <div className="relative">
                    <Wallet className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="0x..."
                      value={form.withdrawWallet || ""}
                      onChange={(e) => setForm(p => ({ ...p, withdrawWallet: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Withdraw Wallet Private Key
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type={showWithdrawKey ? "text" : "password"}
                      placeholder="Enter 64-character private key"
                      value={form.withdrawPrivateKey || ""}
                      onChange={(e) => setForm(p => ({ ...p, withdrawPrivateKey: e.target.value }))}
                      onBlur={() => {
                        try {
                          if (!form.withdrawPrivateKey?.trim()) return;
                          if (form.withdrawWallet?.trim()) return;
                          const addr = deriveAddressFromPrivateKey(form.withdrawPrivateKey);
                          setForm((p) => ({ ...p, withdrawWallet: addr }));
                          toast.success("Withdraw wallet address derived from private key");
                        } catch {
                          // ignore on blur; explicit button handles errors
                        }
                      }}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          if (!form.withdrawPrivateKey) return;
                          const addr = deriveAddressFromPrivateKey(form.withdrawPrivateKey);
                          setForm((p) => ({ ...p, withdrawWallet: addr }));
                          toast.success("Withdraw wallet address updated from private key");
                        } catch (err: any) {
                          toast.error(err?.message || "Failed to derive wallet address from private key");
                        }
                      }}
                      className="absolute right-10 top-3 text-slate-400 hover:text-slate-600"
                      title="Derive address from private key"
                    >
                      <Code className="h-4.5 w-4.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowWithdrawKey(!showWithdrawKey)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showWithdrawKey ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Withdraw Live Balance Check Panel */}
              {form.withdrawWallet && (
                <div className="mt-4 p-5 rounded-2xl border border-indigo-100/80 dark:border-slate-850 bg-indigo-50/10 dark:bg-slate-950/40 space-y-4 shadow-inner">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Live Withdraw Balances</span>
                    </div>
                    <button
                      type="button"
                      onClick={checkWithdrawBalances}
                      disabled={checkingWithdrawBalances}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition disabled:opacity-50 active:scale-95 shadow-md shadow-indigo-500/10"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${checkingWithdrawBalances ? "animate-spin" : ""}`} />
                      Check Balances
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center shadow-sm">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gas Token</span>
                      <span className="font-mono text-sm font-extrabold text-slate-800 dark:text-white break-all block">
                        {withdrawBalances ? `${withdrawBalances.bnb} ${nativeSymbol}` : "—"}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center shadow-sm">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">USDT Balance</span>
                      <span className="font-mono text-sm font-extrabold text-slate-800 dark:text-white break-all block">
                        {withdrawBalances ? `${withdrawBalances.usdt} USDT` : "—"}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center shadow-sm">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        {form.exchAssetMode === "TOKEN" ? (form.exchTokenSymbol || "Token") : nativeSymbol}
                      </span>
                      <span className="font-mono text-sm font-extrabold text-indigo-600 dark:text-indigo-400 break-all block">
                        {withdrawBalances
                          ? form.exchAssetMode === "TOKEN"
                            ? `${withdrawBalances.token} ${form.exchTokenSymbol}`
                            : `${withdrawBalances.bnb} ${nativeSymbol}`
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ROUTING CHANNEL SUB-FORMS */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold text-sm uppercase tracking-wider mb-4">
                <Sparkles className="h-4.5 w-4.5 text-amber-500" />
                <span>Configure 5 Routing Channels & Keys</span>
              </div>

              <div className="space-y-4">
                {form.routingWallets.map((wallet, index) => (
                  <div 
                    key={index} 
                    className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 space-y-3 relative hover:border-slate-200 dark:hover:border-slate-700 transition"
                  >
                    <div className="absolute left-0 top-4 px-2 py-0.5 rounded-r-md bg-indigo-500 text-[10px] font-extrabold text-white uppercase tracking-wider">
                      Route {index + 1}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
                      {/* KEY/LABEL - 3 cols */}
                      <div className="md:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Channel Label</label>
                        <input
                          type="text"
                          value={wallet.key}
                          onChange={(e) => handleWalletChange(index, "key", e.target.value)}
                          placeholder={`Route ${index + 1}`}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      {/* ADDRESS - 5 cols */}
                      <div className="md:col-span-5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Wallet Address</label>
                        <input
                          type="text"
                          value={wallet.address}
                          onChange={(e) => handleWalletChange(index, "address", e.target.value)}
                          placeholder="0x..."
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      {/* LIMIT - 2 cols */}
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Daily Limit</label>
                        <input
                          type="number"
                          value={wallet.limit || ""}
                          onChange={(e) => handleWalletChange(index, "limit", Number(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      {/* MIN BALANCE LIMIT - 2 cols */}
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Min Balance</label>
                        <input
                          type="number"
                          value={wallet.minBalance || ""}
                          onChange={(e) => handleWalletChange(index, "minBalance", Number(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* ROUTE LIVE BALANCE CHECK */}
                    {wallet.address?.trim() && (
                      <div className="mt-1 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-slate-950/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                              Live Route Balances
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => void checkRouteBalances(index)}
                            disabled={Boolean(checkingRouteBalances[index])}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[10px] font-extrabold transition disabled:opacity-50 active:scale-95 shadow-sm shadow-indigo-500/10"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${checkingRouteBalances[index] ? "animate-spin" : ""}`} />
                            Check Balances
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center shadow-sm">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Native</span>
                            <span className="font-mono text-xs font-extrabold text-slate-800 dark:text-white break-all block">
                              {routeBalances[index] ? `${routeBalances[index]!.bnb} BNB` : "—"}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center shadow-sm">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">USDT</span>
                            <span className="font-mono text-xs font-extrabold text-slate-800 dark:text-white break-all block">
                              {routeBalances[index] ? `${routeBalances[index]!.usdt} USDT` : "—"}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center shadow-sm">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{form.exchTokenSymbol || "Token"}</span>
                            <span className="font-mono text-xs font-extrabold text-indigo-600 dark:text-indigo-400 break-all block">
                              {routeBalances[index] ? `${routeBalances[index]!.token} ${form.exchTokenSymbol}` : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* PRIVATE KEY INPUT ROW */}
                    <div className="grid grid-cols-1 gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Private Key Credentials
                        </label>
                        <div className="relative">
                          <input
                            type={showRouteKeys[index] ? "text" : "password"}
                            placeholder="Enter 64-character private key for routing wallet"
                            value={wallet.privateKey}
                            onChange={(e) => handleWalletChange(index, "privateKey", e.target.value)}
                            onBlur={() => {
                              try {
                                const pk = String(wallet.privateKey || "").trim();
                                const addr = String(wallet.address || "").trim();
                                if (!pk) return;
                                if (addr) return;
                                const derived = deriveAddressFromPrivateKey(pk);
                                handleWalletChange(index, "address", derived);
                                toast.success(`Route ${index + 1} address derived from private key`);
                              } catch {
                                // ignore on blur; explicit button handles errors
                              }
                            }}
                            className="w-full pl-3 pr-10 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                const derived = deriveAddressFromPrivateKey(wallet.privateKey);
                                handleWalletChange(index, "address", derived);
                                toast.success(`Route ${index + 1} address updated from private key`);
                              } catch (err: any) {
                                toast.error(err?.message || "Failed to derive wallet address from private key");
                              }
                            }}
                            className="absolute right-9 top-2 text-slate-400 hover:text-slate-600"
                            title="Derive address from private key"
                          >
                            <Code className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleRouteKeyVisibility(index)}
                            className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                          >
                            {showRouteKeys[index] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BUTTONS */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex-1">
                <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950/30 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <ArrowLeftRight className="h-5 w-5 text-indigo-500" />
                      <div>
                        <div className="text-sm font-extrabold text-slate-800 dark:text-white">Test Transaction</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Sends a small test amount using stored reserve/route keys. Estimate gas first, then confirm transfer.
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Active RPC: <span className="font-mono">{activeChainProfile?.rpcUrl || "default"}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Asset</label>
                      <select
                        value={testAsset}
                        onChange={(e) => setTestAsset(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-white focus:outline-none"
                      >
                        <option value="native">{nativeSymbol} (Native)</option>
                        <option value="usdt">USDT</option>
                        {form.exchAssetMode === "TOKEN" && <option value="custom">{form.exchTokenSymbol || "TOKEN"} (Custom)</option>}
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">From Wallet</label>
                      <select
                        value={testSourceKind === "reserve" ? "reserve" : `route:${testRouteIndex}`}
                        onChange={(e) => {
                          const v = String(e.target.value);
                          if (v === "reserve") {
                            setTestSourceKind("reserve");
                            return;
                          }
                          if (v.startsWith("route:")) {
                            setTestSourceKind("route");
                            setTestRouteIndex(Number(v.split(":")[1] || 0) || 0);
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-white focus:outline-none"
                      >
                        <option value="reserve">Reserve Wallet</option>
                        {form.routingWallets.map((w, idx) =>
                          w.address?.trim() ? (
                            <option key={idx} value={`route:${idx}`}>
                              Route {idx + 1}
                            </option>
                          ) : null
                        )}
                      </select>
                    </div>

                    <div className="md:col-span-4">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Receiver Address</label>
                      <input
                        type="text"
                        value={testReceiver}
                        onChange={(e) => setTestReceiver(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono text-slate-800 dark:text-white focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={testAmount}
                        onChange={(e) => setTestAmount(e.target.value)}
                        placeholder="0.01"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={estimateTestTransfer}
                      disabled={estimatingTestTx}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold transition disabled:opacity-50 active:scale-95"
                    >
                      <Activity className={`h-4 w-4 ${estimatingTestTx ? "animate-pulse" : ""}`} />
                      Estimate Gas
                    </button>

                    <button
                      type="button"
                      onClick={sendTestTransfer}
                      disabled={sendingTestTx}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold transition disabled:opacity-50 active:scale-95 shadow-md shadow-emerald-500/10"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Confirm & Send
                    </button>

                    {testEstimate?.estimatedFeeNative && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Est fee:{" "}
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {Number(testEstimate.estimatedFeeNative).toFixed(6)} {nativeSymbol}
                        </span>{" "}
                        · Gas: <span className="font-mono">{testEstimate.gasLimit}</span>
                      </div>
                    )}

                    {testEstimate?.sent?.txHash && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        TX: <span className="font-mono">{testEstimate.sent.txHash}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-md shadow-indigo-500/10 active:scale-95 transition flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4.5 w-4.5" />
                    {form.id ? "Update Profile Settings" : "Save Profile Settings"}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition active:scale-95 font-semibold"
              >
                Reset Form
              </button>
            </div>
          </div>
        </div>

        {/* LIST PANEL - 5 cols */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-100 dark:border-slate-800 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-500" />
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Profile Control Deck</h2>
              </div>
              <button 
                onClick={loadProfiles} 
                className="text-indigo-600 dark:text-indigo-400 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-950 transition"
                disabled={loading}
              >
                <RefreshCw className={`h-4.5 w-4.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-400">Loading configurations...</div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-100 dark:border-slate-850 rounded-2xl">
                <Coins className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-semibold text-slate-600 dark:text-slate-400 mb-1">No exchange profiles</h3>
                <p className="text-xs text-slate-400 px-6 max-w-sm mx-auto">
                  Get started by filling out the form to save your company's exchange routing settings and credentials.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {profiles.map((profile) => {
                  const profilePrice = (Number(profile.id) === Number(form.id) && liveRateNow !== null)
                    ? liveRateNow 
                    : Number(profile.liveRateStatic || 1.0);
                  
                  const multiplier = Number(profile.exchMultiplier || 1.0);
                  const customTokensPerUsdt = profilePrice > 0 ? (1 / profilePrice) : 0;
                  const routedTokensPerUsdt = profilePrice > 0 ? (multiplier / profilePrice) : 0;

                  return (
                    <div 
                      key={profile.id}
                    className={`border rounded-2xl p-5 space-y-4 transition hover:shadow-md relative overflow-hidden ${
                      profile.isActive 
                        ? "border-emerald-200 bg-emerald-50/20 dark:bg-emerald-950/10 dark:border-emerald-900/50" 
                        : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950/30"
                    }`}
                  >
                    {/* Active Ribbon */}
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-white">{profile.profileName}</h3>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {profile.id}</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          profile.isEnabled 
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" 
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}>
                          {profile.isEnabled ? "Sweeper ON" : "Sweeper OFF"}
                        </span>
                        
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          profile.isActive 
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}>
                          {profile.isActive ? "active" : "inactive"}
                        </span>
                      </div>
                    </div>

                    {/* Token Spec Dashboard Summary */}
                    <div className="p-3.5 rounded-xl bg-indigo-50/30 dark:bg-slate-950 border border-indigo-100/50 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="block text-[9px] text-slate-400 uppercase font-bold">Token Spec</span>
                        <span className="font-extrabold text-indigo-950 dark:text-indigo-300">
                          {profile.exchTokenSymbol} ({profile.exchTokenName})
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 uppercase font-bold">Value Multiplier</span>
                        <span className="font-extrabold text-blue-600 dark:text-blue-400">{profile.exchMultiplier}x</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 uppercase font-bold">Price Source</span>
                        <span className="font-extrabold text-slate-700 dark:text-slate-300">{profile.liveRateSource}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 uppercase font-bold">Live Rate Price</span>
                        <span className="font-extrabold text-emerald-600 font-mono">
                          {profilePrice.toFixed(6)} USDT
                        </span>
                      </div>
                    </div>

                    {/* Live Conversion Rate Deck */}
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/40 via-blue-50/10 to-transparent dark:from-slate-900/60 dark:via-indigo-950/20 dark:to-transparent border border-indigo-100/50 dark:border-indigo-900/40 text-xs space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between border-b border-indigo-100/30 dark:border-slate-800 pb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Live Conversion Deck</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 font-mono">1 USDT Base</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="block text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1">Tokens Received per 1 USDT</span>
                          <span className="font-mono text-xs font-extrabold text-slate-800 dark:text-white break-all block">
                            {customTokensPerUsdt > 0 ? customTokensPerUsdt.toFixed(6) : "—"} {profile.exchTokenSymbol}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1">Routed Tokens (Multiplier Applied)</span>
                          <span className="font-mono text-xs font-extrabold text-blue-600 dark:text-blue-400 break-all block">
                            {routedTokensPerUsdt > 0 ? routedTokensPerUsdt.toFixed(6) : "—"} {profile.exchTokenSymbol}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Reserve Address & Key Info */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100/50 dark:border-slate-850 space-y-2">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Reserve wallet</div>
                        <div className="text-xs font-mono font-medium text-indigo-600 dark:text-indigo-400 break-all select-all">
                          {profile.reserveWallet}
                        </div>
                      </div>
                      
                      {profile.reservePrivateKey && (
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-2 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Reserve Private Key</span>
                            <button
                              type="button"
                              onClick={() => {
                                const pid = profile.id!;
                                setShowSavedReserveKeys(prev => ({
                                  ...prev,
                                  [pid]: !prev[pid]
                                }));
                              }}
                              className="text-[10px] text-indigo-500 hover:text-indigo-700 font-bold"
                            >
                              {showSavedReserveKeys[profile.id!] ? "Hide Key" : "Reveal Key"}
                            </button>
                          </div>
                          <div className="text-xs font-mono text-slate-600 dark:text-slate-400 break-all">
                            {showSavedReserveKeys[profile.id!] 
                              ? profile.reservePrivateKey 
                              : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"
                            }
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Withdraw Address & Key Info */}
                    {profile.withdrawWallet && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100/50 dark:border-slate-850 space-y-2">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Withdraw wallet</div>
                          <div className="text-xs font-mono font-medium text-indigo-600 dark:text-indigo-400 break-all select-all">
                            {profile.withdrawWallet}
                          </div>
                        </div>
                        
                        {profile.withdrawPrivateKey && (
                          <div className="border-t border-slate-100 dark:border-slate-800 pt-2 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Withdraw Private Key</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const pid = profile.id!;
                                  setShowSavedWithdrawKeys(prev => ({
                                    ...prev,
                                    [pid]: !prev[pid]
                                  }));
                                }}
                                className="text-[10px] text-indigo-500 hover:text-indigo-700 font-bold"
                              >
                                {showSavedWithdrawKeys[profile.id!] ? "Hide Key" : "Reveal Key"}
                              </button>
                            </div>
                            <div className="text-xs font-mono text-slate-600 dark:text-slate-400 break-all">
                              {showSavedWithdrawKeys[profile.id!] 
                                ? profile.withdrawPrivateKey 
                                : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"
                              }
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Routing Wallets Mini List */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Routing Channels</div>
                      <div className="space-y-2">
                        {profile.routingWallets
                          .filter((w) => w.address.trim() !== "")
                          .map((w, idx) => {
                            const routeKey = `${profile.id}-${idx}`;
                            const hasPrivateKey = !!w.privateKey;
                            return (
                              <div key={idx} className="p-2.5 rounded-lg bg-slate-50/50 dark:bg-slate-900/40 text-[11px] space-y-2">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                  <div className="space-y-0.5">
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{w.key}</span>
                                    <div className="font-mono text-slate-400 text-[10px] break-all select-all">{w.address}</div>
                                  </div>
                                  <div className="flex gap-2 text-slate-500 font-semibold self-start sm:self-center">
                                    <span className="text-blue-600 dark:text-blue-400">Limit: {w.limit}</span>
                                    <span className="text-amber-600 dark:text-amber-500">Min: {w.minBalance}</span>
                                  </div>
                                </div>

                                {hasPrivateKey && (
                                  <div className="border-t border-slate-100 dark:border-slate-800/80 pt-1.5 space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase">Channel Key</span>
                                      <button
                                        type="button"
                                        onClick={() => toggleSavedRouteKeyVisibility(profile.id!, idx)}
                                        className="text-[9px] text-indigo-500 hover:text-indigo-700 font-bold"
                                      >
                                        {showSavedRouteKeys[routeKey] ? "Hide" : "Reveal"}
                                      </button>
                                    </div>
                                    <div className="font-mono text-[10px] text-slate-500 dark:text-slate-455 break-all">
                                      {showSavedRouteKeys[routeKey] 
                                        ? w.privateKey 
                                        : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"
                                      }
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        {profile.routingWallets.filter((w) => w.address.trim() !== "").length === 0 && (
                          <div className="text-xs text-slate-400 italic">No active routing channels configured.</div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleEdit(profile)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 transition active:scale-95"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetStatus(profile.id!, profile.isActive)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                          profile.isActive
                            ? "border border-amber-200 text-amber-700 hover:bg-amber-50/50"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        }`}
                      >
                        <Power className="h-3.5 w-3.5" />
                        {profile.isActive ? "Deactivate" : "Activate"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(profile.id!)}
                        className="ml-auto p-1.5 rounded-lg hover:bg-red-50 text-red-600 dark:text-red-400 transition active:scale-95"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>

          {/* FAILED SWEEPS & RETRY QUEUE */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-100 dark:border-slate-800 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Failed Sweeps & Retry Queue</h2>
              </div>
              <button 
                onClick={loadFailures} 
                className="text-amber-600 dark:text-amber-400 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-950 transition animate-hover"
                disabled={failuresLoading}
                title="Refresh failure queue"
              >
                <RefreshCw className={`h-4.5 w-4.5 ${failuresLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {failuresLoading ? (
              <div className="text-center py-12 text-slate-400">Loading failed sweep queue...</div>
            ) : failures.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-100 dark:border-slate-850 rounded-2xl">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                <h3 className="font-semibold text-slate-600 dark:text-slate-400 mb-1">Queue is Clear!</h3>
                <p className="text-xs text-slate-400 px-6 max-w-sm mx-auto">
                  All exchange sweeps have executed successfully. There are no outstanding routing failures.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {failures.map((fail) => {
                  const isRetrying = retryingFailureId === fail.id;
                  const isSuccess = fail.status === "SUCCESS";
                  return (
                    <div 
                      key={fail.id}
                      className={`border rounded-2xl p-4 space-y-3 transition hover:shadow-md relative overflow-hidden ${
                        isSuccess 
                          ? "border-emerald-200 bg-emerald-50/20 dark:bg-emerald-950/10 dark:border-emerald-900/50" 
                          : "border-amber-200 bg-amber-50/20 dark:bg-amber-950/10 dark:border-amber-900/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                              Order ID: #{fail.orderId}
                            </span>
                            <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              isSuccess 
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                                : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                            }`}>
                              {fail.status}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(fail.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase">Package value</span>
                          <span className="font-extrabold text-slate-800 dark:text-white font-mono text-sm">
                            ${fail.packageAmount}
                          </span>
                        </div>
                      </div>

                      {/* Details list */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100/50 dark:border-slate-850 space-y-2 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="block text-[9px] text-slate-400 uppercase font-bold">Lacking Type</span>
                            <span className="font-extrabold text-amber-600 dark:text-amber-400">
                              {fail.lackingType}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-slate-400 uppercase font-bold">Lacking Amount</span>
                            <span className="font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                              {fail.lackingAmount}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 border-t border-slate-100/50 dark:border-slate-800/50 pt-2">
                          <div>
                            <span className="block text-[9px] text-slate-400 uppercase font-bold">Member Wallet</span>
                            <span 
                              className="font-mono font-medium text-indigo-600 dark:text-indigo-400 break-all select-all hover:underline cursor-pointer"
                              title="Click to copy full address"
                              onClick={() => {
                                void navigator.clipboard.writeText(fail.walletAddress);
                                toast.success("Member wallet address copied!");
                              }}
                            >
                              {fail.walletAddress ? `${fail.walletAddress.slice(0, 6)}...${fail.walletAddress.slice(-4)}` : "unknown"}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-slate-400 uppercase font-bold">Required Gas Cost</span>
                            <span className="font-mono font-extrabold text-slate-700 dark:text-slate-300">
                              {fail.gasRequired}
                            </span>
                          </div>
                        </div>

                        {fail.errorMessage && (
                          <div className="border-t border-slate-100/50 dark:border-slate-800/50 pt-2">
                            <span className="block text-[9px] text-slate-400 uppercase font-bold mb-0.5">Error Log</span>
                            <div className="p-2 rounded bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-mono text-[10px] whitespace-pre-wrap break-all border border-rose-100/30 dark:border-rose-900/10">
                              {fail.errorMessage}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      {!isSuccess && (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            disabled={isRetrying}
                            onClick={() => void handleRetryFailure(fail.id)}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-bold transition disabled:opacity-50 active:scale-95 shadow-md shadow-amber-500/10"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`} />
                            {isRetrying ? "Retrying Sweep..." : "Retry Sweep Order"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
