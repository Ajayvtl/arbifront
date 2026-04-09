"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, BadgeCheck, LockKeyhole, Loader2, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import { BrowserProvider, Contract, formatUnits } from "ethers";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { DAPP_CHAIN, ERC20_BALANCE_ABI } from "@/lib/dappConfig";
import { getInjectedProvider, type Eip1193Provider } from "@/lib/injectedWallet";
import BrandLogo from "@/components/dapp/BrandLogo";

interface AuthApiUser {
  id?: number | string;
  companyId?: number | null;
  company_id?: number | null;
  referralCode?: string;
}

interface AuthApiPayload {
  token?: string;
  user?: AuthApiUser;
}

interface MemberSessionUser {
  id: number;
  name: string;
  email: string;
  role: "USER";
  role_id: number;
  company_id: number | null;
  referral_code?: string;
  wallet_address: string;
}

const DEFAULT_COMPANY_ID = 1;

type WalletPermission = {
  parentCapability?: string;
  caveats?: Array<{ type?: string; value?: unknown }>;
};

function clearWalletConnectState() {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key.startsWith("wc@2:") ||
        key.startsWith("W3M_") ||
        key.startsWith("web3modal") ||
        key === "WALLETCONNECT_DEEPLINK_CHOICE"
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    window.indexedDB?.deleteDatabase("WALLET_CONNECT_V2_INDEXED_DB");
  } catch {
    // best effort
  }
}

function buildMetaMaskDeepLink(targetUrl: string) {
  try {
    const parsed = new URL(targetUrl);
    const explicitUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
    return `metamask://dapp/${explicitUrl}`;
  } catch {
    const explicitUrl = /^https?:\/\//i.test(targetUrl) ? targetUrl : `http://${targetUrl}`;
    return `metamask://dapp/${explicitUrl}`;
  }
}

function buildTokenPocketDeepLink(targetUrl: string) {
  const params = {
    url: targetUrl,
    chain: "BSC",
    source: "rms-panel-user",
  };
  return `tpdapp://open?params=${encodeURIComponent(JSON.stringify(params))}`;
}

async function resetMetaMaskPermissions(provider: Eip1193Provider | null) {
  if (!provider?.isMetaMask) return false;

  try {
    await provider.request({
      method: "wallet_revokePermissions",
      params: [{ eth_accounts: {} }],
    });
    return true;
  } catch {
    return false;
  }
}

async function hasUnsupportedMetaMaskScope(provider: Eip1193Provider | null) {
  if (!provider?.isMetaMask) return false;

  try {
    const permissions = (await provider.request({
      method: "wallet_getPermissions",
    })) as WalletPermission[];

    return permissions.some((permission) => {
      if (permission.parentCapability === "endowment:caip25") return true;
      return (permission.caveats || []).some((caveat) =>
        JSON.stringify(caveat?.value || "").includes("eip155:102025")
      );
    });
  } catch {
    return false;
  }
}

function getWalletErrorMessage(error: unknown): string {
  const serverMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  if (serverMessage) return serverMessage;

  const rawMessage = String((error as { message?: string })?.message || "");
  if (
    rawMessage.includes("authorizedScopes") ||
    rawMessage.includes("eip155:102025") ||
    rawMessage.includes("unsupported chain")
  ) {
    return "Wallet permission scope mismatch. Reconnect and try again.";
  }
  if (rawMessage.includes("User rejected") || rawMessage.includes("user rejected")) {
    return "You rejected the wallet request. Please approve and retry.";
  }
  return rawMessage || "Wallet authentication failed";
}

function persistMemberSession(token: string, user: MemberSessionUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("availableHotels", JSON.stringify([]));
  localStorage.removeItem("currentHotel");
}

export default function DappLoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [walletAddress, setWalletAddress] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [sponsorId, setSponsorId] = useState("");
  const [isWalletBrowser, setIsWalletBrowser] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    const next = params.get("next");
    if (ref) {
      setReferralCode(ref);
      sessionStorage.setItem("referralCode", ref);
    } else {
      const stored = sessionStorage.getItem("referralCode");
      if (stored) setReferralCode(stored);
    }
    if (next?.startsWith("/dapp/")) {
      sessionStorage.setItem("postLoginRedirect", next);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    const rawUser = localStorage.getItem("user");
    if (!token || !rawUser) return;
    try {
      const user = JSON.parse(rawUser) as { role?: string };
      if (user?.role === "USER") {
        router.replace("/dapp/dashboard");
      }
    } catch {
      // ignore malformed cached user
    }
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const provider = getInjectedProvider();
    const ua = navigator.userAgent || "";
    const mobileDetected = /Android|iPhone|iPad|iPod|Mobile|CriOS|FxiOS/i.test(ua);
    const detected =
      Boolean(provider?.isTokenPocket) ||
      Boolean(provider?.isTrust) ||
      (Boolean(provider?.isMetaMask) && /MetaMaskMobile/i.test(ua)) ||
      /Trust/i.test(ua) ||
      /TokenPocket|TP\//i.test(ua);
    setIsMobileDevice(mobileDetected);
    setIsWalletBrowser(detected);
  }, []);

  useEffect(() => {
    if (!loading) {
      setElapsedSec(0);
      return;
    }
    const timer = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [loading]);

  const authenticate = useCallback(async () => {
    let provider: Eip1193Provider | null = null;
    try {
      setLoading(true);
      setError("");
      setStatus("Detecting wallet session...");

      const injectedProvider = getInjectedProvider();
      provider = injectedProvider;

      if (!provider) {
        setStatus("");
        throw new Error("No injected wallet detected. Open this page in MetaMask / Trust Wallet / TokenPocket, or enable your wallet extension.");
        return;
      }

      if (await hasUnsupportedMetaMaskScope(provider)) {
        setStatus("Resetting stale wallet permissions...");
        await resetMetaMaskPermissions(provider);
        clearWalletConnectState();
      }

      setStatus("Requesting wallet account...");
      const existing = (await provider.request({ method: "eth_accounts" })) as string[] | undefined;
      if (!Array.isArray(existing) || existing.length === 0) {
        await provider.request({ method: "eth_requestAccounts" });
      }

      const ethersProvider = new BrowserProvider(provider as unknown as never);
      const signer = await ethersProvider.getSigner();
      const signerAddress = await signer.getAddress();
      setWalletAddress(signerAddress);

      setStatus("Getting secure nonce...");
      const nonceRes = await api.post("/auth/wallet/nonce", {
        walletAddress: signerAddress,
        companyId: DEFAULT_COMPANY_ID,
      }, { timeout: 15000 });
      const nonce = (nonceRes.data?.data || nonceRes.data)?.nonce as string | undefined;
      if (!nonce) throw new Error("Failed to receive nonce from server.");

      setStatus("Waiting for signature...");
      const signature = await signer.signMessage(nonce);

      setStatus("Verifying session...");
      const parsedSponsorId = Number(sponsorId);
      const verifyRes = await api.post("/auth/wallet/verify", {
        walletAddress: signerAddress,
        signature,
        companyId: DEFAULT_COMPANY_ID,
        sponsorId: Number.isFinite(parsedSponsorId) && parsedSponsorId > 0 ? parsedSponsorId : null,
        referralCode: referralCode.trim() || null,
      }, { timeout: 20000 });

      const payload = (verifyRes.data?.data || verifyRes.data) as AuthApiPayload;
      if (!payload?.token || !payload?.user) {
        throw new Error("Invalid authentication response");
      }

      const memberUser: MemberSessionUser = {
        id: Number(payload.user.id || 0),
        name: "Member",
        email: "",
        role: "USER",
        role_id: 5,
        company_id: payload.user.companyId ?? payload.user.company_id ?? DEFAULT_COMPANY_ID,
        referral_code: payload.user.referralCode,
        wallet_address: signerAddress,
      };

      persistMemberSession(payload.token, memberUser);
      login(payload.token, memberUser, [], []);

      void (async () => {
        try {
          const usdtContract = new Contract(DAPP_CHAIN.usdtContractAddress, ERC20_BALANCE_ABI, ethersProvider);
          const [raw, dec] = await Promise.all([
            usdtContract.balanceOf(signerAddress),
            usdtContract.decimals(),
          ]);
          const usdtBalance = formatUnits(raw as bigint, Number(dec));
          sessionStorage.setItem("walletUsdtBnb", usdtBalance);
        } catch {
          // non-blocking
        }
      })();

      const next = sessionStorage.getItem("postLoginRedirect");
      const target = next && next.startsWith("/dapp/") ? next : "/dapp/dashboard";
      setStatus("Authentication successful. Opening dashboard...");
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("postLoginRedirect");
        window.location.replace(target);
      }
      return;
    } catch (authErr: unknown) {
      const rawMessage = String((authErr as { message?: string })?.message || "");
      if (rawMessage.includes("authorizedScopes") || rawMessage.includes("eip155:102025")) {
        await resetMetaMaskPermissions(provider);
        clearWalletConnectState();
      }
      const message = getWalletErrorMessage(authErr);
      setError(message);
      setStatus("");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [login, referralCode, sponsorId]);

  const progress = useMemo(() => {
    if (!status) return 0;
    if (status.includes("Detecting")) return 10;
    if (status.includes("Open wallet app")) return 20;
    if (status.includes("Waiting for wallet connection")) return 30;
    if (status.includes("Requesting wallet account")) return 45;
    if (status.includes("Getting secure nonce")) return 65;
    if (status.includes("Waiting for signature")) return 78;
    if (status.includes("Verifying session")) return 90;
    if (status.includes("Redirecting")) return 100;
    return 15;
  }, [status]);

  const dappUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    // Include the search parameters (e.g. ?ref=XYZ) so they survive the deep link to the wallet app
    return `${window.location.origin}/dapp/login${window.location.search}`;
  }, []);

  const metamaskDeepLink = useMemo(() => {
    if (!dappUrl) return "#";
    return buildMetaMaskDeepLink(dappUrl);
  }, [dappUrl]);

  const trustWalletDeepLink = useMemo(() => {
    if (!dappUrl) return "#";
    return `https://link.trustwallet.com/open_url?coin_id=20000714&url=${encodeURIComponent(dappUrl)}`;
  }, [dappUrl]);

  const tokenPocketDeepLink = useMemo(() => {
    if (!dappUrl) return "#";
    return buildTokenPocketDeepLink(dappUrl);
  }, [dappUrl]);

  const securityItems = [
    { icon: ShieldCheck, label: "Verified" },
    { icon: LockKeyhole, label: "Encrypted" },
    { icon: BadgeCheck, label: "Trusted" },
  ];
  const showWalletPickerOnly = isMobileDevice && !isWalletBrowser;
  const showAuthenticateButton = !showWalletPickerOnly;
  const showWalletShortcuts = !loading && showWalletPickerOnly;

  return (
    <div className="min-h-screen bg-[#060b14] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <div className="w-full max-w-lg rounded-[28px] border border-[#123a62] bg-[#09111c] p-8 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
          <div className="text-center mb-8">
            <BrandLogo centered className="mx-auto max-w-[280px]" />
            <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-[#123a62] bg-[#0b1930] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5bbcff]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Member Access
            </div>
            {/* <h1 className="mb-2 mt-4 text-3xl font-bold text-[#f5f5f5]">Secure Member Login</h1> */}
            <p className="text-sm text-[#b7bdc6]">
              {isWalletBrowser
                ? "Authenticate with the wallet already opened in this dapp browser"
                : isMobileDevice
                  ? "Select your wallet app to continue authentication"
                  : ""}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#f5f5f5]">
                Referral Code <span className="font-normal text-[#848e9c]">(Optional)</span>
              </label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                disabled={loading}
                placeholder="e.g. REFXYZ123"
                className="w-full rounded-lg border border-[#2b3139] bg-[#111418] px-4 py-3 text-[#f5f5f5] outline-none transition focus:border-[#f0b90b] disabled:opacity-60"
              />
            </div>

            {/* <div>
              <label className="mb-1 block text-sm font-medium text-[#f5f5f5]">
                Sponsor ID <span className="font-normal text-[#848e9c]">(Optional)</span>
              </label>
              <input
                type="number"
                value={sponsorId}
                onChange={(e) => setSponsorId(e.target.value)}
                disabled={loading}
                placeholder="123"
                className="w-full rounded-lg border border-[#2b3139] bg-[#111418] px-4 py-3 text-[#f5f5f5] outline-none transition focus:border-[#f0b90b] disabled:opacity-60"
              />
            </div> */}
            
            {showWalletShortcuts ? (
              <div className="space-y-2">
                <p className="text-xs text-[#848e9c]">Open directly in your wallet app:</p>
                <div className="grid grid-cols-3 gap-2">
                  <a
                    href={metamaskDeepLink}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#2b3139] bg-[#111418] px-2 py-2 text-[11px] font-medium text-[#f5f5f5] hover:bg-[#1e2329]"
                  >
                    <Smartphone className="w-3.5 h-3.5" /> MetaMask
                  </a>
                  <a
                    href={trustWalletDeepLink}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#2b3139] bg-[#111418] px-2 py-2 text-[11px] font-medium text-[#f5f5f5] hover:bg-[#1e2329]"
                  >
                    <Smartphone className="w-3.5 h-3.5" /> Trust
                  </a>
                  <a
                    href={tokenPocketDeepLink}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#2b3139] bg-[#111418] px-2 py-2 text-[11px] font-medium text-[#f5f5f5] hover:bg-[#1e2329]"
                  >
                    <Smartphone className="w-3.5 h-3.5" /> TokenPocket
                  </a>
                </div>
              </div>
            ) : null}
            {showAuthenticateButton ? (
              <button
                type="button"
                onClick={() => void authenticate()}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#f0b90b] py-4 font-semibold text-[#181a20] shadow-lg shadow-[#f0b90b]/10 transition-all hover:bg-[#f8d45c] disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wallet className="w-5 h-5" />}
                {loading ? "Authenticating..." : "Connect & Authenticate"}
              </button>
            ) : null}

            <div className="rounded-2xl border border-[#2b3139] bg-[#111418] p-4">
              <div className="mb-3 flex flex-wrap gap-2">
                {securityItems.map((item) => (
                  <div
                    key={item.label}
                    className="inline-flex items-center gap-2 rounded-full border border-[#3a2f09] bg-[#201a08] px-3 py-1.5 text-[11px] font-medium text-[#f0b90b]"
                  >
                    <item.icon className="h-3.5 w-4.5" />
                    {item.label}
                  </div>
                ))}
              </div>
              {/* <p className="text-xs text-[#b7bdc6]">
                Authentication uses a signed wallet challenge. No password or direct wallet custody is taken by this portal.
              </p> */}
            </div>



            {/* <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-[#848e9c]">
              <div className="rounded-xl border border-[#2b3139] bg-[#111418] px-2 py-2">
                Signature verified
              </div>
              <div className="rounded-xl border border-[#2b3139] bg-[#111418] px-2 py-2">
                Session protected
              </div>
              <div className="rounded-xl border border-[#2b3139] bg-[#111418] px-2 py-2">
                Gateway-style flow
              </div>
            </div> */}


            {walletAddress ? (
              <p className="break-all text-xs text-[#f0b90b]">
                Connected: {walletAddress}
              </p>
            ) : null}

            {status ? (
              <div className="space-y-2">
                <p className="text-xs text-[#f0b90b]">{status}</p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#2b3139]">
                  <div
                    className="h-full bg-[#f0b90b] transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#848e9c]">
                  {elapsedSec > 0 ? `Processing for ${elapsedSec}s` : "Starting..."}
                  {elapsedSec >= 12 ? " - still working, please keep wallet app open." : ""}
                </p>
              </div>
            ) : null}

            {error ? (
              <div className="flex items-start gap-2 rounded-lg border border-[#5c1d28] bg-[#2a1218] p-3">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-300">{error}</p>
              </div>
            ) : null}

            <p className="text-xs text-[#848e9c]">
              {isWalletBrowser
                ? "Wallet browser detected. The wallet selection shortcuts are hidden and authentication will use the active wallet directly."
                : isMobileDevice
                  ? "Mobile browser detected. Open one of the wallet apps above, then authenticate inside that wallet."
                  : "Desktop browser detected. Use your installed wallet extension to authenticate."}
            </p>
          </div>
          {/* <div className="mt-6">
            <DappTrustBar />
          </div> */}
        </div>
      </div>
    </div>
  );
}
