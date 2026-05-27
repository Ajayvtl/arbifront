"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Lock, Wallet, Shield, Eye, EyeOff, Loader2, Key, CheckCircle, AlertTriangle } from "lucide-react";
import { BrowserProvider } from "ethers";
import { getInjectedProvider } from "@/lib/injectedWallet";

export default function SecurityPage() {
    const { user, login, availableHotels } = useAuth();
    const [loginMethod, setLoginMethod] = useState<"password" | "wallet">("password");
    const [mounted, setMounted] = useState(false);

    // Password State
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showOldPass, setShowOldPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);
    const [updatingPassword, setUpdatingPassword] = useState(false);

    // Wallet State
    const [walletAddress, setWalletAddress] = useState(user?.wallet_address || "");
    const [connectingWallet, setConnectingWallet] = useState(false);
    const [disablingPassword, setDisablingPassword] = useState(false);

    // Fetch latest user data from api to see if password exists and correct wallet_address
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [hasPassword, setHasPassword] = useState(true);

    const fetchLatestProfile = async () => {
        try {
            setLoadingProfile(true);
            const { data } = await api.get("/auth/me");
            const admin = data.data?.admin || data.data?.user || data.data;
            if (admin) {
                // Update local storage / context
                const token = localStorage.getItem("token");
                if (token && user) {
                    login(token, { 
                        ...user, 
                        wallet_address: admin.wallet_address || "",
                        email: admin.email || user.email,
                        name: admin.name || user.name
                    }, availableHotels, user.permissions, true);
                }
                setWalletAddress(admin.wallet_address || "");
                const passwordExists = Boolean(admin.hasPassword || admin.password_hash);
                setHasPassword(passwordExists);
                
                // Set default toggle based on whether password_hash exists or not
                if (!passwordExists && admin.wallet_address) {
                    setLoginMethod("wallet");
                } else {
                    setLoginMethod("password");
                }
            }
        } catch (err) {
            console.error("Failed to load profile details", err);
        } finally {
            setLoadingProfile(false);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchLatestProfile();
    }, []);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        if (newPassword.length < 6) {
            toast.error("New password must be at least 6 characters");
            return;
        }

        setUpdatingPassword(true);
        try {
            await api.post("/admin/admins/change-password", {
                oldPassword: hasPassword ? oldPassword : "",
                newPassword
            });
            toast.success("Password updated successfully!");
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
            fetchLatestProfile();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update password");
        } finally {
            setUpdatingPassword(false);
        }
    };

    const handleConnectAndVerifyWallet = async () => {
        setConnectingWallet(true);
        try {
            const provider = getInjectedProvider();
            if (!provider) {
                throw new Error("No web3 wallet detected. Please install MetaMask or another extension.");
            }

            // Check if on correct chain
            const chainId = await provider.request({ method: "eth_chainId" });
            const normalizedChainId = typeof chainId === "number" ? chainId : parseInt(String(chainId), 16);
            if (normalizedChainId !== 56) {
                toast.error("Please switch your wallet network to BNB Smart Chain (Chain ID: 56) and try again.");
                setConnectingWallet(false);
                return;
            }

            // Request accounts
            await provider.request({ method: "eth_requestAccounts" });
            const ethersProvider = new BrowserProvider(provider as any);
            const signer = await ethersProvider.getSigner();
            const address = await signer.getAddress();

            if (!address) {
                throw new Error("Could not retrieve wallet address");
            }

            // Save wallet to backend
            await api.patch("/admin/admins/profile/wallet", {
                walletAddress: address
            });

            toast.success("Wallet address linked successfully!");
            setWalletAddress(address);
            
            // Refresh user session details
            await fetchLatestProfile();
        } catch (error: any) {
            toast.error(error.message || "Failed to connect wallet");
        } finally {
            setConnectingWallet(false);
        }
    };

    const handleDisablePassword = async () => {
        if (!walletAddress) {
            toast.error("You must link a wallet address first");
            return;
        }

        const confirmAction = window.confirm(
            "Are you sure you want to disable password login? Once disabled, you will ONLY be able to log in using your Web3 wallet address."
        );
        if (!confirmAction) return;

        setDisablingPassword(true);
        try {
            await api.post("/admin/admins/disable-password");
            toast.success("Password login disabled. Wallet login is now enforced!");
            await fetchLatestProfile();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to disable password");
        } finally {
            setDisablingPassword(false);
        }
    };

    if (!mounted) {
        return (
            <div className="p-8 max-w-[1200px] mx-auto min-h-screen">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Security Settings</h1>
                    <p className="text-slate-500 dark:text-slate-400">Manage your password, login configurations, and Web3 wallets</p>
                </div>
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
                    <span className="text-slate-500 text-sm">Loading security settings...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1200px] mx-auto min-h-screen">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Security Settings</h1>
                <p className="text-slate-500 dark:text-slate-400">Manage your password, login configurations, and Web3 wallets</p>
            </div>

            {loadingProfile ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
                    <span className="text-slate-500 text-sm">Loading security profiles...</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Navigation Mode Switcher */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Login Preferences</h2>
                            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                                Choose how you want to log into the dashboard. You can configure password access, or secure your account completely with a Web3 wallet address.
                            </p>

                            <div className="flex flex-col gap-2 bg-slate-100/50 dark:bg-slate-900/40 rounded-xl p-1.5 border border-slate-200/50 dark:border-slate-700/50">
                                <button
                                    onClick={() => setLoginMethod("password")}
                                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition ${
                                        loginMethod === "password"
                                            ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700"
                                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                    }`}
                                >
                                    <Lock size={16} className={loginMethod === "password" ? "text-emerald-500" : "text-slate-400"} />
                                    Login with Password
                                </button>
                                <button
                                    onClick={() => setLoginMethod("wallet")}
                                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition ${
                                        loginMethod === "wallet"
                                            ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700"
                                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                    }`}
                                >
                                    <Wallet size={16} className={loginMethod === "wallet" ? "text-emerald-500" : "text-slate-400"} />
                                    Login with Wallet
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Mode Action Panels */}
                    <div className="lg:col-span-2">
                        {loginMethod === "password" ? (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 space-y-6">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                                        {hasPassword ? "Change Account Password" : "Set Account Password"}
                                    </h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                        Update your password credentials below. Keep this password safe and secure.
                                    </p>
                                </div>

                                {!hasPassword && (
                                    <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl text-amber-800 dark:text-amber-300 text-xs">
                                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold">Password Login Currently Disabled</p>
                                            <p className="mt-1 leading-relaxed">
                                                You do not have a password set. You can only log in using your wallet address. Set a password below if you wish to enable email/password login.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleChangePassword} className="space-y-4">
                                    <input 
                                        type="text" 
                                        name="username" 
                                        value={user?.email || ""} 
                                        readOnly 
                                        className="hidden" 
                                        autoComplete="username" 
                                    />
                                    {hasPassword && (
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Current Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showOldPass ? "text" : "password"}
                                                    value={oldPassword}
                                                    onChange={(e) => setOldPassword(e.target.value)}
                                                    className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-950 outline-none transition"
                                                    placeholder="Enter current password"
                                                    required
                                                    autoComplete="current-password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowOldPass(!showOldPass)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                                >
                                                    {showOldPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">New Password</label>
                                        <div className="relative">
                                            <input
                                                type={showNewPass ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-950 outline-none transition"
                                                placeholder="Enter new password (min. 6 chars)"
                                                required
                                                autoComplete="new-password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPass(!showNewPass)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                            >
                                                {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Confirm New Password</label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPass ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-950 outline-none transition"
                                                placeholder="Confirm new password"
                                                required
                                                autoComplete="new-password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPass(!showConfirmPass)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                            >
                                                {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={updatingPassword}
                                        className="mt-6 flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                                    >
                                        {updatingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key size={16} />}
                                        {hasPassword ? "Change Password" : "Set Password"}
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 space-y-6">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Web3 Wallet Configuration</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                        Configure cryptographic wallet login for admin and developer accounts.
                                    </p>
                                </div>

                                {walletAddress ? (
                                    <div className="space-y-6">
                                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl space-y-2">
                                            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
                                                <CheckCircle size={16} />
                                                Active Linked Wallet
                                            </div>
                                            <p className="text-xs font-mono text-slate-600 dark:text-slate-400 break-all select-all">
                                                {walletAddress}
                                            </p>
                                        </div>

                                        {hasPassword ? (
                                            <div className="p-5 border border-slate-200 dark:border-slate-700 rounded-xl space-y-4">
                                                <div className="flex gap-3 text-amber-600 dark:text-amber-400">
                                                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                                    <div>
                                                        <h4 className="text-sm font-bold">Enforce Wallet-Only Login</h4>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                                            Currently, password login is also enabled for your account. You can disable password login to enforce wallet-only authentication. This ensures no one can log in with your email/password credentials even if they are compromised.
                                                        </p>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={handleDisablePassword}
                                                    disabled={disablingPassword}
                                                    className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 font-medium transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                                                >
                                                    {disablingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                                    Disable Password Login
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900 rounded-xl text-indigo-800 dark:text-indigo-300 text-xs flex gap-2">
                                                <Shield className="w-5 h-5 flex-shrink-0 text-indigo-500" />
                                                <div>
                                                    <p className="font-semibold">Wallet-Only Enforcement Active</p>
                                                    <p className="mt-1 leading-relaxed">
                                                        Password authentication is disabled. Your account is fully secured and can only be accessed using your active Web3 wallet signature.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
                                            <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-2">Change Linked Wallet</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                                                To change your linked wallet address, connect your new wallet using the button below. This will verify ownership and update your linked address.
                                            </p>
                                            <button
                                                onClick={handleConnectAndVerifyWallet}
                                                disabled={connectingWallet}
                                                className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition flex items-center gap-2 text-sm disabled:opacity-50"
                                            >
                                                {connectingWallet ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet size={16} />}
                                                Connect & Link Different Wallet
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-4">
                                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
                                                <Wallet size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-800 dark:text-white">No Wallet Address Linked</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                                                    You must link a Web3 wallet address before you can log in using cryptography. Use the button below to connect.
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleConnectAndVerifyWallet}
                                                disabled={connectingWallet}
                                                className="mx-auto px-5 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium transition flex items-center gap-2 text-sm shadow-sm disabled:opacity-50"
                                            >
                                                {connectingWallet ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet size={16} />}
                                                Connect & Link Wallet
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
