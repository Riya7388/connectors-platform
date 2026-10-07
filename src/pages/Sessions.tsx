import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import type { WorkshopSession } from "../types/workshop";
import { 
  Calendar, 
  Clock, 
  Users, 
  Sparkles, 
  ArrowRight, 
  Loader2, 
  Mic2,
  CalendarDays,
  CheckCircle2,
  ExternalLink
} from "lucide-react";

// Admin: replace with the live Google Form URL
export const BECOME_A_SPEAKER_FORM_URL = "https://forms.gle/REPLACE_ME";

interface SessionsProps {
  setActiveTab: (tab: string) => void;
}

export const Sessions: React.FC<SessionsProps> = ({ setActiveTab }) => {
  const [sessions, setSessions] = useState<WorkshopSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      // Note: we intentionally do not query or display meet_link on public view
      const { data, error: fetchError } = await supabase
        .from("workshop_sessions")
        .select(`
          id,
          title,
          description,
          speaker_id,
          session_date,
          start_time,
          duration_minutes,
          access_type,
          price_amount,
          capacity,
          cover_image_url,
          status,
          created_at,
          speaker:speakers(
            id,
            full_name,
            headline,
            photo_url,
            speaker_type,
            batch_year,
            branch,
            current_company
          )
        `)
        .order("session_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (fetchError) throw fetchError;
      setSessions((data as unknown as WorkshopSession[]) || []);
    } catch (err: any) {
      console.error("Error fetching workshop sessions:", err);
      setError("Failed to load sessions. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const formatSessionDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr + "T00:00:00");
      return date.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatSessionTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(":");
      const h = parseInt(hours, 10);
      const m = minutes || "00";
      const ampm = h >= 12 ? "PM" : "AM";
      const formattedHour = h % 12 || 12;
      return `${formattedHour}:${m} ${ampm} IST`;
    } catch {
      return timeStr;
    }
  };

  const isPast = (session: WorkshopSession) => {
    if (session.status === "completed" || session.status === "cancelled") return true;
    const now = new Date();
    const sessionDateTime = new Date(`${session.session_date}T${session.start_time}`);
    return sessionDateTime < now;
  };

  const upcomingSessions = sessions.filter((s) => !isPast(s));
  const pastSessions = sessions.filter((s) => isPast(s));

  const renderSessionCard = (session: WorkshopSession, isDimmed = false) => {
    const isFreeForAll = session.access_type === "free_for_all";
    const priceInRupees = Math.round((session.price_amount || 0) / 100);

    return (
      <div
        key={session.id}
        className={`bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 ${
          isDimmed
            ? "opacity-60 hover:opacity-90 grayscale-[30%] hover:grayscale-0"
            : "hover:border-[rgba(255,255,255,0.2)] hover:shadow-2xl hover:shadow-purple-950/20"
        }`}
      >
        <div>
          {/* Card Cover Image / Gradient Header */}
          <div className="relative h-44 w-full bg-[#1C1C21] overflow-hidden">
            {session.cover_image_url ? (
              <img
                src={session.cover_image_url}
                alt={session.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div 
                className="w-full h-full flex flex-col items-center justify-center p-6 text-center"
                style={{
                  background: "linear-gradient(135deg, rgba(255,157,46,0.15) 0%, rgba(255,45,143,0.2) 38%, rgba(168,85,247,0.2) 70%, rgba(79,70,229,0.2) 100%)"
                }}
              >
                <div className="w-12 h-12 rounded-xl bg-[#141417]/80 backdrop-blur-md border border-[rgba(255,255,255,0.12)] flex items-center justify-center text-[#A855F7] mb-2">
                  <Mic2 size={24} />
                </div>
                <span className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
                  Connectors Masterclass
                </span>
              </div>
            )}

            {/* Access Badge (Top-Left) */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
              {isFreeForAll ? (
                <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide bg-emerald-500/90 text-white backdrop-blur-md shadow-md">
                  FREE
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-[rgba(168,85,247,0.9)] text-white backdrop-blur-md shadow-md">
                  FREE for NIT Raipur
                </span>
              )}

              {!isFreeForAll && priceInRupees > 0 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#141417]/90 text-[#FF9D2E] border border-[#FF9D2E]/30 backdrop-blur-md shadow-md">
                  ₹{priceInRupees} for others
                </span>
              )}
            </div>

            {/* Status Indicator (Top-Right) */}
            {session.status === "live" && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-bold uppercase tracking-wider animate-pulse shadow-lg">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span>LIVE NOW</span>
              </div>
            )}
            {session.status === "cancelled" && (
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-zinc-800/90 text-zinc-400 text-xs font-bold uppercase tracking-wider border border-zinc-700">
                CANCELLED
              </div>
            )}
          </div>

          {/* Card Body */}
          <div className="p-5 sm:p-6 space-y-4">
            {/* Title */}
            <h3 className="text-lg sm:text-xl font-bold text-white line-clamp-2 leading-snug">
              {session.title}
            </h3>

            {/* Date & Time Info */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-medium text-[#A1A1AA]">
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-[#FF9D2E]" />
                <span>{formatSessionDate(session.session_date)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-[#FF2D8F]" />
                <span>{formatSessionTime(session.start_time)} ({session.duration_minutes}m)</span>
              </div>
            </div>

            {/* Speaker Mini Row */}
            {session.speaker ? (
              <div
                onClick={() => setActiveTab(`speaker-profile/${session.speaker?.id}`)}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#1C1C21] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] transition-all cursor-pointer group"
              >
                <div 
                  className="w-10 h-10 rounded-full p-[1.5px] shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #FF9D2E 0%, #FF2D8F 38%, #A855F7 70%, #4F46E5 100%)"
                  }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-[#141417] flex items-center justify-center">
                    {session.speaker.photo_url ? (
                      <img
                        src={session.speaker.photo_url}
                        alt={session.speaker.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-[#A855F7]">
                        {session.speaker.full_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-white truncate group-hover:text-[#A855F7] transition-colors">
                      {session.speaker.full_name}
                    </h4>
                  </div>
                  <p className="text-xs text-[#A1A1AA] truncate">
                    {session.speaker.headline || session.speaker.current_company || "Speaker"}
                  </p>
                </div>
              </div>
            ) : null}

            {/* Description Preview */}
            {session.description && (
              <p className="text-xs text-[#A1A1AA] line-clamp-2 leading-relaxed">
                {session.description}
              </p>
            )}
          </div>
        </div>

        {/* Card Footer: Disabled Register CTA (Phase 2 constraint) */}
        <div className="p-5 sm:p-6 pt-0">
          <button
            type="button"
            disabled
            className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white/60 bg-[#1C1C21] border border-[rgba(255,255,255,0.08)] cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>Registration opening soon</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-white py-8 px-4 sm:px-6 lg:px-8 space-y-12">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* 1. Page Header */}
        <div className="text-center sm:text-left space-y-2 border-b border-[rgba(255,255,255,0.08)] pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-[0.08em] bg-[rgba(168,85,247,0.12)] text-[#A855F7] border border-[rgba(168,85,247,0.3)]">
            <Sparkles size={14} />
            Live Workshops & Masterclasses
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Upcoming Workshops
          </h1>
          <p className="text-sm sm:text-base text-[#A1A1AA] max-w-2xl">
            Learn live from senior alumni, industry leaders, and technical specialists. Interactive, high-impact sessions designed for your career growth.
          </p>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#A855F7]" />
            <p className="text-sm text-[#A1A1AA]">Loading sessions...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-center space-y-3">
            <p className="text-red-400 text-sm font-medium">{error}</p>
            <button
              onClick={fetchSessions}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] text-white hover:bg-[#25252b]"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* 2. Upcoming Sessions Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <CalendarDays size={20} className="text-[#FF9D2E]" />
                  <span>Upcoming Sessions ({upcomingSessions.length})</span>
                </h2>
              </div>

              {upcomingSessions.length === 0 ? (
                <div className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl p-10 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#1C1C21] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#A855F7] mx-auto">
                    <Calendar size={28} />
                  </div>
                  <h3 className="text-base font-bold text-white">No upcoming sessions right now</h3>
                  <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-md mx-auto">
                    New masterclasses and workshops are scheduled regularly. Check back soon or register to share your own expertise!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingSessions.map((session) => renderSessionCard(session, false))}
                </div>
              )}
            </div>

            {/* 3. Past Sessions Section */}
            {pastSessions.length > 0 && (
              <div className="space-y-6 pt-6 border-t border-[rgba(255,255,255,0.08)]">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-bold text-[#A1A1AA] flex items-center gap-2">
                    <CheckCircle2 size={18} />
                    <span>Past Sessions ({pastSessions.length})</span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastSessions.map((session) => renderSessionCard(session, true))}
                </div>
              </div>
            )}

            {/* 4. "Become a Speaker" CTA Card */}
            <div className="relative rounded-2xl p-6 sm:p-10 overflow-hidden bg-[#141417] border border-[rgba(255,255,255,0.08)]">
              {/* Brand gradient subtle backdrop */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-[linear-gradient(135deg,#FF9D2E_0%,#FF2D8F_38%,#A855F7_70%,#4F46E5_100%)] opacity-10 blur-3xl pointer-events-none rounded-full" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl p-[2px] shrink-0 shadow-lg"
                    style={{
                      background: "linear-gradient(135deg, #FF9D2E 0%, #FF2D8F 38%, #A855F7 70%, #4F46E5 100%)"
                    }}
                  >
                    <div className="w-full h-full rounded-[10px] bg-[#141417] flex items-center justify-center text-white">
                      <Mic2 size={22} className="text-[#FF2D8F]" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl sm:text-2xl font-bold text-white">
                      Become a Speaker
                    </h3>
                    <p className="text-sm text-[#A1A1AA] max-w-xl leading-relaxed">
                      Have lessons, engineering breakthroughs, or career insights from your journey? Inspire the next generation.
                    </p>
                  </div>
                </div>

                <a
                  href={BECOME_A_SPEAKER_FORM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #FF9D2E 0%, #FF2D8F 38%, #A855F7 70%, #4F46E5 100%)"
                  }}
                >
                  <span>Share Your Journey</span>
                  <ArrowRight size={16} />
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
