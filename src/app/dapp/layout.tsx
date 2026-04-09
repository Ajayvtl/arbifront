"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Bell, CheckCheck, ChevronRight, CircleUserRound, CreditCard, Home, Loader2, LogOut, Menu, Network, Sparkles, Wallet, X } from "lucide-react";
import api from "@/lib/api";
import DappWalletChip from "@/components/dapp/DappWalletChip";
import BrandLogo from "@/components/dapp/BrandLogo";

/**
 * DApp segment layout.
 *
 * Responsibilities:
 *  1. Provides a clean, full-width layout with NO admin sidebar / navbar.
 *     This ensures the dashboard is rendered as a normal authenticated web page,
 *     NOT as a DApp embedded inside a wallet browser.
 *  2. Route-guards all /dapp/* pages except /dapp/login.
 *     Protected pages check for a valid JWT token stored in localStorage.
 *     If there is no token the user is redirected to /dapp/login.
 *  3. Ensures only role=USER (end-users who authenticated via wallet signature)
 *     can access /dapp/* pages. Admins are redirected to /login.
 */
export default function DappLayout({ children }: { children: React.ReactNode }) {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Public DApp pages that do NOT need authentication
  const isPublicDappPage = pathname === "/dapp/login" || pathname === "/dapp";
  const showBottomNav = !isPublicDappPage;
  const [hasPaidPlan, setHasPaidPlan] = useState(false);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [notificationItems, setNotificationItems] = useState<Array<{
    id: number;
    type: string;
    title: string;
    message: string;
    is_read: number;
    action_url?: string | null;
    created_at: string;
  }>>([]);
  const [notificationTrayOpen, setNotificationTrayOpen] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [markingNotifications, setMarkingNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const walletAddress =
    (user as { walletAddress?: string; wallet_address?: string } | null)?.walletAddress ||
    (user as { walletAddress?: string; wallet_address?: string } | null)?.wallet_address ||
    "";
  const navItems = [
    { key: "home", href: "/dapp/dashboard", matchHref: "/dapp/dashboard", label: "Home", icon: Home },
    { key: "plan", href: hasPaidPlan ? "/dapp/roi" : "/dapp/dashboard#packages", matchHref: hasPaidPlan ? "/dapp/roi" : "/dapp/dashboard", label: hasPaidPlan ? "My Plan" : "Activate", icon: CreditCard, badge: pendingOrdersCount },
    { key: "network", href: "/dapp/network", matchHref: "/dapp/network", label: "Network", icon: Network },
    { key: "payments", href: "/dapp/transactions", matchHref: "/dapp/transactions", label: "Payments", icon: Wallet, badge: pendingOrdersCount },
    { key: "notifications", href: "/dapp/notifications", matchHref: "/dapp/notifications", label: "Alerts", icon: Bell, badge: notificationUnreadCount },
    { key: "profile", href: "/dapp/profile", matchHref: "/dapp/profile", label: "Profile", icon: CircleUserRound },
  ];
  const latestNotifications = useMemo(() => notificationItems.slice(0, 6), [notificationItems]);
  const pageTitle = (() => {
    if (pathname === "/dapp/dashboard") return "Account Overview";
    if (pathname === "/dapp/profile") return "Profile";
    if (pathname === "/dapp/network") return "Network";
    if (pathname === "/dapp/notifications") return "Notifications";
    if (pathname === "/dapp/transactions") return "Payment History";
    if (pathname === "/dapp/withdraw") return "Withdraw Funds";
    if (pathname.startsWith("/dapp/pay/")) return "Plan Payment";
    return "Member Dashboard";
  })();

  const formatNotificationTime = (value?: string) => {
    if (!value) return "Unknown time";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown time";
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  const normalizeNotificationUrl = (url?: string | null) => {
    if (!url) return "/dapp/notifications";
    return url.startsWith("/") ? url : "/dapp/notifications";
  };

  const loadNotifications = async () => {
    setNotificationLoading(true);
    try {
      const response = await api.get("/notifications", { params: { limit: 6, page: 1 } });
      const items = (response.data?.data?.items || []) as Array<{
        id: number;
        type: string;
        title: string;
        message: string;
        is_read: number;
        action_url?: string | null;
        created_at: string;
      }>;
      const unread = Number(response.data?.data?.pagination?.unread || 0);
      setNotificationItems(items);
      setNotificationUnreadCount(unread);
    } finally {
      setNotificationLoading(false);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    if (isPublicDappPage) return;

    // No token → send to login, remembering where they tried to go
    if (!token && !localStorage.getItem("token")) {
      const next = encodeURIComponent(pathname);
      router.replace(`/dapp/login?next=${next}`);
      return;
    }

    // Admin accidentally landed here → send to admin portal
    if (user && user.role && user.role !== "USER") {
      router.replace("/login");
    }
  }, [mounted, token, user, pathname, isPublicDappPage, router]);

  useEffect(() => {
    if (!mounted || isPublicDappPage) return;
    const activeToken = token || localStorage.getItem("token");
    if (!activeToken) return;

    let cancelled = false;
    const loadNavState = async () => {
      try {
        const [paymentsResponse, notificationsResponse] = await Promise.all([
          api.get("/payments/orders", { params: { limit: 20 } }),
          api.get("/notifications", { params: { limit: 1 } }),
        ]);
        const rows = ((paymentsResponse.data?.data?.items || []) as Array<{ status?: string }>);
        const unread = Number(notificationsResponse.data?.data?.pagination?.unread || 0);
        if (cancelled) return;
        const paid = rows.some((item) => item.status === "PAID");
        const pending = rows.filter((item) => item.status && item.status !== "PAID").length;
        setHasPaidPlan(paid);
        setPendingOrdersCount(pending);
        setNotificationUnreadCount(unread);
      } catch {
        if (!cancelled) {
          setHasPaidPlan(false);
          setPendingOrdersCount(0);
          setNotificationUnreadCount(0);
        }
      }
    };
    void loadNavState();
    const timer = window.setInterval(() => {
      void loadNavState();
    }, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [mounted, isPublicDappPage, token]);

  useEffect(() => {
    if (!notificationTrayOpen || !mounted || isPublicDappPage) return;
    void loadNotifications();
  }, [notificationTrayOpen, mounted, isPublicDappPage]);

  useEffect(() => {
    setNotificationTrayOpen(false);
  }, [pathname]);

  const markAllNotificationsRead = async () => {
    setMarkingNotifications(true);
    try {
      await api.put("/notifications/read-all");
      setNotificationItems((current) => current.map((item) => ({ ...item, is_read: 1 })));
      setNotificationUnreadCount(0);
    } finally {
      setMarkingNotifications(false);
    }
  };

  // Keep server and first client render identical.
  if (!mounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0b0e11]">
        <Loader2 className="h-8 w-8 animate-spin text-[#f0b90b]" />
      </div>
    );
  }

  const activeToken = token || localStorage.getItem("token");

  // Show spinner while redirecting unauthenticated users
  if (!isPublicDappPage && !activeToken) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0b0e11]">
        <Loader2 className="h-8 w-8 animate-spin text-[#f0b90b]" />
      </div>
    );
  }

  const notificationTrigger = (
    <button
      type="button"
      onClick={() => setNotificationTrayOpen((current) => !current)}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#123a62] bg-[#0d1726] text-[#5bbcff] transition hover:bg-[#122033]"
      aria-label="Toggle notifications"
      aria-expanded={notificationTrayOpen}
    >
      <Bell className="h-4 w-4" />
      {notificationUnreadCount > 0 ? (
        <span className="absolute right-2 top-2 rounded-full bg-[#f6465d] px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white">
          {notificationUnreadCount > 9 ? "9+" : notificationUnreadCount}
        </span>
      ) : null}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#060b14] font-sans text-[#f0f4f8]">
      {showBottomNav ? (
        <>
          <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-[#132235] bg-[#09111c] xl:flex xl:flex-col">
            <div className="border-b border-[#1e2329] px-6 py-6">
              <BrandLogo compact className="max-w-[220px]" />
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#123a62] bg-[#0b1930] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5bbcff]">
                <Sparkles className="h-3.5 w-3.5" />
                Member
              </div>
              {/* <p className="mt-3 text-sm text-[#8aa4bf]">Mobile-first member workspace for plans, referrals, and secure payments.</p> */}
            </div>
            <nav className="flex-1 space-y-2 px-4 py-6">
              {navItems.map((item) => {
                const normalizedHref = item.matchHref.split("#")[0];
                const active = pathname === normalizedHref || (normalizedHref !== "/dapp/dashboard" && pathname.startsWith(normalizedHref));
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      active
                        ? "bg-[#0f2036] text-[#5bbcff] ring-1 ring-[#123a62]"
                        : "text-[#b7bdc6] hover:bg-[#0d1726] hover:text-[#f5f5f5]"
                    }`}
                  >
                    <span className="inline-flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      {item.badge && item.badge > 0 ? (
                        <span className="rounded-full bg-[#f6465d] px-2 py-0.5 text-[10px] font-semibold text-white">
                          {item.badge > 9 ? "9+" : item.badge}
                        </span>
                      ) : null}
                      <ChevronRight className="h-4 w-4 opacity-60" />
                    </span>
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-[#132235] px-4 py-4">
              <DappWalletChip address={walletAddress} className="w-full justify-start" />
              <button
                type="button"
                onClick={logout}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#24364a] bg-[#0d1726] px-4 py-3 text-sm font-medium text-[#f5f5f5] transition hover:border-[#35506b] hover:bg-[#122033]"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </aside>

          <header className="sticky top-0 z-20 hidden border-b border-[#132235] bg-[#09111c]/92 backdrop-blur xl:ml-72 xl:block">
            <div className="flex items-center justify-between gap-4 px-8 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5bbcff]">Dashboard</p>
                <h1 className="mt-1 text-xl font-bold text-[#f5f5f5]">{pageTitle}</h1>
              </div>
              <div className="flex items-center gap-3">
                {notificationTrigger}
                <DappWalletChip address={walletAddress} className="max-w-sm" />
              </div>
            </div>
          </header>

          <header className="sticky top-0 z-30 border-b border-[#132235] bg-[#09111c]/94 backdrop-blur xl:hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#123a62] bg-[#0d1726] text-[#5bbcff]"
                aria-label="Open member menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5bbcff]">Dashboard</p>
                <h1 className="truncate text-base font-bold text-[#f5f5f5]">{pageTitle}</h1>
              </div>
              <div className="flex items-center gap-2">
                {notificationTrigger}
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#24364a] bg-[#0d1726] text-[#f5f5f5]"
                  aria-label="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </header>
        </>
      ) : null}

      <div className={showBottomNav ? "pb-20 xl:ml-72 xl:pb-0" : ""}>
        {children}
      </div>
      {showBottomNav && notificationTrayOpen ? (
        <div className="fixed inset-0 z-40" aria-hidden={!notificationTrayOpen}>
          <div className="absolute inset-0 bg-[#02060c]/50" onClick={() => setNotificationTrayOpen(false)} />
          <section className="absolute right-3 top-20 z-50 flex w-[calc(100vw-1.5rem)] max-w-md flex-col overflow-hidden rounded-[28px] border border-[#123a62] bg-[#09111c] shadow-[0_28px_90px_rgba(0,0,0,0.45)] xl:right-8 xl:top-24">
            <div className="flex items-center justify-between border-b border-[#132235] px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5bbcff]">Notifications</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Latest Activity</h2>
              </div>
              <button
                type="button"
                onClick={() => void markAllNotificationsRead()}
                disabled={markingNotifications || notificationUnreadCount <= 0}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#24364a] bg-[#0d1726] px-3 py-2 text-xs font-semibold text-[#dce8f5] transition hover:border-[#35506b] hover:bg-[#122033] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {markingNotifications ? "Updating..." : "Mark All"}
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {notificationLoading ? (
                <div className="flex min-h-[220px] items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[#5bbcff]" />
                </div>
              ) : latestNotifications.length ? (
                <div className="divide-y divide-[#132235]">
                  {latestNotifications.map((item) => (
                    <Link
                      key={item.id}
                      href={normalizeNotificationUrl(item.action_url)}
                      onClick={() => setNotificationTrayOpen(false)}
                      className={`block px-5 py-4 transition hover:bg-[#0d1726] ${
                        item.is_read ? "bg-transparent" : "bg-[#0c1827]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`mt-1 h-2.5 w-2.5 rounded-full ${item.is_read ? "bg-[#2a3a4e]" : "bg-[#f6465d]"}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-white">{item.title}</p>
                            <span className="rounded-full border border-[#123a62] bg-[#0b1930] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5bbcff]">
                              {item.type.replaceAll("_", " ")}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#94aac0]">{item.message}</p>
                          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#6f8aa5]">
                            {formatNotificationTime(item.created_at)}
                          </p>
                        </div>
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#5bbcff]" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 text-center">
                  <Bell className="h-8 w-8 text-[#5bbcff]" />
                  <h3 className="text-lg font-semibold text-white">No notifications yet</h3>
                  <p className="max-w-sm text-sm leading-6 text-[#8aa4bf]">
                    Bonus, payment, and income activity will appear here as soon as it happens.
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-[#132235] px-5 py-4">
              <p className="text-sm text-[#8aa4bf]">{notificationUnreadCount} unread notification(s)</p>
              <Link
                href="/dapp/notifications"
                onClick={() => setNotificationTrayOpen(false)}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#24364a] bg-[#0d1726] px-4 py-2.5 text-sm font-semibold text-[#dce8f5] transition hover:border-[#35506b] hover:bg-[#122033]"
              >
                View All
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      ) : null}
      {showBottomNav ? (
        <div
          className={`fixed inset-0 z-40 xl:hidden ${mobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"}`}
          aria-hidden={!mobileMenuOpen}
        >
          <div
            className={`absolute inset-0 bg-[#02060c]/70 transition-opacity ${mobileMenuOpen ? "opacity-100" : "opacity-0"}`}
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside
            className={`absolute inset-y-0 left-0 flex w-[88vw] max-w-sm flex-col border-r border-[#132235] bg-[#09111c] shadow-2xl transition-transform ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
          >
            <div className="flex items-start justify-between border-b border-[#132235] px-5 py-5">
              <div>
                <BrandLogo compact className="max-w-[180px]" />
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#123a62] bg-[#0b1930] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5bbcff]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Member
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#24364a] bg-[#0d1726] text-[#f5f5f5]"
                aria-label="Close member menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="border-b border-[#132235] px-5 py-4">
              <DappWalletChip address={walletAddress} className="w-full justify-start" />
            </div>
            <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-5">
              {navItems.map((item) => {
                const normalizedHref = item.matchHref.split("#")[0];
                const active = pathname === normalizedHref || (normalizedHref !== "/dapp/dashboard" && pathname.startsWith(normalizedHref));
                return (
                  <Link
                    key={`mobile-${item.key}`}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      active
                        ? "bg-[#0f2036] text-[#5bbcff] ring-1 ring-[#123a62]"
                        : "text-[#b7bdc6] hover:bg-[#0d1726] hover:text-[#f5f5f5]"
                    }`}
                  >
                    <span className="inline-flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      {item.badge && item.badge > 0 ? (
                        <span className="rounded-full bg-[#f6465d] px-2 py-0.5 text-[10px] font-semibold text-white">
                          {item.badge > 9 ? "9+" : item.badge}
                        </span>
                      ) : null}
                      <ChevronRight className="h-4 w-4 opacity-60" />
                    </span>
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-[#132235] px-4 py-4">
              <button
                type="button"
                onClick={logout}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#24364a] bg-[#0d1726] px-4 py-3 text-sm font-medium text-[#f5f5f5] transition hover:border-[#35506b] hover:bg-[#122033]"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      ) : null}
      {showBottomNav ? (
        <nav className="fixed inset-x-0 bottom-0 z-50 xl:hidden">
          <div className="relative w-full border-t border-[#123a62] bg-[#09111c]/98 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-12px_28px_rgba(0,0,0,0.4)] backdrop-blur">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#1ea0ff] to-transparent" />
            <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}>
            {navItems.map((item) => {
              const normalizedHref = item.matchHref.split("#")[0];
              const active = pathname === normalizedHref || (normalizedHref !== "/dapp/dashboard" && pathname.startsWith(normalizedHref));
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`relative inline-flex flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-medium transition ${
                    active
                      ? "bg-gradient-to-b from-[#0d2340] to-[#0a1628] text-[#5bbcff] shadow-sm ring-1 ring-[#123a62]"
                      : "text-[#7f95ad] hover:bg-[#0d1726] hover:text-[#f5f5f5]"
                  }`}
                >
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${active ? "bg-[#1ea0ff]/12 text-[#5bbcff]" : "bg-[#0d1726] text-[#7f95ad]"}`}>
                    <item.icon className="h-3.5 w-3.5" />
                  </span>
                  {item.label}
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute right-1.5 top-0.5 rounded-full bg-[#f6465d] px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
            </div>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
