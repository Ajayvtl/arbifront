"use client";

import { Users, DollarSign, TrendingUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

export default function ReferralsPage() {
    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Referral Program</h1>
                <p className="text-slate-500 dark:text-slate-400">Track user referrals and earnings</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Total Referrals</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">1,248</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Total Earnings</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">$12,450</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Conversion Rate</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">18.5%</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                    <h2 className="font-bold text-slate-800 dark:text-white">Recent Referrals</h2>
                </div>
                <Table>
                    <TableHeader>
                        <TableHead>Referred By</TableHead>
                        <TableHead>New User</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reward</TableHead>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-medium text-slate-800 dark:text-white">John Doe</TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-400">Alice Smith</TableCell>
                            <TableCell className="text-slate-500 dark:text-slate-400">Dec 1, 2025</TableCell>
                            <TableCell><Badge variant="success">Converted</Badge></TableCell>
                            <TableCell className="font-bold text-emerald-600 dark:text-emerald-400">$20.00</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium text-slate-800 dark:text-white">Jane Roe</TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-400">Bob Jones</TableCell>
                            <TableCell className="text-slate-500 dark:text-slate-400">Nov 30, 2025</TableCell>
                            <TableCell><Badge variant="warning">Pending</Badge></TableCell>
                            <TableCell className="font-bold text-slate-400">$0.00</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
