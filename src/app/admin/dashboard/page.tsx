"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const CompanyAdminDashboard = dynamic(
  () => import("@/components/dashboard/CompanyAdminDashboard"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#060c14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-emerald-500 animate-spin" style={{ borderTopColor: "transparent" }} />
          </div>
          <p className="text-slate-400 text-sm">Fetching live analytics…</p>
        </div>
      </div>
    )
  }
);

const ADMIN_ROLES = ["SUPER_ADMIN", "COMPANY_ADMIN", "FINANCE_ADMIN", "SUPPORT_ADMIN"];

export default function AdminDashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && (!user || !ADMIN_ROLES.includes(user.role || ""))) {
      router.replace("/login");
    }
  }, [user, isLoading, router, mounted]);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-[#060c14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-emerald-500 animate-spin" style={{ borderTopColor: "transparent" }} />
          </div>
          <p className="text-slate-400 text-sm">Loading session…</p>
        </div>
      </div>
    );
  }

  if (!user || !ADMIN_ROLES.includes(user.role || "")) {
    return null;
  }

  return <CompanyAdminDashboard />;
}
