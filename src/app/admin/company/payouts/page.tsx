"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "@/lib/api";

type Payout = {
  id: number;
  user_id: number;
  user_wallet_address: string;
  amount: number;
  charge: number;
  net_amount: number;
  withdrawal_wallet_address: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUCCESS";
  tx_hash: string | null;
  callback_status: string;
  created_at: string;
};

const statusOptions = ["", "PENDING", "APPROVED", "REJECTED", "SUCCESS"];

export default function CompanyPayoutsPage() {
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/mlm/payouts", { params: { status, limit: 200 } });
      setRows((response.data?.data || []) as Payout[]);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to load payouts";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const updateStatus = async (row: Payout, next: "APPROVED" | "REJECTED" | "SUCCESS") => {
    try {
      const txHash = next === "SUCCESS" ? window.prompt("Enter tx hash (optional):", row.tx_hash || "") || undefined : undefined;
      await api.patch(`/mlm/payouts/${row.id}/status`, { status: next, txHash });
      toast.success(`Payout #${row.id} marked ${next}`);
      await loadRows();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update payout status";
      toast.error(message);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Payout Queue</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Review and process withdrawal requests.</p>
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
        >
          {statusOptions.map((opt) => (
            <option key={opt || "ALL"} value={opt}>{opt || "All statuses"}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500">
            <tr>
              <th className="text-left px-4 py-3">Req #</th>
              <th className="text-left px-4 py-3">User</th>
              <th className="text-left px-4 py-3">Amount</th>
              <th className="text-left px-4 py-3">Destination</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Tx Hash</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={7}>Loading payouts...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={7}>No payout requests found.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3">#{row.id}</td>
                <td className="px-4 py-3">#{row.user_id}</td>
                <td className="px-4 py-3">{Number(row.amount || 0).toFixed(6)} (net {Number(row.net_amount || 0).toFixed(6)})</td>
                <td className="px-4 py-3 max-w-[220px] truncate" title={row.withdrawal_wallet_address}>{row.withdrawal_wallet_address || row.user_wallet_address}</td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="px-4 py-3 max-w-[220px] truncate" title={row.tx_hash || ""}>{row.tx_hash || "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => updateStatus(row, "APPROVED")} className="px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-700">Approve</button>
                    <button onClick={() => updateStatus(row, "REJECTED")} className="px-2 py-1 text-xs rounded bg-rose-100 text-rose-700">Reject</button>
                    <button onClick={() => updateStatus(row, "SUCCESS")} className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">Mark Paid</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
