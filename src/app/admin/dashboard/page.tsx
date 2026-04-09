"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import UniversalDashboard from "@/components/dashboard/UniversalDashboard";
import CompanyAdminDashboard from "@/components/dashboard/CompanyAdminDashboard";

export default function SuperAdminDashboard() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && user?.role_id !== 1) {
            // router.push('/dashboard'); // Kick non-super admins out? Or let UniversalDashboard handle "No Config"
        }
    }, [user, isLoading, router]);

    if (isLoading) return <div>Loading...</div>;
    if (user?.role === "COMPANY_ADMIN") return <CompanyAdminDashboard />;

    return <UniversalDashboard />;
}

