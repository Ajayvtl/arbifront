export const WALLET_TYPE_KEYS = [
  "main_balance",
  "earning_balance",
  "roi_balance",
  "direct_balance",
  "level_balance",
  "withdrawable_balance",
  "reward_balance",
  "locked_balance",
] as const;

export type WalletTypeKey = (typeof WALLET_TYPE_KEYS)[number];
export type WalletTypeLabelMap = Record<WalletTypeKey, string>;

export const DEFAULT_WALLET_TYPE_LABELS: WalletTypeLabelMap = {
  main_balance: "Main Balance",
  earning_balance: "Earning Balance",
  roi_balance: "Daily Income",
  direct_balance: "Working Balance",
  level_balance: "Level Balance",
  withdrawable_balance: "Withdrawable",
  reward_balance: "Reward Balance",
  locked_balance: "Locked Balance",
};

export function getWalletTypeLabels(raw?: Partial<Record<string, unknown>> | null): WalletTypeLabelMap {
  const next: WalletTypeLabelMap = { ...DEFAULT_WALLET_TYPE_LABELS };
  if (!raw || typeof raw !== "object") return next;

  for (const key of WALLET_TYPE_KEYS) {
    const value = raw[key];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    next[key] = trimmed;
  }

  return next;
}

export function getWalletTypeLabel(key: string | null | undefined, raw?: Partial<Record<string, unknown>> | null): string {
  const labels = getWalletTypeLabels(raw);
  if (!key) return "-";
  const normalized = String(key).trim().toLowerCase() as WalletTypeKey;
  return labels[normalized] || key;
}
