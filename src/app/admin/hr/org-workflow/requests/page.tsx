"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function OrgWorkflowMyRequestsPage() {
    const [rows, setRows] = useState<any[]>([]);

    const load = async () => {
        try {
            const { data } = await api.get("/org-workflow/requests/my");
            setRows(data?.data || []);
        } catch (error) {
            toast.error("Failed to load my workflow requests");
        }
    };

    useEffect(() => {
        load();
    }, []);

    return (
        <div className="p-8 space-y-6">
            <h1 className="text-2xl font-bold dark:text-white">My Workflow Requests</h1>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-900 text-slate-500 uppercase">
                        <tr>
                            <th className="px-4 py-3 text-left">Process</th>
                            <th className="px-4 py-3 text-left">Type</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-left">Current Stage</th>
                            <th className="px-4 py-3 text-left">Assigned To</th>
                            <th className="px-4 py-3 text-left">Created</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {rows.map((r) => (
                            <tr key={r.id}>
                                <td className="px-4 py-3 dark:text-white">{r.process_key}</td>
                                <td className="px-4 py-3 dark:text-white">{r.request_type}</td>
                                <td className="px-4 py-3 dark:text-white">{r.status}</td>
                                <td className="px-4 py-3 dark:text-white">{r.current_stage}</td>
                                <td className="px-4 py-3 dark:text-white">{r.assigned_to_name || "-"}</td>
                                <td className="px-4 py-3 dark:text-white">{new Date(r.created_at).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {rows.length === 0 && <p className="p-4 text-sm text-slate-500">No workflow requests created by you yet.</p>}
            </div>
        </div>
    );
}
