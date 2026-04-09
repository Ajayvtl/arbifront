"use client";

import Image from "next/image";

export default function BrandLogo({
  compact = false,
  centered = false,
  className = "",
}: {
  compact?: boolean;
  centered?: boolean;
  className?: string;
}) {
  return (
    <div className={`${centered ? "text-center" : ""} ${className}`}>
      <div className={`inline-flex ${centered ? "justify-center" : "justify-start"} w-full`}>
        <Image
          src="/arbitrum-brand.png"
          alt="Arbitrum Investment Planning and Analysis"
          width={compact ? 168 : 248}
          height={compact ? 84 : 124}
          className="h-auto w-auto max-w-full object-contain"
          priority
        />
      </div>
      {!compact ? (
        <p className="mt-2 text-xs font-medium uppercase tracking-[0.24em] text-[#5bbcff]">
          Data . Insight . Growth
        </p>
      ) : null}
    </div>
  );
}
