"use client";

import { ChainProfileManager } from "@/components/admin/ChainProfileManager";
import { useAuth } from "@/context/AuthContext";
import { hasDeveloperScope } from "@/lib/companyRoleScope";

export default function CompanyNetworkSettingsPage() {
  const { user } = useAuth();
  const canAccess = hasDeveloperScope(user);

  if (!canAccess) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          Access denied for Network Settings.
        </div>
      </div>
    );
  }

  return <ChainProfileManager mode="company" />;
}
