"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, CheckCircle, Loader2, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import toast from "react-hot-toast";

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Array<{ id: number; name: string; description?: string; is_default: number; is_active: boolean; updated_at: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [dbSource, setDbSource] = useState<string>("-");
    const [executionScope, setExecutionScope] = useState<string>("-");
    const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
    const router = useRouter();

    useEffect(() => {
        fetchTemplates();
    }, []);

    useEffect(() => {
        const interval = window.setInterval(() => {
            fetchTemplates();
        }, 30000);
        return () => window.clearInterval(interval);
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            setLoadError(null);
            const res = await api.get('/system/finance/templates');
            setTemplates(res.data.data);
            setDbSource(res.headers?.["x-db-source"] || "-");
            setExecutionScope(res.headers?.["x-execution-scope"] || "-");
            setLastSyncAt(new Date());
        } catch (error) {
            console.error("Failed to fetch templates", error);
            setLoadError("Failed to load templates");
            toast.error("Failed to load templates");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this template?")) return;
        try {
            await api.delete(`/system/finance/templates/${id}`);
            toast.success("Template deleted");
            fetchTemplates();
        } catch (error: unknown) {
            const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || "Delete failed");
        }
    };

    const handleSetDefault = async (id: number) => {
        try {
            await api.post(`/system/finance/templates/${id}/set-default`);
            toast.success("Default template updated");
            fetchTemplates();
        } catch {
            toast.error("Failed to set default");
        }
    };

    const handleCreate = async () => {
        try {
            const res = await api.post('/system/finance/templates', {
                name: "New Template",
                description: "Draft template",
                is_active: true,
                layout_json: {
                    header: { showLogo: true, title: "INVOICE" },
                    items: { showDescription: true, showAmount: true }
                }
            });
            router.push(`/finance/platform/templates/builder/${res.data.data.id}`);
        } catch {
            toast.error("Failed to create template");
        }
    };

    return (
        <div className="p-8 max-w-[1200px] mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Invoice Templates</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage and customize your invoice layouts</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">Auto refresh: 30s</span>
                        <span className="px-2 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-100">DB Source: {dbSource}</span>
                        <span className="px-2 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-100">Scope: {executionScope}</span>
                        <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            Last Sync: {lastSyncAt ? lastSyncAt.toLocaleString() : "Never"}
                        </span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={fetchTemplates}>Refresh</Button>
                    <Button onClick={handleCreate} className="bg-emerald-600 text-white gap-2">
                        <Plus size={16} /> Create Template
                    </Button>
                </div>
            </div>
            {loadError && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {loadError}
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                {loading ? (
                    <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableHead>Template Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last Updated</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableHeader>
                        <TableBody>
                            {templates.map((template) => (
                                <TableRow key={template.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg text-slate-500">
                                                <FileText size={18} />
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-800 dark:text-white flex items-center gap-2">
                                                    {template.name}
                                                    {template.is_default === 1 && (
                                                        <Badge variant="success" className="text-[10px] px-1 py-0 h-5">DEFAULT</Badge>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-400">{template.description}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={template.is_active ? 'success' : 'neutral'}>
                                            {template.is_active ? 'Active' : 'Draft'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-sm">
                                        {new Date(template.updated_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {template.is_default !== 1 && (
                                                <Button variant="ghost" size="sm" onClick={() => handleSetDefault(template.id)} title="Set as Default">
                                                    <CheckCircle size={16} className="text-slate-400 hover:text-emerald-500" />
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="sm" onClick={() => router.push(`/finance/platform/templates/builder/${template.id}`)}>
                                                <Edit size={16} className="text-blue-500" />
                                            </Button>
                                            {template.is_default !== 1 && (
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)}>
                                                    <Trash2 size={16} className="text-red-500" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {templates.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                                        No templates found. Create one to get started.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
}
