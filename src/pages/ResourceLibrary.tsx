import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import type { WorkshopSession } from "../types/workshop";
import { 
  BookOpen, 
  Calendar, 
  User, 
  Video, 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  Loader2, 
  ExternalLink,
  CheckCircle2,
  Bookmark
} from "lucide-react";

interface ResourceLibraryProps {
  setActiveTab: (tab: string) => void;
}

export const ResourceLibrary: React.FC<ResourceLibraryProps> = ({ setActiveTab }) => {
  const [sessions, setSessions] = useState<WorkshopSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<WorkshopSession | null>(null);

  useEffect(() => {
    fetchResourceSessions();
  }, []);

  const fetchResourceSessions = async () => {
    setLoading(true);
    setError(null);
    try {
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
          recording_url,
          resource_summary,
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
        .not("resource_summary", "is", null)
        .order("session_date", { ascending: false });

      if (fetchError) throw fetchError;

      // Filter to ensure resource_summary is not empty whitespace
      const validResources = ((data as unknown as WorkshopSession[]) || []).filter(
        (s) => s.resource_summary && s.resource_summary.trim().length > 0
      );

      setSessions(validResources);
    } catch (err: any) {
      console.error("Error fetching resource library:", err);
      setError(err.message || "Failed to load resource library.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to format date cleanly
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return dateString;
    }
  };

  // Helper for text preview (first ~150 chars)
  const getPreviewText = (text: string, maxLength = 150) => {
    const trimmed = text.trim();
    if (trimmed.length <= maxLength) return trimmed;
    return trimmed.slice(0, maxLength).trim() + "...";
  };

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header / Breadcrumb */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#18181C] border border-[rgba(255,255,255,0.1)] text-xs font-semibold text-[#A855F7]">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Public Knowledge Hub • No Booking Needed</span>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Resource Library
              </h1>
              <p className="mt-2 text-sm sm:text-base text-[#A1A1AA] max-w-2xl">
                Browse written takeaways, key action points, and recordings from past mentorship sessions.
              </p>
            </div>

            {selectedSession && (
              <button
                onClick={() => setSelectedSession(null)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1C1C21] hover:bg-[#27272A] border border-[rgba(255,255,255,0.1)] text-sm font-medium text-white transition-all w-fit"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to All Resources</span>
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="w-8 h-8 text-[#A855F7] animate-spin" />
            <p className="text-sm text-[#71717A]">Loading takeaways...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-[#1F1215] border border-red-500/30 rounded-2xl p-6 text-center space-y-3 max-w-xl mx-auto">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={fetchResourceSessions}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* DETAIL VIEW */}
        {/* ----------------------------------------------------------------- */}
        {!loading && !error && selectedSession && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-[#121217] border border-[rgba(255,255,255,0.08)] rounded-3xl p-6 sm:p-8 space-y-8 shadow-2xl">
              
              {/* Session Meta Header */}
              <div className="space-y-4 border-b border-[rgba(255,255,255,0.08)] pb-6">
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#A1A1AA]">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1C1C21] text-purple-300 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(selectedSession.session_date)}</span>
                  </div>
                  {selectedSession.recording_url && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
                      <Video className="w-3.5 h-3.5" />
                      <span>Recording Available</span>
                    </div>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  {selectedSession.title}
                </h2>

                {selectedSession.description && (
                  <p className="text-sm text-[#A1A1AA]">
                    {selectedSession.description}
                  </p>
                )}

                {/* Speaker Header Card */}
                {selectedSession.speaker && (
                  <div className="flex items-center gap-4 bg-[#18181F] p-4 rounded-2xl border border-[rgba(255,255,255,0.06)]">
                    {selectedSession.speaker.photo_url ? (
                      <img
                        src={selectedSession.speaker.photo_url}
                        alt={selectedSession.speaker.full_name}
                        className="w-12 h-12 rounded-full object-cover border border-[#A855F7]/30"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#27272A] flex items-center justify-center text-white">
                        <User className="w-6 h-6 text-[#A1A1AA]" />
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {selectedSession.speaker.full_name}
                      </h4>
                      <p className="text-xs text-[#A1A1AA]">
                        {selectedSession.speaker.headline || selectedSession.speaker.current_company || "Speaker"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Recording Link Section */}
              {selectedSession.recording_url && (
                <div className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-[#A855F7]/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-red-400" />
                      Session Video Recording
                    </span>
                    <p className="text-xs text-[#A1A1AA]">
                      Watch the complete recorded presentation on external media platform.
                    </p>
                  </div>
                  <a
                    href={selectedSession.recording_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#A855F7] hover:bg-[#9333EA] text-white text-xs font-bold transition-colors shadow-lg shadow-purple-500/20 whitespace-nowrap"
                  >
                    <span>Watch Recording</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}

              {/* Key Takeaways Section (Line breaks preserved) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#A855F7]" />
                  <h3 className="text-lg font-bold text-white">Key Takeaways & Summary</h3>
                </div>

                <div className="bg-[#18181D] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 text-sm text-[#E4E4E7] leading-relaxed whitespace-pre-wrap font-sans space-y-2">
                  {selectedSession.resource_summary}
                </div>
              </div>

              {/* Bottom Back Button */}
              <div className="pt-6 border-t border-[rgba(255,255,255,0.08)] flex justify-between items-center">
                <button
                  onClick={() => setSelectedSession(null)}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-[#A1A1AA] hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Resource Library</span>
                </button>

                <button
                  onClick={() => setActiveTab("sessions")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A855F7] hover:underline"
                >
                  <span>Explore Upcoming Sessions</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* LIST VIEW */}
        {/* ----------------------------------------------------------------- */}
        {!loading && !error && !selectedSession && (
          <>
            {sessions.length === 0 ? (
              /* EMPTY STATE */
              <div className="bg-[#121217] border border-[rgba(255,255,255,0.08)] rounded-3xl p-12 text-center space-y-5 max-w-lg mx-auto my-12">
                <div className="w-16 h-16 rounded-full bg-[#1C1C21] border border-[rgba(255,255,255,0.1)] flex items-center justify-center mx-auto text-[#A855F7]">
                  <BookOpen className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Takeaways will appear here</h3>
                  <p className="text-sm text-[#A1A1AA]">
                    Takeaways from past mentorship sessions will be published here after they take place. Check back soon!
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("sessions")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#A855F7] hover:bg-[#9333EA] text-white text-xs font-bold transition-all shadow-lg shadow-purple-500/20"
                >
                  <span>Browse Upcoming Sessions</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* CARDS GRID */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-[#121217] border border-[rgba(255,255,255,0.08)] hover:border-[#A855F7]/40 rounded-3xl p-6 flex flex-col justify-between space-y-6 transition-all duration-200 hover:-translate-y-1 shadow-lg group"
                  >
                    <div className="space-y-4">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(session.session_date)}
                        </span>
                        {session.recording_url && (
                          <span className="text-[11px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1">
                            <Video className="w-3 h-3" />
                            Recording
                          </span>
                        )}
                      </div>

                      {/* Title & Topic */}
                      <div className="space-y-1.5">
                        <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2">
                          {session.title}
                        </h3>
                        {session.description && (
                          <p className="text-xs text-[#71717A] line-clamp-1">
                            {session.description}
                          </p>
                        )}
                      </div>

                      {/* Speaker Badge */}
                      {session.speaker && (
                        <div className="flex items-center gap-3 pt-2">
                          {session.speaker.photo_url ? (
                            <img
                              src={session.speaker.photo_url}
                              alt={session.speaker.full_name}
                              className="w-8 h-8 rounded-full object-cover border border-[#A855F7]/30"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#27272A] flex items-center justify-center text-white text-xs">
                              <User className="w-4 h-4 text-[#A1A1AA]" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">
                              {session.speaker.full_name}
                            </p>
                            <p className="text-[11px] text-[#71717A] truncate">
                              {session.speaker.current_company || session.speaker.headline || "Speaker"}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Takeaways Preview */}
                      <div className="bg-[#18181D] border border-[rgba(255,255,255,0.05)] rounded-2xl p-4 text-xs text-[#A1A1AA] space-y-1">
                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                          <Bookmark className="w-3 h-3" />
                          Key Takeaways Preview
                        </span>
                        <p className="line-clamp-3 leading-relaxed">
                          {getPreviewText(session.resource_summary || "")}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <button
                      onClick={() => setSelectedSession(session)}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#1C1C21] hover:bg-[#A855F7] text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-purple-500/20"
                    >
                      <span>Read Takeaways</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};
