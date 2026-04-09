"use client";

import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react';
import { usePathname } from 'next/navigation';
import React, { ReactNode, useEffect } from 'react';

// ─── WalletConnect Project ID ────────────────────────────────────────────────
// Register at https://cloud.walletconnect.com
// The project's "Allowed Domains" list must include your production domain.
export const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'c5525381ce38eeb573fcea0150bfa3f3';

// ─── BNB Smart Chain ─────────────────────────────────────────────────────────
const bnbMainnet = {
  chainId: 56,
  name: 'BNB Smart Chain',
  currency: 'BNB',
  explorerUrl: 'https://bscscan.com',
  rpcUrl: 'https://bsc-dataseed.binance.org',
};

// ─── App Origin ──────────────────────────────────────────────────────────────
// CRITICAL: metadata.url must match the exact origin WalletConnect sees.
// mobile-dev.js auto-writes NEXT_PUBLIC_APP_ORIGIN from the Cloudflare tunnel
// URL each run so this stays in sync during development.
// In production set this to your permanent domain, e.g. https://yourdomain.com
const appOrigin =
  (process.env.NEXT_PUBLIC_APP_ORIGIN || '').trim() ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

const metadata = {
  name: process.env.NEXT_PUBLIC_APP_NAME || 'Company DApp',
  description: 'Web3 investment platform',
  url: appOrigin,
  icons: [`${appOrigin}/favicon.ico`],
};

// ─── Ethers Config ───────────────────────────────────────────────────────────
// enableEIP6963: true — lets installed browser extensions (MetaMask desktop,
//   TokenPocket browser extension) announce themselves without going through
//   WalletConnect relay, which eliminates the eip155/authorizedScopes error.
// enableInjected: true — fallback for extensions that don't use EIP-6963.
// No `auth` block — the email/social auth layer creates a WalletConnect relay
//   session that pins authorizedScopes to a default chain list (not BNB),
//   causing MetaMask to reject with "eip155:102025 unsupported network".
const ethersConfig = defaultConfig({
  metadata,
  enableEIP6963: true,
  enableInjected: true,
  enableCoinbase: false,
  rpcUrl: 'https://bsc-dataseed.binance.org',
  defaultChainId: 56,
});

// ─── Modal ───────────────────────────────────────────────────────────────────
let modalInitialized = false;

function ensureWeb3Modal() {
  if (modalInitialized) return;
  createWeb3Modal({
    ethersConfig,
    chains: [bnbMainnet],
    projectId,
    defaultChain: bnbMainnet,
    allWallets: 'SHOW',
    enableAnalytics: false,
    enableOnramp: false,
    enableSwaps: false,
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent': '#059669',
      '--w3m-border-radius-master': '12px',
    },
  });
  modalInitialized = true;
}

// ─── Stale-Session Cleanup ───────────────────────────────────────────────────
// WalletConnect v2 stores sessions keyed by the relay topic. When the
// Cloudflare tunnel URL changes between runs the relay drops those sessions,
// causing "No matching key. session topic doesn't exist" crashes.
// We detect an origin change and purge all stale WC keys so users get a
// clean connection prompt instead of a crash.
function purgeStaleWalletConnectSessions() {
  if (typeof window === 'undefined') return;
  try {
    const dead: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (
        k.startsWith('wc@2:') ||
        k.startsWith('W3M_') ||
        k.startsWith('web3modal') ||
        k === 'WALLETCONNECT_DEEPLINK_CHOICE'
      ) {
        dead.push(k);
      }
    }
    dead.forEach((k) => localStorage.removeItem(k));
    window.indexedDB?.deleteDatabase('WALLET_CONNECT_V2_INDEXED_DB');
  } catch {
    /* never block app startup */
  }
}

// ─── Provider Component ──────────────────────────────────────────────────────
export function Web3ModalProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem('wc_app_origin');
    const current = window.location.origin;
    if (stored && stored !== current) {
      console.info('[Web3Modal] Domain changed — clearing stale WalletConnect sessions.');
      purgeStaleWalletConnectSessions();
    }
    localStorage.setItem('wc_app_origin', current);
  }, []);

  useEffect(() => {
    // We must ensure Web3Modal is initialized on all routes so AppKit bindings (including chainId overrides)
    // configure correctly and don't leak default 102025 CAIP testnet strings into Metamask sessions
    // when using the fallback connection methods.
    ensureWeb3Modal();
  }, [pathname]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const originalError = console.error;
    const suppressed = "MetaMask no longer injects web3";

    console.error = (...args: unknown[]) => {
      const first = String(args?.[0] ?? "");
      if (first.includes(suppressed)) return;
      originalError(...args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return <>{children}</>;
}
