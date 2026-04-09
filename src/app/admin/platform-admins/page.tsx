"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { AxiosError } from "axios";

interface AdminRow {
  id: number;
  company_id: number | null;
  company_name?: string | null;
  email: string;
  wallet_address: string | null;
  role: "SUPER_ADMIN" | "COMPANY_ADMIN" | "FINANCE_ADMIN" | "SUPPORT_ADMIN";
  status: "active" | "blocked";
  created_at: string;
}

const roles = ["COMPANY_ADMIN", "FINANCE_ADMIN", "SUPPORT_ADMIN"] as const;

export default function PlatformAdminsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyFilter, setCompanyFilter] = useState("");

  const [createForm, setCreateForm] = useState({
    companyId: "1",
    email: "",
    password: "",
    role: "COMPANY_ADMIN",
    walletAddress: "",
  });

  const [walletForm, setWalletForm] = useState<Record<number, string>>({});

  const isSuperAdmin = useMemo(() => user?.role_id === 1 || user?.role === "SUPER_ADMIN", [user]);

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (companyFilter.trim()) {
        params.companyId = companyFilter.trim();
      }

      const res = await api.get("/admin/admins", { params });
      const data = (res.data?.data || []) as AdminRow[];
      setRows(data);

      const wallets: Record<number, string> = {};
      data.forEach((r) => {
        wallets[r.id] = r.wallet_address || "";
      });
      setWalletForm(wallets);
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to load admins");
    } finally {
      setLoading(false);
    }
  }, [companyFilter]);

  useEffect(() => {
    if (isSuperAdmin) loadAdmins();
  }, [isSuperAdmin, loadAdmins]);

  async function createAdmin(e: React.FormEvent) {
    e.preventDefault();

    try {
      await api.post("/admin/admins", {
        companyId: Number(createForm.companyId),
        email: createForm.email,
        password: createForm.password,
        role: createForm.role,
        walletAddress: createForm.walletAddress || null,
      });

      toast.success("Admin created");
      setCreateForm((prev) => ({ ...prev, email: "", password: "", walletAddress: "" }));
      await loadAdmins();
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to create admin");
    }
  }

  async function updateWallet(adminId: number) {
    try {
      await api.patch(`/admin/admins/${adminId}/wallet`, {
        walletAddress: (walletForm[adminId] || "").trim() || null,
      });
      toast.success("Wallet updated");
      await loadAdmins();
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to update wallet");
    }
  }

  async function toggleStatus(row: AdminRow) {
    const nextStatus = row.status === "active" ? "blocked" : "active";
    try {
      await api.patch(`/admin/admins/${row.id}/status`, { status: nextStatus });
      toast.success(`Admin ${nextStatus}`);
      await loadAdmins();
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || "Failed to update status");
    }
  }

  if (!isSuperAdmin) {
    return <div className="p-6 text-red-600">Only Super Admin can access this page.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Admin Access Management</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Create backend admins, map wallet addresses, and control status.
        </p>
      </div>

      <form onSubmit={createAdmin} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input
          type="number"
          min={1}
          value={createForm.companyId}
          onChange={(e) => setCreateForm((p) => ({ ...p, companyId: e.target.value }))}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
          placeholder="Company ID"
          required
        />
        <input
          type="email"
          value={createForm.email}
          onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={createForm.password}
          onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
          placeholder="Password"
          required
        />
        <select
          value={createForm.role}
          onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
        >
          {roles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <input
          type="text"
          value={createForm.walletAddress}
          onChange={(e) => setCreateForm((p) => ({ ...p, walletAddress: e.target.value }))}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
          placeholder="Wallet (optional)"
        />
        <div className="md:col-span-5">
          <button className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700" type="submit">
            Create Admin
          </button>
        </div>
      </form>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
            placeholder="Filter by Company ID"
          />
          <button className="px-3 py-2 rounded-lg border" onClick={loadAdmins} type="button">Apply</button>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-200 dark:border-slate-700">
                <th className="py-2">ID</th>
                <th className="py-2">Company</th>
                <th className="py-2">Email</th>
                <th className="py-2">Role</th>
                <th className="py-2">Wallet</th>
                <th className="py-2">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="py-3" colSpan={7}>Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="py-3" colSpan={7}>No admins found</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800 align-top">
                  <td className="py-2">{row.id}</td>
                  <td className="py-2">{row.company_id ?? "GLOBAL"}{row.company_name ? ` (${row.company_name})` : ""}</td>
                  <td className="py-2">{row.email}</td>
                  <td className="py-2">{row.role}</td>
                  <td className="py-2 min-w-[280px]">
                    <input
                      type="text"
                      value={walletForm[row.id] || ""}
                      onChange={(e) => setWalletForm((p) => ({ ...p, [row.id]: e.target.value }))}
                      className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                      placeholder="0x..."
                    />
                  </td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${row.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <button className="px-2 py-1 rounded border" type="button" onClick={() => updateWallet(row.id)}>
                        Save Wallet
                      </button>
                      <button className="px-2 py-1 rounded border" type="button" onClick={() => toggleStatus(row)}>
                        {row.status === "active" ? "Block" : "Unblock"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
