"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import UniversalDashboard from '@/components/dashboard/UniversalDashboard';
import { Users, Clock, Calendar, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

export default function HRDashboard() {
    const { user, currentHotel, isLoading } = useAuth();
    const [stats, setStats] = useState<any>(null);

    // Context: System vs Hotel
    const isSystemContext = !currentHotel && user?.role_id === 1;

    useEffect(() => {
        if (!isLoading) {
            fetchStats();
        }
    }, [isLoading, currentHotel]);

    const fetchStats = async () => {
        try {
            const endpoint = isSystemContext ? '/system/hr/stats' : '/hr/stats';
            // Mocking response for now until backend is fully ready
            // const res = await api.get(endpoint);
            // setStats(res.data);

            // Mock Data
            if (isSystemContext) {
                setStats({
                    total_employees: 1250,
                    active_tenants: 45,
                    pending_compliance: 3
                });
            } else {
                setStats({
                    total_employees: 42,
                    on_duty: 12,
                    leaves_pending: 2
                });
            }

        } catch (error) {
            console.error("Failed to fetch HR stats", error);
        }
    };

    if (isLoading) return <div>Loading...</div>;

    if (isSystemContext) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold mb-6">Global HR Overview</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatCard title="Total Employees" value={stats?.total_employees} icon={<Users />} color="blue" />
                    <StatCard title="Active Tenants" value={stats?.active_tenants} icon={<Calendar />} color="green" />
                    <StatCard title="Compliance Alerts" value={stats?.pending_compliance} icon={<AlertCircle />} color="red" />
                </div>
                {/* Reusing Universal Dashboard for the rest */}
                <UniversalDashboard source="system_hr" />
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">HR Management - {currentHotel?.hotel_name}</h1>
                <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Add Employee</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard title="Staff On Duty" value={stats?.on_duty} icon={<Users />} color="emerald" />
                <StatCard title="Total Staff" value={stats?.total_employees} icon={<Users />} color="slate" />
                <StatCard title="Pending Leaves" value={stats?.leaves_pending} icon={<Clock />} color="orange" />
                <StatCard title="Shift Issues" value={0} icon={<AlertCircle />} color="red" />
            </div>

            {/* Main Content: Tabs or Grid Menu */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <MenuCard title="Employee Directory" description="Manage staff profiles and documents" href="/hr/employees" />
                <MenuCard title="Shift Management" description="Schedule shifts and rosters" href="/hr/shifts" />
                <MenuCard title="Payroll" description="Process salaries and payslips" href="/hr/payroll" />
                <MenuCard title="Leave Requests" description="Approve or reject leave applications" href="/hr/leaves" />
                <MenuCard title="Performance" description="Reviews and appraisals" href="/hr/performance" />
                <MenuCard title="Recruitment" description="Job postings and applicants" href="/hr/recruitment" />
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color }: any) {
    const colors: any = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        red: 'bg-red-50 text-red-600',
        orange: 'bg-orange-50 text-orange-600',
        slate: 'bg-slate-50 text-slate-600',
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-slate-500 text-sm font-medium">{title}</p>
                    <h3 className="text-3xl font-bold mt-2 text-slate-800 dark:text-white">{value}</h3>
                </div>
                <div className={`p-3 rounded-lg ${colors[color] || colors.slate}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

function MenuCard({ title, description, href }: any) {
    return (
        <a href={href} className="block group p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-colors">
            <h3 className="font-bold text-lg mb-2 group-hover:text-indigo-600">{title}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{description}</p>
        </a>
    );
}
