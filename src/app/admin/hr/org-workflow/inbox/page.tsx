"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function OrgWorkflowInboxPage() {
    const [rows, setRows] = useState<any[]>([]);

    const load = async () => {
        try {
            const { data } = await api.get("/org-workflow/requests/inbox");
            setRows(data?.data || []);
        } catch (error) {
            toast.error("Failed to load workflow inbox");
        }
    };

    useEffect(() => {
        load();
    }, []);

    const act = async (id: number, action: "approve" | "reject") => {
        try {
            await api.post(`/org-workflow/requests/${id}/action`, {
                action,
                comments: `Action from dedicated inbox page`
            });
            toast.success(`Request ${action}d`);
            load();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Action failed");
        }
    };

    return (
        <div className="p-8 space-y-6">
            <h1 className="text-2xl font-bold dark:text-white">Approval Inbox</h1>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-900 text-slate-500 uppercase">
                        <tr>
                            <th className="px-4 py-3 text-left">Process</th>
                            <th className="px-4 py-3 text-left">Type</th>
                            <th className="px-4 py-3 text-left">Stage</th>
                            <th className="px-4 py-3 text-left">Requester</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {rows.map((r) => (
                            <tr key={r.id}>
                                <td className="px-4 py-3 dark:text-white">{r.process_key}</td>
                                <td className="px-4 py-3 dark:text-white">{r.request_type}</td>
                                <td className="px-4 py-3 dark:text-white">{r.current_stage}</td>
                                <td className="px-4 py-3 dark:text-white">{r.requested_by_name || `User #${r.requested_by}`}</td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => act(r.id, "approve")} className="px-2 py-1 text-xs rounded bg-green-600 text-white mr-2">Approve</button>
                                    <button onClick={() => act(r.id, "reject")} className="px-2 py-1 text-xs rounded bg-red-600 text-white">Reject</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {rows.length === 0 && <p className="p-4 text-sm text-slate-500">No pending workflow approvals assigned to you.</p>}
            </div>
        </div>
    );
}
