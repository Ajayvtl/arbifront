"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";
import { 
  MessageSquare, Clock, Filter, Search, 
  ChevronRight, CheckCircle2, AlertCircle, Loader2,
  User, Shield, Laptop, HardDrive
} from "lucide-react";
import toast from "react-hot-toast";

interface Ticket {
  id: number;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  creator_name: string;
  creator_role: string;
  message_count: number;
}

export default function AdminSupportMembersPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchTickets = async () => {
    try {
      const res = await api.get("/support/tickets", {
        params: { status: statusFilter === "all" ? undefined : statusFilter }
      });
      setTickets(res.data?.data || []);
    } catch (error) {
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "in_progress": return "text-sky-400 bg-sky-500/10 border-sky-500/20";
      case "awaiting_reply": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "resolved": return "text-slate-400 bg-slate-500/10 border-slate-500/20";
      case "closed": return "text-rose-400 bg-rose-500/10 border-rose-500/20";
      default: return "text-slate-500 bg-slate-500/10 border-slate-500/20";
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.subject.toLowerCase().includes(search.toLowerCase()) || 
    t.creator_name.toLowerCase().includes(search.toLowerCase()) ||
    t.id.toString().includes(search)
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Support Management</h1>
          <p className="text-sm text-slate-400">Resolve member inquiries and track ticket status.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, Subject, User..."
              className="pl-10 pr-4 py-2 rounded-xl border border-slate-800 bg-slate-900 text-sm text-white focus:border-emerald-500 focus:outline-none transition w-full md:w-64"
            />
          </div>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Open", count: tickets.filter(t => t.status === 'open').length, color: "text-emerald-400", bg: "bg-emerald-400/10" },
          { label: "In Progress", count: tickets.filter(t => t.status === 'in_progress').length, color: "text-sky-400", bg: "bg-sky-400/10" },
          { label: "Awaiting Reply", count: tickets.filter(t => t.status === 'awaiting_reply').length, color: "text-amber-400", bg: "bg-amber-400/10" },
          { label: "Resolved", count: tickets.filter(t => t.status === 'resolved').length, color: "text-slate-400", bg: "bg-slate-400/10" },
        ].map(stat => (
          <div key={stat.label} className={`rounded-2xl border border-slate-800 bg-slate-900 p-4 ${stat.bg}`}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.count}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {["all", "open", "in_progress", "awaiting_reply", "resolved", "closed"].map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition ${
              statusFilter === f 
                ? "bg-emerald-600 border-emerald-500 text-white" 
                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1).replace("_", " ")}
          </button>
        ))}
      </div>

      {/* ── Ticket List ────────────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-800/50 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                <th className="px-6 py-4">Ticket & User</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Activity</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="group hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 font-bold border border-slate-700">
                        #{ticket.id}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition">{ticket.subject}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {ticket.creator_role === 'USER' ? (
                            <User className="h-3 w-3 text-slate-500" />
                          ) : (
                            <Shield className="h-3 w-3 text-sky-500" />
                          )}
                          <span className="text-[11px] text-slate-500 font-mono">{ticket.creator_name}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold text-slate-300 capitalize">{ticket.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      ticket.priority === 'critical' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                      ticket.priority === 'high' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                      'bg-slate-500/10 border-slate-500/20 text-slate-400'
                    } uppercase tracking-wider`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusColor(ticket.status)}`}>
                      {ticket.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <Clock className="h-3 w-3" />
                        {new Date(ticket.updated_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-500/80">
                        <MessageSquare className="h-3 w-3" />
                        {ticket.message_count} replies
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/support/${ticket.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-600 transition-all border border-slate-700 hover:border-emerald-500"
                    >
                      Manage
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTickets.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-slate-500 text-sm">No tickets found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
