"use client";

import { useEffect, useState } from "react";
import { Loader2, ArrowLeftRight, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

interface ExchangeLogItem {
  status: "SUCCESS" | "FAILED";
  log_id: number;
  user_id: number;
  order_id: number;
  package_amount: number;
  lacking_type: string;
  lacking_amount: string;
  gas_required: string;
  wallet_address: string;
  tx_hash: string | null;
  created_at: string;
  error_message: string | null;
}

interface PaginatedLogs {
  items: ExchangeLogItem[];
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

export default function ExchangeLogsPage() {
  const [rows, setRows] = useState<ExchangeLogItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/exchange-config/logs", {
        params: { page, limit: 12, status: status || undefined },
      });
      const payload = (res.data?.data || { items: [], pagination: { totalPages: 1, total: 0 } }) as PaginatedLogs;
      setRows(payload.items || []);
      setTotalPages(payload.pagination?.totalPages || 1);
      setTotal(payload.pagination?.total || 0);
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed to load exchange logs";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, [page, status]);

  const handleRetry = async (log: ExchangeLogItem) => {
    if (retryingId !== null) return;
    setRetryingId(log.log_id);
    try {
      const res = await api.post(`/admin/exchange-config/failures/${log.log_id}/retry`);
      if (res.data?.data?.success || res.data?.success) {
        toast.success("Retry sweep succeeded!");
        void loadLogs();
      } else {
        toast.error(res.data?.data?.message || res.data?.message || "Retry sweep failed");
      }
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message || "Retry sweep failed";
      toast.error(message);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6 text-primary" />
            Exchange Sweep Logs
          </h1>
          <p className="text-gray-500 text-sm">View and audit automated sequential exchange router sweeps for subscriptions.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
          </select>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
            Total: <span className="font-semibold">{total}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 py-8 justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            Loading exchange logs...
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No exchange routing logs found for the current filter.
          </div>
        ) : (
          <>
            {/* Mobile View */}
            <div className="space-y-3 lg:hidden">
              {rows.map((row) => (
                <div key={`${row.status}-${row.log_id}`} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-mono text-slate-500">Order #{row.order_id} | Member #{row.user_id}</p>
                      <p className="text-xs break-all font-mono text-slate-600 dark:text-slate-400 mt-1">{row.wallet_address}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      row.status === "SUCCESS" 
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}>
                      {row.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Package Value</p>
                      <p className="font-semibold">${row.package_amount}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Swept Amount</p>
                      <p className="font-mono text-xs">{row.lacking_amount || "-"}</p>
                    </div>
                  </div>
                  {row.status === "FAILED" && (
                    <div className="mt-3 bg-red-50 dark:bg-red-950/20 p-2.5 rounded-lg border border-red-100 dark:border-red-900/30">
                      <p className="text-xs text-red-600 dark:text-red-400">
                        <span className="font-semibold">Lacking:</span> {row.lacking_type} ({row.lacking_amount}). Gas: {row.gas_required}
                      </p>
                      {row.error_message && (
                        <p className="text-[11px] text-red-500 mt-1 font-mono break-all">{row.error_message}</p>
                      )}
                      <button
                        onClick={() => void handleRetry(row)}
                        disabled={retryingId !== null}
                        className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold disabled:opacity-50 transition"
                      >
                        {retryingId === row.log_id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                        Retry Sweep
                      </button>
                    </div>
                  )}
                  {row.tx_hash && (
                    <p className="mt-3 break-all text-xs font-mono text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-2 rounded border dark:border-slate-800">
                      <span className="font-semibold text-[10px] uppercase text-slate-400 block">Tx Hash</span>
                      {row.tx_hash}
                    </p>
                  )}
                  <p className="mt-2 text-[11px] text-slate-400 text-right">{formatDate(row.created_at)}</p>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden overflow-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700">
                    <th className="py-3 pr-3">Status</th>
                    <th className="py-3 pr-3">Order</th>
                    <th className="py-3 pr-3">Member Address</th>
                    <th className="py-3 pr-3">Pkg Value</th>
                    <th className="py-3 pr-3">Swept Amount</th>
                    <th className="py-3 pr-3">Tx Hash / Error Details</th>
                    <th className="py-3 pr-3">Time</th>
                    <th className="py-3 pr-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={`${row.status}-${row.log_id}`} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 pr-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          row.status === "SUCCESS"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 pr-3 font-mono">#{row.order_id}</td>
                      <td className="py-3 pr-3 font-mono text-xs break-all max-w-[200px]">{row.wallet_address}</td>
                      <td className="py-3 pr-3 font-semibold">${row.package_amount}</td>
                      <td className="py-3 pr-3 font-mono text-xs">{row.lacking_amount || "-"}</td>
                      <td className="py-3 pr-3 max-w-[300px] break-all font-mono text-xs text-slate-500">
                        {row.status === "SUCCESS" ? (
                          row.tx_hash || "-"
                        ) : (
                          <div>
                            <p className="text-red-600 dark:text-red-400 font-sans text-xs">
                              Lacking: <span className="font-semibold">{row.lacking_type}</span>. Gas: {row.gas_required}
                            </p>
                            {row.error_message && (
                              <p className="text-[11px] text-red-500/80 mt-0.5 break-words">{row.error_message}</p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-xs text-slate-400">{formatDate(row.created_at)}</td>
                      <td className="py-3 pr-3 text-right">
                        {row.status === "FAILED" && (
                          <button
                            onClick={() => void handleRetry(row)}
                            disabled={retryingId !== null}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold disabled:opacity-50 transition"
                          >
                            {retryingId === row.log_id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                            Retry
                          </button>
                        )}
                      </td>
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
