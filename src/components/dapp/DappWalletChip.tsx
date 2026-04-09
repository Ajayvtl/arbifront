"use client";

import { Copy, Wallet } from "lucide-react";
import toast from "react-hot-toast";

function shortenWallet(address: string, compact: boolean) {
  if (!address) return "No wallet";
  if (!compact) return address;
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default function DappWalletChip({
  address,
  compact = false,
  className = "",
}: {
  address: string;
  compact?: boolean;
  className?: string;
}) {
  const copyWallet = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Wallet copied");
    } catch {
      toast.error("Failed to copy wallet");
    }
  };

  return (
    <button
      type="button"
      onClick={() => void copyWallet()}
      className={`inline-flex items-center gap-2 rounded-full border border-[#2b3139] bg-[#161a20] px-3 py-2 text-left text-[#f0f4f8] shadow-sm transition hover:border-[#f0b90b] hover:bg-[#1e2329] ${className}`}
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f0b90b]/12 text-[#f0b90b]">
        <Wallet className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#848e9c]">
          Wallet
        </span>
        <span className="block truncate text-sm font-semibold text-[#f0f4f8]">
          {shortenWallet(address, compact)}
        </span>
      </span>
      <Copy className="h-3.5 w-3.5 shrink-0 text-[#848e9c]" />
    </button>
  );
}
