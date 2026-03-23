"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { hasAnyPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/Button";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";

type AuditRow = {
    id: number;
    actor_user_id: number | null;
    action: string;
    entity_type: string | null;
    entity_id: string | null;
    status: "SUCCESS" | "FAILED";
    reason: string | null;
    error_message: string | null;
    route: string | null;
    method: string | null;
    ip_address: string | null;
    execution_scope: string | null;
    db_source: string | null;
    created_at: string;
};

export default function SecurityAuditPage() {
    const { user } = useAuth();
    const canView = hasAnyPermission(user, ["audit.view"]) || user?.role_id === 1;
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<AuditRow[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [dbSource, setDbSource] = useState<string>("-");
    const [executionScope, setExecutionScope] = useState<string>("-");
    const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

    const [filters, setFilters] = useState({
        action: "",
        status: "",
        actor_user_id: "",
        date_from: "",
        date_to: "",
        limit: "200"
    });

    const query = useMemo(() => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => {
            if (String(v).trim()) params.set(k, String(v).trim());
        });
        return params.toString();
    }, [filters]);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setLoadError(null);
            const res = await api.get(`/saas/security/sensitive-action-audit${query ? `?${query}` : ""}`);
            setRows(res.data.data || []);
            setDbSource(res.headers?.["x-db-source"] || "-");
            setExecutionScope(res.headers?.["x-execution-scope"] || "-");
            setLastSyncAt(new Date());
        } catch {
            setLoadError("Failed to load security audit logs");
            toast.error("Failed to load security audit logs");
        } finally {
            setLoading(false);
        }
    }, [query]);

    const exportCsv = () => {
        const data = rows.map((r) => ({
            id: r.id,
            created_at: r.created_at,
            status: r.status,
            action: r.action,
            actor_user_id: r.actor_user_id,
            entity_type: r.entity_type || "",
            entity_id: r.entity_id || "",
            reason: r.reason || "",
            error_message: r.error_message || "",
            route: r.route || "",
            method: r.method || "",
            ip_address: r.ip_address || "",
            execution_scope: r.execution_scope || "",
            db_source: r.db_source || ""
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "SecurityAudit");
        XLSX.writeFile(wb, `security_audit_${Date.now()}.xlsx`);
    };

    useEffect(() => {
        if (canView) load();
        else setLoading(false);
    }, [canView, load]);

    useEffect(() => {
        if (!canView) return;
        const interval = window.setInterval(() => {
            load();
        }, 30000);
        return () => window.clearInterval(interval);
    }, [canView, load]);

    if (!canView) {
        return <div className="p-8"><div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">Access denied for Security Audit logs.</div></div>;
    }

    return (
        <div className="p-8 space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white">Security Audit Logs</h1>
                    <p className="text-sm text-gray-500">Immutable log stream for sensitive actions.</p>
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
                    <Button variant="secondary" onClick={load}>Refresh</Button>
                    <Button onClick={exportCsv}>Export</Button>
                </div>
            </div>
            {loadError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {loadError}
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <input className="px-3 py-2 rounded border dark:bg-slate-900" placeholder="Action" value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} />
                <select className="px-3 py-2 rounded border dark:bg-slate-900" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                    <option value="">All Status</option>
                    <option value="SUCCESS">SUCCESS</option>
                    <option value="FAILED">FAILED</option>
                </select>
                <input className="px-3 py-2 rounded border dark:bg-slate-900" placeholder="Actor User ID" value={filters.actor_user_id} onChange={(e) => setFilters({ ...filters, actor_user_id: e.target.value })} />
                <input type="date" className="px-3 py-2 rounded border dark:bg-slate-900" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
                <input type="date" className="px-3 py-2 rounded border dark:bg-slate-900" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
                <input className="px-3 py-2 rounded border dark:bg-slate-900" placeholder="Limit" value={filters.limit} onChange={(e) => setFilters({ ...filters, limit: e.target.value })} />
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-auto">
                {loading ? (
                    <div className="p-6 text-sm text-gray-500">Loading...</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-900/50">
                            <tr>
                                <th className="px-3 py-2 text-left">When</th>
                                <th className="px-3 py-2 text-left">Status</th>
                                <th className="px-3 py-2 text-left">Action</th>
                                <th className="px-3 py-2 text-left">Actor</th>
                                <th className="px-3 py-2 text-left">Entity</th>
                                <th className="px-3 py-2 text-left">Reason</th>
                                <th className="px-3 py-2 text-left">Error</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.id} className="border-t dark:border-slate-700">
                                    <td className="px-3 py-2">{new Date(r.created_at).toLocaleString()}</td>
                                    <td className="px-3 py-2">{r.status}</td>
                                    <td className="px-3 py-2 font-mono">{r.action}</td>
                                    <td className="px-3 py-2">{r.actor_user_id ?? "-"}</td>
                                    <td className="px-3 py-2">{r.entity_type || "-"} {r.entity_id ? `#${r.entity_id}` : ""}</td>
                                    <td className="px-3 py-2">{r.reason || "-"}</td>
                                    <td className="px-3 py-2 text-red-600">{r.error_message || "-"}</td>
                                </tr>
                            ))}
                            {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">No audit rows found</td></tr>}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
