"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { AxiosError } from "axios";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type ManagerMode = "super" | "company";
type ChainEnvironment = "production" | "developer";
type ChainStatus = "active" | "inactive";
type PaymentAssetType = "native" | "erc20";

interface ChainCatalogItem {
  chainKey: string;
  chainName: string;
  chainId: number;
  environment: ChainEnvironment;
  isTestnet: boolean;
  defaultRpc: string;
  explorerUrl: string;
}

interface ChainProfile {
  id: string;
  chainKey: string;
  chainName: string;
  chainId: number | null;
  rpcUrl: string;
  explorerUrl: string;
  contractAddress: string;
  receiverAddress: string;
  paymentAssetType: PaymentAssetType;
  paymentAssetSymbol: string;
  tokenAddress: string;
  tokenDecimals: number;
  isTestnet: boolean;
  status: ChainStatus;
  updatedAt?: string;
  createdAt?: string;
}

interface ChainConfig {
  version: number;
  production: { activeProfileId: string | null; profiles: ChainProfile[] };
  developer: { activeProfileId: string | null; profiles: ChainProfile[] };
}

interface RpcProbe {
  chainId: number;
  networkName: string;
  latestBlock: number;
}

const defaultProfile: ChainProfile = {
  id: "",
  chainKey: "",
  chainName: "",
  chainId: null,
  rpcUrl: "",
  explorerUrl: "",
  contractAddress: "",
  receiverAddress: "",
  paymentAssetType: "native",
  paymentAssetSymbol: "BNB",
  tokenAddress: "",
  tokenDecimals: 18,
  isTestnet: false,
  status: "inactive",
};

const defaultConfig: ChainConfig = {
  version: 2,
  production: { activeProfileId: null, profiles: [] },
  developer: { activeProfileId: null, profiles: [] },
};

function normalizeProfile(profile: Partial<ChainProfile> | undefined, environment: ChainEnvironment): ChainProfile {
  const paymentAssetType: PaymentAssetType = profile?.paymentAssetType === "erc20" ? "erc20" : "native";
  return {
    ...defaultProfile,
    ...profile,
    chainId: profile?.chainId ?? null,
    contractAddress: String(profile?.contractAddress || "").trim(),
    receiverAddress: String(profile?.receiverAddress || profile?.contractAddress || "").trim(),
    paymentAssetType,
    paymentAssetSymbol: String(profile?.paymentAssetSymbol || (paymentAssetType === "erc20" ? "USDT" : "BNB")).trim().toUpperCase(),
    tokenAddress: String(profile?.tokenAddress || "").trim(),
    tokenDecimals: Number(profile?.tokenDecimals ?? 18) || 18,
    isTestnet: Boolean(profile?.isTestnet ?? (environment === "developer")),
    status: profile?.status === "active" ? "active" : "inactive",
  };
}

export function ChainProfileManager({ mode }: { mode: ManagerMode }) {
  const { user } = useAuth();
  const authCompanyId = Number(user?.company_id || 0) || 0;
  const isSuperAdmin = useMemo(() => user?.role_id === 1 || user?.role === "SUPER_ADMIN", [user]);
  const isCompanyAdmin = useMemo(() => user?.role === "COMPANY_ADMIN", [user]);
  const canAccess = mode === "super" ? isSuperAdmin : isSuperAdmin || isCompanyAdmin;

  const [companyId, setCompanyId] = useState(authCompanyId ? String(authCompanyId) : "1");
  const [environment, setEnvironment] = useState<ChainEnvironment>("production");
  const [config, setConfig] = useState<ChainConfig>(defaultConfig);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [probe, setProbe] = useState<RpcProbe | null>(null);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogItems, setCatalogItems] = useState<ChainCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [form, setForm] = useState<ChainProfile>(normalizeProfile(undefined, "production"));

  useEffect(() => {
    if (mode === "company" && authCompanyId) {
      setCompanyId(String(authCompanyId));
    }
  }, [authCompanyId, mode]);

  const effectiveCompanyId = useMemo(() => {
    if (mode === "company") {
      return authCompanyId;
    }
    return Number(companyId) || 0;
  }, [authCompanyId, companyId, mode]);

  const scopedProfiles = config[environment].profiles || [];

  const resetForm = useCallback(() => {
    setForm(normalizeProfile(undefined, environment));
    setProbe(null);
  }, [environment]);

  const loadConfig = useCallback(async () => {
    if (!canAccess || !effectiveCompanyId) return;

    setLoading(true);
    try {
      const res = await api.get("/admin/chain-config", {
        params: { companyId: effectiveCompanyId },
      });

      const payload = res.data?.data?.config as ChainConfig | undefined;
      setConfig(payload || defaultConfig);
      setProbe(null);
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to load chain config");
    } finally {
      setLoading(false);
    }
  }, [canAccess, effectiveCompanyId]);

  const searchCatalog = useCallback(async (q: string) => {
    if (!canAccess) return;

    setCatalogLoading(true);
    try {
      const res = await api.get("/admin/chain-catalog", {
        params: { q, environment },
      });
      setCatalogItems((res.data?.data || []) as ChainCatalogItem[]);
    } catch {
      setCatalogItems([]);
    } finally {
      setCatalogLoading(false);
    }
  }, [canAccess, environment]);

  useEffect(() => {
    if (canAccess && effectiveCompanyId) {
      void loadConfig();
    }
  }, [canAccess, effectiveCompanyId, loadConfig]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!canAccess) return;
      void searchCatalog(catalogQuery.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [canAccess, catalogQuery, searchCatalog]);

  const loadForEdit = (profile: ChainProfile) => {
    setForm(normalizeProfile(profile, environment));
  };

  const autofillFromCatalog = (item: ChainCatalogItem) => {
    setForm((prev) =>
      normalizeProfile(
        {
          ...prev,
          chainKey: item.chainKey,
          chainName: item.chainName,
          chainId: item.chainId,
          rpcUrl: item.defaultRpc,
          explorerUrl: item.explorerUrl,
          isTestnet: item.isTestnet,
        },
        environment
      )
    );
  };

  const saveProfile = async () => {
    if (!effectiveCompanyId) {
      toast.error("Company scope is missing");
      return;
    }

    if (!form.rpcUrl.trim()) {
      toast.error("RPC URL is required");
      return;
    }

    if (!form.receiverAddress.trim()) {
      toast.error("Receiver address is required");
      return;
    }

    if (form.paymentAssetType === "erc20" && !form.tokenAddress.trim()) {
      toast.error("Token contract address is required for ERC-20 payments");
      return;
    }

    setSaving(true);
    try {
      await api.post("/admin/chain-config/profile", {
        companyId: effectiveCompanyId,
        environment,
        profile: {
          ...form,
          isTestnet: environment === "developer" ? true : form.isTestnet,
        },
      });
      toast.success("Chain profile saved");
      await loadConfig();
      resetForm();
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to save chain profile");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (profile: ChainProfile, status: ChainStatus) => {
    try {
      await api.patch(`/admin/chain-config/profile/${profile.id}/status`, {
        companyId: effectiveCompanyId,
        environment,
        status,
      });
      toast.success(`Profile ${status}`);
      await loadConfig();
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to update status");
    }
  };

  const deleteProfile = async (profile: ChainProfile) => {
    try {
      await api.delete(`/admin/chain-config/profile/${profile.id}`, {
        params: { companyId: effectiveCompanyId, environment },
      });
      toast.success("Profile deleted");
      await loadConfig();
      if (form.id === profile.id) {
        resetForm();
      }
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to delete profile");
    }
  };

  const testRpc = async () => {
    if (!form.rpcUrl.trim()) {
      toast.error("RPC URL is required");
      return;
    }

    setTesting(true);
    setProbe(null);
    try {
      const res = await api.post("/admin/chain-config/test", { rpcUrl: form.rpcUrl });
      setProbe(res.data?.data as RpcProbe);
      toast.success("RPC test passed");
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "RPC test failed");
    } finally {
      setTesting(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="p-8 text-red-600">
        {mode === "super"
          ? "Only Super Admin can access Developer Operations."
          : "Only Super Admin or Company Admin can manage payment channels."}
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">
          {mode === "super" ? "Developer Operations" : "Company Payment Channels"}
        </h1>
        <p className="text-gray-500">
          {mode === "super"
            ? "Per-company chain profiles for production and developer(testnet) environments."
            : "Configure production and testnet payment channels, receiver wallets, and token contracts for this company."}
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-5 space-y-4">
        <div className={`grid grid-cols-1 ${mode === "super" ? "md:grid-cols-3" : "md:grid-cols-2"} gap-3`}>
          {mode === "super" ? (
            <div>
              <label className="block text-sm font-medium mb-1">Company ID</label>
              <input
                type="number"
                min={1}
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
              />
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium mb-1">Environment</label>
            <select
              value={environment}
              onChange={(e) => {
                const nextEnvironment = e.target.value as ChainEnvironment;
                setEnvironment(nextEnvironment);
                setForm((prev) => normalizeProfile({ ...prev, isTestnet: nextEnvironment === "developer" }, nextEnvironment));
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
            >
              <option value="production">Production Chains</option>
              <option value="developer">Developer/Testnet Chains</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void loadConfig()}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600"
              disabled={loading || !effectiveCompanyId}
            >
              {loading ? "Loading..." : "Load Company Config"}
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
          <label className="block text-sm font-medium mb-2">Live Chain Search & Autofill</label>
          <input
            type="text"
            value={catalogQuery}
            onChange={(e) => setCatalogQuery(e.target.value)}
            placeholder="Search chain name, key, or chain id"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
          />

          <div className="mt-2 max-h-40 overflow-auto space-y-1">
            {catalogLoading ? (
              <div className="text-sm text-slate-500">Searching...</div>
            ) : catalogItems.length === 0 ? (
              <div className="text-sm text-slate-500">No suggestions</div>
            ) : (
              catalogItems.map((item) => (
                <button
                  key={`${item.chainKey}-${item.environment}`}
                  type="button"
                  onClick={() => autofillFromCatalog(item)}
                  className="w-full text-left px-3 py-2 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  <div className="text-sm font-medium">{item.chainName}</div>
                  <div className="text-xs text-slate-500">{item.chainKey} | chainId {item.chainId}</div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-5 space-y-3">
          <h2 className="text-lg font-semibold">Chain Profile Form</h2>
          <input
            type="text"
            value={form.chainName}
            onChange={(e) => setForm((p) => ({ ...p, chainName: e.target.value }))}
            placeholder="Chain name"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
          />
          <input
            type="text"
            value={form.chainKey}
            onChange={(e) => setForm((p) => ({ ...p, chainKey: e.target.value }))}
            placeholder="Chain key (e.g. bsc-mainnet)"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
          />
          <input
            type="number"
            value={form.chainId ?? ""}
            onChange={(e) => setForm((p) => ({ ...p, chainId: Number(e.target.value) || null }))}
            placeholder="Chain id"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
          />
          <input
            type="text"
            value={form.rpcUrl}
            onChange={(e) => setForm((p) => ({ ...p, rpcUrl: e.target.value }))}
            placeholder="RPC URL"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
          />
          <input
            type="text"
            value={form.explorerUrl}
            onChange={(e) => setForm((p) => ({ ...p, explorerUrl: e.target.value }))}
            placeholder="Explorer URL (optional)"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Payment Channel</label>
              <select
                value={form.paymentAssetType}
                onChange={(e) => {
                  const nextType = e.target.value as PaymentAssetType;
                  setForm((p) => ({
                    ...p,
                    paymentAssetType: nextType,
                    paymentAssetSymbol: nextType === "erc20" ? "USDT" : "BNB",
                    tokenAddress: nextType === "erc20" ? p.tokenAddress : "",
                    tokenDecimals: nextType === "erc20" ? p.tokenDecimals || 18 : 18,
                  }));
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
              >
                <option value="native">Native BNB</option>
                <option value="erc20">USDT Token</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Asset Symbol</label>
              <input
                type="text"
                value={form.paymentAssetSymbol}
                onChange={(e) => setForm((p) => ({ ...p, paymentAssetSymbol: e.target.value.toUpperCase() }))}
                placeholder="BNB or USDT"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <input
            type="text"
            value={form.receiverAddress}
            onChange={(e) => setForm((p) => ({ ...p, receiverAddress: e.target.value, contractAddress: e.target.value }))}
            placeholder="Receiver wallet address"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
          />

          {form.paymentAssetType === "erc20" ? (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-3">
              <input
                type="text"
                value={form.tokenAddress}
                onChange={(e) => setForm((p) => ({ ...p, tokenAddress: e.target.value }))}
                placeholder="USDT token contract address"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
              />
              <input
                type="number"
                min={0}
                value={form.tokenDecimals}
                onChange={(e) => setForm((p) => ({ ...p, tokenDecimals: Number(e.target.value) || 18 }))}
                placeholder="Decimals"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
              />
            </div>
          ) : null}

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isTestnet}
              onChange={(e) => setForm((p) => ({ ...p, isTestnet: e.target.checked }))}
            />
            Is testnet
          </label>

          <div className="flex gap-2">
            <button type="button" onClick={() => void testRpc()} disabled={testing} className="px-3 py-2 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50">
              {testing ? "Testing..." : "Test RPC"}
            </button>
            <button type="button" onClick={() => void saveProfile()} disabled={saving} className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
              {saving ? "Saving..." : form.id ? "Update Profile" : "Save Profile"}
            </button>
            <button type="button" onClick={resetForm} className="px-3 py-2 rounded-lg border">Reset</button>
          </div>

          {probe ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <div><strong>Chain ID:</strong> {probe.chainId}</div>
              <div><strong>Network:</strong> {probe.networkName}</div>
              <div><strong>Latest Block:</strong> {probe.latestBlock}</div>
            </div>
          ) : null}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-5 space-y-3">
          <h2 className="text-lg font-semibold">{environment === "production" ? "Production" : "Developer/Testnet"} Profiles</h2>

          {scopedProfiles.length === 0 ? (
            <div className="text-sm text-slate-500">No profiles configured for this environment.</div>
          ) : (
            <div className="space-y-2">
              {scopedProfiles.map((profile) => {
                const normalizedProfile = normalizeProfile(profile, environment);
                const isActive = normalizedProfile.status === "active" || config[environment].activeProfileId === normalizedProfile.id;
                return (
                  <div key={normalizedProfile.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">{normalizedProfile.chainName} {normalizedProfile.isTestnet ? "(Testnet)" : ""}</div>
                        <div className="text-xs text-slate-500">{normalizedProfile.chainKey} | chainId {normalizedProfile.chainId ?? "N/A"}</div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                        {isActive ? "active" : "inactive"}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600">
                      Channel: {normalizedProfile.paymentAssetType === "erc20" ? `${normalizedProfile.paymentAssetSymbol} token` : `${normalizedProfile.paymentAssetSymbol} native`}
                    </div>
                    <div className="text-xs break-all text-slate-600">RPC: {normalizedProfile.rpcUrl}</div>
                    <div className="text-xs break-all text-slate-600">Receiver: {normalizedProfile.receiverAddress || "Not set"}</div>
                    {normalizedProfile.paymentAssetType === "erc20" ? (
                      <div className="text-xs break-all text-slate-600">
                        Token: {normalizedProfile.tokenAddress || "Not set"} | decimals {normalizedProfile.tokenDecimals}
                      </div>
                    ) : null}

                    <div className="flex gap-2">
                      <button type="button" className="px-2 py-1 text-xs rounded border" onClick={() => loadForEdit(normalizedProfile)}>Edit</button>
                      {isActive ? (
                        <button type="button" className="px-2 py-1 text-xs rounded border" onClick={() => void setStatus(normalizedProfile, "inactive")}>Deactivate</button>
                      ) : (
                        <button type="button" className="px-2 py-1 text-xs rounded border" onClick={() => void setStatus(normalizedProfile, "active")}>Activate</button>
                      )}
                      <button type="button" className="px-2 py-1 text-xs rounded border text-red-600" onClick={() => void deleteProfile(normalizedProfile)}>Delete</button>
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
