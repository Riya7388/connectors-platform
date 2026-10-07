import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import type { Speaker } from "../types/workshop";
import { 
  ChevronLeft, 
  Building2, 
  GraduationCap, 
  Sparkles, 
  Calendar, 
  MessageSquareQuote,
  Clock,
  Loader2,
  AlertCircle
} from "lucide-react";

interface SpeakerProfileProps {
  id: string;
  setActiveTab: (tab: string) => void;
}

export const SpeakerProfile: React.FC<SpeakerProfileProps> = ({ id, setActiveTab }) => {
  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpeaker = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from("speakers")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (fetchError) {
          console.error("Error fetching speaker:", fetchError);
          setError("Failed to load speaker profile.");
        } else if (!data) {
          setError("Speaker not found or profile is unpublished.");
        } else {
          setSpeaker(data as Speaker);
        }
      } catch (err: any) {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchSpeaker();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 bg-[#09090B] text-white">
        <Loader2 className="w-10 h-10 animate-spin text-[#A855F7]" />
        <p className="text-sm font-medium text-[#A1A1AA]">Loading speaker profile...</p>
      </div>
    );
  }

  if (error || !speaker) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center bg-[#09090B] text-white">
        <div className="w-16 h-16 rounded-2xl bg-[#141417] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#FF2D8F] mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">Profile Unavailable</h2>
        <p className="text-[#A1A1AA] max-w-md mb-6">{error || "This speaker profile could not be found."}</p>
        <button
          onClick={() => setActiveTab("home")}
          className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] text-white hover:border-[rgba(255,255,255,0.24)] transition-all flex items-center gap-2"
        >
          <ChevronLeft size={16} /> Return to Home
        </button>
      </div>
    );
  }

  const milestones = Array.isArray(speaker.career_milestones) ? speaker.career_milestones : [];
  const expertise = Array.isArray(speaker.areas_of_expertise) ? speaker.areas_of_expertise : [];

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FFFFFF] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation & Controls */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveTab("admin")}
            className="flex items-center gap-2 text-sm font-semibold text-[#A1A1AA] hover:text-white transition-colors group"
          >
            <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Back</span>
          </button>

          {!speaker.is_published && (
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Draft / Preview Mode
            </span>
          )}
        </div>

        {/* 1. Header Card */}
        <div className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 sm:p-8 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[linear-gradient(135deg,#FF9D2E_0%,#FF2D8F_38%,#A855F7_70%,#4F46E5_100%)] opacity-10 blur-3xl pointer-events-none rounded-full" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
            {/* Circular Photo with Brand-Gradient Ring */}
            <div className="relative shrink-0">
              <div 
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-full p-[2px] flex items-center justify-center shadow-2xl"
                style={{
                  background: "linear-gradient(135deg, #FF9D2E 0%, #FF2D8F 38%, #A855F7 70%, #4F46E5 100%)"
                }}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-[#141417]">
                  {speaker.photo_url ? (
                    <img
                      src={speaker.photo_url}
                      alt={speaker.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#1C1C21] text-[#A855F7] text-3xl font-bold">
                      {speaker.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              {/* Speaker Type Badge */}
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] text-[#A1A1AA] capitalize shadow-md">
                {speaker.speaker_type}
              </span>
            </div>

            {/* Speaker Info */}
            <div className="flex-1 text-center sm:text-left space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  {speaker.full_name}
                </h1>

                {speaker.linkedin_url && (
                  <a
                    href={speaker.linkedin_url.startsWith("http") ? speaker.linkedin_url : `https://${speaker.linkedin_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 self-center sm:self-start px-3.5 py-1.5 rounded-full bg-[#0077b5]/10 text-[#0077b5] border border-[#0077b5]/30 hover:bg-[#0077b5]/20 text-xs font-semibold transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    <span>LinkedIn</span>
                  </a>
                )}
              </div>

              {speaker.headline && (
                <p className="text-base sm:text-lg text-[#A1A1AA] font-medium leading-snug">
                  {speaker.headline}
                </p>
              )}

              {/* Tags / Chips (Batch, Branch, Current Role & Company) */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                {(speaker.current_role || speaker.current_company) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] text-[#FFFFFF]">
                    <Building2 size={13} className="text-[#FF9D2E]" />
                    {[speaker.current_role, speaker.current_company].filter(Boolean).join(" @ ")}
                  </span>
                )}

                {speaker.batch_year && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[rgba(168,85,247,0.12)] border border-[rgba(168,85,247,0.3)] text-[#A855F7]">
                    <Calendar size={13} />
                    Batch of {speaker.batch_year}
                  </span>
                )}

                {speaker.branch && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] text-[#A1A1AA]">
                    <GraduationCap size={13} className="text-[#FF2D8F]" />
                    {speaker.branch}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2. My Journey */}
        {speaker.my_journey && (
          <div className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[#A855F7] flex items-center gap-2">
              <Sparkles size={14} />
              MY JOURNEY
            </h2>
            <div className="text-[#A1A1AA] text-sm sm:text-base leading-relaxed whitespace-pre-line">
              {speaker.my_journey}
            </div>
          </div>
        )}

        {/* 3. Career Milestones */}
        {milestones.length > 0 && (
          <div className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 sm:p-8 space-y-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[#A855F7] flex items-center gap-2">
              <Clock size={14} />
              CAREER MILESTONES
            </h2>

            <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-2 sm:before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-[#FF9D2E] before:via-[#FF2D8F] before:to-[#A855F7]">
              {milestones.map((milestone, idx) => (
                <div key={idx} className="relative group">
                  {/* Timeline Dot */}
                  <div 
                    className="absolute -left-6 sm:-left-8 top-1 w-4 h-4 rounded-full border-2 border-[#141417] shadow-md"
                    style={{
                      background: "linear-gradient(135deg, #FF9D2E 0%, #FF2D8F 100%)"
                    }}
                  />

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[rgba(168,85,247,0.12)] border border-[rgba(168,85,247,0.3)] text-[#A855F7]">
                        {milestone.year}
                      </span>
                      <h3 className="text-base font-bold text-white">
                        {milestone.title}
                      </h3>
                    </div>
                    {milestone.description && (
                      <p className="text-sm text-[#A1A1AA] leading-relaxed pt-0.5">
                        {milestone.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Areas of Expertise */}
        {expertise.length > 0 && (
          <div className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[#A855F7]">
              AREAS OF EXPERTISE
            </h2>
            <div className="flex flex-wrap gap-2">
              {expertise.map((item, idx) => (
                <span
                  key={idx}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[rgba(168,85,247,0.12)] border border-[rgba(168,85,247,0.3)] text-[#A855F7]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 5. Mentoring */}
        {speaker.mentoring_note && (
          <div className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[#A855F7] flex items-center gap-2">
              <MessageSquareQuote size={14} />
              MENTORING & GUIDANCE
            </h2>
            <div className="bg-[#1C1C21] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 text-sm sm:text-base text-[#FFFFFF] italic leading-relaxed">
              "{speaker.mentoring_note}"
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
