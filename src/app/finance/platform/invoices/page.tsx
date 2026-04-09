"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { Loader2, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { useSettings } from "@/context/SettingsContext";
import InvoiceTemplate from "@/components/invoice/InvoiceTemplate";

export default function PlatformInvoicesPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [agents, setAgents] = useState<any[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [dbSource, setDbSource] = useState<string>("-");
    const [executionScope, setExecutionScope] = useState<string>("-");
    const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
    const { formatCurrency } = useSettings();

    const [filters, setFilters] = useState({
        status: "",
        start_date: "",
        end_date: "",
        agent_id: "",
    });

    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

    const fetchAgents = useCallback(async () => {
        try {
            const res = await api.get('/system/finance/agents');
            setAgents(res.data.data);
        } catch (error) {
            console.error("Failed to load agents", error);
        }
    }, []);

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        try {
            setLoadError(null);
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });

            const invRes = await api.get(`/system/finance/invoices?${params.toString()}`);
            setInvoices(invRes.data.data.invoices);
            setDbSource(invRes.headers?.["x-db-source"] || "-");
            setExecutionScope(invRes.headers?.["x-execution-scope"] || "-");
            setLastSyncAt(new Date());
        } catch (error) {
            setLoadError("Failed to load invoices");
            console.error("Failed to load invoices", error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    useEffect(() => {
        const interval = window.setInterval(() => {
            fetchInvoices();
        }, 30000);
        return () => window.clearInterval(interval);
    }, [fetchInvoices]);

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value === "all" ? "" : value }));
    };

    const viewInvoice = (invoice: any) => {
        const templateData = {
            ...invoice,
            invoice_number: invoice.invoice_number || 'DRAFT',
            biller_name: "GreenCross Platform",
            biller_address: "123 Platform Hq, Tech City",
            amount: invoice.amount || invoice.total_amount || 0,
            tax_amount: invoice.tax_amount || 0,
            total_amount: invoice.total_amount || 0,
            currency: invoice.currency || 'USD',
            status: invoice.status || 'pending',
            items: [{ description: `SaaS Subscription - ${invoice.plan_name || 'Standard'}`, amount: invoice.amount || invoice.total_amount || 0 }]
        };
        setSelectedInvoice(templateData);
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">SaaS Invoices</h1>
            <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">Auto refresh: 30s</span>
                <span className="px-2 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-100">DB Source: {dbSource}</span>
                <span className="px-2 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-100">Scope: {executionScope}</span>
                <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    Last Sync: {lastSyncAt ? lastSyncAt.toLocaleString() : "Never"}
                </span>
                <Button variant="secondary" onClick={fetchInvoices}>Refresh</Button>
            </div>
            {loadError && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {loadError}
                </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 mb-6 flex flex-wrap gap-4 items-end">
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Date Range</label>
                    <div className="flex gap-2">
                        <Input type="date" className="w-40" value={filters.start_date} onChange={(e) => handleFilterChange('start_date', e.target.value)} />
                        <Input type="date" className="w-40" value={filters.end_date} onChange={(e) => handleFilterChange('end_date', e.target.value)} />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Status</label>
                    <Select
                        className="w-40"
                        options={[
                            { value: "all", label: "All Statuses" },
                            { value: "paid", label: "Paid" },
                            { value: "unpaid", label: "Unpaid" },
                            { value: "overdue", label: "Overdue" }
                        ]}
                        value={filters.status || "all"}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Agent</label>
                    <Select
                        className="w-48"
                        options={[
                            { value: "all", label: "All Agents" },
                            ...agents.map((agent: any) => ({
                                value: agent.id.toString(),
                                label: agent.name || `${agent.first_name} ${agent.last_name}`
                            }))
                        ]}
                        value={filters.agent_id || "all"}
                        onChange={(e) => handleFilterChange('agent_id', e.target.value)}
                    />
                </div>

                {(filters.status || filters.start_date || filters.end_date || filters.agent_id) && (
                    <Button variant="ghost" className="text-red-500" onClick={() => setFilters({ status: "", start_date: "", end_date: "", agent_id: "" })}>
                        <X size={16} className="mr-2" /> Reset
                    </Button>
                )}

                <div className="ml-auto">
                    <Button onClick={() => alert("Manual Invoice Generation Feature coming soon!")} className="bg-emerald-600 text-white">
                        + Generate Invoice
                    </Button>
                </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                {loading ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-emerald-600" /></div> : (
                    <Table>
                        <TableHeader>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Tenant (Hotel)</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableHeader>
                        <TableBody>
                            {invoices.length > 0 ? invoices.map((inv) => (
                                <TableRow key={inv.id}>
                                    <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                                    <TableCell>
                                        <div>{inv.hotel_name}</div>
                                        <div className="text-xs text-slate-400">{inv.email}</div>
                                    </TableCell>
                                    <TableCell>{inv.plan_name || 'N/A'}</TableCell>
                                    <TableCell className="font-medium">{formatCurrency(inv.total_amount)}</TableCell>
                                    <TableCell><Badge variant={inv.status === 'paid' ? 'success' : 'warning'}>{inv.status.toUpperCase()}</Badge></TableCell>
                                    <TableCell>{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" onClick={() => viewInvoice(inv)}>View</Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={7} className="text-center py-4">No records found</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>

            <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-gray-50 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
                    {selectedInvoice && (
                        <div className="relative">
                            <button
                                onClick={() => setSelectedInvoice(null)}
                                className="absolute top-4 right-4 z-50 p-2 bg-slate-100 rounded-full hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                            >
                                <X size={20} className="text-slate-500 dark:text-slate-400" />
                            </button>
                            <div className="p-4">
                                <InvoiceTemplate invoice={{
                                    ...selectedInvoice,
                                    // Map backend fields to template
                                    biller_address: "GreenCross Platform HQ\n123 Tech Park\nSilicon Valley, CA",
                                    hotel_name: selectedInvoice.hotel_name,
                                    guest_name: selectedInvoice.hotel_name, // Reusing field for display
                                    items: [{
                                        description: `SaaS Subscription - ${selectedInvoice.plan_name || 'Standard Plan'}`,
                                        amount: selectedInvoice.total_amount
                                    }],
                                    billing_address: [
                                        selectedInvoice.billing_address,
                                        selectedInvoice.city,
                                        selectedInvoice.state,
                                        selectedInvoice.country
                                    ].filter(Boolean).join(', ') || 'Address Not Available',
                                    biller_tax_id: "TAX-123-456"
                                }} />
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
