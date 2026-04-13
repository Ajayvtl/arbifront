"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import CompanyAdminDashboard from "@/components/dashboard/CompanyAdminDashboard";
import { Loader2 } from "lucide-react";

const ADMIN_ROLES = ["SUPER_ADMIN", "COMPANY_ADMIN", "FINANCE_ADMIN", "SUPPORT_ADMIN"];

export default function AdminDashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || !ADMIN_ROLES.includes(user.role || ""))) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!user || !ADMIN_ROLES.includes(user.role || "")) {
    return null;
  }

  return <CompanyAdminDashboard />;
}
