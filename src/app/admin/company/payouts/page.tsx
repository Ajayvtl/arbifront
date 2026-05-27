"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { ShieldCheck, Search } from "lucide-react";

type Payout = {
  id: number;
  user_id: number;
  user_wallet_address: string;
  amount: number;
  charge: number;
  net_amount: number;
  withdrawal_wallet_address: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUCCESS";
  tx_hash: string | null;
  callback_status: string;
  created_at: string;
};

interface ExchangeActiveSummary {
  withdrawWallet?: string;
  assetMode: "TOKEN" | "COIN";
  nativeSymbol: string;
  customSymbol: string;
  withdrawBalances?: { bnb: string; usdt: string; token: string } | null;
}

const statusOptions = ["", "PENDING", "APPROVED", "REJECTED", "SUCCESS"];

export default function CompanyPayoutsPage() {
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [exchangeSummary, setExchangeSummary] = useState<ExchangeActiveSummary | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadExchangeSummary = useCallback(async () => {
    try {
      const res = await api.get("/admin/exchange-config/active-summary");
      setExchangeSummary((res.data?.data || null) as ExchangeActiveSummary | null);
    } catch {
      setExchangeSummary(null);
    }
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/mlm/payouts", { params: { status, limit: 200 } });
      setRows((response.data?.data || []) as Payout[]);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to load payouts";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void loadRows();
    void loadExchangeSummary();
  }, [loadRows, loadExchangeSummary]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [status]);

  const filteredRows = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r => `#${r.id} #${r.user_id} ${r.user_wallet_address || ''} ${r.withdrawal_wallet_address || ''} ${r.tx_hash || ''} ${r.status}`.toLowerCase().includes(q));
  }, [rows, search]);

  const totalPayouts = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalPayouts / itemsPerPage));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [filteredRows, currentPage, itemsPerPage]);

  const updateStatus = async (row: Payout, next: "APPROVED" | "REJECTED" | "SUCCESS") => {
    try {
      const txHash = next === "SUCCESS" ? window.prompt("Enter tx hash (optional):", row.tx_hash || "") || undefined : undefined;
      await api.patch(`/mlm/payouts/${row.id}/status`, { status: next, txHash });
      toast.success(`Payout #${row.id} marked ${next}`);
      await loadRows();
      await loadExchangeSummary();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update payout status";
      toast.error(message);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Payout Queue</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Review and process withdrawal requests.</p>
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
        >
          {statusOptions.map((opt) => (
            <option key={opt || "ALL"} value={opt}>{opt || "All statuses"}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search by user, wallet, tx hash…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
        </div>
      </div>

      {exchangeSummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-500" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Withdrawal Wallet</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Processes automated withdrawal requests</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Withdrawal
              </span>
            </div>
            
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Wallet Address</div>
              <div className="mt-1 font-mono text-[11px] text-slate-700 dark:text-slate-200 break-all select-all">
                {exchangeSummary.withdrawWallet || "Not Configured"}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3 text-center">
                <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{exchangeSummary.nativeSymbol || "BNB"}</div>
                <div className="mt-1 font-mono text-xs font-bold text-slate-700 dark:text-slate-200">{exchangeSummary.withdrawBalances?.bnb || "0.0000"}</div>
              </div>
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3 text-center">
                <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400">USDT</div>
                <div className="mt-1 font-mono text-xs font-bold text-slate-700 dark:text-slate-200">{exchangeSummary.withdrawBalances?.usdt || "0.00"}</div>
              </div>
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3 text-center">
                <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">{exchangeSummary.customSymbol || "TOKEN"}</div>
                <div className="mt-1 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {exchangeSummary.assetMode === "TOKEN" ? exchangeSummary.withdrawBalances?.token : exchangeSummary.withdrawBalances?.bnb}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-sm">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Req #</th>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Destination</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Tx Hash</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={7}>Loading payouts...</td></tr>
              ) : paginatedRows.length === 0 ? (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={7}>No payout requests found.</td></tr>
              ) : paginatedRows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3">#{row.id}</td>
                  <td className="px-4 py-3">#{row.user_id}</td>
                  <td className="px-4 py-3">{Number(row.amount || 0).toFixed(6)} (net {Number(row.net_amount || 0).toFixed(6)})</td>
                  <td className="px-4 py-3 max-w-[220px] truncate" title={row.withdrawal_wallet_address}>{row.withdrawal_wallet_address || row.user_wallet_address}</td>
                  <td className="px-4 py-3">{row.status}</td>
                  <td className="px-4 py-3 max-w-[220px] truncate" title={row.tx_hash || ""}>{row.tx_hash || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => updateStatus(row, "APPROVED")} className="px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-700">Approve</button>
                      <button onClick={() => updateStatus(row, "REJECTED")} className="px-2 py-1 text-xs rounded bg-rose-100 text-rose-700">Reject</button>
                      <button onClick={() => updateStatus(row, "SUCCESS")} className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">Mark Paid</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalPayouts)} of {totalPayouts} entries
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
