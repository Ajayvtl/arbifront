"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { Search, Loader2, FileText, Download, DollarSign, Briefcase, Filter, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { useSettings } from "@/context/SettingsContext";
import InvoiceTemplate from "@/components/invoice/InvoiceTemplate";

export default function SystemFinancePage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [stats, setStats] = useState({ total_revenue: 0, mrr: 0, outstanding: 0 });
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
    const [statsDbSource, setStatsDbSource] = useState<string>("-");
    const [statsScope, setStatsScope] = useState<string>("-");
    const [invoiceDbSource, setInvoiceDbSource] = useState<string>("-");
    const [invoiceScope, setInvoiceScope] = useState<string>("-");
    const [agents, setAgents] = useState<any[]>([]);
    const { formatCurrency } = useSettings();

    // Filters
    const [filters, setFilters] = useState({
        status: "",
        start_date: "",
        end_date: "",
        agent_id: "",
        package_id: "", // TODO: Fetch packages if needed
        country_id: "" // TODO: Fetch Countries if needed
    });

    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

    const [defaultTemplate, setDefaultTemplate] = useState<any>(null);

    const normalizeStats = (raw: unknown) => {
        if (Array.isArray(raw)) {
            return raw.reduce((acc, row) => {
                const typedRow = row as {
                    revenue_minor?: number; total_revenue?: number;
                    mrr_minor?: number; mrr?: number;
                    outstanding_minor?: number; outstanding?: number;
                };
                acc.total_revenue += Number(typedRow.revenue_minor || typedRow.total_revenue || 0) / (typedRow.revenue_minor != null ? 100 : 1);
                acc.mrr += Number(typedRow.mrr_minor || typedRow.mrr || 0) / (typedRow.mrr_minor != null ? 100 : 1);
                acc.outstanding += Number(typedRow.outstanding_minor || typedRow.outstanding || 0) / (typedRow.outstanding_minor != null ? 100 : 1);
                return acc;
            }, { total_revenue: 0, mrr: 0, outstanding: 0 });
        }
        const typedRaw = (raw || {}) as { total_revenue?: number; mrr?: number; outstanding?: number };
        return {
            total_revenue: Number(typedRaw.total_revenue || 0),
            mrr: Number(typedRaw.mrr || 0),
            outstanding: Number(typedRaw.outstanding || 0)
        };
    };

    const fetchInitialData = useCallback(async () => {
        try {
            setLoadError(null);
            const [statsRes, agentsRes, templatesRes] = await Promise.all([
                api.get('/system/finance/stats'),
                api.get('/system/finance/agents'),
                api.get('/system/finance/templates') // List all, we'll find default
            ]);
            setStats(normalizeStats(statsRes.data.data));
            setAgents(agentsRes.data.data);
            setStatsDbSource(statsRes.headers?.["x-db-source"] || "-");
            setStatsScope(statsRes.headers?.["x-execution-scope"] || "-");
            setLastSyncAt(new Date());

            const def = templatesRes.data.data.find((t: any) => t.is_default === 1);
            if (def) setDefaultTemplate(def);
        } catch (error) {
            setLoadError("Failed to load finance summary data");
            console.error("Failed to load initial data", error);
        }
    }, []);

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });

            const invRes = await api.get(`/system/finance/invoices?${params.toString()}`);
            setInvoices(invRes.data.data.invoices);
            setInvoiceDbSource(invRes.headers?.["x-db-source"] || "-");
            setInvoiceScope(invRes.headers?.["x-execution-scope"] || "-");
            setLastSyncAt(new Date());
        } catch (error) {
            setLoadError("Failed to load invoices");
            console.error("Failed to load invoices", error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    useEffect(() => {
        const interval = window.setInterval(() => {
            fetchInitialData();
            fetchInvoices();
        }, 30000);
        return () => window.clearInterval(interval);
    }, [fetchInitialData, fetchInvoices]);

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value === "all" ? "" : value }));
    };

    const handleExport = () => {
        // Simple client-side CSV export
        const headers = ["Invoice Number", "Hotel", "Plan", "Amount", "Status", "Date", "Agent"];
        const rows = invoices.map(inv => [
            inv.invoice_number,
            inv.hotel_name,
            inv.plan_name || 'N/A',
            inv.total_amount,
            inv.status,
            new Date(inv.created_at).toLocaleDateString(),
            "N/A" // Agent name would need join in backend or finding in agents list
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `saas_invoices_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const viewInvoice = (invoice: any) => {
        // Map invoice data to template format with safe defaults
        const templateData = {
            ...invoice,
            invoice_number: invoice.invoice_number || 'DRAFT',
            biller_name: "GreenCross Platform",
            biller_address: "123 Platform Hq, Tech City",
            amount: invoice.amount || invoice.total_amount || 0, // Fallback chain
            tax_amount: invoice.tax_amount || 0,
            total_amount: invoice.total_amount || 0,
            currency: invoice.currency || 'USD',
            status: invoice.status || 'pending',
            items: [{
                description: `SaaS Subscription - ${invoice.plan_name || 'Standard'}`,
                amount: invoice.amount || invoice.total_amount || 0
            }]
        };
        setSelectedInvoice(templateData);
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">System Finance (SaaS)</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="info">Auto refresh: 30s</Badge>
                        <Badge variant="neutral">Stats DB: {statsDbSource}</Badge>
                        <Badge variant="neutral">Stats Scope: {statsScope}</Badge>
                        <Badge variant="neutral">Invoice DB: {invoiceDbSource}</Badge>
                        <Badge variant="neutral">Invoice Scope: {invoiceScope}</Badge>
                        <Badge variant="default">Last Sync: {lastSyncAt ? lastSyncAt.toLocaleString() : "Never"}</Badge>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => { fetchInitialData(); fetchInvoices(); }} variant="outline" className="gap-2">
                        <Loader2 size={16} className={loading ? "animate-spin" : ""} /> Refresh
                    </Button>
                    <Button onClick={handleExport} variant="secondary" className="gap-2">
                        <Download size={16} /> Export CSV
                    </Button>
                </div>
            </div>
            {loadError && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {loadError}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard icon={<DollarSign size={24} />} label="Total SaaS Revenue" value={formatCurrency(stats.total_revenue)} color="bg-emerald-100 text-emerald-600" />
                <StatCard icon={<Briefcase size={24} />} label="Monthly Recurring (MRR)" value={formatCurrency(stats.mrr)} color="bg-blue-100 text-blue-600" />
                <StatCard icon={<FileText size={24} />} label="Outstanding" value={formatCurrency(stats.outstanding)} color="bg-orange-100 text-orange-600" />
            </div>

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
                                label: agent.name || `${agent.first_name || ''} ${agent.last_name || ''}`.trim()
                            }))
                        ]}
                        value={filters.agent_id || "all"}
                        onChange={(e) => handleFilterChange('agent_id', e.target.value)}
                    />
                </div>

                {(filters.status || filters.start_date || filters.end_date || filters.agent_id) && (
                    <Button variant="ghost" className="text-red-500" onClick={() => setFilters({ status: "", start_date: "", end_date: "", agent_id: "", package_id: "", country_id: "" })}>
                        <X size={16} className="mr-2" /> Reset
                    </Button>
                )}
            </div>

            {/* Invoices Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 font-bold text-slate-700">Recent SaaS Invoices</div>

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
                                    <TableCell>{inv.hotel_name}</TableCell>
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

            {/* Invoice Viewer Modal */}
            <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-gray-50 max-h-[90vh] overflow-y-auto">
                    {selectedInvoice && (
                        <div className="p-4">
                            <div className="sticky top-0 z-10 bg-gray-50 pb-4 flex justify-end mb-4 border-b border-gray-200 print:hidden">
                                <Button onClick={() => window.print()}>Print Invoice</Button>
                            </div>
                            <InvoiceTemplate invoice={selectedInvoice} template={defaultTemplate?.layout_json} />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function StatCard({ icon, label, value, color }: any) {
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
            <div>
                <p className="text-slate-500 text-sm">{label}</p>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{value}</h3>
            </div>
        </div>
    );
}
