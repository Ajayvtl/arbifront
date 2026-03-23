"use client";
import { Button } from "@/components/ui/Button";

export default function OperationsPage() {
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">System Operations</h1>
            <p className="text-gray-500 mb-6">Monitor queues, cache, and system health.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow border border-emerald-200 dark:border-emerald-900/30">
                    <h3 className="font-bold text-lg mb-2 text-emerald-600">Cache Status</h3>
                    <p className="text-3xl font-bold">Healthy</p>
                    <p className="text-sm text-gray-400">Redis Connection: Active</p>
                </div>
                <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow border border-blue-200 dark:border-blue-900/30">
                    <h3 className="font-bold text-lg mb-2 text-blue-600">Job Queues</h3>
                    <p className="text-3xl font-bold">0</p>
                    <p className="text-sm text-gray-400">Pending Jobs</p>
                </div>
            </div>
        </div>
    );
}
