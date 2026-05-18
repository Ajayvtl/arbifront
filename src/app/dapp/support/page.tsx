"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Plus, MessageSquare, Clock, CheckCircle2, AlertCircle, 
  Send, ChevronLeft, ChevronRight, Loader2, Search, Filter, Paperclip
} from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface Message {
  id: number;
  sender_role: string;
  sender_name: string;
  message: string;
  created_at: string;
}

interface Ticket {
  id: number;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  messages?: Message[];
}

export default function DappSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  // New Ticket Form
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [initialMessage, setInitialMessage] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchTickets = async () => {
    try {
      const res = await api.get("/support/tickets");
      setTickets(res.data?.data || []);
    } catch (error) {
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetails = async (id: number) => {
    try {
      const res = await api.get(`/support/tickets/${id}`);
      const { ticket, messages } = res.data?.data || {};
      setSelectedTicket({ ...ticket, messages });
      scrollToBottom();
    } catch (error) {
      toast.error("Failed to load ticket details");
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !initialMessage) {
      toast.error("Subject and message are required");
      return;
    }

    setIsSending(true);
    try {
      await api.post("/support/tickets", {
        subject,
        category,
        priority,
        message: initialMessage
      });
      toast.success("Ticket created successfully");
      setSubject("");
      setInitialMessage("");
      setShowCreateForm(false);
      fetchTickets();
    } catch (error) {
      toast.error("Failed to create ticket");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;

    const ticketId = selectedTicket.id;
    setIsSending(true);
    try {
      await api.post(`/support/tickets/${ticketId}/reply`, {
        message: replyMessage
      });
      setReplyMessage("");
      fetchTicketDetails(ticketId);
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "in_progress": return "text-sky-400 bg-sky-500/10 border-sky-500/20";
      case "awaiting_reply": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "resolved": return "text-slate-400 bg-slate-500/10 border-slate-500/20";
      default: return "text-slate-500 bg-slate-500/10 border-slate-500/20";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#5bbcff]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Support Center</h1>
          <p className="text-sm text-slate-400">Need help? Our team is here for you.</p>
        </div>
        {!selectedTicket && !showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 rounded-2xl bg-[#5bbcff] px-4 py-2.5 text-sm font-bold text-[#060b14] transition hover:bg-[#4aa3e0]"
          >
            <Plus className="h-4 w-4" />
            New Ticket
          </button>
        )}
      </div>

      {/* ── Content ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* CREATE FORM */}
        {showCreateForm ? (
          <div className="rounded-3xl border border-[#123a62] bg-[#0d1726] p-6 shadow-xl">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setShowCreateForm(false)} className="p-2 rounded-xl bg-slate-800/50 text-slate-400 hover:text-white transition">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-semibold text-white">Create New Ticket</h2>
            </div>
            
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subject</label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Deposit not showing"
                    className="w-full rounded-2xl border border-[#1e2d40] bg-[#09111c] px-4 py-3 text-sm text-white focus:border-[#5bbcff] focus:outline-none transition"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-2xl border border-[#1e2d40] bg-[#09111c] px-4 py-3 text-sm text-white focus:border-[#5bbcff] focus:outline-none transition"
                    >
                      <option value="general">General</option>
                      <option value="billing">Billing</option>
                      <option value="technical">Technical</option>
                      <option value="account">Account</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full rounded-2xl border border-[#1e2d40] bg-[#09111c] px-4 py-3 text-sm text-white focus:border-[#5bbcff] focus:outline-none transition"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Message</label>
                <textarea
                  rows={5}
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  className="w-full rounded-2xl border border-[#1e2d40] bg-[#09111c] px-4 py-3 text-sm text-white focus:border-[#5bbcff] focus:outline-none transition resize-none"
                />
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSending}
                  className="flex items-center gap-2 rounded-2xl bg-[#5bbcff] px-8 py-3 text-sm font-bold text-[#060b14] transition hover:bg-[#4aa3e0] disabled:opacity-50"
                >
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        ) : selectedTicket ? (
          /* CHAT INTERFACE */
          <div className="flex flex-col rounded-3xl border border-[#123a62] bg-[#0d1726] shadow-xl overflow-hidden min-h-[600px]">
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b border-[#1e2d40] px-6 py-4 bg-[#09111c]/50">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedTicket(null)} className="p-2 rounded-xl bg-slate-800/50 text-slate-400 hover:text-white transition">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-white">{selectedTicket.subject}</h2>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusColor(selectedTicket.status)}`}>
                      {selectedTicket.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Ticket #{selectedTicket.id} · {selectedTicket.category}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
              {selectedTicket.messages?.map((msg) => {
                const isUser = msg.sender_role === 'USER';
                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-4 ${
                      isUser 
                        ? 'bg-[#5bbcff] text-[#060b14] rounded-tr-none' 
                        : 'bg-[#1e2d40] text-slate-200 rounded-tl-none border border-[#304156]'
                    }`}>
                      {!isUser && <p className="text-[10px] font-bold uppercase tracking-widest text-[#5bbcff] mb-1">Support Team</p>}
                      <p className="text-sm leading-relaxed">{msg.message}</p>
                      <p className={`text-[9px] mt-2 font-medium ${isUser ? 'text-[#060b14]/60' : 'text-slate-500'}`}>
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            {selectedTicket.status !== 'closed' && (
              <form onSubmit={handleSendReply} className="border-t border-[#1e2d40] p-4 bg-[#09111c]/80 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <button type="button" className="p-2.5 rounded-2xl border border-[#1e2d40] bg-[#0d1726] text-slate-400 hover:text-white transition">
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <input
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your reply..."
                    className="flex-1 rounded-2xl border border-[#1e2d40] bg-[#0d1726] px-4 py-2.5 text-sm text-white focus:border-[#5bbcff] focus:outline-none transition"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !replyMessage.trim()}
                    className="inline-flex items-center justify-center h-10 w-10 rounded-2xl bg-[#5bbcff] text-[#060b14] transition hover:bg-[#4aa3e0] disabled:opacity-50"
                  >
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* TICKET LIST */
          <div className="space-y-4">
            {tickets.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#123a62] p-12 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-[#123a62]/20 flex items-center justify-center mb-4">
                  <MessageSquare className="h-8 w-8 text-[#5bbcff]" />
                </div>
                <h3 className="text-lg font-semibold text-white">No tickets yet</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                  When you have questions or need assistance, your support tickets will appear here.
                </p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="mt-6 text-sm font-bold text-[#5bbcff] hover:underline"
                >
                  Create your first ticket
                </button>
              </div>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => fetchTicketDetails(ticket.id)}
                  className="group relative rounded-3xl border border-[#123a62] bg-[#0d1726] p-5 cursor-pointer transition-all hover:bg-[#122033] hover:border-[#5bbcff]/30 shadow-lg hover:shadow-[#5bbcff]/5"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-2xl ${getStatusColor(ticket.status)} border shrink-0`}>
                        <MessageSquare className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-white group-hover:text-[#5bbcff] transition">
                            {ticket.subject}
                          </h3>
                          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getStatusColor(ticket.status)}`}>
                            {ticket.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">{ticket.category}</p>
                          <span className="h-1 w-1 rounded-full bg-slate-700" />
                          <p className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(ticket.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-0 border-[#1e2d40] pt-4 md:pt-0">
                      <div className="text-left md:text-right">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Priority</p>
                        <p className={`text-xs font-bold ${
                          ticket.priority === 'critical' ? 'text-rose-400' : 
                          ticket.priority === 'high' ? 'text-amber-400' : 'text-slate-300'
                        } capitalize`}>
                          {ticket.priority}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 rounded-2xl bg-slate-900/50 px-3 py-1.5 border border-[#1e2d40]">
                        <span className="text-xs font-bold text-[#5bbcff]">{ticket.message_count}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">replies</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-[#5bbcff] group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Help Quick Links ────────────────────────────────────────── */}
      {!selectedTicket && !showCreateForm && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-[#123a62]">
          <div className="rounded-2xl border border-[#1e2d40] bg-[#0d1726]/40 p-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-1">Knowledge Base</h4>
            <p className="text-[11px] text-slate-500">Self-help guides and tutorials for all platform features.</p>
          </div>
          <div className="rounded-2xl border border-[#1e2d40] bg-[#0d1726]/40 p-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-1">Security Tips</h4>
            <p className="text-[11px] text-slate-500">Learn how to keep your account and funds secure.</p>
          </div>
          <div className="rounded-2xl border border-[#1e2d40] bg-[#0d1726]/40 p-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-1">API Docs</h4>
            <p className="text-[11px] text-slate-500">Developer resources for custom integrations.</p>
          </div>
        </div>
      )}
    </div>
  );
}
