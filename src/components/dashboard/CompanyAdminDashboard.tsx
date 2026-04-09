"use client";

import Link from "next/link";
import {
  Activity,
  BarChart3,
  FileText,
  Shield,
  ShoppingBag,
  Users,
} from "lucide-react";

const metricCards = [
  { title: "Active Distributors", value: "3,248", delta: "+8.4%", icon: Users },
  { title: "Commission Liability", value: "$82,490", delta: "+5.1%", icon: FileText },
  { title: "Pending KYC", value: "94", delta: "-12 today", icon: Shield },
  { title: "New Enrollments", value: "186", delta: "+21 this week", icon: Activity },
];

const quickModules = [
  { name: "Member Registry", href: "/admin/company/members", icon: Users },
  { name: "Genealogy Control", href: "/admin/company/network", icon: Activity },
  { name: "Commission Runs", href: "/admin/company/commissions", icon: FileText },
  { name: "Payout Queue", href: "/admin/company/payouts", icon: BarChart3 },
  { name: "Plan Catalog", href: "/admin/company/plans", icon: ShoppingBag },
  { name: "KYC Review", href: "/admin/company/kyc", icon: Shield },
];

export default function CompanyAdminDashboard() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 p-6 md:p-8 text-white">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">MLM Company Control</p>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold">Company Admin Command Center</h1>
          <p className="mt-2 text-sm text-slate-300 max-w-2xl">
            Monitor distributor growth, compensation health, payout risks, and compliance from a single operational dashboard.
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.title} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500 dark:text-slate-400">{card.title}</p>
                  <Icon className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{card.value}</p>
                <p className="mt-1 text-xs text-emerald-600">{card.delta}</p>
              </article>
            );
          })}
        </section>

        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 md:p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Operational Modules</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Core areas used daily by MLM company admins.</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {quickModules.map((module) => {
              const Icon = module.icon;
              return (
                <Link
                  key={module.name}
                  href={module.href}
                  className="group rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-slate-100 dark:bg-slate-900 p-2 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 transition-colors">
                      <Icon className="h-4 w-4 text-slate-700 dark:text-slate-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-300" />
                    </div>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{module.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
