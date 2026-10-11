import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import {
  ShieldCheck,
  Star,
  MapPin,
  ChevronLeft,
  X,
  Loader2,
  Trophy,
  Globe,
  Clock,
  Check,
  CheckCircle2,
} from "lucide-react";
import { FREE_MODE, FREE_MODE_DURATIONS } from "../lib/config";
import { toTitleCase, getInitials } from "../lib/formatters";

interface Mentor {
  id: string;
  user_id: string;
  full_name: string;
  college_name: string;
  branch: string;
  exam_category?: string;
  current_organization?: string;
  years_of_experience?: string;
  ca_stage?: string;
  upsc_stage?: string;
  target_exam?: string;
  target_college?: string;
  other_exam?: string;
  graduation_year: number;
  bio: string | null;
  pricing: Record<string, string> | null;
  profile_photo_url: string;
  verified: boolean;
  areas_of_expertise: string[] | null;
  languages_known: string[] | null;
  free_intro_session: boolean;
  rating: number | null;
  city: string;
  is_online?: boolean;
  last_online_at?: string | null;
  availability_time?: string | null;
  achievements?: string[] | null;
  goals?: string[] | null;
  mentor_tag?: string | null;
  mentor_tag_other?: string | null;
  expertise_other?: string | null;
  session_durations?: string[] | null;
  top_achievement?: string | null;
  journey_tags?: string[] | null;
  help_statement?: string | null;
  milestones?: string | null;
}

interface MentorProfileProps {
  id: string;
  setActiveTab: (tab: string) => void;
}

const JOURNEY_TAG_LABELS: Record<string, string> = {
  first_attempt: "Cracked it in my first attempt",
  after_drop: "Cracked it after a drop / repeat",
  self_study: "Self-study (no coaching)",
  coaching_plus_self: "Coaching + self-study",
  changed_path: "Changed my stream / goal",
  still_preparing: "Still preparing (peer mentor)",
};

interface MilestoneItem {
  year: string;
  text: string;
}

function parseMilestones(raw: string | null | undefined): MilestoneItem[] {
  if (!raw || !raw.trim()) return [];
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const items: MilestoneItem[] = [];

  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const year = line.slice(0, colonIdx).trim();
      const text = line.slice(colonIdx + 1).trim();
      if (year && text) {
        items.push({ year, text });
      } else {
        items.push({ year: "", text: line });
      }
    } else {
      items.push({ year: "", text: line });
    }
  }
  return items;
}

export const MentorProfile: React.FC<MentorProfileProps> = ({ id, setActiveTab }) => {
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [initialMessage, setInitialMessage] = useState("");
  const [selectedDuration, setSelectedDuration] = useState<string>("30");
  const [connectLoading, setConnectLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // In-app notification state (replaces alerts)
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });
  }, []);

  useEffect(() => {
    const fetchMentor = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("mentors")
        .select("*")
        .eq("id", id)
        .eq("application_status", "approved")
        .eq("verified", true)
        .maybeSingle();

      if (error) {
        console.error("Error fetching mentor:", error);
        setError("Failed to load mentor profile.");
      } else if (!data) {
        setError("Mentor not found or is no longer available.");
      } else {
        setMentor(data as Mentor);
      }
      setLoading(false);
    };

    if (id) {
      fetchMentor();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 rounded-full border-4 border-[#FF9D2E] border-t-transparent animate-spin mb-4" />
        <p className="text-[#A1A1AA] animate-pulse">Loading profile...</p>
      </div>
    );
  }

  if (error || !mentor) {
    return (
      <div className="min-h-screen bg-[#09090B] py-16 px-6 flex flex-col items-center justify-center">
        <div className="bg-[#141417] p-10 rounded-3xl max-w-lg w-full text-center space-y-6 border border-[rgba(255,255,255,0.08)]">
          <div className="w-20 h-20 bg-[#1C1C21] mx-auto rounded-full flex items-center justify-center">
            <ShieldCheck className="text-[#A1A1AA]" size={32} />
          </div>
          <h2 className="text-2xl font-bold font-poppins text-white">Profile Unavailable</h2>
          <p className="text-[#A1A1AA]">{error}</p>
          <button
            onClick={() => setActiveTab("find-mentor")}
            className="px-6 py-2.5 rounded-full bg-[#1C1C21] hover:bg-white/[0.08] transition-colors text-sm font-semibold text-white mt-4"
          >
            ← Back to Mentors
          </button>
        </div>
      </div>
    );
  }

  const titleName = toTitleCase(mentor.full_name);
  const firstName = titleName.split(" ")[0] || "Mentor";
  const initials = getInitials(mentor.full_name);

  const getAvailableDurations = (m: Mentor) => {
    let rawDurations: string[] = m.session_durations ?? [];
    if (rawDurations.length === 0 && m.pricing) {
      rawDurations = Object.keys(m.pricing);
    }
    if (rawDurations.length === 0) {
      rawDurations = ["15 min", "30 min"];
    }

    if (FREE_MODE) {
      rawDurations = rawDurations.filter((durStr) => {
        const mins = parseInt(durStr);
        return FREE_MODE_DURATIONS.includes(mins);
      });
      if (rawDurations.length === 0) {
        rawDurations = ["15 min", "30 min"];
      }
    }

    const sorted = [...rawDurations].sort((a, b) => parseInt(a) - parseInt(b));

    return sorted.map((durStr) => {
      const mins = parseInt(durStr);
      const label = mins >= 60 ? `${mins / 60} Hour${mins > 60 ? "s" : ""}` : `${mins} min`;
      const priceVal = m.pricing?.[durStr] || m.pricing?.[`${mins} min`];
      const isFree = mins === 15 && m.free_intro_session;
      const priceText = FREE_MODE ? "" : isFree ? "Free Intro" : priceVal ? `₹${priceVal}` : "Custom";
      return { durStr, mins: String(mins), label, priceText };
    });
  };

  const handleConnectClick = async () => {
    if (!currentUser) {
      setNotification({ message: "Please log in to connect with mentors.", type: "error" });
      setTimeout(() => setActiveTab("auth"), 1200);
      return;
    }
    if (currentUser.id === mentor.user_id) {
      setNotification({ message: "You cannot request a connection with yourself.", type: "error" });
      return;
    }

    setConnectLoading(true);
    const { data: existingRequests, error: reqError } = await supabase
      .from("booking_requests")
      .select("id")
      .eq("student_id", currentUser.id)
      .eq("mentor_id", mentor.id)
      .in("status", ["pending", "accepted", "time_confirmed"]);

    if (reqError) {
      console.error("Error checking requests:", reqError);
      setNotification({ message: "Something went wrong. Please try again.", type: "error" });
      setConnectLoading(false);
      return;
    }

    if (existingRequests && existingRequests.length > 0) {
      setActiveTab(`chat/${existingRequests[0].id}`);
      setConnectLoading(false);
    } else {
      setConnectLoading(false);
      const durationOpts = getAvailableDurations(mentor);
      if (durationOpts.length > 0) {
        setSelectedDuration(durationOpts[0].mins);
      }
      setShowConnectModal(true);
    }
  };

  const handleSendRequest = async () => {
    if (!currentUser || !mentor) return;

    setConnectLoading(true);
    const payload: any = {
      student_id: currentUser.id,
      mentor_id: mentor.id,
      initial_message: initialMessage,
      requested_duration_minutes: parseInt(selectedDuration) || 30,
      status: "pending",
    };

    let { error: insertError } = await supabase
      .from("booking_requests")
      .insert(payload)
      .select()
      .single();

    if (insertError && insertError.message?.includes("requested_duration_minutes")) {
      delete payload.requested_duration_minutes;
      const fallback = await supabase
        .from("booking_requests")
        .insert(payload)
        .select()
        .single();
      insertError = fallback.error;
    }

    setConnectLoading(false);

    if (insertError) {
      console.error("Error creating request:", insertError);
      setNotification({ message: "Failed to send request. Please try again.", type: "error" });
      return;
    }

    // Trigger email notification (fire and forget)
    supabase.functions
      .invoke("send-email", {
        body: {
          type: "new_request",
          studentId: currentUser.id,
          mentorId: mentor.id,
        },
      })
      .catch(console.error);

    setShowConnectModal(false);
    setInitialMessage("");
    setNotification({
      message: `Request sent! ${firstName} will respond soon.`,
      type: "success",
    });
    setTimeout(() => {
      setActiveTab("dashboard");
    }, 1500);
  };

  // Exam tag
  const examTag =
    mentor.current_organization
      ? mentor.exam_category || "Mentor"
      : mentor.exam_category === "CA"
      ? mentor.ca_stage || "CA"
      : mentor.exam_category === "UPSC"
      ? mentor.upsc_stage || "UPSC"
      : mentor.exam_category === "Banking" || mentor.exam_category === "Defense"
      ? mentor.target_exam || mentor.exam_category
      : mentor.exam_category === "CUET"
      ? mentor.target_college || "CUET"
      : mentor.exam_category === "Other"
      ? mentor.other_exam || "Other"
      : mentor.exam_category || mentor.branch || "Mentor";

  const isNewMentor = mentor.rating === null || mentor.rating === undefined;

  // College & Grad year subtitle
  const collegeSubtitle = mentor.current_organization
    ? mentor.current_organization
    : `${mentor.college_name || ""}${
        mentor.graduation_year ? ` · Class of ${mentor.graduation_year}` : ""
      }`;

  // Milestones parsing
  const parsedMilestones = parseMilestones(mentor.milestones);

  // Pricing info
  const isFree = FREE_MODE || (mentor.pricing && Object.keys(mentor.pricing).length === 0);

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FFFFFF] pb-24 relative overflow-x-hidden">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div
            className={`px-5 py-3 rounded-2xl shadow-2xl border text-sm font-semibold flex items-center gap-2.5 ${
              notification.type === "success"
                ? "bg-[#141417] text-[#4ADE80] border-[rgba(34,197,94,0.35)]"
                : "bg-[#141417] text-red-400 border-red-500/30"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 size={18} className="text-[#4ADE80]" />
            ) : (
              <X size={18} className="text-red-400" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* 1. Full-width gradient banner (about 230px) fading into page background */}
      <div className="relative w-full h-[230px] overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #FF9D2E 0%, #FF2D8F 38%, #A855F7 70%, #4F46E5 100%)",
          }}
        />
        {/* Smooth gradient fade to page background #09090B */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#09090B]/30 to-[#09090B]" />

        {/* Back button */}
        <div className="absolute top-6 left-4 sm:left-8 z-10">
          <button
            onClick={() => setActiveTab("find-mentor")}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#141417]/70 backdrop-blur-md text-[#D4D4D8] hover:text-white border border-[rgba(255,255,255,0.08)] text-xs font-medium transition-all group"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Directory
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* 2. Header Section: Avatar (168px desktop, 120px mobile) overlapping banner */}
        <div className="-mt-20 sm:-mt-24 relative z-20 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[rgba(255,255,255,0.08)]">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 text-center sm:text-left">
            {/* Avatar with gradient ring */}
            <div className="relative shrink-0">
              <div className="h-[120px] w-[120px] sm:h-[168px] sm:w-[168px] rounded-full p-[3px] sm:p-[4px] bg-gradient-to-tr from-[#FF9D2E] via-[#FF2D8F] to-[#4F46E5] shadow-2xl">
                <div className="h-full w-full rounded-full overflow-hidden bg-[#1C1C21] flex items-center justify-center">
                  {mentor.profile_photo_url ? (
                    <img
                      src={mentor.profile_photo_url}
                      alt={titleName}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = "none";
                        if (target.parentElement) {
                          target.parentElement.innerHTML = `<span class="text-4xl font-bold font-poppins text-white/90">${initials}</span>`;
                        }
                      }}
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[#1C1C21] to-[#2A2A32] flex items-center justify-center text-4xl font-bold font-poppins text-white/90">
                      {initials}
                    </div>
                  )}
                </div>
              </div>

              {/* Verified check badge on lower right */}
              {mentor.verified && (
                <div
                  className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-[#16A34A] border-4 border-[#09090B] flex items-center justify-center shadow-lg"
                  title="Verified Profile"
                >
                  <Check size={16} strokeWidth={3} className="text-white" />
                </div>
              )}
            </div>

            {/* Name, Subtitle, Pills */}
            <div className="space-y-3 min-w-0">
              <div>
                <h1 className="font-poppins text-2xl sm:text-[36px] font-bold text-white tracking-tight leading-tight">
                  {titleName}
                </h1>
                {collegeSubtitle && (
                  <p className="text-sm sm:text-base text-[#D4D4D8] mt-1 font-normal">
                    {collegeSubtitle}
                  </p>
                )}
              </div>

              {/* Pill row: New Mentor, location, exam, Verified pill */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {isNewMentor && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold text-[#C4A0FF] bg-[rgba(168,85,247,0.14)] border border-[rgba(168,85,247,0.4)]">
                    New Mentor
                  </span>
                )}
                {mentor.rating !== null && mentor.rating !== undefined && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#1C1C21] text-[#FFFFFF] border border-[rgba(255,255,255,0.08)]">
                    <Star size={13} className="text-[#FF9D2E] fill-[#FF9D2E]" />
                    <span>{mentor.rating.toFixed(1)}</span>
                  </div>
                )}
                {mentor.city && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#1C1C21] text-[#D4D4D8] border border-[rgba(255,255,255,0.08)]">
                    <MapPin size={12} className="text-[#A1A1AA]" />
                    {mentor.city}
                  </span>
                )}
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#1C1C21] text-[#D4D4D8] border border-[rgba(255,255,255,0.08)]">
                  {examTag}
                </span>

                {/* Single green Identity + College Verified pill */}
                {mentor.verified && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-[#4ADE80] bg-[rgba(34,197,94,0.12)] border border-[rgba(34,197,94,0.35)]">
                    <ShieldCheck size={14} className="shrink-0" />
                    Identity + College Verified
                  </span>
                )}
              </div>

              {/* Journey chips (small neutral chips under the pill row) */}
              {mentor.journey_tags && mentor.journey_tags.length > 0 && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                  {mentor.journey_tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-[#1C1C21] text-[#A1A1AA] border border-[rgba(255,255,255,0.06)]"
                    >
                      {JOURNEY_TAG_LABELS[tag] || tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Desktop CTA Pill: Connect with {firstName} */}
          <div className="hidden md:flex items-center self-end mb-1">
            <button
              onClick={handleConnectClick}
              disabled={connectLoading}
              className="brand-gradient-bg px-8 py-3.5 rounded-full text-white font-poppins font-bold text-base shadow-[0_4px_25px_rgba(255,45,143,0.25)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {connectLoading && <Loader2 size={18} className="animate-spin" />}
              Connect with {firstName}
            </button>
          </div>
        </div>

        {/* 3. Top Achievement Strip (full width under header, hidden if empty) */}
        {mentor.top_achievement && mentor.top_achievement.trim() !== "" && (
          <div className="gradient-border-box rounded-2xl p-4 sm:p-5 flex items-start sm:items-center gap-3.5 sm:gap-4 my-6">
            <div className="p-2 sm:p-2.5 rounded-xl bg-[#FF9D2E]/15 text-[#FF9D2E] shrink-0">
              <Trophy size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#FF9D2E]">
                Top Achievement
              </p>
              <p className="text-sm sm:text-base font-semibold text-white mt-0.5 leading-snug">
                {mentor.top_achievement}
              </p>
            </div>
          </div>
        )}

        {/* 4. Two-Column Layout Below */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
          {/* ---- Left Column Cards ---- */}
          <div className="lg:col-span-2 space-y-6">
            {/* "In my words" pull-quote card (hidden when empty) */}
            {mentor.help_statement && mentor.help_statement.trim() !== "" && (
              <div className="bg-[#141417] rounded-2xl p-6 border border-[rgba(255,255,255,0.08)] space-y-4">
                <h3 className="font-poppins text-lg font-bold text-white">In my words</h3>
                <div className="border-l-4 border-purple-500 pl-4 py-2 italic text-[#D4D4D8] text-base leading-relaxed bg-[#1C1C21]/50 rounded-r-xl">
                  "{mentor.help_statement}"
                </div>
              </div>
            )}

            {/* "My journey" (the existing bio/journey + vertical timeline) */}
            {((mentor.bio && mentor.bio.trim() !== "") || parsedMilestones.length > 0) && (
              <div className="bg-[#141417] rounded-2xl p-6 border border-[rgba(255,255,255,0.08)] space-y-5">
                <h3 className="font-poppins text-lg font-bold text-white">My journey</h3>

                {mentor.bio && mentor.bio.trim() !== "" && (
                  <p className="text-[#D4D4D8] text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                    {mentor.bio}
                  </p>
                )}

                {/* Vertical Timeline if milestones exist */}
                {parsedMilestones.length > 0 && (
                  <div className="pt-4 border-t border-[rgba(255,255,255,0.08)] space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
                      Career Milestones
                    </h4>
                    <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-[#FF9D2E] before:via-[#FF2D8F] before:to-[#A855F7]">
                      {parsedMilestones.map((m, idx) => (
                        <div key={idx} className="relative group">
                          {/* Timeline dot */}
                          <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full bg-[#1C1C21] border-2 border-[#FF9D2E]" />
                          {m.year && (
                            <span className="font-poppins font-bold text-xs text-[#FF9D2E] block">
                              {m.year}
                            </span>
                          )}
                          <p className="text-sm text-[#D4D4D8] mt-0.5 leading-relaxed font-medium">
                            {m.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* "Key achievements" list rows on #1C1C21 (hidden if empty) */}
            {mentor.achievements && mentor.achievements.length > 0 && (
              <div className="bg-[#141417] rounded-2xl p-6 border border-[rgba(255,255,255,0.08)] space-y-4">
                <div className="flex items-center gap-2">
                  <Trophy size={18} className="text-[#FF9D2E]" />
                  <h3 className="font-poppins text-lg font-bold text-white">Key achievements</h3>
                </div>
                <div className="space-y-2.5">
                  {mentor.achievements.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3.5 rounded-xl bg-[#1C1C21] border border-[rgba(255,255,255,0.06)]"
                    >
                      <div className="p-1 rounded-md bg-[#FF9D2E]/15 text-[#FF9D2E] shrink-0 mt-0.5">
                        <Check size={14} strokeWidth={3} />
                      </div>
                      <p className="text-sm text-[#D4D4D8] font-medium leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ---- Right Column (Sticky on Desktop) ---- */}
          <div className="space-y-6 lg:sticky lg:top-6 self-start">
            {/* Booking Card with Gradient Outline */}
            <div className="gradient-border-box rounded-2xl p-6 space-y-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
                  Session Price
                </p>
                <div className="mt-1">
                  {isFree ? (
                    <div>
                      <span className="font-poppins font-black text-3xl brand-gradient-text tracking-wide">
                        FREE
                      </span>
                      <p className="text-xs text-[#4ADE80] font-semibold mt-1">
                        Completely free 1:1 mentorship session
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-poppins font-black text-3xl text-white">
                          ₹{Object.values(mentor.pricing || {})[0] || "99"}
                        </span>
                        <span className="text-xs text-[#A1A1AA]">
                          / {Object.keys(mentor.pricing || {})[0] || "30 min"}
                        </span>
                      </div>
                      {mentor.free_intro_session && (
                        <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30">
                          Free 15-min Intro Available
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Availability */}
              {mentor.availability_time && (
                <div className="flex items-center gap-2.5 text-xs text-[#D4D4D8] pt-3 border-t border-[rgba(255,255,255,0.08)]">
                  <Clock size={15} className="text-[#FF9D2E] shrink-0" />
                  <span>Available: {mentor.availability_time}</span>
                </div>
              )}

              {/* Languages */}
              {mentor.languages_known && mentor.languages_known.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-[rgba(255,255,255,0.08)]">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#71717A]">
                    <Globe size={13} />
                    <span>Mentors in</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {mentor.languages_known.map((lang) => (
                      <span
                        key={lang}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#141417] text-[#D4D4D8] border border-[rgba(255,255,255,0.08)]"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Repeat Gradient CTA Button */}
              <button
                onClick={handleConnectClick}
                disabled={connectLoading}
                className="w-full brand-gradient-bg py-3.5 rounded-full text-white font-poppins font-bold text-sm shadow-[0_4px_20px_rgba(255,45,143,0.25)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {connectLoading && <Loader2 size={16} className="animate-spin" />}
                Connect with {firstName}
              </button>
            </div>

            {/* "Can help with" Chips Card (hidden if empty) */}
            {mentor.areas_of_expertise && mentor.areas_of_expertise.length > 0 && (
              <div className="bg-[#141417] rounded-2xl p-6 border border-[rgba(255,255,255,0.08)] space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
                  Can help with
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {mentor.areas_of_expertise.map((exp, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-[#1C1C21] text-[#D4D4D8] border border-[rgba(255,255,255,0.08)]"
                    >
                      {exp}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Verification Card */}
            <div className="bg-[#141417] rounded-2xl p-6 border border-[rgba(255,255,255,0.08)] space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
                Verification Status
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.25)]">
                  <div className="p-1 rounded-md bg-[#16A34A] text-white">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#4ADE80]">Identity Verified</p>
                    <p className="text-[11px] text-[#A1A1AA]">Govt. ID verified by Connectors</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.25)]">
                  <div className="p-1 rounded-md bg-[#16A34A] text-white">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#4ADE80]">College Verified</p>
                    <p className="text-[11px] text-[#A1A1AA]">
                      Student / Alumni credentials confirmed
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Mobile Sticky Bottom Bar (360px compatible) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-3.5 bg-[#141417]/95 backdrop-blur-md border-t border-[rgba(255,255,255,0.08)] md:hidden flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase font-bold text-[#71717A]">Session</p>
          <p className="font-poppins font-extrabold text-base brand-gradient-text">
            {isFree ? "FREE" : `₹${Object.values(mentor.pricing || {})[0] || "99"}`}
          </p>
        </div>
        <button
          onClick={handleConnectClick}
          disabled={connectLoading}
          className="brand-gradient-bg px-6 py-2.5 rounded-full text-white font-poppins font-bold text-sm shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {connectLoading && <Loader2 size={15} className="animate-spin" />}
          Connect
        </button>
      </div>

      {/* 6. Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] rounded-3xl w-full max-w-md p-6 sm:p-8 relative shadow-2xl animate-scale-in">
            <button
              onClick={() => setShowConnectModal(false)}
              className="absolute top-6 right-6 text-[#A1A1AA] hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl sm:text-2xl font-bold font-poppins text-white mb-1.5">
              Connect with {firstName}
            </h3>
            <p className="text-[#A1A1AA] text-xs sm:text-sm mb-5">
              Select your session duration and include a brief note about what you'd like guidance on.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-[#71717A] mb-2 uppercase tracking-wider">
                Session Duration
              </label>
              <div className="grid grid-cols-2 gap-2">
                {getAvailableDurations(mentor).map((opt) => (
                  <button
                    key={opt.mins}
                    type="button"
                    onClick={() => setSelectedDuration(opt.mins)}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      selectedDuration === opt.mins
                        ? "bg-gradient-to-r from-[#FF9D2E]/20 via-[#FF2D8F]/20 to-[#A855F7]/20 border-[#FF9D2E] text-white"
                        : "bg-[#141417] border-[rgba(255,255,255,0.08)] text-[#D4D4D8] hover:border-[rgba(255,255,255,0.2)]"
                    }`}
                  >
                    <p className="font-semibold text-sm">{opt.label}</p>
                    <p className="text-[11px] text-[#FF9D2E] font-medium mt-0.5">
                      {FREE_MODE ? "Free" : opt.priceText}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-bold text-[#71717A] mb-2 uppercase tracking-wider">
                Your Note / Goals (Optional)
              </label>
              <textarea
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                placeholder={`Hi ${firstName}, I'd love help with study planning and mock test strategies...`}
                className="w-full bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-xl p-3.5 text-white placeholder:text-[#71717A] text-sm focus:outline-none focus:border-purple-500/50 min-h-[100px] resize-none"
              />
            </div>

            <button
              onClick={handleSendRequest}
              disabled={connectLoading}
              className="w-full py-3.5 brand-gradient-bg rounded-full text-white font-poppins font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 shadow-lg shadow-purple-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {connectLoading && <Loader2 size={16} className="animate-spin" />}
              Send Request to {firstName}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
