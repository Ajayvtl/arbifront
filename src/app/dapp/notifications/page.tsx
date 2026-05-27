"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, ChevronRight, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { getWalletTypeLabel } from "@/lib/walletTypeLabels";

type SessionProfile = {
  mlmSettings?: {
    wallet_type_labels?: Partial<Record<string, unknown>> | null;
  } | null;
};

type NotificationItem = {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: number;
  action_url?: string | null;
  meta?: Record<string, unknown> | null;
  created_at: string;
};

type NotificationResponse = {
  items: NotificationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    unread: number;
  };
};

function formatDateTime(value?: string) {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function normalizeActionUrl(url?: string | null) {
  if (!url) return "/dapp/dashboard";
  if (url.startsWith("/")) return url;
  return "/dapp/dashboard";
}

export default function DappNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [page, setPage] = useState(1);
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [data, setData] = useState<NotificationResponse>({
    items: [],
    pagination: { page: 1, limit: 12, total: 0, totalPages: 1, unread: 0 },
  });

  const loadNotifications = async (targetPage = page) => {
    setLoading(true);
    try {
      const [profileRes, notificationsRes] = await Promise.all([
        api.get("/auth/me").catch(() => null),
        api.get("/notifications", {
          params: { page: targetPage, limit: 12 },
        }),
      ]);
      
      if (profileRes) {
        setProfile(profileRes.data?.data as SessionProfile | null);
      }
      
      const nextData = notificationsRes.data?.data as NotificationResponse | undefined;
      if (nextData) {
        setData(nextData);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications(page);
  }, [page]);

  const unreadCount = Number(data.pagination?.unread || 0);
  const totalCount = Number(data.pagination?.total || 0);

  const visibleItems = useMemo(() => {
    // Hide duplicate booster/roi credit notifications that can appear multiple times for the same tick.
    // Ledger entries remain visible in /dapp/commissions and /dapp/wallet.
    const seen = new Set<string>();
    const out: NotificationItem[] = [];

    for (const item of data.items) {
      const type = String(item.type || "").toUpperCase();
      const meta = (item.meta || {}) as Record<string, unknown>;
      const subscriptionId = meta.subscriptionId !== undefined ? String(meta.subscriptionId) : "";
      const creditedThrough = meta.creditedThrough !== undefined ? String(meta.creditedThrough) : "";

      let key = "";
      if ((type === "ROI_CREDIT" || type === "ROI_BOOSTER_CREDIT") && subscriptionId) {
        key = `${type}:${subscriptionId}:${creditedThrough}`;
      }

      if (key) {
        if (seen.has(key)) continue;
        seen.add(key);
      }

      out.push(item);
    }

    return out;
  }, [data.items]);

  const stats = useMemo(
    () => [
      { label: "Unread", value: unreadCount },
      { label: "Total", value: totalCount },
      { label: "Page", value: `${data.pagination.page} / ${Math.max(1, data.pagination.totalPages)}` },
    ],
    [data.pagination.page, data.pagination.totalPages, totalCount, unreadCount]
  );

  const markOneRead = async (notificationId: number) => {
    setBusyId(notificationId);
    try {
      await api.put(`/notifications/${notificationId}/read`);
      await loadNotifications(page);
    } finally {
      setBusyId(null);
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.put("/notifications/read-all");
      await loadNotifications(page);
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#060b14] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[30px] border border-[#123a62] bg-[radial-gradient(circle_at_top_left,_rgba(30,160,255,0.16),_transparent_38%),linear-gradient(135deg,#0b1320_0%,#09111c_46%,#060b14_100%)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#123a62] bg-[#0b1930] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5bbcff]">
                <Bell className="h-3.5 w-3.5" />
                Notifications
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Member Alerts</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8aa4bf]">
                Bonus credits, daily income posts, level income, and payment confirmations appear here.
              </p>
            </div>
            <button
              type="button"
              onClick={markAllRead}
              disabled={markingAll || unreadCount <= 0}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#123a62] bg-[#0d1726] px-4 py-3 text-sm font-semibold text-[#dce8f5] transition hover:bg-[#132033] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4" />
              {markingAll ? "Marking..." : "Mark All Read"}
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {stats.map((item) => (
            <div
              key={item.label}
              className="rounded-[24px] border border-[#132235] bg-[#09111c] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5bbcff]">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-[30px] border border-[#132235] bg-[#09111c] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-6">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-[#5bbcff]" />
            </div>
          ) : visibleItems.length ? (
            <div className="space-y-4">
              {visibleItems.map((item) => {
                const isLevelIncome = item.type.toUpperCase() === "LEVEL_INCOME";
                
                if (isLevelIncome) {
                  const meta = (item.meta || {}) as Record<string, any>;
                  const levelNumber = meta.level || "-";
                  const status = meta.status || "CREDITED";
                  const creditedToVal = meta.balanceType || "level_balance";
                  const creditedToLabel = getWalletTypeLabel(creditedToVal, profile?.mlmSettings?.wallet_type_labels || null);
                  const sourceDailyRoi = meta.sourceDailyRoi;
                  const receivedAmount = meta.receivedAmount;
                  const sourceRefCode = meta.sourceReferralCode || (meta.sourceUserId ? `User #${meta.sourceUserId}` : "-");
                  const percent = meta.percent || 0;
                  const sourceWalletAddress = meta.sourceWallet || "";
                  const reason = meta.reason || "";
                  
                  const isMissed = String(status).toUpperCase() === "MISSED";
                  
                  return (
                    <div
                      key={item.id}
                      className={`rounded-[24px] border p-5 transition ${
                        item.is_read
                          ? "border-[#132235] bg-[#0a1420]"
                          : "border-[#123a62] bg-[#0c1827] shadow-[0_10px_34px_rgba(30,160,255,0.08)]"
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          {/* Badges */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-[#123a62] bg-[#0b1930] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5bbcff]">
                              LEVEL INCOME
                            </span>
                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                              isMissed
                                ? "border-rose-700/40 bg-rose-900/30 text-rose-300"
                                : "border-emerald-700/40 bg-emerald-900/30 text-emerald-300"
                            }`}>
                              {status}
                            </span>
                            {!item.is_read ? (
                              <span className="rounded-full bg-[#f6465d] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                                New
                              </span>
                            ) : null}
                          </div>
                          
                          <h2 className="mt-3 text-lg font-semibold text-white">{item.title}</h2>
                          
                          {/* Parameters Grid */}
                          <div className="mt-4 grid grid-cols-2 gap-4 rounded-2xl border border-[#142337] bg-[#060b14]/50 p-4 sm:grid-cols-3 xl:grid-cols-6">
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-[#6f8aa5]">Level</p>
                              <p className="mt-1 text-sm font-semibold text-white">Level {levelNumber}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-[#6f8aa5]">Distribution %</p>
                              <p className="mt-1 text-sm font-semibold text-white">{Number(percent).toFixed(2)}%</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-[#6f8aa5]">Referral Member</p>
                              <p className="mt-1 text-sm font-semibold text-[#5bbcff]" title={sourceWalletAddress || undefined}>
                                {sourceRefCode}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-[#6f8aa5]">Member Daily ROI</p>
                              <p className="mt-1 text-sm font-semibold text-white">
                                {sourceDailyRoi !== undefined ? `${Number(sourceDailyRoi).toFixed(4)} USDT` : "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-[#6f8aa5]">Your Payout</p>
                              <p className="mt-1 text-sm font-semibold text-[#a066ff]">
                                {receivedAmount !== undefined ? `${Number(receivedAmount).toFixed(4)} USDT` : "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-[#6f8aa5]">Credited To</p>
                              <p className="mt-1 text-sm font-semibold text-white truncate">
                                {isMissed ? "None (Missed)" : (creditedToLabel || "Level Wallet")}
                              </p>
                            </div>
                          </div>
                          
                          {isMissed && reason && (
                            <p className="mt-3 text-xs font-medium text-rose-400">
                              Reason for Missed Income: <span className="underline">{reason}</span>
                            </p>
                          )}
                          
                          <p className="mt-3 text-sm leading-6 text-[#9ab0c6]">{item.message}</p>
                          <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-[#6f8aa5]">
                            {formatDateTime(item.created_at)}
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                          {!item.is_read ? (
                            <button
                              type="button"
                              onClick={() => void markOneRead(item.id)}
                              disabled={busyId === item.id}
                              className="inline-flex items-center justify-center rounded-2xl border border-[#123a62] bg-[#0d1726] px-4 py-2.5 text-sm font-semibold text-[#dce8f5] transition hover:bg-[#132033] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {busyId === item.id ? "Updating..." : "Mark Read"}
                            </button>
                          ) : null}
                          <Link
                            href={normalizeActionUrl(item.action_url)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#24364a] bg-[#0d1726] px-4 py-2.5 text-sm font-semibold text-[#dce8f5] transition hover:border-[#35506b] hover:bg-[#122033]"
                          >
                            Open
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id}
                    className={`rounded-[24px] border p-5 transition ${
                      item.is_read
                        ? "border-[#132235] bg-[#0a1420]"
                        : "border-[#123a62] bg-[#0c1827] shadow-[0_10px_34px_rgba(30,160,255,0.08)]"
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-[#123a62] bg-[#0b1930] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5bbcff]">
                            {item.type.replaceAll("_", " ")}
                          </span>
                          {!item.is_read ? (
                            <span className="rounded-full bg-[#f6465d] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                              New
                            </span>
                          ) : null}
                        </div>
                        <h2 className="mt-3 text-lg font-semibold text-white">{item.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-[#9ab0c6]">{item.message}</p>
                        <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-[#6f8aa5]">
                          {formatDateTime(item.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                        {!item.is_read ? (
                          <button
                            type="button"
                            onClick={() => void markOneRead(item.id)}
                            disabled={busyId === item.id}
                            className="inline-flex items-center justify-center rounded-2xl border border-[#123a62] bg-[#0d1726] px-4 py-2.5 text-sm font-semibold text-[#dce8f5] transition hover:bg-[#132033] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {busyId === item.id ? "Updating..." : "Mark Read"}
                          </button>
                        ) : null}
                        <Link
                          href={normalizeActionUrl(item.action_url)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#24364a] bg-[#0d1726] px-4 py-2.5 text-sm font-semibold text-[#dce8f5] transition hover:border-[#35506b] hover:bg-[#122033]"
                        >
                          Open
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-[#123a62] bg-[#0a1420] px-6 text-center">
              <Bell className="h-8 w-8 text-[#5bbcff]" />
              <h2 className="text-lg font-semibold text-white">No notifications yet</h2>
              <p className="max-w-md text-sm leading-6 text-[#8aa4bf]">
                When payments, bonuses, daily income, or level income arrive, they will appear here.
              </p>
            </div>
          )}
        </section>

        <section className="flex items-center justify-between gap-3 rounded-[24px] border border-[#132235] bg-[#09111c] px-4 py-4">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || loading}
            className="rounded-2xl border border-[#24364a] bg-[#0d1726] px-4 py-2.5 text-sm font-semibold text-[#dce8f5] transition hover:border-[#35506b] hover:bg-[#122033] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <p className="text-sm font-medium text-[#8aa4bf]">
            Page {data.pagination.page} of {Math.max(1, data.pagination.totalPages)}
          </p>
          <button
            type="button"
            onClick={() => setPage((current) => (current < data.pagination.totalPages ? current + 1 : current))}
            disabled={page >= data.pagination.totalPages || loading}
            className="rounded-2xl border border-[#24364a] bg-[#0d1726] px-4 py-2.5 text-sm font-semibold text-[#dce8f5] transition hover:border-[#35506b] hover:bg-[#122033] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </section>
      </div>
    </main>
  );
}
