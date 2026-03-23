"use client";

import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, PaperAirplaneIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

export default function TicketDetailsPage() {
    const params = useParams();
    const id = params.id;
    const [ticket, setTicket] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [reply, setReply] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchDetails();
    }, [id]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const fetchDetails = async () => {
        try {
            const res = await api.get(`/support/tickets/${id}`);
            setTicket(res.data.data.ticket);
            setMessages(res.data.data.messages);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load ticket details');
        } finally {
            setLoading(false);
        }
    };

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reply.trim()) return;
        setSending(true);

        try {
            await api.post(`/support/tickets/${id}/reply`, { message: reply });
            setReply('');
            fetchDetails(); // Refresh to see new message
        } catch (error) {
            toast.error('Failed to send reply');
        } finally {
            setSending(false);
        }
    };

    const handleClose = async () => {
        if (!confirm('Are you sure you want to close this ticket?')) return;
        try {
            await api.put(`/support/tickets/${id}/status`, { status: 'closed' });
            toast.success('Ticket closed');
            fetchDetails();
        } catch (error) {
            toast.error('Failed to close ticket');
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Discussion...</div>;
    if (!ticket) return <div className="p-8 text-center text-gray-500">Ticket not found</div>;

    const isClosed = ticket.status === 'closed' || ticket.status === 'resolved';

    return (
        <div className="p-8 max-w-5xl mx-auto h-[calc(100vh-64px)] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start mb-6 shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/admin/support" className="text-gray-500 hover:text-gray-900 dark:hover:text-white p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            {ticket.subject}
                            <span className="px-2.5 py-0.5 rounded-full text-sm bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 font-normal">
                                #{ticket.id}
                            </span>
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {ticket.category.toUpperCase()} • Priority: {ticket.priority.toUpperCase()}
                        </p>
                    </div>
                </div>
                {!isClosed && (
                    <button
                        onClick={handleClose}
                        className="text-red-600 hover:text-red-700 text-sm font-medium hover:underline px-4 py-2"
                    >
                        Close Ticket
                    </button>
                )}
                {isClosed && (
                    <div className="flex items-center text-green-600 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg">
                        <CheckCircleIcon className="w-5 h-5 mr-2" />
                        <span className="font-medium">Ticket Closed</span>
                    </div>
                )}
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-gray-50 dark:bg-slate-900 mb-6 rounded-xl border border-gray-200 dark:border-slate-700 overflow-y-auto p-6 space-y-6">
                {messages.map((msg) => {
                    const isMe = msg.sender_type === 'user'; // Or check current user ID if multi-user logic improves
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${isMe
                                    ? 'bg-emerald-600 text-white rounded-br-none'
                                    : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                                }`}>
                                <div className="text-xs opacity-75 mb-1 flex justify-between gap-4">
                                    <span className="font-bold">{msg.sender_name}</span>
                                    <span>{new Date(msg.created_at).toLocaleString()}</span>
                                </div>
                                <div className="whitespace-pre-wrap">{msg.message}</div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {!isClosed ? (
                <div className="shrink-0 bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                    <form onSubmit={handleReply} className="flex gap-4">
                        <textarea
                            rows={2} // initial
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                            placeholder="Type your reply..."
                            value={reply}
                            onChange={e => setReply(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={sending || !reply.trim()}
                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 self-end"
                        >
                            <PaperAirplaneIcon className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            ) : (
                <div className="shrink-0 text-center text-gray-500 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
                    This ticket is closed. You can no longer reply.
                </div>
            )}
        </div>
    );
}
