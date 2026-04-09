"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

type Member = {
  id: number;
  wallet_address: string;
  referral_code: string | null;
  sponsor_id: number | null;
  status: string;
  is_blocked: number;
  created_at: string;
  main_balance: number | null;
  earning_balance: number | null;
  reward_balance: number | null;
  rank_name: string | null;
  direct_count: number;
};

export default function CompanyMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/mlm/members", { params: { search, limit: 200 } });
      setMembers((response.data?.data || []) as Member[]);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to load members";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => {
      void loadMembers();
    }, 300);
    return () => clearTimeout(t);
  }, [loadMembers]);

  const stats = useMemo(() => {
    const total = members.length;
    const active = members.filter((m) => String(m.status).toLowerCase() === "active" && !m.is_blocked).length;
    const blocked = members.filter((m) => m.is_blocked || String(m.status).toLowerCase() === "blocked").length;
    const totalDirects = members.reduce((sum, m) => sum + Number(m.direct_count || 0), 0);
    return { total, active, blocked, totalDirects };
  }, [members]);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Member Registry</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Distributor base, sponsor links, balances and activation status.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4"><p className="text-xs text-slate-500">Total Members</p><p className="text-2xl font-semibold">{stats.total}</p></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4"><p className="text-xs text-slate-500">Active</p><p className="text-2xl font-semibold text-emerald-600">{stats.active}</p></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4"><p className="text-xs text-slate-500">Blocked</p><p className="text-2xl font-semibold text-rose-600">{stats.blocked}</p></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4"><p className="text-xs text-slate-500">Total Directs</p><p className="text-2xl font-semibold">{stats.totalDirects}</p></div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by wallet, referral code, or user id"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500">
            <tr>
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-left px-4 py-3">Wallet</th>
              <th className="text-left px-4 py-3">Referral</th>
              <th className="text-left px-4 py-3">Sponsor</th>
              <th className="text-left px-4 py-3">Rank</th>
              <th className="text-left px-4 py-3">Directs</th>
              <th className="text-left px-4 py-3">Balances</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={8}>Loading members...</td></tr>
            ) : members.length === 0 ? (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={8}>No members found.</td></tr>
            ) : members.map((m) => (
              <tr key={m.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3">#{m.id}</td>
                <td className="px-4 py-3 max-w-[220px] truncate" title={m.wallet_address}>{m.wallet_address}</td>
                <td className="px-4 py-3">{m.referral_code || "-"}</td>
                <td className="px-4 py-3">{m.sponsor_id || "-"}</td>
                <td className="px-4 py-3">{m.rank_name || "-"}</td>
                <td className="px-4 py-3">{m.direct_count || 0}</td>
                <td className="px-4 py-3 text-xs">
                  M:{Number(m.main_balance || 0).toFixed(2)} E:{Number(m.earning_balance || 0).toFixed(2)} R:{Number(m.reward_balance || 0).toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${m.is_blocked ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {m.is_blocked ? "Blocked" : "Active"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
