"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { hasDeveloperScope } from "@/lib/companyRoleScope";

type KycRow = {
  id: number;
  wallet_address: string;
  email: string | null;
  referral_code: string | null;
  status: string;
  is_blocked: number;
  created_at: string;
  kyc_status: "PENDING" | "VERIFIED" | "REJECTED";
};

const statusOptions = ["", "PENDING", "VERIFIED", "REJECTED"];

export default function CompanyKycPage() {
  const { user } = useAuth();
  const canAccess = hasDeveloperScope(user);
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<KycRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRows = useCallback(async () => {
    if (!canAccess) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await api.get("/mlm/kyc", { params: { status, limit: 200 } });
      setRows((response.data?.data || []) as KycRow[]);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to load KYC queue";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [canAccess, status]);

  useEffect(() => {
    if (!canAccess) {
      setLoading(false);
      return;
    }
    void loadRows();
  }, [canAccess, loadRows]);

  const updateStatus = async (row: KycRow, next: "VERIFIED" | "REJECTED") => {
    if (!canAccess) {
      toast.error("Access denied");
      return;
    }
    try {
      await api.patch(`/mlm/kyc/${row.id}`, { status: next });
      toast.success(`User #${row.id} marked ${next}`);
      await loadRows();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update KYC status";
      toast.error(message);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {!canAccess ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          Access denied for KYC Review.
        </div>
      ) : null}
      {canAccess ? (
        <>
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">KYC Review Queue</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Compliance review and activation control for distributor accounts.</p>
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
              <th className="text-left px-4 py-3">User #</th>
              <th className="text-left px-4 py-3">Wallet</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Referral</th>
              <th className="text-left px-4 py-3">KYC Status</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>Loading KYC queue...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>No KYC records found.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3">#{row.id}</td>
                <td className="px-4 py-3 max-w-[220px] truncate" title={row.wallet_address}>{row.wallet_address}</td>
                <td className="px-4 py-3">{row.email || "-"}</td>
                <td className="px-4 py-3">{row.referral_code || "-"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${row.kyc_status === "VERIFIED" ? "bg-emerald-100 text-emerald-700" : row.kyc_status === "REJECTED" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                    {row.kyc_status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => updateStatus(row, "VERIFIED")} className="px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-700">Verify</button>
                    <button onClick={() => updateStatus(row, "REJECTED")} className="px-2 py-1 text-xs rounded bg-rose-100 text-rose-700">Reject</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        </>
      ) : null}
    </div>
  );
}
