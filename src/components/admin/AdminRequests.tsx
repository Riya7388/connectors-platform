import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../supabase";
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  User,
  Mail,
  Calendar,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Inbox,
  Flame,
  ArrowUpDown
} from "lucide-react";

export interface AdminBookingRequest {
  id: string;
  created_at: string;
  status: string;
  initial_message: string | null;
  confirmed_date?: string | null;
  confirmed_time?: string | null;
  confirmed_duration_minutes?: number | null;
  requested_duration_minutes?: number | null;
  payment_status?: string | null;
  amount_due?: number | null;
  expires_at?: string | null;
  updated_at?: string | null;
  mentor_id: string;
  mentor_name: string;
  mentor_photo?: string | null;
  student_id: string;
  student_email: string | null;
  student_name: string | null;
}

interface MentorSummary {
  mentor_id: string;
  mentor_name: string;
  mentor_photo: string | null;
  total_requests: number;
  pending_count: number;
  completed_count: number;
  accepted_count: number;
  confirmed_count: number;
  declined_count: number;
  oldest_pending_at: string | null;
  oldest_pending_age: string;
  is_highlighted: boolean; // pending > 0 && completed === 0
}

function formatAge(dateStr: string | null): string {
  if (!dateStr) return "None";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  if (diffMs < 0) return "Just now";

  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays >= 1) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""}`;
  }
  if (diffHours >= 1) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""}`;
  }
  if (diffMins >= 1) {
    return `${diffMins} min${diffMins > 1 ? "s" : ""}`;
  }
  return "Just now";
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return dateStr;
  }
}

export const AdminRequests: React.FC = () => {
  const [requests, setRequests] = useState<AdminBookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Search for requests list
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMentorId, setSelectedMentorId] = useState<string | null>(null);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setErrorMsg(null);
    try {
      // 1. Try calling the SECURITY DEFINER RPC function
      const { data, error } = await supabase.rpc("get_admin_booking_requests");

      if (!error && Array.isArray(data)) {
        setRequests(data as AdminBookingRequest[]);
        return;
      }

      // 2. Fallback in case RPC is not yet created or direct query is needed
      console.warn("RPC get_admin_booking_requests failed, falling back to direct table query:", error?.message);
      
      const { data: bData, error: bErr } = await supabase
        .from("booking_requests")
        .select(`
          id,
          created_at,
          status,
          initial_message,
          confirmed_date,
          confirmed_time,
          confirmed_duration_minutes,
          requested_duration_minutes,
          payment_status,
          amount_due,
          expires_at,
          updated_at,
          mentor_id,
          student_id
        `)
        .order("created_at", { ascending: false });

      if (bErr) throw bErr;

      const rawBookings = bData || [];
      if (rawBookings.length === 0) {
        setRequests([]);
        return;
      }

      // Fetch mentors
      const mentorIds = [...new Set(rawBookings.map((b: any) => b.mentor_id).filter(Boolean))];
      const { data: mentorsData } = await supabase
        .from("mentors")
        .select("id, full_name, profile_photo_url")
        .in("id", mentorIds);

      const mentorsMap: Record<string, { full_name: string; profile_photo_url: string | null }> = {};
      (mentorsData || []).forEach((m: any) => {
        mentorsMap[m.id] = m;
      });

      const mapped: AdminBookingRequest[] = rawBookings.map((b: any) => ({
        ...b,
        mentor_name: mentorsMap[b.mentor_id]?.full_name || "Unknown Mentor",
        mentor_photo: mentorsMap[b.mentor_id]?.profile_photo_url || null,
        student_name: "Student (" + (b.student_id ? b.student_id.slice(0, 8) : "N/A") + ")",
        student_email: null
      }));

      setRequests(mapped);
    } catch (err: any) {
      console.error("Error loading admin requests:", err);
      setErrorMsg(
        err.message ||
        "Failed to load booking requests. Make sure the 'get_admin_booking_requests' function has been created in Supabase SQL Editor."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  // ---------------------------------------------------------------------------
  // 1. Per-Mentor Summary calculation
  // ---------------------------------------------------------------------------
  const mentorSummaries: MentorSummary[] = useMemo(() => {
    const map: Record<
      string,
      {
        mentor_id: string;
        mentor_name: string;
        mentor_photo: string | null;
        total: number;
        pending: number;
        completed: number;
        accepted: number;
        confirmed: number;
        declined: number;
        oldest_pending_at: string | null;
      }
    > = {};

    requests.forEach((req) => {
      const mid = req.mentor_id || "unknown";
      if (!map[mid]) {
        map[mid] = {
          mentor_id: mid,
          mentor_name: req.mentor_name || "Unknown Mentor",
          mentor_photo: req.mentor_photo || null,
          total: 0,
          pending: 0,
          completed: 0,
          accepted: 0,
          confirmed: 0,
          declined: 0,
          oldest_pending_at: null
        };
      }

      map[mid].total += 1;
      const st = req.status;

      if (st === "pending") {
        map[mid].pending += 1;
        if (
          !map[mid].oldest_pending_at ||
          new Date(req.created_at).getTime() < new Date(map[mid].oldest_pending_at!).getTime()
        ) {
          map[mid].oldest_pending_at = req.created_at;
        }
      } else if (st === "completed") {
        map[mid].completed += 1;
      } else if (st === "accepted") {
        map[mid].accepted += 1;
      } else if (st === "time_confirmed") {
        map[mid].confirmed += 1;
      } else if (st === "declined") {
        map[mid].declined += 1;
      }
    });

    const list = Object.values(map).map((m) => ({
      mentor_id: m.mentor_id,
      mentor_name: m.mentor_name,
      mentor_photo: m.mentor_photo,
      total_requests: m.total,
      pending_count: m.pending,
      completed_count: m.completed,
      accepted_count: m.accepted,
      confirmed_count: m.confirmed,
      declined_count: m.declined,
      oldest_pending_at: m.oldest_pending_at,
      oldest_pending_age: formatAge(m.oldest_pending_at),
      is_highlighted: m.pending > 0 && m.completed === 0
    }));

    // Sort by most pending first; if tied, oldest pending first
    list.sort((a, b) => {
      if (b.pending_count !== a.pending_count) {
        return b.pending_count - a.pending_count;
      }
      if (a.oldest_pending_at && b.oldest_pending_at) {
        return new Date(a.oldest_pending_at).getTime() - new Date(b.oldest_pending_at).getTime();
      }
      if (a.oldest_pending_at) return -1;
      if (b.oldest_pending_at) return 1;
      return b.total_requests - a.total_requests;
    });

    return list;
  }, [requests]);

  // Total summary metrics
  const totalStats = useMemo(() => {
    let pending = 0;
    let completed = 0;
    let confirmed = 0;
    let accepted = 0;
    let declined = 0;
    let highlightedMentors = 0;

    requests.forEach((r) => {
      if (r.status === "pending") pending++;
      else if (r.status === "completed") completed++;
      else if (r.status === "time_confirmed") confirmed++;
      else if (r.status === "accepted") accepted++;
      else if (r.status === "declined") declined++;
    });

    mentorSummaries.forEach((m) => {
      if (m.is_highlighted) highlightedMentors++;
    });

    return {
      total: requests.length,
      pending,
      completed,
      confirmed,
      accepted,
      declined,
      highlightedMentors
    };
  }, [requests, mentorSummaries]);

  // ---------------------------------------------------------------------------
  // 2. Filtered list of requests
  // ---------------------------------------------------------------------------
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // Mentor filter
      if (selectedMentorId && r.mentor_id !== selectedMentorId) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "pending" && r.status !== "pending") return false;
        if (statusFilter === "accepted" && r.status !== "accepted") return false;
        if (statusFilter === "time_confirmed" && r.status !== "time_confirmed") return false;
        if (statusFilter === "completed" && r.status !== "completed") return false;
        if (statusFilter === "declined" && r.status !== "declined") return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesMentor = (r.mentor_name || "").toLowerCase().includes(q);
        const matchesStudent = (r.student_name || "").toLowerCase().includes(q);
        const matchesEmail = (r.student_email || "").toLowerCase().includes(q);
        const matchesMessage = (r.initial_message || "").toLowerCase().includes(q);
        const matchesStatus = (r.status || "").toLowerCase().includes(q);
        return matchesMentor || matchesStudent || matchesEmail || matchesMessage || matchesStatus;
      }

      return true;
    });
  }, [requests, selectedMentorId, statusFilter, searchTerm]);

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock size={12} /> Pending
          </span>
        );
      case "accepted":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <CheckCircle2 size={12} /> Accepted
          </span>
        );
      case "time_confirmed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/30">
            <CheckCircle2 size={12} /> Confirmed
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <CheckCircle2 size={12} /> Completed
          </span>
        );
      case "declined":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/30">
            <XCircle size={12} /> Declined
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-[#1C1C21] text-[#A1A1AA] border border-[rgba(255,255,255,0.08)]">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-[#A1A1AA] animate-pulse">Loading mentorship requests & mentor summaries...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.08)] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-[rgba(255,45,143,0.15)] text-[#FF2D8F] border border-[rgba(255,45,143,0.3)]">
              Requests & Backlog
            </span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight mt-1 text-white flex items-center gap-2">
            <Inbox size={24} className="text-[#FF9D2E]" /> Mentorship Requests
          </h2>
          <p className="text-sm text-[#A1A1AA] mt-1">
            Monitor mentor response activity, pending backlogs, and individual session requests across the platform.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#1C1C21] text-white hover:bg-[#25252b] border border-[rgba(255,255,255,0.12)] transition-colors shrink-0 disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Unable to fetch complete request details</p>
            <p className="text-xs text-red-300/80">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-[#141417] p-4 rounded-xl border border-[rgba(255,255,255,0.08)] space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">Total Requests</span>
          <p className="text-2xl font-extrabold text-white">{totalStats.total}</p>
        </div>
        <div className="bg-[#141417] p-4 rounded-xl border border-[rgba(255,255,255,0.08)] space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Pending</span>
          <p className="text-2xl font-extrabold text-amber-400">{totalStats.pending}</p>
        </div>
        <div className="bg-[#141417] p-4 rounded-xl border border-[rgba(255,255,255,0.08)] space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Accepted</span>
          <p className="text-2xl font-extrabold text-blue-400">{totalStats.accepted}</p>
        </div>
        <div className="bg-[#141417] p-4 rounded-xl border border-[rgba(255,255,255,0.08)] space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-green-400">Confirmed</span>
          <p className="text-2xl font-extrabold text-green-400">{totalStats.confirmed}</p>
        </div>
        <div className="bg-[#141417] p-4 rounded-xl border border-[rgba(255,255,255,0.08)] space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">Completed</span>
          <p className="text-2xl font-extrabold text-purple-400">{totalStats.completed}</p>
        </div>
        <div className="bg-[#141417] p-4 rounded-xl border border-[rgba(255,255,255,0.08)] space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Zero-Done Alert</span>
          <p className="text-2xl font-extrabold text-rose-400">{totalStats.highlightedMentors}</p>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 1: PER-MENTOR SUMMARY */}
      {/* ===================================================================== */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <User size={18} className="text-[#FF9D2E]" /> Per-Mentor Summary
            </h3>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Ranked by most pending requests. Rows highlighted in amber indicate mentors with pending requests who have not yet completed any session.
            </p>
          </div>
          {selectedMentorId && (
            <button
              onClick={() => setSelectedMentorId(null)}
              className="text-xs font-semibold text-primary hover:underline self-start sm:self-auto"
            >
              Clear mentor filter
            </button>
          )}
        </div>

        {mentorSummaries.length === 0 ? (
          <div className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl p-10 text-center">
            <MessageSquare size={36} className="text-[#71717A] mx-auto mb-3" />
            <p className="text-sm text-white font-bold">No mentor requests found</p>
            <p className="text-xs text-[#A1A1AA] mt-1">When students request sessions, summary analytics will appear here.</p>
          </div>
        ) : (
          <div className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[rgba(255,255,255,0.06)] text-left text-sm">
                <thead className="bg-[#1C1C21]/60 text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
                  <tr>
                    <th scope="col" className="px-6 py-4">Mentor Name</th>
                    <th scope="col" className="px-6 py-4">Total Requests</th>
                    <th scope="col" className="px-6 py-4">Pending</th>
                    <th scope="col" className="px-6 py-4">Completed</th>
                    <th scope="col" className="px-6 py-4">Oldest Pending Age</th>
                    <th scope="col" className="px-6 py-4 text-right">Filter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                  {mentorSummaries.map((m) => {
                    const isSelected = selectedMentorId === m.mentor_id;
                    return (
                      <tr
                        key={m.mentor_id}
                        className={`transition-colors ${
                          m.is_highlighted
                            ? "bg-amber-500/[0.08] hover:bg-amber-500/[0.12] border-l-4 border-l-amber-500"
                            : isSelected
                            ? "bg-[rgba(255,45,143,0.08)] hover:bg-[rgba(255,45,143,0.12)] border-l-4 border-l-[#FF2D8F]"
                            : "hover:bg-[#1C1C21]/40"
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {m.mentor_photo ? (
                              <img
                                src={m.mentor_photo}
                                alt={m.mentor_name}
                                className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-[#1C1C21] border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                {m.mentor_name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white truncate">{m.mentor_name}</span>
                                {m.is_highlighted && (
                                  <span
                                    title="Mentor has pending requests but 0 completed sessions"
                                    className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1"
                                  >
                                    <AlertTriangle size={10} /> Needs Attention
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-white font-semibold">
                          {m.total_requests}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {m.pending_count > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              <Clock size={12} /> {m.pending_count}
                            </span>
                          ) : (
                            <span className="text-xs text-[#71717A]">0</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {m.completed_count > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                              <CheckCircle2 size={12} /> {m.completed_count}
                            </span>
                          ) : (
                            <span className="text-xs text-[#71717A]">0</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {m.pending_count > 0 ? (
                            <span
                              className={`text-xs font-semibold ${
                                m.oldest_pending_age.includes("day")
                                  ? "text-rose-400 font-bold"
                                  : "text-[#A1A1AA]"
                              }`}
                            >
                              {m.oldest_pending_age}
                            </span>
                          ) : (
                            <span className="text-xs text-[#71717A]">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() =>
                              setSelectedMentorId(isSelected ? null : m.mentor_id)
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              isSelected
                                ? "bg-primary text-white border-primary"
                                : "bg-[#1C1C21] text-white hover:bg-[#25252b] border-[rgba(255,255,255,0.12)]"
                            }`}
                          >
                            {isSelected ? "Showing" : "View Requests"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* SECTION 2: ALL REQUESTS LIST */}
      {/* ===================================================================== */}
      <div className="space-y-4 pt-4 border-t border-[rgba(255,255,255,0.08)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <MessageSquare size={18} className="text-[#FF2D8F]" /> All Mentorship Requests ({filteredRequests.length})
            </h3>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Full log of mentorship requests including student identity, timing, and messages.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "All" },
              { id: "pending", label: "Pending" },
              { id: "accepted", label: "Accepted" },
              { id: "time_confirmed", label: "Confirmed" },
              { id: "completed", label: "Completed" },
              { id: "declined", label: "Declined" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  statusFilter === tab.id
                    ? "bg-[#1C1C21] text-white border border-[rgba(255,255,255,0.2)] shadow-sm"
                    : "text-[#71717A] hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Active Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
            <input
              type="text"
              placeholder="Search by mentor, student name, email, or message text..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-xl text-xs sm:text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {selectedMentorId && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] rounded-xl text-xs text-white">
              <span>Filtered by mentor:</span>
              <span className="font-bold text-[#FF9D2E]">
                {mentorSummaries.find((m) => m.mentor_id === selectedMentorId)?.mentor_name || "Selected"}
              </span>
              <button
                onClick={() => setSelectedMentorId(null)}
                className="ml-1 text-[#A1A1AA] hover:text-white"
              >
                <XCircle size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Requests Table */}
        {filteredRequests.length === 0 ? (
          <div className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl p-12 text-center space-y-2">
            <Inbox size={32} className="text-[#71717A] mx-auto mb-2" />
            <p className="text-sm font-bold text-white">No requests match criteria</p>
            <p className="text-xs text-[#A1A1AA]">
              {searchTerm || statusFilter !== "all" || selectedMentorId
                ? "Try clearing your search filters to view all requests."
                : "No session requests have been submitted yet."}
            </p>
          </div>
        ) : (
          <div className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[rgba(255,255,255,0.06)] text-left text-sm">
                <thead className="bg-[#1C1C21]/60 text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
                  <tr>
                    <th scope="col" className="px-6 py-4">Date</th>
                    <th scope="col" className="px-6 py-4">Mentor Name</th>
                    <th scope="col" className="px-6 py-4">Student</th>
                    <th scope="col" className="px-6 py-4">Status</th>
                    <th scope="col" className="px-6 py-4">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                  {filteredRequests.map((req) => {
                    const isExpanded = expandedRequestId === req.id;
                    const msg = req.initial_message || "";
                    const isLongMsg = msg.length > 90;

                    return (
                      <tr key={req.id} className="hover:bg-[#1C1C21]/30 transition-colors">
                        {/* Date */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-[#A1A1AA]">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-[#71717A]" />
                            <span>{formatDate(req.created_at)}</span>
                          </div>
                          {req.confirmed_date && (
                            <div className="text-[11px] text-green-400 mt-1 flex items-center gap-1 font-medium">
                              <Clock size={11} />
                              Confirmed: {req.confirmed_date} {req.confirmed_time || ""}
                            </div>
                          )}
                        </td>

                        {/* Mentor */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            {req.mentor_photo ? (
                              <img
                                src={req.mentor_photo}
                                alt={req.mentor_name}
                                className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-[#1C1C21] border border-white/10 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                                {req.mentor_name ? req.mentor_name.charAt(0).toUpperCase() : "M"}
                              </div>
                            )}
                            <span className="font-semibold text-white text-xs">{req.mentor_name}</span>
                          </div>
                        </td>

                        {/* Student */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <p className="font-semibold text-white text-xs flex items-center gap-1.5">
                              <User size={12} className="text-[#A1A1AA]" />
                              {req.student_name || "Student"}
                            </p>
                            {req.student_email ? (
                              <p className="text-[11px] text-[#A1A1AA] flex items-center gap-1.5">
                                <Mail size={11} className="text-[#71717A]" />
                                {req.student_email}
                              </p>
                            ) : (
                              <p className="text-[10px] text-[#71717A] italic">Email hidden</p>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {renderStatusBadge(req.status)}
                        </td>

                        {/* Message */}
                        <td className="px-6 py-4 max-w-xs text-xs text-[#D4D4D8]">
                          {msg ? (
                            <div>
                              <p className="leading-relaxed">
                                {isExpanded || !isLongMsg ? msg : `${msg.slice(0, 90)}...`}
                              </p>
                              {isLongMsg && (
                                <button
                                  onClick={() =>
                                    setExpandedRequestId(isExpanded ? null : req.id)
                                  }
                                  className="text-[11px] text-primary hover:underline font-semibold mt-1 inline-flex items-center gap-0.5"
                                >
                                  {isExpanded ? (
                                    <>
                                      Show less <ChevronUp size={11} />
                                    </>
                                  ) : (
                                    <>
                                      Read full message <ChevronDown size={11} />
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#71717A] italic">No initial message</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
