"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Wallet } from "lucide-react";

export default function DappRootPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = (searchParams.get("ref") || "").trim();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("token");
    if (token) {
      router.replace("/dapp/dashboard");
      return;
    }

    if (referralCode) {
      sessionStorage.setItem("referralCode", referralCode);
    }
  }, [referralCode, router]);

  const handleConnectWallet = () => {
    router.push("/dapp/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 md:p-10 shadow-sm">
          <p className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
            Company Web3 Platform
          </p>
          <h1 className="mt-4 text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
            Connect Wallet, Authenticate, Activate Plan
          </h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300 max-w-2xl">
            Single wallet flow for both new and existing users. Connect your wallet, sign secure nonce, and continue to dashboard and plan activation.
          </p>
          {referralCode ? (
            <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-300">
              Referral detected: <span className="font-semibold">{referralCode}</span>
            </p>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No referral code detected in link.</p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleConnectWallet}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 px-5 py-3 font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-500"
            >
              Admin Login
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">User Auth Flow</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />Connect wallet</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />Sign nonce message</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />Backend auto register/login</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />Referral attached on first registration</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Activation Flow</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />Open dashboard</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />Choose package</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />Wallet payment + tx hash</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />Backend verifies chain and activates plan</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
