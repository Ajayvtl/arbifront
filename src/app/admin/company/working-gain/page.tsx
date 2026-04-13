"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import api from "@/lib/api";

type WorkingGainItem = {
  id: number;
  rule_name: string;
  user_wallet: string | null;
  subscription_amount: number;
  direct_count: number;
  total_volume: number;
  extra_roi_percent: number;
  boosted_cap_multiplier: number;
  qualified_at: string | null;
};

type PaginatedData = {
  items: WorkingGainItem[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function formatDate(value: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

const REFRESH_SECS = 60;

export default function CompanyWorkingGainPage() {
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedData>({ items: [] });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_SECS);
  const countRef = useRef(REFRESH_SECS);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get("/mlm/commissions/working-gain", { params: { page, limit: 20 } });
      setData((response.data?.data || { items: [] }) as PaginatedData);
      setLastUpdated(new Date());
      countRef.current = REFRESH_SECS;
      setCountdown(REFRESH_SECS);
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to load working gain logs";
      toast.error(message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  // 60s auto-refresh
  useEffect(() => {
    const interval = setInterval(() => { void load(true); }, REFRESH_SECS * 1000);
    return () => clearInterval(interval);
  }, [load]);

  // countdown tick
  useEffect(() => {
    const tick = setInterval(() => {
      countRef.current = countRef.current > 0 ? countRef.current - 1 : REFRESH_SECS;
      setCountdown(countRef.current);
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">ROI Increment (Working) Logs</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Qualified ROI increment events by rule, wallet, package amount, direct count, business volume, and boosted ROI/cap.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()} · next in ${countdown}s` : "Connecting…"}
          <button type="button" onClick={() => void load()} className="ml-2 rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs hover:border-emerald-500 transition-colors">↺ Refresh</button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Rule</th>
              <th className="px-4 py-3 text-left">Wallet</th>
              <th className="px-4 py-3 text-left">Paid Amount</th>
              <th className="px-4 py-3 text-left">Directs</th>
              <th className="px-4 py-3 text-left">Business</th>
              <th className="px-4 py-3 text-left">Boost</th>
              <th className="px-4 py-3 text-left">Qualified At</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={7}>Loading ROI increment logs...</td></tr>
            ) : data.items.length === 0 ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={7}>No ROI increment qualifications found.</td></tr>
            ) : data.items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3">{item.rule_name}</td>
                <td className="px-4 py-3 max-w-[220px] truncate" title={item.user_wallet || ""}>{item.user_wallet || "-"}</td>
                <td className="px-4 py-3">{Number(item.subscription_amount || 0).toFixed(6)}</td>
                <td className="px-4 py-3">{item.direct_count}</td>
                <td className="px-4 py-3">{Number(item.total_volume || 0).toFixed(6)}</td>
                <td className="px-4 py-3">+{Number(item.extra_roi_percent || 0).toFixed(2)}% | {Number(item.boosted_cap_multiplier || 0).toFixed(2)}x</td>
                <td className="px-4 py-3">{formatDate(item.qualified_at)}</td>
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
