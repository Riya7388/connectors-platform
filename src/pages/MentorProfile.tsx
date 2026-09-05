import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { 
  ShieldCheck, 
  Star, 
  MapPin, 
  MessageCircle,
  ChevronLeft,
  GraduationCap,
  X,
  Loader2,
  Trophy,
  Target
} from "lucide-react";

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
}

interface MentorProfileProps {
  id: string;
  setActiveTab: (tab: string) => void;
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
        <p className="text-on-surface-variant animate-pulse">Loading profile...</p>
      </div>
    );
  }

  if (error || !mentor) {
    return (
      <div className="min-h-screen bg-background py-16 px-6 flex flex-col items-center justify-center">
        <div className="glass-card p-10 rounded-3xl max-w-lg w-full text-center space-y-6 border border-white/5">
          <div className="w-20 h-20 bg-surface-container mx-auto rounded-full flex items-center justify-center">
            <ShieldCheck className="text-on-surface-variant/50" size={32} />
          </div>
          <h2 className="text-2xl font-bold">Profile Unavailable</h2>
          <p className="text-on-surface-variant">{error}</p>
          <button 
            onClick={() => setActiveTab("find-mentor")}
            className="px-6 py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors text-sm font-semibold mt-4"
          >
            ← Back to Mentors
          </button>
        </div>
      </div>
    );
  }

  // ✅ STATIC complete class strings — Tailwind JIT can scan these at build time.
  // DO NOT split into dynamic variables like `bg-${color}-500` — Tailwind won't detect those.
  const examCategoryClass: Record<string, string> = {
    JEE:     "bg-blue-500/20 text-blue-300 ring-blue-500/40",
    NEET:    "bg-green-500/20 text-green-300 ring-green-500/40",
    CA:      "bg-purple-500/20 text-purple-300 ring-purple-500/40",
    UPSC:    "bg-orange-500/20 text-orange-300 ring-orange-500/40",
    CAT:     "bg-pink-500/20 text-pink-300 ring-pink-500/40",
    CLAT:    "bg-teal-500/20 text-teal-300 ring-teal-500/40",
    Banking: "bg-yellow-500/20 text-yellow-300 ring-yellow-500/40",
    Defense: "bg-red-500/20 text-red-300 ring-red-500/40",
    CUET:    "bg-indigo-500/20 text-indigo-300 ring-indigo-500/40",
  };

  const renderMentorBadge = (m: Mentor) => {
    const displayTag = m.mentor_tag
      ? (m.mentor_tag === "Other" ? (m.mentor_tag_other || "Other") : m.mentor_tag)
      : m.exam_category;

    if (!displayTag) return null;

    let cls = "bg-amber-500/20 text-amber-300 ring-amber-500/40";
    if (m.mentor_tag && examCategoryClass[m.mentor_tag]) {
      cls = examCategoryClass[m.mentor_tag];
    } else if (!m.mentor_tag && m.exam_category && examCategoryClass[m.exam_category]) {
      cls = examCategoryClass[m.exam_category];
    }

    return (
      <span
        className={`absolute top-6 right-6 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ring-1 shadow-sm ${cls}`}
      >
        {displayTag}
      </span>
    );
  };

  const renderStars = (rating: number | null) => {
    if (rating === null) return <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">New Mentor</span>;
    return (
      <div className="flex items-center gap-1.5 bg-surface-container px-4 py-1.5 rounded-full border border-white/5">
        <Star className="text-amber-400 fill-amber-400" size={16} />
        <span className="font-bold text-sm">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const getStatus = (gradYear: number) => {
    const currentYear = new Date().getFullYear();
    return gradYear > currentYear ? "Student" : "Alumni";
  };

  const formatLastSeen = (isoDate: string | null | undefined): string | null => {
    if (!isoDate) return null;
    const now = Date.now();
    const then = new Date(isoDate).getTime();
    const diffMs = now - then;
    if (diffMs < 0) return null;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const formatPricing = (prices: Record<string, string> | null) => {
    if (!prices || Object.keys(prices).length === 0) return null;
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm font-medium text-on-surface-variant">
        {Object.entries(prices).map(([duration, price], index) => (
          <React.Fragment key={duration}>
            <span>
              <span className="text-on-surface">{duration}:</span> ₹{price}
            </span>
            {index < Object.entries(prices).length - 1 && <span className="opacity-30">•</span>}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const getAvailableDurations = (m: Mentor) => {
    let rawDurations: string[] = m.session_durations ?? [];
    if (rawDurations.length === 0 && m.pricing) {
      rawDurations = Object.keys(m.pricing);
    }
    if (rawDurations.length === 0) {
      rawDurations = ["15 min", "30 min"];
    }

    const sorted = [...rawDurations].sort((a, b) => parseInt(a) - parseInt(b));

    return sorted.map((durStr) => {
      const mins = parseInt(durStr);
      const label = mins >= 60 ? `${mins / 60} Hour${mins > 60 ? 's' : ''}` : `${mins} min`;
      const priceVal = m.pricing?.[durStr] || m.pricing?.[`${mins} min`];
      const isFree = mins === 15 && m.free_intro_session;
      const priceText = isFree ? "Free Intro" : (priceVal ? `₹${priceVal}` : "Custom");
      return { durStr, mins: String(mins), label, priceText };
    });
  };

  const handleConnectClick = async () => {
    if (!currentUser) {
      alert("Please login to connect with mentors.");
      setActiveTab("auth");
      return;
    }
    if (currentUser.id === mentor.user_id) {
      alert("You cannot connect with yourself.");
      return;
    }
    
    setConnectLoading(true);
    const { data: existingRequests, error } = await supabase
      .from("booking_requests")
      .select("id")
      .eq("student_id", currentUser.id)
      .eq("mentor_id", mentor.id)
      .in("status", ["pending", "accepted", "time_confirmed"]);

    if (error) {
      console.error("Error checking requests:", error);
      alert("Something went wrong. Please try again.");
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
      status: "pending"
    };

    let { error } = await supabase
      .from("booking_requests")
      .insert(payload)
      .select()
      .single();

    // Fallback if column migration hasn't been executed on Supabase yet
    if (error && error.message?.includes("requested_duration_minutes")) {
      delete payload.requested_duration_minutes;
      const fallback = await supabase
        .from("booking_requests")
        .insert(payload)
        .select()
        .single();
      error = fallback.error;
    }

    setConnectLoading(false);

    if (error) {
      console.error("Error creating request:", error);
      alert("Failed to send request.");
      return;
    }

    // Trigger email notification (fire and forget)
    supabase.functions.invoke('send-email', {
      body: {
        type: 'new_request',
        studentId: currentUser.id,
        mentorId: mentor.id,
      }
    }).catch(console.error);

    setShowConnectModal(false);
    setInitialMessage("");
    alert("Request sent! " + mentor.full_name.split(' ')[0] + " will respond soon.");
    setActiveTab("dashboard");
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-background pb-20 relative">
      {/* Abstract Background Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-[100%] blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10">
        <button 
          onClick={() => setActiveTab("find-mentor")}
          className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors text-sm font-medium mb-8 group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Directory
        </button>

        <div className="glass-card rounded-[2rem] border border-white/10 p-8 sm:p-12 relative overflow-hidden">
          {/* Mentor Tag / Category Badge — top-right of card */}
          {renderMentorBadge(mentor)}

          {/* Header Section */}
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="relative">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-surface-container ring-4 ring-primary/20 shadow-2xl">
                {mentor.profile_photo_url ? (
                  <img src={mentor.profile_photo_url} alt={mentor.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/40 to-secondary-container flex items-center justify-center text-4xl font-bold text-white/50">
                    {mentor.full_name.charAt(0)}
                  </div>
                )}
              </div>
              {mentor.verified && (
                <div className="absolute bottom-1 right-1 bg-green-500 text-white p-1.5 rounded-full border-4 border-surface-container shadow-lg" title="Verified Profile">
                  <ShieldCheck size={20} />
                </div>
              )}
            </div>

            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center justify-center gap-3">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-on-surface">{mentor.full_name}</h1>
                {mentor.is_online ? (
                  <span className="flex items-center gap-1.5 bg-green-500/15 border border-green-500/25 text-green-400 px-3 py-1 rounded-full text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Online
                  </span>
                ) : mentor.last_online_at ? (
                  <span className="text-xs text-on-surface-variant/60 font-medium">
                    Last seen {formatLastSeen(mentor.last_online_at)}
                  </span>
                ) : null}
              </div>
              <p className="text-on-surface-variant text-base sm:text-lg flex flex-wrap items-center justify-center gap-2">
                <GraduationCap size={18} className="text-primary/70" />
                {mentor.current_organization ? (
                  <>
                    <span>{mentor.current_organization}</span>
                    {mentor.years_of_experience && (
                      <>
                        <span className="opacity-30">•</span>
                        <span>{mentor.years_of_experience} Experience</span>
                      </>
                    )}
                    {mentor.exam_category && (
                      <>
                        <span className="opacity-30">•</span>
                        <span>{mentor.exam_category}</span>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {mentor.college_name && <span>{mentor.college_name}</span>}
                    {(mentor.college_name && (mentor.branch || mentor.ca_stage || mentor.upsc_stage || mentor.target_exam || mentor.target_college || mentor.other_exam)) && <span className="opacity-30">•</span>}
                    <span>
                    {mentor.exam_category === 'CA' ? mentor.ca_stage :
                     mentor.exam_category === 'UPSC' ? mentor.upsc_stage :
                     (mentor.exam_category === 'Banking' || mentor.exam_category === 'Defense') ? mentor.target_exam :
                     mentor.exam_category === 'CUET' ? mentor.target_college :
                     mentor.exam_category === 'Other' ? mentor.other_exam :
                     mentor.branch}
                    </span>
                    {mentor.graduation_year ? (
                      <>
                        <span className="opacity-30">•</span>
                        <span>Class of {mentor.graduation_year}</span>
                      </>
                    ) : null}
                  </>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              {renderStars(mentor.rating)}
              <div className="flex items-center gap-1.5 bg-surface-container px-4 py-1.5 rounded-full border border-white/5 text-sm">
                <MapPin className="text-on-surface-variant" size={14} />
                <span>{mentor.city || "India"}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-surface-container px-4 py-1.5 rounded-full border border-white/5 text-sm font-medium">
                {getStatus(mentor.graduation_year)}
              </div>
              {mentor.availability_time && (
                <div className="flex items-center gap-1.5 bg-surface-container px-4 py-1.5 rounded-full border border-white/5 text-sm">
                  <span>🕒</span>
                  <span>Free: {mentor.availability_time}</span>
                </div>
              )}
            </div>

            <div className="pt-4 space-y-3 w-full">
              {formatPricing(mentor.pricing)}
              {mentor.free_intro_session && (
                <div className="inline-block bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                  Free Intro Session Available
                </div>
              )}
            </div>

            <button 
              onClick={handleConnectClick}
              disabled={connectLoading}
              className="mt-6 px-10 py-4 brand-gradient-bg rounded-full text-white font-extrabold text-lg shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] hover:scale-105 transition-all w-full sm:w-auto disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {connectLoading && <Loader2 size={20} className="animate-spin" />}
              Connect with {mentor.full_name.split(' ')[0]}
            </button>
          </div>

          <hr className="border-white/10 my-10" />

          {/* Details Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Bio & Achievements */}
            <div className="md:col-span-2 space-y-8">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
                  <MessageCircle className="text-primary" size={20} />
                  About {mentor.full_name.split(' ')[0]}
                </h3>
                <div className="text-on-surface-variant leading-relaxed space-y-4 whitespace-pre-wrap bg-surface-container-low/50 p-6 rounded-2xl border border-white/5">
                  {mentor.bio ? mentor.bio : "This mentor hasn't added a bio yet."}
                </div>
              </div>

              {/* Achievements (rendered only if present and non-empty) */}
              {mentor.achievements && mentor.achievements.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
                    <Trophy className="text-amber-400" size={20} />
                    Key Achievements
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {mentor.achievements.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 bg-surface-container-low/50 p-4 rounded-xl border border-white/5 hover:border-amber-400/20 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-amber-400/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                          {idx + 1}
                        </div>
                        <p className="text-sm text-on-surface-variant leading-relaxed font-medium">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Goals & Targets (rendered only if present and non-empty) */}
              {mentor.goals && mentor.goals.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
                    <Target className="text-primary" size={20} />
                    Currently Working Towards
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {mentor.goals.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 bg-surface-container-low/50 p-4 rounded-xl border border-white/5 hover:border-primary/20 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                          {idx + 1}
                        </div>
                        <p className="text-sm text-on-surface-variant leading-relaxed font-medium">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Details */}
            <div className="space-y-8">
              {mentor.areas_of_expertise && mentor.areas_of_expertise.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">Areas of Expertise</h4>
                  <div className="flex flex-wrap gap-2">
                    {mentor.areas_of_expertise.map((exp, idx) => (
                      <span key={idx} className="bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-lg text-sm font-medium">
                        {exp}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {mentor.languages_known && mentor.languages_known.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">Languages I Can Mentor In</h4>
                  <div className="flex flex-wrap gap-2">
                    {mentor.languages_known.map((lang, idx) => (
                      <span key={idx} className="bg-surface-container-high border border-white/10 text-on-surface-variant px-3 py-1.5 rounded-lg text-sm">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                 <h4 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">Verification</h4>
                 <div className="flex flex-col gap-2">
                   <div className="flex items-center gap-3 bg-surface-container p-3 rounded-xl border border-green-500/20">
                     <div className="bg-green-500/20 text-green-500 p-2 rounded-lg">
                       <ShieldCheck size={16} />
                     </div>
                     <span className="text-sm font-medium text-on-surface">Identity Verified</span>
                   </div>
                   <div className="flex items-center gap-3 bg-surface-container p-3 rounded-xl border border-green-500/20">
                     <div className="bg-green-500/20 text-green-500 p-2 rounded-lg">
                       <GraduationCap size={16} />
                     </div>
                     <span className="text-sm font-medium text-on-surface">College Verified</span>
                   </div>
                 </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container border border-white/10 rounded-3xl w-full max-w-md p-6 sm:p-8 relative shadow-2xl animate-scale-in">
            <button 
              onClick={() => setShowConnectModal(false)}
              className="absolute top-6 right-6 text-on-surface-variant hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            
            <h3 className="text-2xl font-bold text-on-surface mb-2">Send a request to {mentor.full_name.split(' ')[0]}</h3>
            <p className="text-on-surface-variant text-sm mb-6">Select your session duration and include a brief message about what you'd like to discuss.</p>

            <div className="mb-5">
              <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-wider">
                Select Session Duration
              </label>
              <select
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(e.target.value)}
                className="w-full bg-surface-container-low border border-white/10 rounded-2xl p-3.5 text-on-surface font-semibold focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 cursor-pointer"
              >
                {getAvailableDurations(mentor).map((opt) => (
                  <option key={opt.mins} value={opt.mins} className="bg-surface-container text-on-surface font-medium">
                    {opt.label} — {opt.priceText}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="Hi, I'm interested in..."
              className="w-full bg-surface-container-low border border-white/10 rounded-2xl p-4 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 min-h-[120px] resize-none mb-6"
            ></textarea>
            
            <button
              onClick={handleSendRequest}
              disabled={connectLoading}
              className="w-full py-3 brand-gradient-bg rounded-xl text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {connectLoading && <Loader2 size={18} className="animate-spin" />}
              Send Request
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
