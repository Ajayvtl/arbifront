"use client";

import { useEffect, useState } from "react";
import { Loader2, Calculator, Search } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

interface RoiCreditItem {
  id: number;
  user_id: number;
  wallet_address: string;
  amount: number;
  type: "ROI" | "ROI_BOOSTER";
  created_at: string;
  plan_name: string | null;
  pkg_amount: number | null;
  pkg_symbol: string | null;
}

interface PaginatedRoiCredits {
  items: RoiCreditItem[];
  summary?: {
    totalDailyRoi: number;
    dailyRoiPayout: number;
    yesterdayRoiPayout: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function formatDate(value: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function RoiCreditsPage() {
  const [rows, setRows] = useState<RoiCreditItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchWallet, setSearchWallet] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [todayRoiPayout, setTodayRoiPayout] = useState(0);
  const [summary, setSummary] = useState({
    totalDailyRoi: 0,
    dailyRoiPayout: 0,
    yesterdayRoiPayout: 0,
  });

  const loadTodayPayout = async () => {
    try {
      const res = await api.get("/mlm/commissions/summary", { params: { days: 30 } });
      const v = Number(res.data?.data?.totalActualRoiPayoutToday || 0);
      setTodayRoiPayout(Number.isFinite(v) ? v : 0);
    } catch {
      setTodayRoiPayout(0);
    }
  };

  const loadRoiCredits = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/roi-credits", {
        params: {
          page,
          limit: 15,
          walletAddress: searchWallet ? searchWallet.trim() : undefined,
          type: typeFilter || undefined
        },
      });
      const payload = (res.data?.data || { items: [], pagination: { totalPages: 1, total: 0 } }) as PaginatedRoiCredits;
      setRows(payload.items || []);
      setTotalPages(payload.pagination?.totalPages || 1);
      setTotal(payload.pagination?.total || 0);
      if (payload.summary) {
        setSummary(payload.summary);
      }
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed to load ROI credit logs";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTodayPayout();
  }, []);

  useEffect(() => {
    void loadRoiCredits();
  }, [page, typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void loadRoiCredits();
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            ROI Payout Logs (3X Amount)
          </h1>
          <p className="text-gray-500 text-sm">Audit daily ROI credits and ROI boosters distributed to members.</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 self-start md:self-auto">
          Total: <span className="font-semibold">{total}</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total ROI Credited (All-time)</p>
            <p className="text-2xl font-bold mt-2 text-blue-600 dark:text-blue-400">
              ${Number(summary.totalDailyRoi).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </p>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">Sum of ROI + booster credit transactions</p>
        </div>

        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Today's ROI Payout</p>
            <p className="text-2xl font-bold mt-2 text-emerald-600 dark:text-emerald-400">
              ${Number(todayRoiPayout).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </p>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">Processed today</p>
        </div>

        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Yesterday's ROI Payout</p>
            <p className="text-2xl font-bold mt-2 text-amber-600 dark:text-amber-400">
              ${Number(summary.yesterdayRoiPayout).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </p>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">Total ROI credited during the previous day</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by member wallet address..."
              value={searchWallet}
              onChange={(e) => setSearchWallet(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-600 dark:bg-slate-900"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm transition font-semibold"
          >
            Search
          </button>
        </form>

        <select
          value={typeFilter}
          onChange={(e) => {
            setPage(1);
            setTypeFilter(e.target.value);
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
        >
          <option value="">All ROI Types</option>
          <option value="ROI">Standard Daily ROI</option>
          <option value="ROI_BOOSTER">ROI Booster</option>
        </select>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 py-8 justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            Loading ROI credit logs...
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No ROI credit records found matching the search/filters.
          </div>
        ) : (
          <>
            {/* Mobile View */}
            <div className="space-y-3 lg:hidden">
              {rows.map((row) => (
                <div key={row.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs break-all font-mono text-slate-600 dark:text-slate-400">{row.wallet_address}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Package: {row.plan_name ? `${row.plan_name} ($${row.pkg_amount})` : "N/A"}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${row.type === "ROI"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                      }`}>
                      {row.type === "ROI" ? "Daily ROI" : "Booster"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">Amount Credited</p>
                      <p className="text-base font-bold text-green-600 dark:text-green-400">+${Number(row.amount).toFixed(4)}</p>
                    </div>
                    <p className="text-[11px] text-slate-400">{formatDate(row.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden overflow-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700">
                    <th className="py-3 pr-3">Tx ID</th>
                    <th className="py-3 pr-3">Member Address</th>
                    <th className="py-3 pr-3">Plan Name</th>
                    <th className="py-3 pr-3">Package Value</th>
                    <th className="py-3 pr-3">Type</th>
                    <th className="py-3 pr-3">Amount Credited</th>
                    <th className="py-3 pr-3">Timestamp (UTC)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 pr-3 font-mono text-xs">#{row.id}</td>
                      <td className="py-3 pr-3 font-mono text-xs break-all max-w-[240px]">{row.wallet_address}</td>
                      <td className="py-3 pr-3">{row.plan_name || "N/A"}</td>
                      <td className="py-3 pr-3 font-medium">
                        {row.pkg_amount ? `$${row.pkg_amount} ${row.pkg_symbol || "USDT"}` : "-"}
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${row.type === "ROI"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                          }`}>
                          {row.type === "ROI" ? "Daily ROI" : "Booster ROI"}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-green-600 dark:text-green-400 font-bold">
                        +${Number(row.amount).toFixed(4)}
                      </td>
                      <td className="py-3 pr-3 text-xs text-slate-400">{formatDate(row.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination */}
        {rows.length > 0 && (
          <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">Page {page} / {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
