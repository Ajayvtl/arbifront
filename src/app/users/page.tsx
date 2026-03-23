"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Plus, Search, Loader2, User, Shield, Briefcase } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

import { useAuth } from "@/context/AuthContext";

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { user: currentUser } = useAuth();

    useEffect(() => {
        if (currentUser) {
            fetchUsers();
        }
    }, [currentUser]);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            // Filter OUT users/patients (keep only staff/admins)
            const allUsers = response.data.data;
            const staff = allUsers.filter((u: any) => {
                const rName = u.role_name?.toLowerCase();
                // Exclude patients
                if (rName === 'user' || rName === 'patient') return false;

                // Hide Super Admin from non-Super Admin users
                if (currentUser?.role_name !== 'Super Admin' && u.role_name === 'Super Admin') {
                    return false;
                }

                return true;
            });
            setUsers(staff);
        } catch (error) {
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Staff Management</h1>
                    <p className="text-slate-500 dark:text-slate-400">Manage admins, phlebotomists, and other staff</p>
                </div>
                <Link href="/users/create" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20">
                    <Plus size={18} />
                    Add Staff
                </Link>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search staff..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableHead>Name</TableHead>
                            <TableHead>Job Position & Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300">
                                                <User size={16} />
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-800 dark:text-white">{user.name}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 text-slate-800 dark:text-white font-medium">
                                                <Briefcase size={14} className="text-blue-500" />
                                                {user.job_position_name || 'No Position Linked'}
                                            </div>
                                            {(user.department_name || user.role_name) && (
                                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                    {user.department_name || 'No Dept'} • {user.role_name || 'No Primary Role'}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.is_active ? 'success' : 'danger'}>
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-slate-500 dark:text-slate-400 text-sm">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <button className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium text-sm">Edit</button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
}
