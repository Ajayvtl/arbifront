"use client";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import api from "@/lib/api";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

type TenantBackupRow = {
    id: number;
    db_name: string;
    name: string;
    subdomain: string;
    last_backup_at?: string | null;
};

export default function ProductDbBackupPage() {
    const [tenants, setTenants] = useState<TenantBackupRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [dbSource, setDbSource] = useState<string>("-");
    const [executionScope, setExecutionScope] = useState<string>("-");
    const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

    const fetchTenants = async () => {
        try {
            setLoading(true);
            setLoadError(null);
            const res = await api.get('/maintenance/tenants-status');
            setTenants(Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
            setDbSource(res.headers?.["x-db-source"] || "-");
            setExecutionScope(res.headers?.["x-execution-scope"] || "-");
            setLastSyncAt(new Date());
        } catch {
            setLoadError("Failed to load tenants");
            toast.error("Failed to load tenants");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTenants();
        const interval = window.setInterval(() => {
            fetchTenants();
        }, 30000);
        return () => window.clearInterval(interval);
    }, []);

    const handleBackup = async (id: number) => {
        try {
            await api.post(`/maintenance/backup/tenant/${id}`, {});
            toast.success("Backup Started");
            fetchTenants(); // Refresh
        } catch {
            toast.error("Backup Failed");
        }
    };

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Product Database Backups</h1>
            <p className="text-gray-500 mb-6">Manage backups for individual tenant/product databases.</p>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="info">Auto refresh: 30s</Badge>
                <Badge variant="neutral">DB Source: {dbSource}</Badge>
                <Badge variant="neutral">Scope: {executionScope}</Badge>
                <Badge variant="default">Last Sync: {lastSyncAt ? lastSyncAt.toLocaleString() : "Never"}</Badge>
            </div>
            {loadError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {loadError}
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-slate-700/50">
                        <tr>
                            <th className="px-6 py-4">Database Name</th>
                            <th className="px-6 py-4">Associated Product</th>
                            <th className="px-6 py-4">Last Backup</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {loading ? (
                            <tr><td colSpan={4} className="px-6 py-4 text-center">Loading...</td></tr>
                        ) : tenants.map((tenant) => (
                            <tr key={tenant.id}>
                                <td className="px-6 py-4 font-mono text-sm">{tenant.db_name}</td>
                                <td className="px-6 py-4">
                                    <div className="font-bold">{tenant.name}</div>
                                    <div className="text-xs text-gray-400">{tenant.subdomain}</div>
                                </td>
                                <td className="px-6 py-4">
                                    {tenant.last_backup_at ? new Date(tenant.last_backup_at).toLocaleString() : 'Never'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <Button variant="secondary" onClick={() => handleBackup(tenant.id)}>
                                        <ArrowDownTrayIcon className="w-4 h-4 mr-2" /> Export
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
