"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Search, Loader2, FileText, Download, DollarSign, CreditCard, Filter, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { useSettings } from "@/context/SettingsContext";
import InvoiceTemplate from "@/components/invoice/InvoiceTemplate";

export default function HotelFinancePage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [stats, setStats] = useState({ revenue: 0, pending: 0 });
    const [loading, setLoading] = useState(true);
    const { formatCurrency } = useSettings();

    // Filters
    const [filters, setFilters] = useState({
        status: "",
        start_date: "",
        end_date: ""
    });

    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        fetchInvoices();
    }, [filters]);

    const fetchStats = async () => {
        try {
            const statsRes = await api.get('/hotel/finance/stats');
            setStats(statsRes.data.data);
        } catch (error) {
            console.error("Failed to load hotel stats", error);
        }
    };

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });

            const invRes = await api.get(`/hotel/finance/invoices?${params.toString()}`);
            setInvoices(invRes.data.data.invoices);
        } catch (error) {
            console.error("Failed to load invoices", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value === "all" ? "" : value }));
    };

    const handleExport = () => {
        const headers = ["Invoice Number", "Guest", "Order #", "Amount", "Status", "Date"];
        const rows = invoices.map(inv => [
            inv.invoice_number,
            inv.guest_name || 'Guest',
            inv.order_number,
            inv.total_amount,
            inv.status,
            new Date(inv.created_at).toLocaleDateString()
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `guest_invoices_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const viewInvoice = (invoice: any) => {
        const templateData = {
            ...invoice,
            invoice_number: invoice.invoice_number || 'DRAFT',
            biller_name: "Hotel Service",
            biller_address: "Front Desk",
            guest_name: invoice.guest_name || 'Guest',
            amount: invoice.amount || invoice.total_amount || 0,
            tax_amount: invoice.tax_amount || 0,
            total_amount: invoice.total_amount || 0,
            currency: invoice.currency || 'USD',
            status: invoice.status || 'pending',
            items: [{
                description: `Order #${invoice.order_number || 'N/A'}`,
                amount: invoice.total_amount || 0
            }]
        };
        setSelectedInvoice(templateData);
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Hotel Finance</h1>
                <Button onClick={handleExport} variant="secondary" className="gap-2">
                    <Download size={16} /> Export CSV
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <StatCard icon={<DollarSign size={24} />} label="Total Revenue (Paid)" value={formatCurrency(stats.revenue)} color="bg-emerald-100 text-emerald-600" />
                <StatCard icon={<CreditCard size={24} />} label="Pending Payments" value={formatCurrency(stats.pending)} color="bg-orange-100 text-orange-600" />
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
                            { value: "generated", label: "Unpaid" }
                        ]}
                        value={filters.status || "all"}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                    />
                </div>

                {(filters.status || filters.start_date || filters.end_date) && (
                    <Button variant="ghost" className="text-red-500" onClick={() => setFilters({ status: "", start_date: "", end_date: "" })}>
                        <X size={16} className="mr-2" /> Reset
                    </Button>
                )}
            </div>

            {/* Invoices Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 font-bold text-slate-700">Guest Invoices</div>

                {loading ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-emerald-600" /></div> : (
                    <Table>
                        <TableHeader>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Guest Name</TableHead>
                            <TableHead>Order #</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableHeader>
                        <TableBody>
                            {invoices.length > 0 ? invoices.map((inv) => (
                                <TableRow key={inv.id}>
                                    <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                                    <TableCell>{inv.guest_name}</TableCell>
                                    <TableCell>{inv.order_number}</TableCell>
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
                            <div className="flex justify-end mb-4 print:hidden">
                                <Button onClick={() => window.print()}>Print Invoice</Button>
                            </div>
                            <InvoiceTemplate invoice={selectedInvoice} />
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
