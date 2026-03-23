"use client";

import { useEffect, useState } from "react";
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

export default function HotelInvoicesPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { formatCurrency } = useSettings();

    const [filters, setFilters] = useState({
        status: "",
        start_date: "",
        end_date: ""
    });

    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

    const [defaultTemplate, setDefaultTemplate] = useState<any>(null);

    useEffect(() => {
        fetchInitialData();
        fetchInvoices();
    }, [filters]);

    const fetchInitialData = async () => {
        try {
            const templatesRes = await api.get('/system/finance/templates');
            const def = templatesRes.data.data.find((t: any) => t.is_default === 1);
            if (def) setDefaultTemplate(def);
        } catch (error) {
            console.error("Failed to load templates", error);
        }
    }

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
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Guest Invoices</h1>
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
