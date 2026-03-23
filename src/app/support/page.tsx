"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Search, Loader2, MessageSquare, AlertCircle, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

export default function SupportPage() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            const response = await api.get('/support/tickets');
            setTickets(response.data.data);
        } catch (error) {
            // toast.error("Failed to load tickets");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Support Tickets</h1>
                    <p className="text-slate-500 dark:text-slate-400">Resolve user queries and issues</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search tickets..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableHead>Ticket #</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableHeader>
                        <TableBody>
                            {tickets.map((ticket) => (
                                <TableRow key={ticket.id}>
                                    <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400">{ticket.ticket_number}</TableCell>
                                    <TableCell className="font-medium text-slate-800 dark:text-white">{ticket.subject}</TableCell>
                                    <TableCell className="text-slate-600 dark:text-slate-400">User #{ticket.user_id}</TableCell>
                                    <TableCell>
                                        <Badge variant={ticket.priority === 'critical' ? 'danger' : ticket.priority === 'high' ? 'warning' : 'info'}>
                                            {ticket.priority.toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={ticket.status === 'open' ? 'success' : 'neutral'}>
                                            {ticket.status.toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-slate-500 dark:text-slate-400 text-sm">{new Date(ticket.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <button className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium text-sm">Reply</button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {tickets.length === 0 && (
                                <TableRow>
                                    <td colSpan={7} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">No tickets found.</td>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
}
