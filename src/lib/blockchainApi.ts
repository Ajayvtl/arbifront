import api from '@/lib/api';

export interface IngestDepositPayload {
  companyId?: number;
  userId: number;
  amount: number;
  token: string;
  chain: string;
  txHash: string;
  logIndex: number;
  blockNumber: number;
  contractAddress: string;
  eventName?: string;
  rawData?: Record<string, unknown>;
}

export async function ingestDepositEvent(payload: IngestDepositPayload) {
  const res = await api.post('/blockchain/events/deposit', payload);
  return res.data?.data;
}

export async function fetchBlockchainEvents(limit = 100, companyId?: number) {
  const res = await api.get('/blockchain/events', {
    params: { limit, companyId },
  });
  return res.data?.data ?? [];
}
