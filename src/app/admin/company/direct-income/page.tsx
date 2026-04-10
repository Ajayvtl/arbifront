"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "@/lib/api";

type DirectIncomeItem = {
  id: number;
  bonus_label: string;
  amount: number;
  sponsor_wallet: string | null;
  source_wallet: string | null;
  source_amount: number;
  token_symbol: string | null;
  created_at: string;
  rule_name?: string | null;
};

type PaginatedData = {
  items: DirectIncomeItem[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function CompanyDirectIncomePage() {
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedData>({ items: [] });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/mlm/commissions/direct-income", { params: { page, limit: 20 } });
      setData((response.data?.data || { items: [] }) as PaginatedData);
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to load sponsor income logs";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Sponsor Income Logs(pkg)</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Rule-wise direct sponsor credits with sponsor wallet, joining wallet, joining amount, and credited amount.</p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Rule</th>
              <th className="px-4 py-3 text-left">Sponsor Wallet</th>
              <th className="px-4 py-3 text-left">Joined Wallet</th>
              <th className="px-4 py-3 text-left">Join Amount</th>
              <th className="px-4 py-3 text-left">Credit</th>
              <th className="px-4 py-3 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>Loading sponsor income logs...</td></tr>
            ) : data.items.length === 0 ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>No sponsor income payouts found.</td></tr>
            ) : data.items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3">{item.rule_name || item.bonus_label || "Sponsor Income(pkg)"}</td>
                <td className="px-4 py-3 max-w-[220px] truncate" title={item.sponsor_wallet || ""}>{item.sponsor_wallet || "-"}</td>
                <td className="px-4 py-3 max-w-[220px] truncate" title={item.source_wallet || ""}>{item.source_wallet || "-"}</td>
                <td className="px-4 py-3">{Number(item.source_amount || 0).toFixed(6)} {item.token_symbol || ""}</td>
                <td className="px-4 py-3">{Number(item.amount || 0).toFixed(6)}</td>
                <td className="px-4 py-3">{formatDate(item.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>Page {data.pagination?.page || 1} of {data.pagination?.totalPages || 1}</span>
        <div className="flex gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-50 dark:border-slate-700">Previous</button>
          <button type="button" disabled={page >= Number(data.pagination?.totalPages || 1)} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-50 dark:border-slate-700">Next</button>
        </div>
      </div>
    </div>
  );
}
