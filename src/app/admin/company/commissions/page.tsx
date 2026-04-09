"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "@/lib/api";

type CommissionBucket = { type: string; total_count: number; total_amount: number };
type Earner = { user_id: number; wallet_address: string; total_amount: number };

export default function CompanyCommissionsPage() {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<CommissionBucket[]>([]);
  const [topEarners, setTopEarners] = useState<Earner[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/mlm/commissions/summary", { params: { days } });
      const data = response.data?.data || {};
      setTotals((data.totals || []) as CommissionBucket[]);
      setTopEarners((data.topEarners || []) as Earner[]);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to load commission summary";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const grandTotal = useMemo(
    () => totals.reduce((sum, bucket) => sum + Number(bucket.total_amount || 0), 0),
    [totals]
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Commission Engine</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Commission mix by income type and top earning distributors.</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
          <p className="text-xs text-slate-500">Grand Total</p>
          <p className="text-2xl font-semibold">{grandTotal.toFixed(2)}</p>
        </div>
        {totals.slice(0, 3).map((bucket) => (
          <div key={bucket.type} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
            <p className="text-xs text-slate-500">{bucket.type}</p>
            <p className="text-2xl font-semibold">{Number(bucket.total_amount || 0).toFixed(2)}</p>
            <p className="text-xs text-slate-400">{bucket.total_count} entries</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500">
            <tr>
              <th className="text-left px-4 py-3">Income Type</th>
              <th className="text-left px-4 py-3">Total Entries</th>
              <th className="text-left px-4 py-3">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={3}>Loading summary...</td></tr>
            ) : totals.length === 0 ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={3}>No commission data in selected period.</td></tr>
            ) : totals.map((bucket) => (
              <tr key={bucket.type} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3">{bucket.type}</td>
                <td className="px-4 py-3">{bucket.total_count}</td>
                <td className="px-4 py-3">{Number(bucket.total_amount || 0).toFixed(6)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-auto">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-sm font-medium">Top Earners</div>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500">
            <tr>
              <th className="text-left px-4 py-3">User ID</th>
              <th className="text-left px-4 py-3">Wallet</th>
              <th className="text-left px-4 py-3">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {topEarners.length === 0 ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={3}>No top earners yet.</td></tr>
            ) : topEarners.map((row) => (
              <tr key={row.user_id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3">#{row.user_id}</td>
                <td className="px-4 py-3 max-w-[260px] truncate" title={row.wallet_address}>{row.wallet_address}</td>
                <td className="px-4 py-3">{Number(row.total_amount || 0).toFixed(6)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
