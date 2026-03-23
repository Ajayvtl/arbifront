"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Loader2, Bell, CheckCheck } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get("/notifications");
            setNotifications(res.data?.data?.list || []);
            setUnreadCount(res.data?.data?.unread || 0);
        } catch (error) {
            toast.error("Failed to load notifications");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const markRead = async (id: number) => {
        try {
            await api.put(`/notifications/${id}/read`);
            fetchData();
        } catch (error) {
            toast.error("Failed to mark notification as read");
        }
    };

    const markAllRead = async () => {
        try {
            await api.put("/notifications/read-all");
            fetchData();
        } catch (error) {
            toast.error("Failed to mark all as read");
        }
    };

    return (
        <div className="p-8 max-w-[1200px] mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Bell size={22} /> Notifications
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Inbox and read status management
                    </p>
                </div>
                <button
                    onClick={markAllRead}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <CheckCheck size={18} />
                    Mark All Read ({unreadCount})
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                {loading ? (
                    <div className="p-10 flex justify-center">
                        <Loader2 className="animate-spin text-emerald-600" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableHead>Title</TableHead>
                            <TableHead>Message</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                        </TableHeader>
                        <TableBody>
                            {notifications.map((item) => (
                                <TableRow
                                    key={item.id}
                                    className={!item.is_read ? "bg-blue-50/40 dark:bg-blue-900/10 cursor-pointer" : "cursor-pointer"}
                                    onClick={() => !item.is_read && markRead(item.id)}
                                >
                                    <TableCell className="font-medium text-slate-800 dark:text-white">{item.title}</TableCell>
                                    <TableCell className="text-slate-500 dark:text-slate-400 max-w-md truncate">{item.message}</TableCell>
                                    <TableCell>
                                        <Badge variant={item.is_read ? "neutral" : "success"}>
                                            {item.is_read ? "Read" : "Unread"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-slate-500 dark:text-slate-400">
                                        {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {notifications.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                                        No notifications found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
}
