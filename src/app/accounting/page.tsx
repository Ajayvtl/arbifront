"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import api from "@/lib/api";
import { DollarSign, CreditCard, TrendingUp, FileText, AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";

type PlatformStats = {
    total_revenue: number;
    mrr: number;
    outstanding: number;
    active_subscriptions: number;
};

type PlatformInvoice = {
    id: number;
    invoice_number: string;
    hotel_name?: string;
    total_amount?: number;
    total_amount_minor?: number;
    status: string;
    created_at: string;
};

type HotelStats = {
    total_revenue?: number;
    expenses?: number;
    net_profit?: number;
    pending_payments?: number;
};

type HotelInvoice = {
    id: number;
    invoice_number?: string;
    guest_name?: string;
    total_amount?: number;
    amount?: number;
    status?: string;
    created_at?: string;
};

export default function AccountingPage() {
    const { user, currentHotel, isLoading } = useAuth();
    const { formatCurrency } = useSettings();

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [platformStats, setPlatformStats] = useState<PlatformStats>({
        total_revenue: 0,
        mrr: 0,
        outstanding: 0,
        active_subscriptions: 0
    });
    const [platformInvoices, setPlatformInvoices] = useState<PlatformInvoice[]>([]);

    const [hotelStats, setHotelStats] = useState<HotelStats>({});
    const [hotelInvoices, setHotelInvoices] = useState<HotelInvoice[]>([]);

    const isSystemContext = !currentHotel && user?.role_id === 1;

    const normalizePlatformStats = (raw: unknown): PlatformStats => {
        if (Array.isArray(raw)) {
            const aggregated = raw.reduce((acc, row) => {
                const typed = row as {
                    revenue_minor?: number;
                    mrr_minor?: number;
                    outstanding_minor?: number;
                };
                acc.total_revenue += Number(typed.revenue_minor || 0) / 100;
                acc.mrr += Number(typed.mrr_minor || 0) / 100;
                acc.outstanding += Number(typed.outstanding_minor || 0) / 100;
                return acc;
            }, { total_revenue: 0, mrr: 0, outstanding: 0 });
            return {
                ...aggregated,
                active_subscriptions: 0
            };
        }

        const typed = (raw || {}) as { total_revenue?: number; mrr?: number; outstanding?: number; active_subscriptions?: number };
        return {
            total_revenue: Number(typed.total_revenue || 0),
            mrr: Number(typed.mrr || 0),
            outstanding: Number(typed.outstanding || 0),
            active_subscriptions: Number(typed.active_subscriptions || 0)
        };
    };

    const loadSystemAccounting = async () => {
        const [statsRes, invoiceRes] = await Promise.all([
            api.get("/system/finance/stats"),
            api.get("/system/finance/invoices?limit=10")
        ]);

        setPlatformStats(normalizePlatformStats(statsRes.data?.data));
        setPlatformInvoices(invoiceRes.data?.data?.invoices || []);
    };

    const loadHotelAccounting = async () => {
        const [statsRes, invoiceRes] = await Promise.all([
            api.get("/hotel/finance/stats"),
            api.get("/hotel/finance/invoices?limit=10")
        ]);

        setHotelStats(statsRes.data?.data || {});
        setHotelInvoices(invoiceRes.data?.data?.invoices || []);
    };

    useEffect(() => {
        if (isLoading) return;

        const run = async () => {
            setLoading(true);
            setLoadError(null);
            try {
                if (isSystemContext) {
                    await loadSystemAccounting();
                } else {
                    await loadHotelAccounting();
                }
            } catch (error) {
                console.error("Accounting page load failed", error);
                setLoadError("Failed to load accounting data");
            } finally {
                setLoading(false);
            }
        };

        run();

        const timer = window.setInterval(run, 30000);
        return () => window.clearInterval(timer);
    }, [isLoading, isSystemContext]);

    const systemActiveSubCount = useMemo(() => {
        if (platformStats.active_subscriptions > 0) return platformStats.active_subscriptions;
        return 0;
    }, [platformStats.active_subscriptions]);

    if (isLoading) return <div className="p-8">Loading...</div>;

    if (isSystemContext) {
        return (
            <div className="p-8 space-y-6">
                <header className="mb-2">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">SaaS Revenue Operations</h1>
                    <p className="text-slate-500">Monitor MRR, ARR, and Subscription Invoices</p>
                </header>

                {loadError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</div>
                )}

                <div className="flex justify-end">
                    <Button variant="outline" onClick={() => { void loadSystemAccounting(); }}>
                        Refresh
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatCard title="MRR" value={formatCurrency(platformStats.mrr)} icon={<TrendingUp />} color="indigo" />
                    <StatCard title="Total Revenue" value={formatCurrency(platformStats.total_revenue)} icon={<DollarSign />} color="green" />
                    <StatCard title="Outstanding Invoices" value={formatCurrency(platformStats.outstanding)} icon={<AlertTriangle />} color="red" />
                    <StatCard title="Active Subscriptions" value={String(systemActiveSubCount)} icon={<FileText />} color="blue" />
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 font-semibold">Recent Transactions</div>
                    {loading ? (
                        <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableHead>Invoice #</TableHead>
                                <TableHead>Tenant</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                            </TableHeader>
                            <TableBody>
                                {platformInvoices.length > 0 ? platformInvoices.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-mono text-xs">{row.invoice_number || `INV-${row.id}`}</TableCell>
                                        <TableCell>{row.hotel_name || "-"}</TableCell>
                                        <TableCell>{formatCurrency(Number(row.total_amount ?? ((row.total_amount_minor || 0) / 100)))}</TableCell>
                                        <TableCell>
                                            <Badge variant={String(row.status || "").toLowerCase() === "paid" ? "success" : "warning"}>
                                                {String(row.status || "unknown").toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-6 text-slate-500">No transactions found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Hotel Accounting - {currentHotel?.hotel_name}</h1>
                <p className="text-slate-500">Manage expenses, revenue, and invoices</p>
            </header>

            {loadError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="Total Revenue" value={formatCurrency(Number(hotelStats.total_revenue || 0))} icon={<DollarSign />} color="emerald" />
                <StatCard title="Expenses" value={formatCurrency(Number(hotelStats.expenses || 0))} icon={<CreditCard />} color="orange" />
                <StatCard title="Net Profit" value={formatCurrency(Number(hotelStats.net_profit || 0))} icon={<TrendingUp />} color="green" />
                <StatCard title="Pending Payments" value={formatCurrency(Number(hotelStats.pending_payments || 0))} icon={<AlertTriangle />} color="red" />
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 font-semibold">Recent Invoices</div>
                {loading ? (
                    <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Guest</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                        </TableHeader>
                        <TableBody>
                            {hotelInvoices.length > 0 ? hotelInvoices.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell className="font-mono text-xs">{row.invoice_number || `INV-${row.id}`}</TableCell>
                                    <TableCell>{row.guest_name || "-"}</TableCell>
                                    <TableCell>{formatCurrency(Number(row.total_amount || row.amount || 0))}</TableCell>
                                    <TableCell>
                                        <Badge variant={String(row.status || "").toLowerCase() === "paid" ? "success" : "warning"}>
                                            {String(row.status || "unknown").toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{row.created_at ? new Date(row.created_at).toLocaleString() : "-"}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-6 text-slate-500">No invoices found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color }: { title: string; value: string; icon: ReactNode; color: string }) {
    const colors: Record<string, string> = {
        indigo: "bg-indigo-50 text-indigo-600",
        green: "bg-green-50 text-green-600",
        emerald: "bg-emerald-50 text-emerald-600",
        red: "bg-red-50 text-red-600",
        blue: "bg-blue-50 text-blue-600",
        orange: "bg-orange-50 text-orange-600"
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-slate-500 text-sm font-medium">{title}</p>
                    <h3 className="text-2xl font-bold mt-2 text-slate-800 dark:text-white">{value}</h3>
                </div>
                <div className={`p-3 rounded-lg ${colors[color] || "bg-slate-100"}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}
