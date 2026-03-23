"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { hasAnyPermission } from "@/lib/permissions";
import { useSettings } from "@/context/SettingsContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";

type DueRenewal = {
    subscription_id: number;
    hotel_id: number;
    hotel_name: string;
    package_name: string;
    billing_cycle: "monthly" | "yearly";
    status: string;
    next_billing_date: string;
    renewal_amount: number;
    currency?: string;
    grace_period_days?: number;
    renewal_notice_days?: number;
};

type RenewalPayment = {
    id: number;
    hotel_name: string;
    package_name: string;
    invoice_number?: string;
    amount_minor: number;
    currency: string;
    payment_method: string;
    transaction_id?: string;
    created_at: string;
};

type RenewalTab = "due" | "expired";

export default function PlatformRenewalsPage() {
    const { user } = useAuth();
    const { formatCurrency } = useSettings();
    const [days, setDays] = useState(30);
    const [activeTab, setActiveTab] = useState<RenewalTab>("due");
    const [dueRenewals, setDueRenewals] = useState<DueRenewal[]>([]);
    const [expiredRenewals, setExpiredRenewals] = useState<DueRenewal[]>([]);
    const [payments, setPayments] = useState<RenewalPayment[]>([]);
    const [loadingDue, setLoadingDue] = useState(false);
    const [loadingExpired, setLoadingExpired] = useState(false);
    const [loadingPayments, setLoadingPayments] = useState(false);
    const [runningReminders, setRunningReminders] = useState(false);
    const [renewingId, setRenewingId] = useState<number | null>(null);
    const [selectedRenewal, setSelectedRenewal] = useState<DueRenewal | null>(null);
    const [renewForm, setRenewForm] = useState({ payment_method: "bank_transfer", transaction_id: "" });
    const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
    const [dueDbSource, setDueDbSource] = useState<string>("-");
    const [dueScope, setDueScope] = useState<string>("-");
    const [expiredDbSource, setExpiredDbSource] = useState<string>("-");
    const [expiredScope, setExpiredScope] = useState<string>("-");
    const [paymentsDbSource, setPaymentsDbSource] = useState<string>("-");
    const [paymentsScope, setPaymentsScope] = useState<string>("-");

    const canView = hasAnyPermission(user, ["finance_system.view", "finance_system.manage", "menu.finance_system"]) || user?.role_id === 1;
    const canManage = hasAnyPermission(user, ["finance_system.manage"]) || user?.role_id === 1;

    const fetchDueRenewals = useCallback(async (windowDays = days) => {
        setLoadingDue(true);
        try {
            const res = await api.get(`/system/finance/subscriptions/due-renewals?days=${windowDays}`);
            setDueRenewals(res.data?.data || []);
            setDueDbSource(res.headers?.["x-db-source"] || "-");
            setDueScope(res.headers?.["x-execution-scope"] || "-");
            setLastSyncAt(new Date());
        } catch (error: unknown) {
            const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(message || "Failed to load due renewals");
        } finally {
            setLoadingDue(false);
        }
    }, [days]);

    const fetchExpiredRenewals = useCallback(async (windowDays = 365) => {
        setLoadingExpired(true);
        try {
            const res = await api.get(`/system/finance/subscriptions/expired-renewals?days=${windowDays}`);
            setExpiredRenewals(res.data?.data || []);
            setExpiredDbSource(res.headers?.["x-db-source"] || "-");
            setExpiredScope(res.headers?.["x-execution-scope"] || "-");
            setLastSyncAt(new Date());
        } catch (error: unknown) {
            const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(message || "Failed to load expired renewals");
        } finally {
            setLoadingExpired(false);
        }
    }, []);

    const fetchPayments = useCallback(async () => {
        setLoadingPayments(true);
        try {
            const res = await api.get("/system/finance/subscriptions/renewal-payments?limit=100");
            setPayments(res.data?.data || []);
            setPaymentsDbSource(res.headers?.["x-db-source"] || "-");
            setPaymentsScope(res.headers?.["x-execution-scope"] || "-");
            setLastSyncAt(new Date());
        } catch (error: unknown) {
            const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(message || "Failed to load renewal payments");
        } finally {
            setLoadingPayments(false);
        }
    }, []);

    useEffect(() => {
        if (!canView) return;
        fetchDueRenewals(30);
        fetchExpiredRenewals(365);
        fetchPayments();
        const interval = window.setInterval(() => {
            fetchDueRenewals(days);
            fetchExpiredRenewals(365);
            fetchPayments();
        }, 30000);
        return () => window.clearInterval(interval);
    }, [canView, days, fetchDueRenewals, fetchExpiredRenewals, fetchPayments]);

    const openRenewDialog = (row: DueRenewal) => {
        setSelectedRenewal(row);
        setRenewForm({
            payment_method: "bank_transfer",
            transaction_id: `manual-${Date.now()}`
        });
    };

    const submitRenewal = async () => {
        if (!selectedRenewal) return;
        setRenewingId(selectedRenewal.subscription_id);
        try {
            await api.post(`/system/finance/subscriptions/${selectedRenewal.subscription_id}/renew`, renewForm);
            toast.success(`Renewal processed for ${selectedRenewal.hotel_name}`);
            setSelectedRenewal(null);
            await Promise.all([fetchDueRenewals(days), fetchExpiredRenewals(365), fetchPayments()]);
        } catch (error: unknown) {
            const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(message || "Failed to renew subscription");
        } finally {
            setRenewingId(null);
        }
    };

    const runReminders = async () => {
        if (!canManage) return;
        setRunningReminders(true);
        try {
            const res = await api.post("/system/finance/subscriptions/reminders/run");
            const count = Number(res?.data?.data?.reminders_sent || 0);
            toast.success(`Renewal reminders dispatched: ${count}`);
            await fetchDueRenewals(days);
        } catch (error: unknown) {
            const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(message || "Failed to run reminder dispatch");
        } finally {
            setRunningReminders(false);
        }
    };

    if (!canView) {
        return (
            <div className="p-8">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">Access denied for Subscription Renewals.</div>
            </div>
        );
    }

    const renewalRows = activeTab === "due" ? dueRenewals : expiredRenewals;
    const loadingRenewals = activeTab === "due" ? loadingDue : loadingExpired;

    return (
        <div className="p-8 max-w-[1700px] mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Subscription Renewals</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage due renewals, grace controls, and payment records.</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="info">Auto refresh: 30s</Badge>
                        <Badge variant="neutral">Due DB: {dueDbSource}</Badge>
                        <Badge variant="neutral">Due Scope: {dueScope}</Badge>
                        <Badge variant="neutral">Expired DB: {expiredDbSource}</Badge>
                        <Badge variant="neutral">Expired Scope: {expiredScope}</Badge>
                        <Badge variant="neutral">Pay DB: {paymentsDbSource}</Badge>
                        <Badge variant="neutral">Pay Scope: {paymentsScope}</Badge>
                        <Badge variant="default">Last Sync: {lastSyncAt ? lastSyncAt.toLocaleString() : "Never"}</Badge>
                    </div>
                </div>
                <div className="flex items-end gap-3">
                    <div>
                        <label className="text-xs font-semibold text-slate-500">Due Window (Days)</label>
                        <Input
                            type="number"
                            min={1}
                            max={365}
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value || 30))}
                            className="w-32"
                        />
                    </div>
                    <Button
                        variant="secondary"
                        className="gap-2"
                        onClick={() => Promise.all([fetchDueRenewals(days), fetchExpiredRenewals(365), fetchPayments()])}
                    >
                        <RefreshCw size={15} />
                        Refresh
                    </Button>
                    <Button
                        variant="outline"
                        onClick={runReminders}
                        isLoading={runningReminders}
                        disabled={!canManage}
                    >
                        Run Reminders
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard label="Due Renewals" value={String(dueRenewals.length)} />
                <SummaryCard label="Expired" value={String(expiredRenewals.length)} tone="danger" />
                <SummaryCard label="Renewal Payments (100)" value={String(payments.length)} tone="info" />
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3">
                    <div className="font-semibold text-slate-700 dark:text-slate-200">{activeTab === "due" ? "Due Renewals" : "Expired Renewals"}</div>
                    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <button
                            type="button"
                            className={`px-3 py-1.5 text-sm ${activeTab === "due" ? "bg-emerald-600 text-white" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}
                            onClick={() => setActiveTab("due")}
                        >
                            Due Renewals
                        </button>
                        <button
                            type="button"
                            className={`px-3 py-1.5 text-sm border-l border-slate-200 dark:border-slate-700 ${activeTab === "expired" ? "bg-rose-600 text-white" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}
                            onClick={() => setActiveTab("expired")}
                        >
                            Expired
                        </button>
                    </div>
                </div>
                {loadingRenewals ? (
                    <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableHead>Tenant</TableHead>
                            <TableHead>Package</TableHead>
                            <TableHead>Cycle</TableHead>
                            <TableHead>{activeTab === "due" ? "Next Billing" : "Expired On"}</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Policy</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableHeader>
                        <TableBody>
                            {renewalRows.length > 0 ? renewalRows.map((row) => (
                                <TableRow key={`${activeTab}-${row.subscription_id}`}>
                                    <TableCell>
                                        <div className="font-medium">{row.hotel_name}</div>
                                        <div className="text-xs text-slate-400">Sub #{row.subscription_id}</div>
                                    </TableCell>
                                    <TableCell>{row.package_name}</TableCell>
                                    <TableCell className="capitalize">{row.billing_cycle}</TableCell>
                                    <TableCell>{row.next_billing_date ? new Date(row.next_billing_date).toLocaleDateString() : "-"}</TableCell>
                                    <TableCell>{formatCurrency(Number(row.renewal_amount || 0))} {row.currency || ""}</TableCell>
                                    <TableCell>
                                        <Badge variant={mapStatusVariant(row.status)}>{String(row.status || "unknown").toUpperCase()}</Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-slate-500">
                                        Grace: {Number(row.grace_period_days || 7)}d
                                        <br />
                                        Notice: {Number(row.renewal_notice_days || 7)}d
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            size="sm"
                                            variant={activeTab === "expired" ? "secondary" : "outline"}
                                            disabled={!canManage || renewingId === row.subscription_id}
                                            isLoading={renewingId === row.subscription_id}
                                            onClick={() => openRenewDialog(row)}
                                        >
                                            Renew
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-6">
                                        {activeTab === "due" ? "No due renewals in selected window." : "No expired subscriptions found."}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200">
                    Renewal Payments
                </div>
                {loadingPayments ? (
                    <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableHead>Date</TableHead>
                            <TableHead>Tenant</TableHead>
                            <TableHead>Package</TableHead>
                            <TableHead>Invoice</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Transaction</TableHead>
                        </TableHeader>
                        <TableBody>
                            {payments.length > 0 ? payments.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
                                    <TableCell>{row.hotel_name}</TableCell>
                                    <TableCell>{row.package_name}</TableCell>
                                    <TableCell className="font-mono text-xs">{row.invoice_number || "-"}</TableCell>
                                    <TableCell>{formatCurrency((Number(row.amount_minor || 0) || 0) / 100)} {row.currency || ""}</TableCell>
                                    <TableCell className="capitalize">{row.payment_method || "-"}</TableCell>
                                    <TableCell className="font-mono text-xs">{row.transaction_id || "-"}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={7} className="text-center py-6">No renewal payments recorded yet.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>

            <Dialog open={!!selectedRenewal} onOpenChange={(open) => !open && setSelectedRenewal(null)}>
                <DialogContent className="max-w-xl">
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-white">Confirm Subscription Renewal</h3>
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                                <div className="text-xs text-slate-500">Tenant</div>
                                <div className="font-medium">{selectedRenewal?.hotel_name || "-"}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500">Subscription</div>
                                <div className="font-medium">#{selectedRenewal?.subscription_id || "-"}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500">Package</div>
                                <div className="font-medium">{selectedRenewal?.package_name || "-"}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500">Amount</div>
                                <div className="font-medium">{formatCurrency(Number(selectedRenewal?.renewal_amount || 0))} {selectedRenewal?.currency || ""}</div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500">Payment Method</label>
                            <Select
                                options={[
                                    { value: "bank_transfer", label: "Bank Transfer" },
                                    { value: "card", label: "Card" },
                                    { value: "upi", label: "UPI" },
                                    { value: "cash", label: "Cash" },
                                    { value: "other", label: "Other" }
                                ]}
                                value={renewForm.payment_method}
                                onChange={(e) => setRenewForm((p) => ({ ...p, payment_method: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500">Transaction ID (Optional)</label>
                            <Input
                                value={renewForm.transaction_id}
                                onChange={(e) => setRenewForm((p) => ({ ...p, transaction_id: e.target.value }))}
                                placeholder="Gateway/Bank reference"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setSelectedRenewal(null)}>Cancel</Button>
                            <Button
                                onClick={submitRenewal}
                                isLoading={renewingId === selectedRenewal?.subscription_id}
                                disabled={!canManage}
                            >
                                Confirm Renewal
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function SummaryCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "warning" | "info" | "danger" }) {
    const toneClass = tone === "warning"
        ? "bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800"
        : tone === "info"
            ? "bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800"
            : tone === "danger"
                ? "bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800"
                : "bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700";

    return (
        <div className={`rounded-xl border p-4 ${toneClass}`}>
            <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{value}</div>
        </div>
    );
}

function mapStatusVariant(status: string): "default" | "success" | "warning" | "danger" | "info" | "neutral" {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "active") return "success";
    if (normalized === "grace" || normalized === "grace_period") return "warning";
    if (normalized === "suspended") return "danger";
    return "neutral";
}
