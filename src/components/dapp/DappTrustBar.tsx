"use client";

import { BadgeCheck, LockKeyhole, ShieldCheck } from "lucide-react";

const trustItems = [
  {
    icon: ShieldCheck,
    label: "Verified Access",
    detail: "Wallet signature authentication",
  },
  {
    icon: LockKeyhole,
    label: "Secure Session",
    detail: "Protected member session flow",
  },
  {
    icon: BadgeCheck,
    label: "Gateway Ready",
    detail: "Payment-grade trust indicators",
  },
];

export default function DappTrustBar() {
  return (
    <div className="rounded-2xl border border-[#2b3139] bg-[#111418] px-4 py-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f0b90b]">
            Member Security
          </p>
          <p className="mt-1 text-sm text-[#b7bdc6]">
            Authenticated wallet access and protected payment experience.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {trustItems.map((item) => (
            <div
              key={item.label}
              className="inline-flex items-center gap-2 rounded-full border border-[#3a2f09] bg-[#201a08] px-3 py-2"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#f0b90b]/12 text-[#f0b90b]">
                <item.icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-xs font-semibold text-[#f5f5f5]">{item.label}</span>
                <span className="block text-[11px] text-[#b7bdc6]">{item.detail}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
