"use client";

export interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
  isTrust?: boolean;
  isTokenPocket?: boolean;
  providers?: Eip1193Provider[];
}

interface TokenPocketWindow extends Window {
  tokenpocket?: { ethereum?: Eip1193Provider };
  tp?: { ethereum?: Eip1193Provider };
}

export function getInjectedProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;

  const tokenPocketProvider =
    (window as TokenPocketWindow).tokenpocket?.ethereum ||
    (window as TokenPocketWindow).tp?.ethereum;
  const ethereum = (window as Window & { ethereum?: Eip1193Provider }).ethereum || tokenPocketProvider;

  if (!ethereum) return tokenPocketProvider || null;

  if (Array.isArray(ethereum.providers) && ethereum.providers.length) {
    return (
      ethereum.providers.find((provider) => provider.isMetaMask) ||
      ethereum.providers.find((provider) => provider.isTrust) ||
      ethereum.providers.find((provider) => provider.isTokenPocket) ||
      ethereum.providers[0] ||
      null
    );
  }

  return ethereum;
}
