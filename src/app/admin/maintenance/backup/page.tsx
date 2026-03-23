"use client";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import api from "@/lib/api";
import { ArrowDownTrayIcon, CloudArrowUpIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

type SystemBackupRow = {
    id: number;
    status?: string;
    file_name?: string | null;
    created_at?: string | null;
    completed_at?: string | null;
    file_size_kb?: number | null;
};

export default function SystemBackupPage() {
    const [loading, setLoading] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [backups, setBackups] = useState<SystemBackupRow[]>([]);
    const [dbSource, setDbSource] = useState<string>("-");
    const [executionScope, setExecutionScope] = useState<string>("-");
    const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
    const [excludeSuperAdminData, setExcludeSuperAdminData] = useState(false);

    const loadHistory = async () => {
        try {
            setLoadingHistory(true);
            setLoadError(null);
            const res = await api.get('/maintenance/backup/system');
            setBackups(Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
            setDbSource(res.headers?.["x-db-source"] || "-");
            setExecutionScope(res.headers?.["x-execution-scope"] || "-");
            setLastSyncAt(new Date());
        } catch {
            setLoadError("Failed to load backup history");
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        loadHistory();
        const interval = window.setInterval(() => {
            loadHistory();
        }, 30000);
        return () => window.clearInterval(interval);
    }, []);

    const handleBackup = async () => {
        if (!confirm('Start System Backup? This might take a while.')) return;
        setLoading(true);
        try {
            await api.post('/maintenance/backup/system', {
                exclude_super_admin_data: excludeSuperAdminData
            });
            toast.success(
                excludeSuperAdminData
                    ? 'System Backup Started (excluding super admin data)'
                    : 'System Backup Started'
            );
            await loadHistory();
        } catch {
            toast.error('Backup Failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">System Backup</h1>
            <p className="text-gray-500 mb-6">Backup and Restore Main Database.</p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-4 text-emerald-600">
                        <ArrowDownTrayIcon className="w-8 h-8" />
                        <h2 className="text-xl font-bold">Export Database</h2>
                    </div>
                    <p className="text-gray-500 mb-6">Create a full SQL dump of the main system database. This may take a few minutes.</p>
                    <label className="flex items-start gap-2 mb-4 text-sm text-gray-700 dark:text-gray-300">
                        <input
                            type="checkbox"
                            className="mt-1"
                            checked={excludeSuperAdminData}
                            onChange={(e) => setExcludeSuperAdminData(e.target.checked)}
                            disabled={loading}
                        />
                        <span>Exclude Super Admin rows from restore data</span>
                    </label>
                    <Button variant="primary" onClick={handleBackup} disabled={loading}>
                        {loading ? 'Starting...' : 'Start Backup'}
                    </Button>
                </div>

                <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-4 text-blue-600">
                        <CloudArrowUpIcon className="w-8 h-8" />
                        <h2 className="text-xl font-bold">Restore Database</h2>
                    </div>
                    <p className="text-gray-500 mb-6">Restore system from a SQL file. <span className="text-red-500 font-bold">Warning: Overwrites existing data.</span></p>
                    <Button variant="danger" disabled>Upload & Restore (Dev Only)</Button>
                </div>
            </div>

            <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 font-semibold flex items-center justify-between">
                    <span>Recent System Backups</span>
                    <Button variant="secondary" onClick={loadHistory} isLoading={loadingHistory}>Refresh</Button>
                </div>
                <div className="overflow-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-900/50">
                            <tr>
                                <th className="px-6 py-3">ID</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">File</th>
                                <th className="px-6 py-3">Size (KB)</th>
                                <th className="px-6 py-3">Created</th>
                                <th className="px-6 py-3">Completed</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {loadingHistory ? (
                                <tr><td colSpan={6} className="px-6 py-5 text-center">Loading...</td></tr>
                            ) : backups.length > 0 ? backups.map((b) => (
                                <tr key={b.id}>
                                    <td className="px-6 py-3">#{b.id}</td>
                                    <td className="px-6 py-3">{b.status || "-"}</td>
                                    <td className="px-6 py-3 font-mono text-xs">{b.file_name || "-"}</td>
                                    <td className="px-6 py-3">{Number(b.file_size_kb || 0).toLocaleString()}</td>
                                    <td className="px-6 py-3">{b.created_at ? new Date(b.created_at).toLocaleString() : "-"}</td>
                                    <td className="px-6 py-3">{b.completed_at ? new Date(b.completed_at).toLocaleString() : "-"}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} className="px-6 py-6 text-center text-gray-500">No backup history found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
