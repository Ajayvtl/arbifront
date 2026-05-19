"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Hash, Loader2, ReceiptText, Search, ShieldCheck, History } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

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

interface WithdrawalRecord {
  id: number;
  amount: number;
  charge: number;
  net_amount: number;
  wallet_address: string;
  status: "PENDING" | "APPROVED" | "FAILED" | "REJECTED" | "SUCCESS";
  tx_hash: string | null;
  remark: string | null;
  processed_at: string | null;
  created_at: string;
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

function renderWithdrawalStatus(status: string) {
  if (status === "APPROVED" || status === "SUCCESS") return "bg-[#102821] text-[#0ecb81]";
  if (status === "FAILED" || status === "REJECTED") return "bg-[#35151b] text-[#f6465d]";
  return "bg-[#2b2110] text-[#f0b90b]";
}

export default function DappTransactionsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"packages" | "withdrawals">("packages");
  
  // Package orders state
  const [rows, setRows] = useState<OrderItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hashQuery, setHashQuery] = useState("");
  const [fromDateTime, setFromDateTime] = useState("");
  const [toDateTime, setToDateTime] = useState("");
  const [manualHashes, setManualHashes] = useState<Record<number, string>>({});

  const [verifyingOrderId, setVerifyingOrderId] = useState<number | null>(null);
  const handleReverify = async (orderId: number, txHash: string) => {
    const trimmedHash = String(txHash || "").trim();
    setVerifyingOrderId(orderId);
    const toastId = toast.loading(
      trimmedHash
        ? "Verifying payment on-chain... Please wait."
        : "Searching blockchain explorer for matching transaction..."
    );
    try {
      if (trimmedHash) {
        await api.post("/payments/update-hash", { orderId, txHash: trimmedHash });
      }
      
      await api.post("/payments/verify", { orderId, txHash: trimmedHash || undefined });
      toast.success("Payment verified and package activated!", { id: toastId });
      
      const res = await api.get("/payments/orders", { params: { page, limit: 10 } });
      const payload = (res.data?.data || { items: [] }) as PaginatedOrders;
      setRows(payload.items || []);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message ||
        (error as { message?: string }).message ||
        "Payment verification failed";
      toast.error(message, { id: toastId });
    } finally {
      setVerifyingOrderId(null);
    }
  };

  // Withdrawals state
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [withdrawHashQuery, setWithdrawHashQuery] = useState("");
  const [withdrawFromDateTime, setWithdrawFromDateTime] = useState("");
  const [withdrawToDateTime, setWithdrawToDateTime] = useState("");

  // Load package orders
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

  // Load withdrawals
  useEffect(() => {
    const loadWithdrawals = async () => {
      if (!user?.id) return;
      setWithdrawalsLoading(true);
      try {
        const res = await api.get(`/wallets/${user.id}/withdrawals`);
        setWithdrawals(res.data?.data || []);
      } catch (error: unknown) {
        const message =
          (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
          "Failed to load withdrawal history";
        toast.error(message);
      } finally {
        setWithdrawalsLoading(false);
      }
    };

    if (user?.id) {
      void loadWithdrawals();
    }
  }, [user?.id, activeTab]);

  // Filtered package orders
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

  // Filtered withdrawals
  const filteredWithdrawals = useMemo(() => {
    const normalizedHash = withdrawHashQuery.trim().toLowerCase();
    const fromTs = parseDateValue(withdrawFromDateTime);
    const toTs = parseDateValue(withdrawToDateTime);

    return withdrawals.filter((row) => {
      if (normalizedHash) {
        const haystack = `${row.tx_hash || ""} ${row.wallet_address || ""} ${row.id} ${row.remark || ""}`.toLowerCase();
        if (!haystack.includes(normalizedHash)) return false;
      }

      const rowTimestamp = new Date(row.created_at).getTime();
      if (fromTs !== null && rowTimestamp < fromTs) return false;
      if (toTs !== null && rowTimestamp > toTs) return false;

      return true;
    });
  }, [withdrawals, withdrawHashQuery, withdrawFromDateTime, withdrawToDateTime]);

  // Stats derived from package orders
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

  // Stats derived from withdrawals
  const wSuccessCount = useMemo(
    () => filteredWithdrawals.filter((w) => w.status === "APPROVED" || w.status === "SUCCESS").length,
    [filteredWithdrawals]
  );
  const wPendingCount = useMemo(
    () => filteredWithdrawals.filter((w) => w.status === "PENDING").length,
    [filteredWithdrawals]
  );
  const wFailedCount = useMemo(
    () => filteredWithdrawals.filter((w) => w.status === "FAILED" || w.status === "REJECTED").length,
    [filteredWithdrawals]
  );

  return (
    <div className="min-h-screen bg-[#060b14] px-4 py-5 md:px-6 md:py-6 xl:px-8">
      <div className="space-y-6">
        {/* Header Section */}
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
            
            <div className="flex gap-2 rounded-2xl bg-[#09111c]/90 border border-[#132235] p-1.5 w-fit">
              <button
                type="button"
                onClick={() => setActiveTab("packages")}
                className={`rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === "packages"
                    ? "bg-[#f0b90b] text-[#181a20] shadow-[0_4px_20px_rgba(240,185,11,0.25)]"
                    : "text-[#8aa4bf] hover:text-white"
                }`}
              >
                Deposits & Packages
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("withdrawals")}
                className={`rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === "withdrawals"
                    ? "bg-[#f0b90b] text-[#181a20] shadow-[0_4px_20px_rgba(240,185,11,0.25)]"
                    : "text-[#8aa4bf] hover:text-white"
                }`}
              >
                Withdrawals
              </button>
            </div>
          </div>
        </section>

        {/* Stats Cards Section */}
        {activeTab === "packages" ? (
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
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-[#132235] bg-[#09111c] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.28)]">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#10243d] text-[#0ecb81]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm text-[#8aa4bf]">Completed</p>
              <p className="mt-2 text-3xl font-bold text-white">{wSuccessCount}</p>
            </div>
            <div className="rounded-3xl border border-[#132235] bg-[#09111c] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.28)]">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2b2110] text-[#f0b90b]">
                <Loader2 className="h-5 w-5 animate-pulse" />
              </div>
              <p className="mt-4 text-sm text-[#8aa4bf]">Pending</p>
              <p className="mt-2 text-3xl font-bold text-white">{wPendingCount}</p>
            </div>
            <div className="rounded-3xl border border-[#132235] bg-[#09111c] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.28)]">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#35151b] text-[#f6465d]">
                <Hash className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm text-[#8aa4bf]">Failed / Rejected</p>
              <p className="mt-2 text-3xl font-bold text-white">{wFailedCount}</p>
            </div>
            <div className="rounded-3xl border border-[#132235] bg-[#09111c] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.28)]">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#10243d] text-[#5bbcff]">
                <History className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm text-[#8aa4bf]">Total Actions</p>
              <p className="mt-2 text-3xl font-bold text-white">{withdrawals.length}</p>
            </div>
          </section>
        )}

        {/* Filter Section */}
        <section className="rounded-[30px] border border-[#132235] bg-[#09111c] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.28)] md:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5bbcff]">
                Search Filters
              </p>
              <h2 className="mt-2 text-xl font-bold text-white">Hash And Date-Time Search</h2>
              <p className="mt-1 text-sm text-[#8aa4bf]">
                Filter the loaded transaction logs by hash, status, receiver wallet, and time window.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (activeTab === "packages") {
                  setHashQuery("");
                  setFromDateTime("");
                  setToDateTime("");
                } else {
                  setWithdrawHashQuery("");
                  setWithdrawFromDateTime("");
                  setWithdrawToDateTime("");
                }
              }}
              className="rounded-2xl border border-[#24364a] px-4 py-2 text-sm font-medium text-[#dbe7f3] transition hover:border-[#35506b] hover:bg-[#0d1726]"
            >
              Clear Filters
            </button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7e9cbd]">
                {activeTab === "packages" ? "Tx Hash / Order / Receiver" : "Tx Hash / ID / Destination / Remark"}
              </span>
              <div className="flex items-center gap-3 rounded-2xl border border-[#1d3048] bg-[#0d1726] px-4 py-3">
                <Search className="h-4 w-4 text-[#5bbcff]" />
                <input
                  value={activeTab === "packages" ? hashQuery : withdrawHashQuery}
                  onChange={(event) => activeTab === "packages" ? setHashQuery(event.target.value) : setWithdrawHashQuery(event.target.value)}
                  placeholder={activeTab === "packages" ? "0x..., receiver wallet, or order id" : "0x..., ID, address, or remark"}
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
                value={activeTab === "packages" ? fromDateTime : withdrawFromDateTime}
                onChange={(event) => activeTab === "packages" ? setFromDateTime(event.target.value) : setWithdrawFromDateTime(event.target.value)}
                className="w-full rounded-2xl border border-[#1d3048] bg-[#0d1726] px-4 py-3 text-sm text-white outline-none"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7e9cbd]">
                To Date And Time
              </span>
              <input
                type="datetime-local"
                value={activeTab === "packages" ? toDateTime : withdrawToDateTime}
                onChange={(event) => activeTab === "packages" ? setToDateTime(event.target.value) : setWithdrawToDateTime(event.target.value)}
                className="w-full rounded-2xl border border-[#1d3048] bg-[#0d1726] px-4 py-3 text-sm text-white outline-none"
              />
            </label>
          </div>
        </section>

        {/* List / Table Section */}
        <section className="rounded-[30px] border border-[#132235] bg-[#09111c] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.28)] md:p-6">
          {activeTab === "packages" ? (
            loading ? (
              <div className="flex items-center gap-3 rounded-2xl border border-[#1d3048] bg-[#0d1726] px-4 py-5 text-[#8aa4bf]">
                <Loader2 className="h-5 w-5 animate-spin text-[#5bbcff]" />
                Loading payment history...
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#29405c] bg-[#0d1726] px-5 py-10 text-center">
                <p className="text-lg font-semibold text-white">No transactions matched this filter.</p>
                <p className="mt-2 text-sm text-[#8aa4bf]">
                  Try clearing the filters or widening the search window.
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
                      </div>

                      <div className="mt-4 space-y-3 text-sm">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[#7e9cbd]">Receiver</p>
                          <p className="mt-1 break-all text-[#dbe7f3]">{row.receiver_address || "-"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[#7e9cbd]">Tx Hash</p>
                          {row.tx_hash ? (
                            <div className="mt-1 flex items-center justify-between gap-2 flex-wrap">
                              <span className="break-all font-mono text-[#dbe7f3] text-xs">{row.tx_hash}</span>
                              {row.status === "INITIATED" && (
                                <button
                                  type="button"
                                  disabled={verifyingOrderId === row.id}
                                  onClick={() => handleReverify(row.id, row.tx_hash!)}
                                  className="rounded bg-[#f0b90b] px-2.5 py-1 text-[11px] font-bold text-[#181a20] hover:bg-[#f8d45c] disabled:opacity-50"
                                >
                                  {verifyingOrderId === row.id ? "Verifying..." : "Verify Now"}
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="mt-2 flex flex-col gap-2">
                              {row.status === "INITIATED" ? (
                                <>
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <span className="text-[#8aa4bf] text-xs">No hash logged yet</span>
                                    <button
                                      type="button"
                                      disabled={verifyingOrderId === row.id}
                                      onClick={() => handleReverify(row.id, "")}
                                      className="rounded bg-[#f0b90b] px-2.5 py-1 text-[11px] font-bold text-[#181a20] hover:bg-[#f8d45c] disabled:opacity-50"
                                    >
                                      {verifyingOrderId === row.id ? "Scanning Explorer..." : "Auto-Verify"}
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <input
                                      type="text"
                                      placeholder="Or paste Tx Hash here"
                                      value={manualHashes[row.id] || ""}
                                      onChange={(e) => setManualHashes(prev => ({ ...prev, [row.id]: e.target.value }))}
                                      className="flex-1 rounded border border-[#24364a] bg-[#0d1726] px-2 py-1 text-xs text-white outline-none placeholder:text-[#506e8b]"
                                    />
                                    <button
                                      type="button"
                                      disabled={verifyingOrderId === row.id || !manualHashes[row.id]}
                                      onClick={() => handleReverify(row.id, manualHashes[row.id])}
                                      className="rounded bg-[#5bbcff] px-3 py-1 text-xs font-bold text-[#060b14] hover:bg-[#86cbff] disabled:opacity-50"
                                    >
                                      Verify
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <span className="text-[#8aa4bf] text-xs">No transaction hash</span>
                              )}
                            </div>
                          )}
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
                          <td className="max-w-[180px] px-4 py-4 align-top break-all text-[#c8d6e5]">{row.receiver_address || "-"}</td>
                          <td className="px-4 py-4 align-top">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${renderStatus(row.status)}`}>
                              {row.status}
                            </span>
                          </td>
                           <td className="max-w-[240px] px-4 py-4 align-top break-all text-[#c8d6e5]">
                            {row.tx_hash ? (
                              <div className="flex flex-col gap-1.5">
                                <span className="font-mono text-xs text-[#c8d6e5]">{row.tx_hash}</span>
                                {row.status === "INITIATED" && (
                                  <button
                                    type="button"
                                    disabled={verifyingOrderId === row.id}
                                    onClick={() => handleReverify(row.id, row.tx_hash!)}
                                    className="w-fit rounded bg-[#f0b90b] px-2 py-0.5 text-[11px] font-bold text-[#181a20] hover:bg-[#f8d45c] disabled:opacity-50"
                                  >
                                    {verifyingOrderId === row.id ? "Verifying..." : "Verify Now"}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2 max-w-[200px]">
                                {row.status === "INITIATED" ? (
                                  <>
                                    <span className="text-[#8aa4bf] text-xs">No hash logged</span>
                                    <button
                                      type="button"
                                      disabled={verifyingOrderId === row.id}
                                      onClick={() => handleReverify(row.id, "")}
                                      className="w-fit rounded bg-[#f0b90b] px-2 py-0.5 text-[11px] font-bold text-[#181a20] hover:bg-[#f8d45c] disabled:opacity-50"
                                    >
                                      {verifyingOrderId === row.id ? "Scanning..." : "Auto-Verify"}
                                    </button>
                                    <div className="flex items-center gap-1 mt-1">
                                      <input
                                        type="text"
                                        placeholder="Paste Tx Hash"
                                        value={manualHashes[row.id] || ""}
                                        onChange={(e) => setManualHashes(prev => ({ ...prev, [row.id]: e.target.value }))}
                                        className="w-28 rounded border border-[#24364a] bg-[#0d1726] px-1.5 py-0.5 text-[10px] text-white outline-none placeholder:text-[#506e8b]"
                                      />
                                      <button
                                        type="button"
                                        disabled={verifyingOrderId === row.id || !manualHashes[row.id]}
                                        onClick={() => handleReverify(row.id, manualHashes[row.id])}
                                        className="rounded bg-[#5bbcff] px-2 py-0.5 text-[10px] font-bold text-[#060b14] hover:bg-[#86cbff] disabled:opacity-50"
                                      >
                                        Verify
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-[#8aa4bf] text-xs">-</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 align-top whitespace-nowrap">{formatDate(row.created_at)}</td>
                          <td className="px-4 py-4 align-top whitespace-nowrap">{formatDate(row.paid_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

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
              </>
            )
          ) : (
            // Withdrawals Tab Content
            withdrawalsLoading ? (
              <div className="flex items-center gap-3 rounded-2xl border border-[#1d3048] bg-[#0d1726] px-4 py-5 text-[#8aa4bf]">
                <Loader2 className="h-5 w-5 animate-spin text-[#5bbcff]" />
                Loading withdrawal history...
              </div>
            ) : filteredWithdrawals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#29405c] bg-[#0d1726] px-5 py-10 text-center">
                <p className="text-lg font-semibold text-white">No withdrawals matched this filter.</p>
                <p className="mt-2 text-sm text-[#8aa4bf]">
                  Try clearing the filters or checking back later.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4 lg:hidden">
                  {filteredWithdrawals.map((w) => (
                    <article
                      key={w.id}
                      className="rounded-[28px] border border-[#1d3048] bg-[#0d1726] p-4 shadow-[0_16px_30px_rgba(0,0,0,0.22)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-white">
                            Withdrawal #{w.id}
                          </p>
                          <p className="mt-1 text-xs text-[#7e9cbd]">{formatDate(w.created_at)}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${renderWithdrawalStatus(w.status)}`}>
                          {w.status}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-2xl border border-[#1b2d43] bg-[#0a1422] p-3">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[#7e9cbd]">Net Received</p>
                          <p className="mt-2 text-white font-bold text-base">{Number(w.net_amount).toFixed(2)} USDT</p>
                        </div>
                        <div className="rounded-2xl border border-[#1b2d43] bg-[#0a1422] p-3">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[#7e9cbd]">Fee Charged</p>
                          <p className="mt-2 text-white font-mono">{Number(w.charge).toFixed(2)} USDT</p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3 text-sm">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[#7e9cbd]">Target Wallet Address</p>
                          <p className="mt-1 break-all text-[#dbe7f3] font-mono">{w.wallet_address || "-"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[#7e9cbd]">Tx Hash</p>
                          <p className="mt-1 break-all text-[#dbe7f3] font-mono">{w.tx_hash || "Processing..."}</p>
                        </div>
                        {w.remark && (
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.16em] text-[#7e9cbd]">Remark</p>
                            <p className="mt-1 text-[#dbe7f3]">{w.remark}</p>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-x-auto lg:block">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#1f3249] text-left text-[#7e9cbd]">
                        <th className="px-4 py-4 font-semibold">ID</th>
                        <th className="px-4 py-4 font-semibold">Requested Amount</th>
                        <th className="px-4 py-4 font-semibold">Fee (Charge)</th>
                        <th className="px-4 py-4 font-semibold">Net Payout</th>
                        <th className="px-4 py-4 font-semibold">Destination Wallet</th>
                        <th className="px-4 py-4 font-semibold">Status</th>
                        <th className="px-4 py-4 font-semibold">Tx Hash</th>
                        <th className="px-4 py-4 font-semibold">Processed At</th>
                        <th className="px-4 py-4 font-semibold">Created At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWithdrawals.map((w) => (
                        <tr key={w.id} className="border-b border-[#132235] text-[#e6edf5] transition-all hover:bg-[#0d1726]/30">
                          <td className="px-4 py-4 align-top">#{w.id}</td>
                          <td className="px-4 py-4 align-top">{Number(w.amount).toFixed(2)} USDT</td>
                          <td className="px-4 py-4 align-top text-[#8aa4bf]">{Number(w.charge).toFixed(2)} USDT</td>
                          <td className="px-4 py-4 align-top font-bold text-white">{Number(w.net_amount).toFixed(2)} USDT</td>
                          <td className="max-w-[160px] px-4 py-4 align-top break-all font-mono text-[#c8d6e5]">{w.wallet_address || "-"}</td>
                          <td className="px-4 py-4 align-top">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${renderWithdrawalStatus(w.status)}`}>
                              {w.status}
                            </span>
                          </td>
                          <td className="max-w-[200px] px-4 py-4 align-top break-all font-mono text-[#c8d6e5]">{w.tx_hash || "-"}</td>
                          <td className="px-4 py-4 align-top whitespace-nowrap">{formatDate(w.processed_at)}</td>
                          <td className="px-4 py-4 align-top whitespace-nowrap">{formatDate(w.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex flex-col gap-4 border-t border-[#132235] pt-5 md:flex-row md:items-center md:justify-between">
                  <Link
                    href="/dapp/dashboard"
                    className="text-sm font-medium text-[#8aa4bf] transition hover:text-white"
                  >
                    Back to dashboard
                  </Link>
                  <span className="text-sm text-[#8aa4bf]">
                    Showing {filteredWithdrawals.length} withdrawal records
                  </span>
                </div>
              </>
            )
          )}
        </section>
      </div>
    </div>
  );
}
