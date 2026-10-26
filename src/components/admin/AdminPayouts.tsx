import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import {
  IndianRupee,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Search,
  Loader2,
  X,
  CreditCard,
  Building2,
  Calendar,
  ExternalLink,
  ShieldAlert,
  ArrowRight
} from "lucide-react";

interface PayoutBooking {
  id: string;
  student_id: string;
  mentor_id: string;
  status: string; // 'pending' | 'accepted' | 'time_confirmed' | 'confirmed' | 'completed' | 'cancelled'
  confirmed_date?: string | null;
  confirmed_time?: string | null;
  confirmed_duration_minutes?: number | null;
  amount_due?: number | null;
  payment_status?: string | null;
  platform_fee?: number | null;
  mentor_payout?: number | null;
  payout_status?: "pending" | "paid" | "not_applicable" | null;
  payout_reference?: string | null;
  payout_paid_at?: string | null;
  created_at: string;
  mentor?: {
    id: string;
    full_name: string;
    profile_photo_url?: string | null;
    current_organization?: string | null;
  } | null;
  payout_settings?: {
    commission_percent?: number | null;
    payout_type?: "upi" | "bank" | null;
    upi_id?: string | null;
    bank_account_number?: string | null;
    bank_ifsc?: string | null;
    bank_account_holder?: string | null;
  } | null;
}

interface MentorGroupSummary {
  mentorId: string;
  mentorName: string;
  photoUrl?: string | null;
  currentOrg?: string | null;
  payoutSettings?: PayoutBooking["payout_settings"];
  totalPendingPayout: number;
  totalCompletedPendingPayout: number;
  pendingCount: number;
  completedPendingCount: number;
  pendingBookings: PayoutBooking[];
}

export const AdminPayouts: React.FC = () => {
  const [bookings, setBookings] = useState<PayoutBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State for Single Payout
  const [payoutModalBooking, setPayoutModalBooking] = useState<PayoutBooking | null>(null);
  const [payoutReference, setPayoutReference] = useState("");
  const [submittingPayout, setSubmittingPayout] = useState(false);

  // Modal State for Batch Mentor Payout
  const [batchMentorGroup, setBatchMentorGroup] = useState<MentorGroupSummary | null>(null);
  const [batchReference, setBatchReference] = useState("");
  const [submittingBatch, setSubmittingBatch] = useState(false);

  // Copied state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchPayoutBookings();
  }, []);

  const fetchPayoutBookings = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch bookings that are paid and require or have payout tracking
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("booking_requests")
        .select(`
          id,
          student_id,
          mentor_id,
          status,
          confirmed_date,
          confirmed_time,
          confirmed_duration_minutes,
          amount_due,
          payment_status,
          platform_fee,
          mentor_payout,
          payout_status,
          payout_reference,
          payout_paid_at,
          created_at
        `)
        .eq("payment_status", "paid")
        .in("payout_status", ["pending", "paid"])
        .order("created_at", { ascending: false });

      if (bookingsError) throw bookingsError;

      const rawBookings = bookingsData || [];
      if (rawBookings.length === 0) {
        setBookings([]);
        setLoading(false);
        return;
      }

      // 2. Fetch mentor details for these bookings
      const mentorIds = [...new Set(rawBookings.map((b) => b.mentor_id).filter(Boolean))];
      const { data: mentorsData } = await supabase
        .from("mentors")
        .select("id, full_name, profile_photo_url, current_organization")
        .in("id", mentorIds);

      const mentorsMap: Record<string, any> = {};
      (mentorsData || []).forEach((m) => {
        mentorsMap[m.id] = m;
      });

      // 3. Fetch mentor payout settings (admin-only table)
      const { data: payoutSettingsData } = await supabase
        .from("mentor_payout_settings")
        .select("mentor_id, commission_percent, payout_type, upi_id, bank_account_number, bank_ifsc, bank_account_holder")
        .in("mentor_id", mentorIds);

      const payoutSettingsMap: Record<string, any> = {};
      (payoutSettingsData || []).forEach((s) => {
        payoutSettingsMap[s.mentor_id] = s;
      });

      // 4. Combine data
      const enrichedBookings: PayoutBooking[] = rawBookings.map((b) => ({
        ...b,
        mentor: mentorsMap[b.mentor_id] || null,
        payout_settings: payoutSettingsMap[b.mentor_id] || null,
      }));

      setBookings(enrichedBookings);
    } catch (err: any) {
      console.error("Error fetching payouts:", err);
      setErrorMsg(err.message || "Failed to load payouts data.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Group pending payouts by mentor
  const pendingMentorGroups: MentorGroupSummary[] = React.useMemo(() => {
    const groups: Record<string, MentorGroupSummary> = {};

    bookings
      .filter((b) => b.payout_status === "pending")
      .forEach((b) => {
        const mId = b.mentor_id;
        if (!groups[mId]) {
          groups[mId] = {
            mentorId: mId,
            mentorName: b.mentor?.full_name || "Unknown Mentor",
            photoUrl: b.mentor?.profile_photo_url,
            currentOrg: b.mentor?.current_organization,
            payoutSettings: b.payout_settings,
            totalPendingPayout: 0,
            totalCompletedPendingPayout: 0,
            pendingCount: 0,
            completedPendingCount: 0,
            pendingBookings: [],
          };
        }

        const payoutAmt = Number(b.mentor_payout) || 0;
        groups[mId].totalPendingPayout += payoutAmt;
        groups[mId].pendingCount += 1;
        groups[mId].pendingBookings.push(b);

        if (b.status === "completed") {
          groups[mId].totalCompletedPendingPayout += payoutAmt;
          groups[mId].completedPendingCount += 1;
        }
      });

    return Object.values(groups).sort((a, b) => b.totalPendingPayout - a.totalPendingPayout);
  }, [bookings]);

  // Handle Mark Single Booking as Paid
  const handleOpenSinglePayout = (booking: PayoutBooking) => {
    if (booking.status !== "completed") return;
    setPayoutModalBooking(booking);
    setPayoutReference("");
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSubmitSinglePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutModalBooking) return;
    if (!payoutReference.trim()) {
      setErrorMsg("Payout reference (UTR or UPI transaction ID) is required.");
      return;
    }

    setSubmittingPayout(true);
    setErrorMsg(null);
    try {
      const paidAt = new Date().toISOString();
      const { error } = await supabase
        .from("booking_requests")
        .update({
          payout_status: "paid",
          payout_reference: payoutReference.trim(),
          payout_paid_at: paidAt,
        })
        .eq("id", payoutModalBooking.id);

      if (error) throw error;

      setBookings((prev) =>
        prev.map((b) =>
          b.id === payoutModalBooking.id
            ? {
                ...b,
                payout_status: "paid",
                payout_reference: payoutReference.trim(),
                payout_paid_at: paidAt,
              }
            : b
        )
      );

      setSuccessMsg(`Payout marked as paid for ${payoutModalBooking.mentor?.full_name || "mentor"}!`);
      setPayoutModalBooking(null);
      setPayoutReference("");
    } catch (err: any) {
      console.error("Error updating payout status:", err);
      setErrorMsg(err.message || "Failed to mark session as paid.");
    } finally {
      setSubmittingPayout(false);
    }
  };

  // Handle Batch Payout for a Mentor
  const handleOpenBatchPayout = (group: MentorGroupSummary) => {
    if (group.completedPendingCount === 0) return;
    setBatchMentorGroup(group);
    setBatchReference("");
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSubmitBatchPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchMentorGroup) return;
    if (!batchReference.trim()) {
      setErrorMsg("Payout reference is required for batch payout.");
      return;
    }

    const completedBookings = batchMentorGroup.pendingBookings.filter((b) => b.status === "completed");
    if (completedBookings.length === 0) {
      setErrorMsg("No completed sessions available to pay.");
      return;
    }

    setSubmittingBatch(true);
    setErrorMsg(null);
    try {
      const paidAt = new Date().toISOString();
      const idsToUpdate = completedBookings.map((b) => b.id);

      const { error } = await supabase
        .from("booking_requests")
        .update({
          payout_status: "paid",
          payout_reference: batchReference.trim(),
          payout_paid_at: paidAt,
        })
        .in("id", idsToUpdate);

      if (error) throw error;

      setBookings((prev) =>
        prev.map((b) =>
          idsToUpdate.includes(b.id)
            ? {
                ...b,
                payout_status: "paid",
                payout_reference: batchReference.trim(),
                payout_paid_at: paidAt,
              }
            : b
        )
      );

      setSuccessMsg(
        `Successfully marked ${idsToUpdate.length} completed sessions (₹${batchMentorGroup.totalCompletedPendingPayout.toLocaleString("en-IN")}) as paid for ${batchMentorGroup.mentorName}!`
      );
      setBatchMentorGroup(null);
      setBatchReference("");
    } catch (err: any) {
      console.error("Error in batch payout:", err);
      setErrorMsg(err.message || "Failed to process batch payout.");
    } finally {
      setSubmittingBatch(false);
    }
  };

  // Filtered Bookings for the main table
  const filteredBookings = bookings.filter((b) => {
    const matchesStatus =
      statusFilter === "all" ? true : b.payout_status === statusFilter;

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      b.mentor?.full_name?.toLowerCase().includes(query) ||
      b.payout_reference?.toLowerCase().includes(query) ||
      b.payout_settings?.upi_id?.toLowerCase().includes(query) ||
      b.payout_settings?.bank_account_number?.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  const totalOwedOverall = pendingMentorGroups.reduce((acc, g) => acc + g.totalPendingPayout, 0);
  const totalCompletedOwed = pendingMentorGroups.reduce((acc, g) => acc + g.totalCompletedPendingPayout, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-300">
            <X size={16} />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-300">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Top Section: Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
              Total Pending Payouts
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <IndianRupee size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-white">
            ₹{totalOwedOverall.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-[#71717A]">
            Across {pendingMentorGroups.length} speaker-mentors ({bookings.filter((b) => b.payout_status === "pending").length} paid sessions)
          </p>
        </div>

        <div className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Ready for Payout Now
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400">
            ₹{totalCompletedOwed.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-[#71717A]">
            Sessions marked as "completed" and ready for transfer
          </p>
        </div>

        <div className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
              Total Disbursed (Paid)
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-[#A855F7]">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-white">
            ₹
            {bookings
              .filter((b) => b.payout_status === "paid")
              .reduce((acc, b) => acc + (Number(b.mentor_payout) || 0), 0)
              .toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-[#71717A]">
            {bookings.filter((b) => b.payout_status === "paid").length} past settled sessions
          </p>
        </div>
      </div>

      {/* Grouped Pending Totals Per Mentor ("You owe this mentor ₹X") */}
      {pendingMentorGroups.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Pending Speaker Settlements</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  {pendingMentorGroups.length} mentors
                </span>
              </h3>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Grouped pending amounts with mentor payment destination details.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingMentorGroups.map((group) => {
              const settings = group.payoutSettings;
              const hasCompleted = group.completedPendingCount > 0;

              return (
                <div
                  key={group.mentorId}
                  className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl p-5 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] shrink-0 flex items-center justify-center font-bold text-[#A855F7]">
                          {group.photoUrl ? (
                            <img src={group.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            group.mentorName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-base text-white">{group.mentorName}</h4>
                          <p className="text-xs text-[#A1A1AA]">{group.currentOrg || "Speaker Mentor"}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-[#A1A1AA]">You owe</p>
                        <p className="text-lg font-black text-amber-400">
                          ₹{group.totalPendingPayout.toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>

                    {/* Stats pills */}
                    <div className="flex flex-wrap gap-2 text-xs pt-1">
                      <span className="px-2.5 py-1 rounded-lg bg-[#1C1C21] text-[#A1A1AA] border border-[rgba(255,255,255,0.06)]">
                        {group.pendingCount} pending session{group.pendingCount === 1 ? "" : "s"}
                      </span>
                      {hasCompleted ? (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                          ₹{group.totalCompletedPendingPayout.toLocaleString("en-IN")} ready ({group.completedPendingCount} completed)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                          0 sessions marked completed yet
                        </span>
                      )}
                    </div>

                    {/* Payout Destination Info */}
                    <div className="bg-[#1C1C21] p-3 rounded-xl border border-[rgba(255,255,255,0.06)] text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-[#71717A] text-[11px] font-bold uppercase tracking-wider">
                        <span>Payment Destination</span>
                        <span className="text-[#A855F7]">
                          {settings?.payout_type === "bank" ? "Bank Transfer" : "UPI"}
                        </span>
                      </div>

                      {settings?.payout_type === "bank" ? (
                        <div className="space-y-1 text-white">
                          <div className="flex items-center justify-between">
                            <span className="text-[#A1A1AA]">Holder:</span>
                            <span className="font-semibold">{settings.bank_account_holder || "—"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#A1A1AA]">A/C No:</span>
                            <div className="flex items-center gap-1.5 font-mono">
                              <span>{settings.bank_account_number || "—"}</span>
                              {settings.bank_account_number && (
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(settings.bank_account_number!, `ac_${group.mentorId}`)}
                                  className="text-[#A1A1AA] hover:text-white"
                                  title="Copy account number"
                                >
                                  {copiedKey === `ac_${group.mentorId}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#A1A1AA]">IFSC:</span>
                            <div className="flex items-center gap-1.5 font-mono">
                              <span>{settings.bank_ifsc || "—"}</span>
                              {settings.bank_ifsc && (
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(settings.bank_ifsc!, `ifsc_${group.mentorId}`)}
                                  className="text-[#A1A1AA] hover:text-white"
                                  title="Copy IFSC code"
                                >
                                  {copiedKey === `ifsc_${group.mentorId}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-white pt-0.5">
                          <span className="text-[#A1A1AA]">UPI ID:</span>
                          <div className="flex items-center gap-1.5 font-mono font-semibold text-[#A855F7]">
                            <span>{settings?.upi_id || "Not configured"}</span>
                            {settings?.upi_id && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(settings.upi_id!, `upi_${group.mentorId}`)}
                                className="text-[#A1A1AA] hover:text-white"
                                title="Copy UPI ID"
                              >
                                {copiedKey === `upi_${group.mentorId}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Batch Action */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={!hasCompleted}
                      onClick={() => handleOpenBatchPayout(group)}
                      className={`w-full py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        hasCompleted
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-sm"
                          : "bg-[#1C1C21] text-[#71717A] border border-[rgba(255,255,255,0.06)] cursor-not-allowed"
                      }`}
                    >
                      <CheckCircle2 size={14} />
                      {hasCompleted
                        ? `Mark ${group.completedPendingCount} Completed as Paid (₹${group.totalCompletedPendingPayout.toLocaleString("en-IN")})`
                        : "No Completed Sessions Ready"}
                    </button>
                    {!hasCompleted && (
                      <p className="text-[11px] text-[#71717A] text-center mt-1.5">
                        Sessions must be marked as completed before releasing payouts.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Paid Bookings Table Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">Paid Session Bookings</h3>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              History of all paid sessions, platform commission deduction, and mentor payouts.
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-2 bg-[#141417] p-1 rounded-xl border border-[rgba(255,255,255,0.08)] self-start sm:self-auto">
            {(["all", "pending", "paid"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  statusFilter === st
                    ? "bg-[#1C1C21] text-white border border-[rgba(255,255,255,0.12)] shadow-sm"
                    : "text-[#A1A1AA] hover:text-white"
                }`}
              >
                {st} (
                {st === "all"
                  ? bookings.length
                  : bookings.filter((b) => b.payout_status === st).length}
                )
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by mentor name, UPI ID, account number, or payout reference..."
            className="w-full bg-[#141417] border border-[rgba(255,255,255,0.08)] focus:border-[#A855F7] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-[#71717A] outline-none transition-colors"
          />
        </div>

        {/* Table / List */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-[#A855F7]" />
            <p className="text-sm text-[#A1A1AA]">Loading payout records...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#1C1C21] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-amber-400 mx-auto mb-3">
              <IndianRupee size={28} />
            </div>
            <h4 className="text-base font-bold text-white mb-1">No Payout Records Found</h4>
            <p className="text-xs text-[#A1A1AA] max-w-sm mx-auto">
              {statusFilter === "all"
                ? "No paid bookings have been logged yet."
                : `No bookings found matching payout status "${statusFilter}".`}
            </p>
          </div>
        ) : (
          <div className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#A1A1AA]">
                <thead className="bg-[#1C1C21] text-[11px] uppercase font-bold text-[#A1A1AA] tracking-wider border-b border-[rgba(255,255,255,0.08)]">
                  <tr>
                    <th className="px-5 py-3.5">Speaker / Mentor</th>
                    <th className="px-5 py-3.5">Session Schedule</th>
                    <th className="px-5 py-3.5">Gross (₹)</th>
                    <th className="px-5 py-3.5">Platform Fee</th>
                    <th className="px-5 py-3.5">Mentor Payout</th>
                    <th className="px-5 py-3.5">Session Status</th>
                    <th className="px-5 py-3.5">Payout Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.06)]">
                  {filteredBookings.map((b) => {
                    const isCompleted = b.status === "completed";
                    const isPending = b.payout_status === "pending";
                    const isPaid = b.payout_status === "paid";

                    return (
                      <tr key={b.id} className="hover:bg-[#1C1C21]/40 transition-colors">
                        {/* Mentor Info */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] shrink-0 flex items-center justify-center font-bold text-[#A855F7] text-xs">
                              {b.mentor?.profile_photo_url ? (
                                <img src={b.mentor.profile_photo_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                (b.mentor?.full_name || "M").charAt(0)
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-white truncate max-w-[150px]">
                                {b.mentor?.full_name || "Unknown Mentor"}
                              </p>
                              <p className="text-[11px] text-[#71717A] truncate max-w-[150px]">
                                {b.mentor?.current_organization || "Speaker"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Session Date & Duration */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <p className="font-medium text-white">
                            {b.confirmed_date
                              ? new Date(b.confirmed_date).toLocaleDateString("en-IN", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "Date TBD"}
                          </p>
                          <p className="text-[11px] text-[#71717A]">
                            {b.confirmed_time ? `${b.confirmed_time.substring(0, 5)} IST` : "—"} ·{" "}
                            {b.confirmed_duration_minutes || "—"} min
                          </p>
                        </td>

                        {/* Amount Due / Paid */}
                        <td className="px-5 py-4 whitespace-nowrap font-semibold text-white">
                          ₹{Number(b.amount_due || 0).toLocaleString("en-IN")}
                        </td>

                        {/* Platform Fee */}
                        <td className="px-5 py-4 whitespace-nowrap text-[#A1A1AA]">
                          {b.platform_fee != null ? (
                            <span>₹{Number(b.platform_fee).toLocaleString("en-IN")}</span>
                          ) : (
                            <span className="text-[#71717A]">—</span>
                          )}
                        </td>

                        {/* Mentor Payout */}
                        <td className="px-5 py-4 whitespace-nowrap font-bold text-emerald-400">
                          ₹{Number(b.mentor_payout || 0).toLocaleString("en-IN")}
                        </td>

                        {/* Session Status */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              b.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : b.status === "confirmed"
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                                : b.status === "cancelled"
                                ? "bg-red-500/10 text-red-400 border border-red-500/30"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>

                        {/* Payout Status */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {isPaid ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                <Check size={11} /> Paid
                              </span>
                              {b.payout_reference && (
                                <p className="text-[10px] text-[#71717A] font-mono truncate max-w-[140px]" title={b.payout_reference}>
                                  Ref: {b.payout_reference}
                                </p>
                              )}
                              {b.payout_paid_at && (
                                <p className="text-[9px] text-[#71717A]">
                                  {new Date(b.payout_paid_at).toLocaleDateString("en-IN", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              <Clock size={11} /> Pending
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          {isPaid ? (
                            <span className="text-[11px] text-[#71717A] italic">Settled</span>
                          ) : (
                            <div className="flex flex-col items-end gap-1">
                              <button
                                type="button"
                                disabled={!isCompleted}
                                onClick={() => handleOpenSinglePayout(b)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                  isCompleted
                                    ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-sm"
                                    : "bg-[#1C1C21] text-[#71717A] border border-[rgba(255,255,255,0.06)] cursor-not-allowed"
                                }`}
                                title={
                                  isCompleted
                                    ? "Mark this session payout as completed"
                                    : "Session must be marked as completed before payout can be released"
                                }
                              >
                                <CheckCircle2 size={13} /> Mark Paid
                              </button>
                              {!isCompleted && (
                                <span className="text-[10px] text-amber-400/80">
                                  Requires status: completed
                                </span>
                              )}
                            </div>
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

      {/* ── Single Payout Confirmation Modal ────────────────────────────── */}
      {payoutModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#141417] border border-[rgba(255,255,255,0.12)] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <IndianRupee size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Record Mentor Payout</h3>
                  <p className="text-xs text-[#A1A1AA]">
                    Enter the transaction reference after transferring funds.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPayoutModalBooking(null)}
                className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#1C1C21]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Payout Summary Info */}
            <div className="bg-[#1C1C21] rounded-xl p-4 border border-[rgba(255,255,255,0.08)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A1A1AA]">Mentor</span>
                <span className="text-xs font-bold text-white">
                  {payoutModalBooking.mentor?.full_name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A1A1AA]">Net Payout Amount</span>
                <span className="text-base font-black text-emerald-400">
                  ₹{Number(payoutModalBooking.mentor_payout || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#71717A] pt-1 border-t border-[rgba(255,255,255,0.06)]">
                <span>Gross: ₹{payoutModalBooking.amount_due}</span>
                <span>Platform Fee: ₹{payoutModalBooking.platform_fee}</span>
              </div>
            </div>

            {/* Destination Payment Details with copy buttons */}
            <div className="bg-[#1C1C21] rounded-xl p-4 border border-[rgba(255,255,255,0.08)] space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
                <span>Transfer Details</span>
                <span className="text-[#A855F7]">
                  {payoutModalBooking.payout_settings?.payout_type === "bank" ? "Bank Details" : "UPI ID"}
                </span>
              </div>

              {payoutModalBooking.payout_settings?.payout_type === "bank" ? (
                <div className="space-y-1.5 text-xs text-white">
                  <div className="flex items-center justify-between">
                    <span className="text-[#A1A1AA]">Account Holder:</span>
                    <span className="font-semibold">{payoutModalBooking.payout_settings.bank_account_holder || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#A1A1AA]">A/C Number:</span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span>{payoutModalBooking.payout_settings.bank_account_number || "—"}</span>
                      {payoutModalBooking.payout_settings.bank_account_number && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(payoutModalBooking.payout_settings!.bank_account_number!, "modal_ac")}
                          className="text-[#A1A1AA] hover:text-white"
                        >
                          {copiedKey === "modal_ac" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#A1A1AA]">IFSC:</span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span>{payoutModalBooking.payout_settings.bank_ifsc || "—"}</span>
                      {payoutModalBooking.payout_settings.bank_ifsc && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(payoutModalBooking.payout_settings!.bank_ifsc!, "modal_ifsc")}
                          className="text-[#A1A1AA] hover:text-white"
                        >
                          {copiedKey === "modal_ifsc" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs text-white pt-1">
                  <span className="text-[#A1A1AA]">UPI ID:</span>
                  <div className="flex items-center gap-2 font-mono font-bold text-[#A855F7]">
                    <span>{payoutModalBooking.payout_settings?.upi_id || "Not configured"}</span>
                    {payoutModalBooking.payout_settings?.upi_id && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(payoutModalBooking.payout_settings!.upi_id!, "modal_upi")}
                        className="text-[#A1A1AA] hover:text-white"
                      >
                        {copiedKey === "modal_upi" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Payout Reference Form */}
            <form onSubmit={handleSubmitSinglePayout} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#A1A1AA]">
                  Payout Reference / UTR / UPI Ref ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={payoutReference}
                  onChange={(e) => setPayoutReference(e.target.value)}
                  placeholder="e.g. UPI-34982749823 or HDFC-UTR-982348"
                  className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#71717A] outline-none transition-colors"
                />
                <p className="text-[11px] text-[#71717A]">
                  This reference number will be saved on the booking record for audit and tracking.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPayoutModalBooking(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1C1C21] text-white hover:bg-[#25252b] border border-[rgba(255,255,255,0.08)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayout || !payoutReference.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {submittingPayout && <Loader2 size={13} className="animate-spin" />}
                  Confirm Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Batch Payout Confirmation Modal ────────────────────────────── */}
      {batchMentorGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#141417] border border-[rgba(255,255,255,0.12)] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Batch Settle All Sessions</h3>
                  <p className="text-xs text-[#A1A1AA]">
                    Mark all completed sessions for this mentor as paid in one transfer.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBatchMentorGroup(null)}
                className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#1C1C21]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Batch Summary Info */}
            <div className="bg-[#1C1C21] rounded-xl p-4 border border-[rgba(255,255,255,0.08)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A1A1AA]">Mentor</span>
                <span className="text-xs font-bold text-white">{batchMentorGroup.mentorName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A1A1AA]">Eligible Completed Sessions</span>
                <span className="text-xs font-semibold text-white">
                  {batchMentorGroup.completedPendingCount} sessions
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A1A1AA]">Total Payout Amount</span>
                <span className="text-base font-black text-emerald-400">
                  ₹{batchMentorGroup.totalCompletedPendingPayout.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Payment Destination */}
            <div className="bg-[#1C1C21] rounded-xl p-4 border border-[rgba(255,255,255,0.08)] space-y-2 text-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
                Transfer Details
              </p>
              {batchMentorGroup.payoutSettings?.payout_type === "bank" ? (
                <div className="space-y-1 text-white">
                  <div className="flex justify-between">
                    <span className="text-[#A1A1AA]">Holder:</span>
                    <span>{batchMentorGroup.payoutSettings.bank_account_holder || "—"}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-[#A1A1AA]">A/C:</span>
                    <span>{batchMentorGroup.payoutSettings.bank_account_number || "—"}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-[#A1A1AA]">IFSC:</span>
                    <span>{batchMentorGroup.payoutSettings.bank_ifsc || "—"}</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between text-white font-mono font-bold text-[#A855F7]">
                  <span className="text-[#A1A1AA]">UPI ID:</span>
                  <span>{batchMentorGroup.payoutSettings?.upi_id || "Not configured"}</span>
                </div>
              )}
            </div>

            {/* Batch Reference Form */}
            <form onSubmit={handleSubmitBatchPayout} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#A1A1AA]">
                  Batch Transfer Reference / UTR / UPI Ref ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={batchReference}
                  onChange={(e) => setBatchReference(e.target.value)}
                  placeholder="e.g. UPI-BATCH-4982349 or NEFT-UTR-12893"
                  className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#71717A] outline-none transition-colors"
                />
                <p className="text-[11px] text-[#71717A]">
                  This reference will be applied to all {batchMentorGroup.completedPendingCount} completed bookings.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBatchMentorGroup(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1C1C21] text-white hover:bg-[#25252b] border border-[rgba(255,255,255,0.08)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBatch || !batchReference.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {submittingBatch && <Loader2 size={13} className="animate-spin" />}
                  Confirm Batch Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
