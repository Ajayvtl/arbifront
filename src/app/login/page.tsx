"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Lock, Mail, Loader2, Eye, EyeOff, Wallet, Smartphone } from 'lucide-react';
import type { AxiosError } from 'axios';
import { BrowserProvider } from 'ethers';
import { getInjectedProvider } from '@/lib/injectedWallet';

import { useSettings } from "@/context/SettingsContext";

type LoginMethod = 'password' | 'wallet';

interface AuthApiUser {
    id?: number | string;
    name?: string;
    email?: string;
    role?: string;
    role_id?: number | string;
    companyId?: number | null;
    company_id?: number | null;
}

interface AuthApiPayload {
    token?: string;
    user?: AuthApiUser;
    admin?: AuthApiUser;
    hotels?: unknown[];
    permissions?: string[];
}

const roleToRoleId: Record<string, number> = {
    SUPER_ADMIN: 1,
    COMPANY_ADMIN: 2,
    FINANCE_ADMIN: 3,
    SUPPORT_ADMIN: 4,
};

function deriveDappUrl() {
    const configured = (process.env.NEXT_PUBLIC_DAPP_URL || '').trim();
    if (configured) return configured;
    if (typeof window === 'undefined') return '';

    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim();
        if (apiUrl) {
            try {
                const parsed = new URL(apiUrl);
                return `${window.location.protocol}//${parsed.hostname}:3000/dapp/login`;
            } catch {
                // fall through
            }
        }
    }
    return `${window.location.origin}/dapp/login`;
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

function buildMetaMaskFallbackLink(targetUrl: string) {
    try {
        const parsed = new URL(targetUrl);
        const path = `${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
        return `https://metamask.app.link/dapp/${path}`;
    } catch {
        const sanitized = targetUrl.replace(/^https?:\/\//i, '');
        return `https://metamask.app.link/dapp/${sanitized}`;
    }
}

function buildTokenPocketDeepLink(targetUrl: string) {
    const params = {
        url: targetUrl,
        chain: 'BSC',
        source: 'rms-panel-admin',
    };
    return `tpdapp://open?params=${encodeURIComponent(JSON.stringify(params))}`;
}

function getWalletErrorMessage(error: unknown) {
    const axiosError = error as AxiosError<{ message?: string }>;
    const serverMessage = axiosError.response?.data?.message;
    if (serverMessage) return serverMessage;

    const rawMessage = String((error as Error)?.message || '');
    if (rawMessage.includes('authorizedScopes') || rawMessage.includes('eip155:102025')) {
        return 'Wallet requested unsupported chain scope (eip155:102025). Switch wallet network to BNB Smart Chain (chainId 56) and retry.';
    }
    return rawMessage || 'Wallet login failed';
}

export default function LoginPage() {
    const [method, setMethod] = useState<LoginMethod>('password');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [walletLoading, setWalletLoading] = useState(false);
    const [connectedWallet, setConnectedWallet] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [providerAvailable, setProviderAvailable] = useState(false);
    const [dappUrl, setDappUrl] = useState('');
    const { login } = useAuth();
    const { settings } = useSettings();
    const DEFAULT_COMPANY_ID = 1;

    useEffect(() => {
        setDappUrl(deriveDappUrl());
    }, []);

    useEffect(() => {
        setProviderAvailable(Boolean(getInjectedProvider()));
    }, []);

    const metamaskDeepLink = useMemo(() => {
        if (!dappUrl) return '#';
        return buildMetaMaskDeepLink(dappUrl);
    }, [dappUrl]);

    const trustWalletDeepLink = useMemo(() => {
        if (!dappUrl) return '#';
        return `https://link.trustwallet.com/open_url?coin_id=20000714&url=${encodeURIComponent(dappUrl)}`;
    }, [dappUrl]);
    const tokenPocketDeepLink = useMemo(() => {
        if (!dappUrl) return '#';
        return buildTokenPocketDeepLink(dappUrl);
    }, [dappUrl]);
    const metamaskFallbackLink = useMemo(() => {
        if (!dappUrl) return '#';
        return buildMetaMaskFallbackLink(dappUrl);
    }, [dappUrl]);

    const finalizeLogin = (payload: AuthApiPayload, fallbackEmail = '') => {
        const token = payload?.token;
        const apiUser = payload?.user || payload?.admin;
        const role = apiUser?.role || '';

        if (!token || !apiUser) {
            throw new Error('Invalid auth response');
        }

        const normalizedUser = {
            id: Number(apiUser.id || 0),
            name: apiUser.name || apiUser.email || fallbackEmail || 'Admin',
            email: apiUser.email || fallbackEmail,
            role_id: roleToRoleId[role] || Number(apiUser.role_id || 2),
            role,
            company_id: apiUser.companyId ?? apiUser.company_id ?? null,
        };

        const hotels = (payload?.hotels || []) as [];
        const permissions = payload?.permissions || [];
        login(token, normalizedUser, hotels, permissions);
    };

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let response;
            try {
                response = await api.post('/auth/admin/login', { email, password });
            } catch {
                response = await api.post('/auth/login', { email, password });
            }

            const payload = (response.data?.data || response.data) as AuthApiPayload;
            finalizeLogin(payload, email);
        } catch (error: unknown) {
            const axiosError = error as AxiosError<{ message?: string }>;
            toast.error(axiosError.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleWalletLogin = async () => {
        setWalletLoading(true);

        try {
            const provider = getInjectedProvider();
            if (!provider) {
                throw new Error('No injected wallet detected. Use a wallet extension or open this page in a wallet browser.');
            }

            const existing = (await provider.request({ method: 'eth_accounts' })) as string[] | undefined;
            if (!Array.isArray(existing) || existing.length === 0) {
                await provider.request({ method: 'eth_requestAccounts' });
            }

            const chainId = await provider.request({ method: 'eth_chainId' });
            const normalizedChainId = typeof chainId === 'number' ? chainId : Number.parseInt(String(chainId), 16);
            if (normalizedChainId !== 56) {
                toast.error('Please switch wallet network to BNB Smart Chain (56).');
                return;
            }

            const ethersProvider = new BrowserProvider(provider as unknown as never);
            const signer = await ethersProvider.getSigner();
            const walletAddress = await signer.getAddress();
            if (!walletAddress) {
                throw new Error('Wallet connection failed');
            }
            setConnectedWallet(walletAddress);

            const nonceResponse = await api.post('/auth/admin/wallet/nonce', {
                walletAddress,
                companyId: DEFAULT_COMPANY_ID,
            });

            const noncePayload = nonceResponse.data?.data || nonceResponse.data;
            const nonce = noncePayload?.nonce as string | undefined;
            if (!nonce) {
                throw new Error('Nonce not received from server');
            }

            const signature = await signer.signMessage(nonce);

            const verifyResponse = await api.post('/auth/admin/wallet/verify', {
                walletAddress,
                signature,
                companyId: DEFAULT_COMPANY_ID,
            });

            const payload = (verifyResponse.data?.data || verifyResponse.data) as AuthApiPayload;
            finalizeLogin(payload, email);
        } catch (error: unknown) {
            toast.error(getWalletErrorMessage(error));
        } finally {
            setWalletLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        if (showPassword) {
            setShowPassword(false);
        } else {
            setShowPassword(true);
            setTimeout(() => {
                setShowPassword(false);
            }, 3000);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100 dark:border-slate-700">
                <div className="text-center mb-8">
                    {settings.logo && (
                        <div className="w-16 h-16 mx-auto mb-4 bg-white rounded-xl shadow-lg shadow-emerald-500/10 p-2 flex items-center justify-center">
                            <img src={settings.logo} alt={settings.brand_name} className="w-full h-full object-contain" />
                        </div>
                    )}
                    <h1 className="text-3xl font-bold text-emerald-600 mb-2">{settings.brand_name || 'Admin Panel'}</h1>
                    <p className="text-slate-500 dark:text-slate-400">{settings.site_name || 'Management System'}</p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        End user wallet access: <Link href="/dapp/login" className="text-emerald-600 hover:underline">/dapp/login</Link>
                    </p>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-700/40 rounded-lg p-1">
                    <button
                        type="button"
                        onClick={() => setMethod('password')}
                        className={`rounded-md px-3 py-2 text-sm font-medium transition ${method === 'password' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow' : 'text-slate-600 dark:text-slate-300'}`}
                    >
                        Email Login
                    </button>
                    <button
                        type="button"
                        onClick={() => setMethod('wallet')}
                        className={`rounded-md px-3 py-2 text-sm font-medium transition ${method === 'wallet' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow' : 'text-slate-600 dark:text-slate-300'}`}
                    >
                        Wallet Login
                    </button>
                </div>

                {method === 'password' ? (
                    <form onSubmit={handlePasswordLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900 outline-none transition-all"
                                    placeholder="admin@example.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-12 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900 outline-none transition-all"
                                    placeholder="********"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={togglePasswordVisibility}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center shadow-lg shadow-emerald-500/20"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
                        </button>
                    </form>
                ) : (
                    <div className="space-y-5">
                        {connectedWallet ? (
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-700 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300 break-all">
                                Connected: {connectedWallet}
                            </div>
                        ) : null}

                        <button
                            type="button"
                            onClick={handleWalletLogin}
                            disabled={walletLoading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                        >
                            {walletLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wallet className="w-5 h-5" />}
                            {walletLoading ? 'Connecting Wallet...' : 'Login With Wallet'}
                        </button>

                        {!providerAvailable ? (
                            <div className="space-y-2">
                                <p className="text-xs text-slate-500 dark:text-slate-400">No wallet extension detected. Open this page in your mobile wallet app:</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <a
                                        href={metamaskDeepLink}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                                    >
                                        <Smartphone className="w-4 h-4" /> MetaMask
                                    </a>
                                    <a
                                        href={trustWalletDeepLink}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                                    >
                                        <Smartphone className="w-4 h-4" /> Trust Wallet
                                    </a>
                                    <a
                                        href={tokenPocketDeepLink}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                                    >
                                        <Smartphone className="w-4 h-4" /> TokenPocket
                                    </a>
                                </div>
                                <a href={metamaskFallbackLink} className="text-xs text-slate-500 hover:underline block text-center">
                                    MetaMask fallback link
                                </a>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
}
