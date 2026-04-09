"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

interface CompanyOrderItem {
  id: number;
  user_id: number;
  plan_id: number;
  plan_name: string;
  amount: number;
  token_symbol: string;
  chain_id: number | null;
  chain_name: string;
  receiver_address: string;
  tx_hash: string | null;
  status: "INITIATED" | "PENDING" | "PAID" | "FAILED";
  created_at: string;
  paid_at: string | null;
}

interface PaginatedOrders {
  items: CompanyOrderItem[];
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

export default function CompanyPaymentLogsPage() {
  const [rows, setRows] = useState<CompanyOrderItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      try {
        const res = await api.get("/payments/company/orders", {
          params: { page, limit: 12, status: status || undefined },
        });
        const payload = (res.data?.data || { items: [], pagination: { totalPages: 1, total: 0 } }) as PaginatedOrders;
        setRows(payload.items || []);
        setTotalPages(payload.pagination?.totalPages || 1);
        setTotal(payload.pagination?.total || 0);
      } catch (error: unknown) {
        const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed to load payment logs";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    void loadOrders();
  }, [page, status]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Company Payment Logs</h1>
          <p className="text-gray-500">Responsive transaction history for end-user package payments with pagination.</p>
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
            <option value="">All statuses</option>
            <option value="INITIATED">Initiated</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="FAILED">Failed</option>
          </select>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
            Total: <span className="font-semibold">{total}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {loading ? (
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading payment logs...
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">No payment logs found for the current filter.</p>
        ) : (
          <>
            <div className="space-y-3 lg:hidden">
              {rows.map((row) => (
                <div key={row.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{row.plan_name || `Plan ${row.plan_id}`}</p>
                      <p className="text-xs text-slate-500">Order #{row.id} | User #{row.user_id}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                      {row.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Amount</p>
                      <p>{row.amount} {row.token_symbol}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Chain</p>
                      <p>{row.chain_name || row.chain_id || "-"}</p>
                    </div>
                  </div>
                  <p className="mt-3 break-all text-xs text-slate-500">{row.tx_hash || "No tx hash yet"}</p>
                  <p className="mt-2 text-xs text-slate-500">{formatDate(row.created_at)}</p>
                </div>
              ))}
            </div>

            <div className="hidden overflow-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700">
                    <th className="py-3 pr-3">Order</th>
                    <th className="py-3 pr-3">User</th>
                    <th className="py-3 pr-3">Plan</th>
                    <th className="py-3 pr-3">Amount</th>
                    <th className="py-3 pr-3">Chain</th>
                    <th className="py-3 pr-3">Receiver</th>
                    <th className="py-3 pr-3">Status</th>
                    <th className="py-3 pr-3">Tx Hash</th>
                    <th className="py-3 pr-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 dark:border-slate-700">
                      <td className="py-3 pr-3">#{row.id}</td>
                      <td className="py-3 pr-3">#{row.user_id}</td>
                      <td className="py-3 pr-3">{row.plan_name || `Plan ${row.plan_id}`}</td>
                      <td className="py-3 pr-3">{row.amount} {row.token_symbol}</td>
                      <td className="py-3 pr-3">{row.chain_name || row.chain_id || "-"}</td>
                      <td className="py-3 pr-3 break-all">{row.receiver_address || "-"}</td>
                      <td className="py-3 pr-3">{row.status}</td>
                      <td className="py-3 pr-3 break-all">{row.tx_hash || "-"}</td>
                      <td className="py-3 pr-3">{formatDate(row.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

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
      </div>
    </div>
  );
}
