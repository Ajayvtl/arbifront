"use client";

import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ReportsDashboard() {
    const router = useRouter();

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Reports & Analytics</h1>
                    <p className="text-slate-500 text-sm">Monitor system performance and trends</p>
                </div>
                <Link href="/reports/builder">
                    <Button className="gap-2">
                        <Plus size={16} /> New Report
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Placeholder for pinned reports */}
                <div className="col-span-full py-12 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    <p>No reports pinned yet. Create your first report!</p>
                    <Link href="/reports/builder" className="mt-4 inline-block text-emerald-600 font-medium hover:underline">Go to Report Builder &rarr;</Link>
                </div>
            </div>
        </div>
    );
}
