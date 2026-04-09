import api from '@/lib/api';

export type WalletBalanceType =
  | 'main_balance'
  | 'earning_balance'
  | 'roi_balance'
  | 'direct_balance'
  | 'level_balance'
  | 'withdrawable_balance'
  | 'reward_balance'
  | 'locked_balance';

export type WalletDirection = 'CREDIT' | 'DEBIT';

export type WalletTxType =
  | 'DEPOSIT'
  | 'WITHDRAW'
  | 'REFERRAL'
  | 'LEVEL'
  | 'ROI'
  | 'REWARD';

export interface WalletMutationPayload {
  userId: number;
  companyId?: number;
  balanceType: WalletBalanceType;
  amount: number;
  direction: WalletDirection;
  type: WalletTxType;
  referenceId?: number;
  txHash?: string;
  idempotencyKey?: string;
  meta?: Record<string, unknown>;
}

export async function fetchUplines(userId: number, maxLevel = 50) {
  const res = await api.get(`/mlm/uplines/${userId}`, { params: { maxLevel } });
  return res.data?.data ?? [];
}

export async function fetchDownlines(userId: number, maxLevel = 10, limit = 500) {
  const res = await api.get(`/mlm/downlines/${userId}`, {
    params: { maxLevel, limit },
  });
  return res.data?.data ?? [];
}

export async function mutateWallet(payload: WalletMutationPayload) {
  const res = await api.post('/wallets/mutate', payload);
  return res.data?.data;
}

export async function fetchWallet(userId: number, companyId?: number) {
  const res = await api.get(`/wallets/${userId}`, { params: { companyId } });
  return res.data?.data;
}

export async function fetchWalletTransactions(userId: number, limit = 50, companyId?: number) {
  const res = await api.get(`/wallets/${userId}/transactions`, {
    params: { limit, companyId },
  });
  return res.data?.data ?? [];
}
