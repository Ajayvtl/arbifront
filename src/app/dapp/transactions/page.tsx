"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Hash, Loader2, ReceiptText, Search, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

interface OrderItem {
  id: number;
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
  items: OrderItem[];
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

function parseDateValue(value: string) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function renderStatus(status: OrderItem["status"]) {
  if (status === "PAID") return "bg-[#102821] text-[#0ecb81]";
  if (status === "FAILED") return "bg-[#35151b] text-[#f6465d]";
  return "bg-[#2b2110] text-[#f0b90b]";
}

export default function DappTransactionsPage() {
  const [rows, setRows] = useState<OrderItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hashQuery, setHashQuery] = useState("");
  const [fromDateTime, setFromDateTime] = useState("");
  const [toDateTime, setToDateTime] = useState("");

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      try {
        const res = await api.get("/payments/orders", { params: { page, limit: 10 } });
        const payload = (res.data?.data || {
          items: [],
          pagination: { page: 1, totalPages: 1, total: 0, limit: 10 },
        }) as PaginatedOrders;
        setRows(payload.items || []);
        setTotalPages(payload.pagination?.totalPages || 1);
        setTotal(payload.pagination?.total || 0);
      } catch (error: unknown) {
        const message =
          (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
          "Failed to load payment history";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    void loadOrders();
  }, [page]);

  const filteredRows = useMemo(() => {
    const normalizedHash = hashQuery.trim().toLowerCase();
    const fromTs = parseDateValue(fromDateTime);
    const toTs = parseDateValue(toDateTime);

    return rows.filter((row) => {
      if (normalizedHash) {
        const haystack = `${row.tx_hash || ""} ${row.receiver_address || ""} ${row.id}`.toLowerCase();
        if (!haystack.includes(normalizedHash)) return false;
      }

      const rowTimestamp = new Date(row.paid_at || row.created_at).getTime();
      if (fromTs !== null && rowTimestamp < fromTs) return false;
      if (toTs !== null && rowTimestamp > toTs) return false;

      return true;
    });
  }, [rows, hashQuery, fromDateTime, toDateTime]);

  const paidCount = useMemo(
    () => filteredRows.filter((row) => row.status === "PAID").length,
    [filteredRows]
  );
  const pendingCount = useMemo(
    () => filteredRows.filter((row) => row.status === "PENDING" || row.status === "INITIATED").length,
    [filteredRows]
  );
  const failedCount = useMemo(
    () => filteredRows.filter((row) => row.status === "FAILED").length,
    [filteredRows]
  );

  return (
    <div className="min-h-screen bg-[#060b14] px-4 py-5 md:px-6 md:py-6 xl:px-8">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-[#132235] bg-[radial-gradient(circle_at_top_left,_rgba(30,160,255,0.18),_transparent_32%),linear-gradient(180deg,#0a1422_0%,#09111c_100%)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.35)] md:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5bbcff]">
                Payment Ledger
              </p>
              <h1 className="mt-3 text-3xl font-extrabold text-white md:text-4xl">
                Transactions
              </h1>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:min-w-[360px]">
              <div className="rounded-2xl border border-[#1a2d45] bg-[#0d1726]/88 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#7e9cbd]">All Orders</p>
                <p className="mt-2 text-2xl font-bold text-white">{total}</p>
              </div>
              <div className="rounded-2xl border border-[#1a2d45] bg-[#0d1726]/88 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#7e9cbd]">Visible On Page</p>
                <p className="mt-2 text-2xl font-bold text-white">{filteredRows.length}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-[#132235] bg-[#09111c] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.28)]">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#10243d] text-[#5bbcff]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm text-[#8aa4bf]">Paid</p>
            <p className="mt-2 text-3xl font-bold text-white">{paidCount}</p>
          </div>
          <div className="rounded-3xl border border-[#132235] bg-[#09111c] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.28)]">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2b2110] text-[#f0b90b]">
              <ReceiptText className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm text-[#8aa4bf]">Pending</p>
            <p className="mt-2 text-3xl font-bold text-white">{pendingCount}</p>
          </div>
          <div className="rounded-3xl border border-[#132235] bg-[#09111c] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.28)]">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#35151b] text-[#f6465d]">
              <Hash className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm text-[#8aa4bf]">Failed</p>
            <p className="mt-2 text-3xl font-bold text-white">{failedCount}</p>
          </div>
          <div className="rounded-3xl border border-[#132235] bg-[#09111c] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.28)]">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#10243d] text-[#5bbcff]">
              <CalendarDays className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm text-[#8aa4bf]">Current Page</p>
            <p className="mt-2 text-3xl font-bold text-white">
              {page} <span className="text-base font-medium text-[#7e9cbd]">/ {totalPages}</span>
            </p>
          </div>
        </section>

        <section className="rounded-[30px] border border-[#132235] bg-[#09111c] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.28)] md:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5bbcff]">
                Search Filters
              </p>
              <h2 className="mt-2 text-xl font-bold text-white">Hash And Date-Time Search</h2>
              <p className="mt-1 text-sm text-[#8aa4bf]">
                Filter the loaded transaction page by transaction hash, order id, receiver wallet,
                and payment time window.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setHashQuery("");
                setFromDateTime("");
                setToDateTime("");
              }}
              className="rounded-2xl border border-[#24364a] px-4 py-2 text-sm font-medium text-[#dbe7f3] transition hover:border-[#35506b] hover:bg-[#0d1726]"
            >
              Clear Filters
            </button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7e9cbd]">
                Tx Hash / Order / Receiver
              </span>
              <div className="flex items-center gap-3 rounded-2xl border border-[#1d3048] bg-[#0d1726] px-4 py-3">
                <Search className="h-4 w-4 text-[#5bbcff]" />
                <input
                  value={hashQuery}
                  onChange={(event) => setHashQuery(event.target.value)}
                  placeholder="0x..., receiver wallet, or order id"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#6f88a4]"
                />
              </div>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7e9cbd]">
                From Date And Time
              </span>
              <input
                type="datetime-local"
                value={fromDateTime}
                onChange={(event) => setFromDateTime(event.target.value)}
                className="w-full rounded-2xl border border-[#1d3048] bg-[#0d1726] px-4 py-3 text-sm text-white outline-none"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7e9cbd]">
                To Date And Time
              </span>
              <input
                type="datetime-local"
                value={toDateTime}
                onChange={(event) => setToDateTime(event.target.value)}
                className="w-full rounded-2xl border border-[#1d3048] bg-[#0d1726] px-4 py-3 text-sm text-white outline-none"
              />
            </label>
          </div>
        </section>

        <section className="rounded-[30px] border border-[#132235] bg-[#09111c] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.28)] md:p-6">
          {loading ? (
            <div className="flex items-center gap-3 rounded-2xl border border-[#1d3048] bg-[#0d1726] px-4 py-5 text-[#8aa4bf]">
              <Loader2 className="h-5 w-5 animate-spin text-[#5bbcff]" />
              Loading payment history...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#29405c] bg-[#0d1726] px-5 py-10 text-center">
              <p className="text-lg font-semibold text-white">No transactions matched this filter.</p>
              <p className="mt-2 text-sm text-[#8aa4bf]">
                Try clearing the hash or widening the date-time range.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4 lg:hidden">
                {filteredRows.map((row) => (
                  <article
                    key={row.id}
                    className="rounded-[28px] border border-[#1d3048] bg-[#0d1726] p-4 shadow-[0_16px_30px_rgba(0,0,0,0.22)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-white">
                          {row.plan_name || `Plan ${row.plan_id}`}
                        </p>
                        <p className="mt-1 text-xs text-[#7e9cbd]">Order #{row.id}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${renderStatus(row.status)}`}>
                        {row.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl border border-[#1b2d43] bg-[#0a1422] p-3">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-[#7e9cbd]">Amount</p>
                        <p className="mt-2 text-white">{row.amount} {row.token_symbol}</p>
                      </div>
                      {/* <div className="rounded-2xl border border-[#1b2d43] bg-[#0a1422] p-3">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-[#7e9cbd]">Chain</p>
                        <p className="mt-2 text-white">{row.chain_name || row.chain_id || "-"}</p>
                      </div> */}
                    </div>

                    <div className="mt-4 space-y-3 text-sm">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-[#7e9cbd]">Receiver</p>
                        <p className="mt-1 break-all text-[#dbe7f3]">{row.receiver_address || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-[#7e9cbd]">Tx Hash</p>
                        <p className="mt-1 break-all text-[#dbe7f3]">{row.tx_hash || "No tx hash yet"}</p>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[#7e9cbd]">Created</p>
                          <p className="mt-1 text-[#dbe7f3]">{formatDate(row.created_at)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[#7e9cbd]">Paid</p>
                          <p className="mt-1 text-[#dbe7f3]">{formatDate(row.paid_at)}</p>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1f3249] text-left text-[#7e9cbd]">
                      <th className="px-4 py-4 font-semibold">Order</th>
                      <th className="px-4 py-4 font-semibold">Plan</th>
                      <th className="px-4 py-4 font-semibold">Amount</th>
                      {/* <th className="px-4 py-4 font-semibold">Chain</th> */}
                      <th className="px-4 py-4 font-semibold">Receiver</th>
                      <th className="px-4 py-4 font-semibold">Status</th>
                      <th className="px-4 py-4 font-semibold">Tx Hash</th>
                      <th className="px-4 py-4 font-semibold">Created</th>
                      <th className="px-4 py-4 font-semibold">Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.id} className="border-b border-[#132235] text-[#e6edf5]">
                        <td className="px-4 py-4 align-top">#{row.id}</td>
                        <td className="px-4 py-4 align-top">{row.plan_name || `Plan ${row.plan_id}`}</td>
                        <td className="px-4 py-4 align-top">{row.amount} {row.token_symbol}</td>
                        {/* <td className="px-4 py-4 align-top">{row.chain_name || row.chain_id || "-"}</td> */}
                        <td className="max-w-[180px] px-4 py-4 align-top break-all text-[#c8d6e5]">{row.receiver_address || "-"}</td>
                        <td className="px-4 py-4 align-top">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${renderStatus(row.status)}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="max-w-[220px] px-4 py-4 align-top break-all text-[#c8d6e5]">{row.tx_hash || "-"}</td>
                        <td className="px-4 py-4 align-top whitespace-nowrap">{formatDate(row.created_at)}</td>
                        <td className="px-4 py-4 align-top whitespace-nowrap">{formatDate(row.paid_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="mt-6 flex flex-col gap-4 border-t border-[#132235] pt-5 md:flex-row md:items-center md:justify-between">
            <Link
              href="/dapp/dashboard"
              className="text-sm font-medium text-[#8aa4bf] transition hover:text-white"
            >
              Back to dashboard
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="rounded-2xl border border-[#24364a] px-4 py-2 text-sm font-medium text-[#f5f5f5] transition hover:border-[#35506b] hover:bg-[#0d1726] disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-2 text-sm text-[#8aa4bf]">
                Page {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                className="rounded-2xl border border-[#24364a] px-4 py-2 text-sm font-medium text-[#f5f5f5] transition hover:border-[#35506b] hover:bg-[#0d1726] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
