import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import {
  RefreshCw,
  MessageCircle,
  Phone,
  BellRing,
  AlertCircle,
  CheckCircle2,
  Inbox
} from "lucide-react";

interface FollowUp {
  request_id: string;
  student_name: string | null;
  student_email: string | null;
  mentor_name: string | null;
  hours_waiting: number | null;
  student_phone: string | null;
  last_reminded: string | null;
}

// Digits only; a bare 10-digit number gets the 91 country code.
function normalizePhone(raw: string | null | undefined): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length === 10 ? `91${digits}` : digits;
}

function formatReminded(value: string): string {
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return value;
  }
}

export const AdminFollowUps: React.FC = () => {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const fetchFollowUps = async () => {
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.rpc("get_admin_followups");
      if (error) throw error;
      setFollowUps((data as FollowUp[]) || []);
    } catch (err: any) {
      console.error("Error loading admin follow-ups:", err);
      setErrorMsg(err?.message || "Failed to load follow-ups.");
      setFollowUps([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFollowUps();
  };

  const handleMarkReminded = async (requestId: string) => {
    setMarkingId(requestId);
    try {
      const { error } = await supabase.rpc("mark_request_reminded", { p_request_id: requestId });
      if (error) throw error;
      await fetchFollowUps();
    } catch (err: any) {
      console.error("Error marking request reminded:", err);
      setErrorMsg(err?.message || "Failed to mark as reminded.");
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <BellRing size={18} className="text-[#FF9D2E]" /> Follow-ups
          </h3>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Follow-ups: accepted by mentor, no time confirmed in 24h
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#1C1C21] text-white hover:bg-[#25252b] border border-[rgba(255,255,255,0.12)] transition-colors shrink-0 self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <p className="text-xs">{errorMsg}</p>
        </div>
      )}

      {loading ? (
        <div className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : followUps.length === 0 ? (
        <div className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl p-10 text-center">
          <Inbox size={32} className="text-[#71717A] mx-auto mb-3" />
          <p className="text-sm text-white font-bold">No follow-ups needed right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {followUps.map((f) => {
            const phoneDigits = normalizePhone(f.student_phone);
            const hasPhone = phoneDigits.length > 0;
            const isMarking = markingId === f.request_id;

            return (
              <div
                key={f.request_id}
                className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl p-4 sm:p-5 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-bold text-white break-words">
                      {f.student_name || "Student"}
                    </p>
                    {f.student_email && (
                      <p className="text-xs text-[#A1A1AA] break-all">{f.student_email}</p>
                    )}
                    <p className="text-xs text-[#D4D4D8] break-words">
                      Mentor: <span className="font-semibold text-white">{f.mentor_name || "Unknown Mentor"}</span>
                    </p>
                    <p className="text-xs text-amber-400 font-semibold">
                      waiting {f.hours_waiting ?? 0} hours
                    </p>
                    <p className="text-xs text-[#A1A1AA]">
                      {hasPhone ? f.student_phone : "No number"}
                    </p>
                  </div>

                  {f.last_reminded && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/30 self-start shrink-0">
                      <CheckCircle2 size={11} /> Reminded {formatReminded(f.last_reminded)}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {hasPhone && (
                    <>
                      <a
                        href={`https://wa.me/${phoneDigits}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#1C1C21] text-white hover:bg-[#25252b] border border-[rgba(255,255,255,0.12)] transition-colors"
                      >
                        <MessageCircle size={13} /> WhatsApp
                      </a>
                      <a
                        href={`tel:+${phoneDigits}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#1C1C21] text-white hover:bg-[#25252b] border border-[rgba(255,255,255,0.12)] transition-colors"
                      >
                        <Phone size={13} /> Call
                      </a>
                    </>
                  )}

                  <button
                    onClick={() => handleMarkReminded(f.request_id)}
                    disabled={isMarking}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <BellRing size={13} className={isMarking ? "animate-pulse" : ""} /> Mark reminded
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
