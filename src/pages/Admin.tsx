import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import type { 
  Speaker, 
  CareerMilestone, 
  SpeakerType, 
  WorkshopSession, 
  SessionAccessType, 
  SessionStatus, 
  SessionDuration,
  SessionRegistration 
} from "../types/workshop";
import { FileUpload } from "../components/FileUpload";
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Users, 
  Calendar, 
  Building2, 
  GraduationCap, 
  Sparkles,
  Loader2,
  ExternalLink,
  Tag,
  Video,
  Clock,
  Mic2,
  IndianRupee,
  Link2,
  Copy,
  Layers,
  ClipboardList,
  Download
} from "lucide-react";

interface AdminProps {
  setActiveTab: (tab: string) => void;
  isAdmin: boolean;
}

// ---------------------------------------------------------------------------
// Speaker Form Data & Initial State
// ---------------------------------------------------------------------------
interface SpeakerFormData {
  full_name: string;
  headline: string;
  photo_url: string;
  speaker_type: SpeakerType;
  batch_year: string;
  branch: string;
  current_role: string;
  current_company: string;
  linkedin_url: string;
  my_journey: string;
  career_milestones: CareerMilestone[];
  areas_of_expertise: string[];
  mentoring_note: string;
  is_published: boolean;
}

const initialSpeakerFormData: SpeakerFormData = {
  full_name: "",
  headline: "",
  photo_url: "",
  speaker_type: "alumni",
  batch_year: "",
  branch: "",
  current_role: "",
  current_company: "",
  linkedin_url: "",
  my_journey: "",
  career_milestones: [],
  areas_of_expertise: [],
  mentoring_note: "",
  is_published: false,
};

// ---------------------------------------------------------------------------
// Session Form Data & Initial State
// ---------------------------------------------------------------------------
interface SessionFormData {
  title: string;
  description: string;
  speaker_id: string;
  session_date: string;
  start_time: string;
  duration_minutes: SessionDuration;
  access_type: SessionAccessType;
  price_inr: string; // in Rupees for user input
  capacity: string;
  meet_link: string;
  cover_image_url: string;
  status: SessionStatus;
}

const initialSessionFormData: SessionFormData = {
  title: "",
  description: "",
  speaker_id: "",
  session_date: "",
  start_time: "18:00",
  duration_minutes: 60,
  access_type: "free_for_all",
  price_inr: "0",
  capacity: "",
  meet_link: "",
  cover_image_url: "",
  status: "upcoming",
};

export const Admin: React.FC<AdminProps> = ({ setActiveTab, isAdmin }) => {
  const [adminSection, setAdminSection] = useState<"speakers" | "sessions" | "registrations">("sessions");
  
  // Speakers State
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [speakersLoading, setSpeakersLoading] = useState(true);
  const [isSpeakerModalOpen, setIsSpeakerModalOpen] = useState(false);
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);
  const [speakerFormData, setSpeakerFormData] = useState<SpeakerFormData>(initialSpeakerFormData);
  const [expertiseInput, setExpertiseInput] = useState("");
  const [deletingSpeaker, setDeletingSpeaker] = useState<Speaker | null>(null);

  // Sessions State
  const [sessions, setSessions] = useState<WorkshopSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionFilter, setSessionFilter] = useState<"all" | SessionStatus>("all");
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [sessionFormData, setSessionFormData] = useState<SessionFormData>(initialSessionFormData);
  const [deletingSession, setDeletingSession] = useState<WorkshopSession | null>(null);

  // Registrations State
  const [registrations, setRegistrations] = useState<SessionRegistration[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(true);
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<string>("all");

  // Common UI states
  const [submitting, setSubmitting] = useState(false);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchSpeakers();
      fetchSessions();
      fetchRegistrations();
    }
  }, [isAdmin]);

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------
  const fetchSpeakers = async () => {
    setSpeakersLoading(true);
    try {
      const { data, error } = await supabase
        .from("speakers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSpeakers((data as Speaker[]) || []);
    } catch (err: any) {
      console.error("Error fetching speakers:", err);
      setErrorMsg("Failed to load speakers.");
    } finally {
      setSpeakersLoading(false);
    }
  };

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const { data, error } = await supabase
        .from("workshop_sessions")
        .select(`
          *,
          speaker:speakers(
            id,
            full_name,
            headline,
            photo_url,
            speaker_type
          )
        `)
        .order("session_date", { ascending: false })
        .order("start_time", { ascending: false });

      if (error) throw error;
      setSessions((data as unknown as WorkshopSession[]) || []);
    } catch (err: any) {
      console.error("Error fetching sessions:", err);
      setErrorMsg("Failed to load sessions.");
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchRegistrations = async () => {
    setRegistrationsLoading(true);
    try {
      const { data, error } = await supabase
        .from("session_registrations")
        .select(`
          *,
          session:workshop_sessions(
            id,
            title,
            session_date,
            start_time
          )
        `)
        .order("registered_at", { ascending: false });

      if (error) throw error;
      setRegistrations((data as SessionRegistration[]) || []);
    } catch (err: any) {
      console.error("Error fetching registrations:", err);
      setErrorMsg("Failed to load registrations.");
    } finally {
      setRegistrationsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Speakers Handlers
  // ---------------------------------------------------------------------------
  const handleOpenCreateSpeaker = () => {
    setEditingSpeakerId(null);
    setSpeakerFormData(initialSpeakerFormData);
    setExpertiseInput("");
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSpeakerModalOpen(true);
  };

  const handleOpenEditSpeaker = (speaker: Speaker) => {
    setEditingSpeakerId(speaker.id);
    setSpeakerFormData({
      full_name: speaker.full_name || "",
      headline: speaker.headline || "",
      photo_url: speaker.photo_url || "",
      speaker_type: speaker.speaker_type || "alumni",
      batch_year: speaker.batch_year || "",
      branch: speaker.branch || "",
      current_role: speaker.current_role || "",
      current_company: speaker.current_company || "",
      linkedin_url: speaker.linkedin_url || "",
      my_journey: speaker.my_journey || "",
      career_milestones: Array.isArray(speaker.career_milestones) ? speaker.career_milestones : [],
      areas_of_expertise: Array.isArray(speaker.areas_of_expertise) ? speaker.areas_of_expertise : [],
      mentoring_note: speaker.mentoring_note || "",
      is_published: !!speaker.is_published,
    });
    setExpertiseInput("");
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSpeakerModalOpen(true);
  };

  const handleAddMilestone = () => {
    setSpeakerFormData((prev) => ({
      ...prev,
      career_milestones: [
        ...prev.career_milestones,
        { year: "", title: "", description: "" },
      ],
    }));
  };

  const handleMilestoneChange = (index: number, field: keyof CareerMilestone, value: string) => {
    setSpeakerFormData((prev) => {
      const updated = [...prev.career_milestones];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, career_milestones: updated };
    });
  };

  const handleRemoveMilestone = (index: number) => {
    setSpeakerFormData((prev) => ({
      ...prev,
      career_milestones: prev.career_milestones.filter((_, i) => i !== index),
    }));
  };

  const handleAddExpertise = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = expertiseInput.trim();
      if (val && !speakerFormData.areas_of_expertise.includes(val)) {
        setSpeakerFormData((prev) => ({
          ...prev,
          areas_of_expertise: [...prev.areas_of_expertise, val],
        }));
        setExpertiseInput("");
      }
    }
  };

  const handleRemoveExpertise = (chip: string) => {
    setSpeakerFormData((prev) => ({
      ...prev,
      areas_of_expertise: prev.areas_of_expertise.filter((item) => item !== chip),
    }));
  };

  const handleSubmitSpeaker = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!speakerFormData.full_name.trim()) {
      setErrorMsg("Full name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        full_name: speakerFormData.full_name.trim(),
        headline: speakerFormData.headline.trim() || null,
        photo_url: speakerFormData.photo_url || null,
        speaker_type: speakerFormData.speaker_type,
        batch_year: speakerFormData.batch_year.trim() || null,
        branch: speakerFormData.branch.trim() || null,
        current_role: speakerFormData.current_role.trim() || null,
        current_company: speakerFormData.current_company.trim() || null,
        linkedin_url: speakerFormData.linkedin_url.trim() || null,
        my_journey: speakerFormData.my_journey.trim() || null,
        career_milestones: speakerFormData.career_milestones.filter(m => m.year || m.title),
        areas_of_expertise: speakerFormData.areas_of_expertise,
        mentoring_note: speakerFormData.mentoring_note.trim() || null,
        is_published: speakerFormData.is_published,
        updated_at: new Date().toISOString(),
      };

      if (editingSpeakerId) {
        const { error } = await supabase
          .from("speakers")
          .update(payload)
          .eq("id", editingSpeakerId);
        if (error) throw error;
        setSuccessMsg("Speaker updated successfully!");
      } else {
        const { error } = await supabase
          .from("speakers")
          .insert([payload]);
        if (error) throw error;
        setSuccessMsg("Speaker created successfully!");
      }

      await fetchSpeakers();
      setTimeout(() => setIsSpeakerModalOpen(false), 600);
    } catch (err: any) {
      console.error("Error saving speaker:", err);
      setErrorMsg(err.message || "Failed to save speaker.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSpeaker = async () => {
    if (!deletingSpeaker) return;
    setDeletingLoading(true);
    try {
      const { error } = await supabase
        .from("speakers")
        .delete()
        .eq("id", deletingSpeaker.id);
      if (error) throw error;
      setDeletingSpeaker(null);
      await fetchSpeakers();
    } catch (err: any) {
      console.error("Error deleting speaker:", err);
      setErrorMsg("Failed to delete speaker.");
    } finally {
      setDeletingLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Sessions Handlers
  // ---------------------------------------------------------------------------
  const handleOpenCreateSession = () => {
    setEditingSessionId(null);
    setSessionFormData(initialSessionFormData);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSessionModalOpen(true);
  };

  const handleOpenEditSession = (session: WorkshopSession) => {
    setEditingSessionId(session.id);
    const inrVal = session.price_amount ? (session.price_amount / 100).toString() : "0";

    setSessionFormData({
      title: session.title || "",
      description: session.description || "",
      speaker_id: session.speaker_id || "",
      session_date: session.session_date || "",
      start_time: session.start_time ? session.start_time.substring(0, 5) : "18:00",
      duration_minutes: session.duration_minutes || 60,
      access_type: session.access_type || "free_for_all",
      price_inr: inrVal,
      capacity: session.capacity ? session.capacity.toString() : "",
      meet_link: session.meet_link || "",
      cover_image_url: session.cover_image_url || "",
      status: session.status || "upcoming",
    });
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSessionModalOpen(true);
  };

  const handleSubmitSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!sessionFormData.title.trim()) {
      setErrorMsg("Session title is required.");
      return;
    }
    if (!sessionFormData.session_date) {
      setErrorMsg("Session date is required.");
      return;
    }
    if (!sessionFormData.start_time) {
      setErrorMsg("Start time is required.");
      return;
    }

    // Convert price to paise (rupees * 100)
    let priceAmountPaise = 0;
    if (sessionFormData.access_type === "nit_free_others_paid") {
      const parsedInr = parseFloat(sessionFormData.price_inr);
      if (isNaN(parsedInr) || parsedInr < 0) {
        setErrorMsg("Please enter a valid price for non-NIT participants.");
        return;
      }
      priceAmountPaise = Math.round(parsedInr * 100);
    }

    setSubmitting(true);
    try {
      const payload = {
        title: sessionFormData.title.trim(),
        description: sessionFormData.description.trim() || null,
        speaker_id: sessionFormData.speaker_id || null,
        session_date: sessionFormData.session_date,
        start_time: sessionFormData.start_time.length === 5 ? `${sessionFormData.start_time}:00` : sessionFormData.start_time,
        duration_minutes: sessionFormData.duration_minutes,
        access_type: sessionFormData.access_type,
        price_amount: priceAmountPaise,
        meet_link: sessionFormData.meet_link.trim() || null,
        capacity: sessionFormData.capacity ? parseInt(sessionFormData.capacity, 10) : null,
        cover_image_url: sessionFormData.cover_image_url || null,
        status: sessionFormData.status,
        updated_at: new Date().toISOString(),
      };

      if (editingSessionId) {
        const { error } = await supabase
          .from("workshop_sessions")
          .update(payload)
          .eq("id", editingSessionId);
        if (error) throw error;
        setSuccessMsg("Session updated successfully!");
      } else {
        const { error } = await supabase
          .from("workshop_sessions")
          .insert([payload]);
        if (error) throw error;
        setSuccessMsg("Session created successfully!");
      }

      await fetchSessions();
      setTimeout(() => setIsSessionModalOpen(false), 600);
    } catch (err: any) {
      console.error("Error saving session:", err);
      setErrorMsg(err.message || "Failed to save session.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!deletingSession) return;
    setDeletingLoading(true);
    try {
      const { error } = await supabase
        .from("workshop_sessions")
        .delete()
        .eq("id", deletingSession.id);
      if (error) throw error;
      setDeletingSession(null);
      await fetchSessions();
    } catch (err: any) {
      console.error("Error deleting session:", err);
      setErrorMsg("Failed to delete session.");
    } finally {
      setDeletingLoading(false);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    if (sessionFilter === "all") return true;
    return s.status === sessionFilter;
  });

  const filteredRegistrations = registrations.filter((r) => {
    if (selectedSessionFilter === "all") return true;
    return r.session_id === selectedSessionFilter;
  });

  const nitCount = filteredRegistrations.filter((r) => r.is_nit_verified).length;
  const nonNitCount = filteredRegistrations.filter((r) => !r.is_nit_verified).length;

  const handleExportCSV = () => {
    if (filteredRegistrations.length === 0) return;

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const headers = [
      "Full Name",
      "Email",
      "Phone",
      "Class / Year",
      "NIT Verified",
      "Payment Status",
      "Amount Paid",
      "Question for Speaker",
      "Session Title",
      "Session Date",
      "Registered At"
    ];

    const rows = filteredRegistrations.map((r) => [
      escapeCsv(r.full_name),
      escapeCsv(r.email),
      escapeCsv(r.phone),
      escapeCsv(r.year_or_class),
      escapeCsv(r.is_nit_verified ? "Yes" : "No"),
      escapeCsv(r.payment_status),
      escapeCsv(r.amount_paid),
      escapeCsv(r.question_for_speaker),
      escapeCsv(r.session?.title || (sessions.find(s => s.id === r.session_id)?.title || "")),
      escapeCsv(r.session?.session_date || (sessions.find(s => s.id === r.session_id)?.session_date || "")),
      escapeCsv(r.registered_at)
    ]);

    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const selectedSessionObj = sessions.find(s => s.id === selectedSessionFilter);
    const filenameSlug = selectedSessionObj
      ? selectedSessionObj.title.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 30)
      : "all_sessions";

    link.setAttribute("href", url);
    link.setAttribute("download", `session_registrations_${filenameSlug}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center bg-[#09090B] text-white">
        <div className="w-16 h-16 rounded-2xl bg-[#141417] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-red-400 mb-4 shadow-xl">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">Not Authorised</h2>
        <p className="text-[#A1A1AA] max-w-md mb-6">
          You do not have administrative privileges to view this section.
        </p>
        <button
          onClick={() => setActiveTab("home")}
          className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] text-white hover:border-[rgba(255,255,255,0.24)] transition-all"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Admin Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.08)] pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-[rgba(168,85,247,0.15)] text-[#A855F7] border border-[rgba(168,85,247,0.3)]">
                Admin Console
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-white">
              Workshop Management
            </h1>
            <p className="text-sm text-[#A1A1AA] mt-1">
              Manage workshop sessions, schedules, speaker profiles, and live links.
            </p>
          </div>

          {/* Section Switcher & Action Button */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex bg-[#141417] p-1 rounded-xl border border-[rgba(255,255,255,0.08)]">
              <button
                onClick={() => setAdminSection("sessions")}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  adminSection === "sessions"
                    ? "bg-[#1C1C21] text-white border border-[rgba(255,255,255,0.12)] shadow-sm"
                    : "text-[#A1A1AA] hover:text-white"
                }`}
              >
                <Video size={14} /> Sessions ({sessions.length})
              </button>
              <button
                onClick={() => setAdminSection("speakers")}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  adminSection === "speakers"
                    ? "bg-[#1C1C21] text-white border border-[rgba(255,255,255,0.12)] shadow-sm"
                    : "text-[#A1A1AA] hover:text-white"
                }`}
              >
                <Users size={14} /> Speakers ({speakers.length})
              </button>
              <button
                onClick={() => setAdminSection("registrations")}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  adminSection === "registrations"
                    ? "bg-[#1C1C21] text-white border border-[rgba(255,255,255,0.12)] shadow-sm"
                    : "text-[#A1A1AA] hover:text-white"
                }`}
              >
                <ClipboardList size={14} /> Registrations ({registrations.length})
              </button>
            </div>

            {adminSection === "sessions" ? (
              <button
                onClick={handleOpenCreateSession}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #FF9D2E 0%, #FF2D8F 38%, #A855F7 70%, #4F46E5 100%)"
                }}
              >
                <Plus size={18} />
                Create Session
              </button>
            ) : adminSection === "speakers" ? (
              <button
                onClick={handleOpenCreateSpeaker}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #FF9D2E 0%, #FF2D8F 38%, #A855F7 70%, #4F46E5 100%)"
                }}
              >
                <Plus size={18} />
                Add Speaker
              </button>
            ) : (
              <button
                onClick={handleExportCSV}
                disabled={filteredRegistrations.length === 0}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #FF9D2E 0%, #FF2D8F 38%, #A855F7 70%, #4F46E5 100%)"
                }}
              >
                <Download size={18} />
                Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Global Feedback Messages */}
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

        {/* ========================================================================= */}
        {/* SESSIONS SECTION */}
        {/* ========================================================================= */}
        {adminSection === "sessions" && (
          <div className="space-y-6">
            {/* Status Filters */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {(["all", "upcoming", "live", "completed", "cancelled"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setSessionFilter(st)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${
                      sessionFilter === st
                        ? "bg-[rgba(168,85,247,0.15)] text-[#A855F7] border border-[rgba(168,85,247,0.3)]"
                        : "bg-[#141417] text-[#A1A1AA] border border-[rgba(255,255,255,0.08)] hover:text-white"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <span className="text-xs text-[#71717A]">
                Showing {filteredSessions.length} sessions
              </span>
            </div>

            {sessionsLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#A855F7]" />
                <p className="text-sm text-[#A1A1AA]">Loading sessions...</p>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#1C1C21] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#A855F7] mx-auto mb-4">
                  <Video size={30} />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">No sessions found</h3>
                <p className="text-sm text-[#A1A1AA] max-w-sm mx-auto mb-6">
                  {sessionFilter === "all"
                    ? "Get started by creating your first workshop session."
                    : `No sessions found matching "${sessionFilter}".`}
                </p>
                {sessionFilter === "all" && (
                  <button
                    onClick={handleOpenCreateSession}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white"
                    style={{
                      background: "linear-gradient(135deg, #FF9D2E 0%, #FF2D8F 38%, #A855F7 70%, #4F46E5 100%)"
                    }}
                  >
                    <Plus size={18} /> Create First Session
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredSessions.map((session) => {
                  const isFree = session.access_type === "free_for_all";
                  const priceInr = Math.round((session.price_amount || 0) / 100);

                  return (
                    <div
                      key={session.id}
                      className="bg-[#141417] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] transition-all rounded-2xl p-5 flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        {/* Top Status & Access row */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
                              isFree
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : "bg-[rgba(168,85,247,0.1)] text-[#A855F7] border-[rgba(168,85,247,0.25)]"
                            }`}
                          >
                            {isFree ? "Free for All" : `NIT Free • ₹${priceInr}`}
                          </span>

                          <span
                            className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
                              session.status === "live"
                                ? "bg-red-500/15 text-red-400 border-red-500/30 animate-pulse"
                                : session.status === "upcoming"
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                                : session.status === "completed"
                                ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {session.status}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="font-bold text-base text-white line-clamp-2 leading-snug">
                          {session.title}
                        </h4>

                        {/* Schedule & Duration */}
                        <div className="space-y-1.5 text-xs text-[#A1A1AA] pt-1">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-[#FF9D2E]" />
                            <span>{session.session_date} at {session.start_time.substring(0, 5)} IST</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock size={13} className="text-[#FF2D8F]" />
                            <span>{session.duration_minutes} minutes duration</span>
                          </div>
                        </div>

                        {/* Speaker info */}
                        {session.speaker ? (
                          <div className="flex items-center gap-2.5 pt-2 border-t border-[rgba(255,255,255,0.06)]">
                            <div className="w-7 h-7 rounded-full bg-[#1C1C21] overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-[#A855F7]">
                              {session.speaker.photo_url ? (
                                <img src={session.speaker.photo_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                session.speaker.full_name.charAt(0)
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{session.speaker.full_name}</p>
                              <p className="text-[11px] text-[#71717A] truncate">{session.speaker.headline || session.speaker.speaker_type}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-[#71717A] italic pt-1">
                            No speaker assigned
                          </div>
                        )}

                        {/* Meet link notice */}
                        {session.meet_link ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                            <Link2 size={12} />
                            <span className="truncate">Meet link configured</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#71717A] bg-[#1C1C21] px-2.5 py-1 rounded-lg border border-[rgba(255,255,255,0.06)]">
                            <AlertCircle size={12} />
                            <span>No Meet link yet</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="pt-3 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditSession(session)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-[#1C1C21] text-[#A855F7] hover:bg-[rgba(168,85,247,0.15)] border border-[rgba(255,255,255,0.08)] transition-colors"
                        >
                          <Edit3 size={14} /> Edit Session
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingSession(session)}
                          className="p-2 rounded-xl text-xs font-semibold bg-[#1C1C21] text-red-400 hover:bg-red-500/15 border border-[rgba(255,255,255,0.08)] transition-colors"
                          title="Delete Session"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SPEAKERS SECTION */}
        {/* ========================================================================= */}
        {adminSection === "speakers" && (
          <div className="space-y-6">
            {speakersLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#A855F7]" />
                <p className="text-sm text-[#A1A1AA]">Loading speakers...</p>
              </div>
            ) : speakers.length === 0 ? (
              <div className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#1C1C21] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#A855F7] mx-auto mb-4">
                  <Users size={30} />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">No speakers yet</h3>
                <p className="text-sm text-[#A1A1AA] max-w-sm mx-auto mb-6">
                  Get started by adding your first speaker profile for upcoming workshops.
                </p>
                <button
                  onClick={handleOpenCreateSpeaker}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white"
                  style={{
                    background: "linear-gradient(135deg, #FF9D2E 0%, #FF2D8F 38%, #A855F7 70%, #4F46E5 100%)"
                  }}
                >
                  <Plus size={18} /> Add First Speaker
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {speakers.map((spk) => (
                  <div
                    key={spk.id}
                    className="bg-[#141417] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] transition-all rounded-2xl p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Top info row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] shrink-0 flex items-center justify-center">
                            {spk.photo_url ? (
                              <img
                                src={spk.photo_url}
                                alt={spk.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-base font-bold text-[#A855F7]">
                                {spk.full_name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-base text-white line-clamp-1">
                              {spk.full_name}
                            </h4>
                            <p className="text-xs text-[#A1A1AA] line-clamp-1">
                              {spk.headline || "No headline"}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                            spk.is_published
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
                          }`}
                        >
                          {spk.is_published ? "Published" : "Draft"}
                        </span>
                      </div>

                      {/* Metadata Chips */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#1C1C21] text-[#A1A1AA] capitalize border border-[rgba(255,255,255,0.08)]">
                          {spk.speaker_type}
                        </span>
                        {spk.batch_year && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[rgba(168,85,247,0.1)] text-[#A855F7] border border-[rgba(168,85,247,0.2)]">
                            Batch {spk.batch_year}
                          </span>
                        )}
                        {spk.current_company && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#1C1C21] text-white border border-[rgba(255,255,255,0.08)]">
                            {spk.current_company}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab(`speaker-profile/${spk.id}`)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-[#1C1C21] text-[#A1A1AA] hover:text-white hover:border-[rgba(255,255,255,0.2)] border border-[rgba(255,255,255,0.08)] transition-colors"
                      >
                        <Eye size={14} /> Preview
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditSpeaker(spk)}
                        className="p-2 rounded-xl text-xs font-semibold bg-[#1C1C21] text-[#A855F7] hover:bg-[rgba(168,85,247,0.15)] border border-[rgba(255,255,255,0.08)] transition-colors"
                        title="Edit Speaker"
                      >
                        <Edit3 size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingSpeaker(spk)}
                        className="p-2 rounded-xl text-xs font-semibold bg-[#1C1C21] text-red-400 hover:bg-red-500/15 border border-[rgba(255,255,255,0.08)] transition-colors"
                        title="Delete Speaker"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* REGISTRATIONS SECTION */}
        {/* ========================================================================= */}
        {adminSection === "registrations" && (
          <div className="space-y-6">
            {/* Filter & Refresh Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141417] p-4 rounded-2xl border border-[rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-3 flex-1 max-w-md">
                <label className="text-xs font-semibold text-[#A1A1AA] shrink-0">
                  Filter Session:
                </label>
                <select
                  value={selectedSessionFilter}
                  onChange={(e) => setSelectedSessionFilter(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#1C1C21] border border-[rgba(255,255,255,0.08)] text-white text-xs font-medium focus:outline-none focus:border-[#A855F7]"
                >
                  <option value="all">All Sessions ({sessions.length})</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.session_date})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchRegistrations}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#1C1C21] border border-[rgba(255,255,255,0.08)] text-[#A1A1AA] hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-all flex items-center gap-1.5"
                >
                  <Loader2 size={13} className={registrationsLoading ? "animate-spin" : ""} />
                  Refresh Data
                </button>

                <button
                  onClick={handleExportCSV}
                  disabled={filteredRegistrations.length === 0}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] text-white hover:bg-[#25252b] transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download size={13} />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl p-5 space-y-1">
                <p className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
                  Total Registrations
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-white">
                  {filteredRegistrations.length}
                </p>
                <p className="text-[11px] text-[#71717A]">
                  {selectedSessionFilter === "all" ? "Across all sessions" : "For selected session"}
                </p>
              </div>

              <div className="bg-[#141417] border border-emerald-500/20 rounded-2xl p-5 space-y-1">
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> NIT Raipur Verified
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
                  {nitCount}
                </p>
                <p className="text-[11px] text-[#71717A]">
                  {filteredRegistrations.length > 0
                    ? `${Math.round((nitCount / filteredRegistrations.length) * 100)}% of registrants`
                    : "0%"}
                </p>
              </div>

              <div className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl p-5 space-y-1">
                <p className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
                  Non-NIT Attendees
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-white">
                  {nonNitCount}
                </p>
                <p className="text-[11px] text-[#71717A]">External participants</p>
              </div>
            </div>

            {/* Registrations Table */}
            {registrationsLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#A855F7]" />
                <p className="text-sm text-[#A1A1AA]">Loading registrations...</p>
              </div>
            ) : filteredRegistrations.length === 0 ? (
              <div className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#1C1C21] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#A855F7] mx-auto mb-4">
                  <Users size={30} />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">No registrations found</h3>
                <p className="text-sm text-[#A1A1AA] max-w-sm mx-auto">
                  {selectedSessionFilter === "all"
                    ? "No users have registered for any sessions yet."
                    : "No users have registered for this session yet."}
                </p>
              </div>
            ) : (
              <div className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#A1A1AA]">
                    <thead className="bg-[#1C1C21] text-[#A1A1AA] uppercase font-bold text-[10px] tracking-wider border-b border-[rgba(255,255,255,0.08)]">
                      <tr>
                        <th className="py-3.5 px-4">Name</th>
                        <th className="py-3.5 px-4">Email</th>
                        <th className="py-3.5 px-4">Phone</th>
                        <th className="py-3.5 px-4">Class / Year</th>
                        <th className="py-3.5 px-4">NIT Badge</th>
                        <th className="py-3.5 px-4">Payment</th>
                        {selectedSessionFilter === "all" && <th className="py-3.5 px-4">Session</th>}
                        <th className="py-3.5 px-4">Question for Speaker</th>
                        <th className="py-3.5 px-4">Registered At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(255,255,255,0.06)]">
                      {filteredRegistrations.map((reg) => (
                        <tr key={reg.id} className="hover:bg-[#1C1C21]/50 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-white whitespace-nowrap">
                            {reg.full_name}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-white/80 whitespace-nowrap">
                            {reg.email}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-white/90">
                            {reg.phone || "—"}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {reg.year_or_class || "—"}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {reg.is_nit_verified ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 size={11} />
                                NIT Raipur
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium text-[#71717A] bg-[#1C1C21] border border-[rgba(255,255,255,0.06)]">
                                —
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`capitalize px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                              reg.payment_status === "paid"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : reg.payment_status === "not_required"
                                ? "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                                : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                            }`}>
                              {reg.payment_status.replace("_", " ")}
                            </span>
                          </td>
                          {selectedSessionFilter === "all" && (
                            <td className="py-3.5 px-4 max-w-[180px] truncate text-white" title={reg.session?.title || ""}>
                              {reg.session?.title || "—"}
                            </td>
                          )}
                          <td className="py-3.5 px-4 max-w-[220px] truncate" title={reg.question_for_speaker || ""}>
                            {reg.question_for_speaker ? (
                              <span className="text-white/80">{reg.question_for_speaker}</span>
                            ) : (
                              <span className="text-[#71717A]">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-[#71717A] text-[11px]">
                            {new Date(reg.registered_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* CREATE / EDIT SESSION MODAL */}
        {/* ========================================================================= */}
        {isSessionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
            <div className="bg-[#141417] border border-[rgba(255,255,255,0.12)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl my-auto">
              <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {editingSessionId ? "Edit Workshop Session" : "Create New Session"}
                  </h3>
                  <p className="text-xs text-[#A1A1AA] mt-0.5">
                    Configure the session details, schedule, access type, and live meet link.
                  </p>
                </div>
                <button
                  onClick={() => setIsSessionModalOpen(false)}
                  className="p-2 rounded-xl text-[#A1A1AA] hover:text-white hover:bg-[#1C1C21] transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {successMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmitSession} className="space-y-5">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#A1A1AA]">
                    Session Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={sessionFormData.title}
                    onChange={(e) => setSessionFormData({ ...sessionFormData, title: e.target.value })}
                    placeholder="e.g. Breaking into Big Tech: DSA & System Design Strategy"
                    className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#71717A] outline-none transition-colors"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#A1A1AA]">
                    Description & Key Takeaways
                  </label>
                  <textarea
                    rows={3}
                    value={sessionFormData.description}
                    onChange={(e) => setSessionFormData({ ...sessionFormData, description: e.target.value })}
                    placeholder="Briefly describe what attendees will learn in this session..."
                    className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl p-3 text-sm text-white placeholder:text-[#71717A] outline-none transition-colors"
                  />
                </div>

                {/* Speaker selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#A1A1AA]">
                    Speaker (Optional)
                  </label>
                  <select
                    value={sessionFormData.speaker_id}
                    onChange={(e) => setSessionFormData({ ...sessionFormData, speaker_id: e.target.value })}
                    className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors"
                  >
                    <option value="">No speaker assigned</option>
                    {speakers.map((spk) => (
                      <option key={spk.id} value={spk.id}>
                        {spk.full_name} {spk.headline ? `(${spk.headline})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date & Start Time & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#A1A1AA]">
                      Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={sessionFormData.session_date}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, session_date: e.target.value })}
                      className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-3 py-2.5 text-sm text-white outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#A1A1AA]">
                      Start Time (IST) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={sessionFormData.start_time}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, start_time: e.target.value })}
                      className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-3 py-2.5 text-sm text-white outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#A1A1AA]">
                      Duration <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={sessionFormData.duration_minutes}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, duration_minutes: parseInt(e.target.value, 10) as SessionDuration })}
                      className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-3 py-2.5 text-sm text-white outline-none transition-colors"
                    >
                      <option value={60}>60 minutes</option>
                      <option value={90}>90 minutes</option>
                    </select>
                  </div>
                </div>

                {/* Access Type & Pricing */}
                <div className="space-y-3 p-4 rounded-xl bg-[#1C1C21] border border-[rgba(255,255,255,0.08)]">
                  <label className="text-xs font-bold uppercase tracking-[0.08em] text-[#A855F7]">
                    Access & Pricing Type
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label
                      onClick={() => setSessionFormData({ ...sessionFormData, access_type: "free_for_all" })}
                      className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${
                        sessionFormData.access_type === "free_for_all"
                          ? "bg-[rgba(168,85,247,0.1)] border-[#A855F7] text-white"
                          : "bg-[#141417] border-[rgba(255,255,255,0.08)] text-[#A1A1AA]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="access_type"
                        checked={sessionFormData.access_type === "free_for_all"}
                        onChange={() => {}}
                        className="sr-only"
                      />
                      <div className="w-4 h-4 rounded-full border border-[rgba(255,255,255,0.3)] flex items-center justify-center">
                        {sessionFormData.access_type === "free_for_all" && (
                          <div className="w-2 h-2 rounded-full bg-[#A855F7]" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Free for Everyone</p>
                        <p className="text-[11px] text-[#71717A]">Open & free for all registered users</p>
                      </div>
                    </label>

                    <label
                      onClick={() => setSessionFormData({ ...sessionFormData, access_type: "nit_free_others_paid" })}
                      className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${
                        sessionFormData.access_type === "nit_free_others_paid"
                          ? "bg-[rgba(168,85,247,0.1)] border-[#A855F7] text-white"
                          : "bg-[#141417] border-[rgba(255,255,255,0.08)] text-[#A1A1AA]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="access_type"
                        checked={sessionFormData.access_type === "nit_free_others_paid"}
                        onChange={() => {}}
                        className="sr-only"
                      />
                      <div className="w-4 h-4 rounded-full border border-[rgba(255,255,255,0.3)] flex items-center justify-center">
                        {sessionFormData.access_type === "nit_free_others_paid" && (
                          <div className="w-2 h-2 rounded-full bg-[#A855F7]" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Free for NIT Raipur</p>
                        <p className="text-[11px] text-[#71717A]">NIT free • paid for outside attendees</p>
                      </div>
                    </label>
                  </div>

                  {/* Price input (shown only if nit_free_others_paid) */}
                  {sessionFormData.access_type === "nit_free_others_paid" && (
                    <div className="pt-2 space-y-1.5 animate-fade-in">
                      <label className="text-xs font-semibold text-[#A1A1AA] flex items-center gap-1">
                        <IndianRupee size={13} className="text-[#FF9D2E]" />
                        Price for Non-NIT Attendees (INR ₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={sessionFormData.price_inr}
                        onChange={(e) => setSessionFormData({ ...sessionFormData, price_inr: e.target.value })}
                        placeholder="e.g. 199"
                        className="w-full bg-[#141417] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-4 py-2 text-sm text-white placeholder:text-[#71717A] outline-none"
                      />
                      <p className="text-[11px] text-[#71717A]">
                        Stored securely as paise in the database (₹{sessionFormData.price_inr || 0} = {((parseFloat(sessionFormData.price_inr) || 0) * 100)} paise)
                      </p>
                    </div>
                  )}
                </div>

                {/* Google Meet link & Capacity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#A1A1AA]">
                      Google Meet Link
                    </label>
                    <input
                      type="text"
                      value={sessionFormData.meet_link}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, meet_link: e.target.value })}
                      placeholder="https://meet.google.com/abc-defg-hij"
                      className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#71717A] outline-none transition-colors"
                    />
                    <p className="text-[11px] text-[#71717A]">
                      Admin-only. Never exposed on the public page. Delivered via email.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#A1A1AA]">
                      Seat Capacity (Optional)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={sessionFormData.capacity}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, capacity: e.target.value })}
                      placeholder="Blank for unlimited"
                      className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#71717A] outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Cover Image Upload */}
                <div>
                  <FileUpload
                    label="Session Cover Image (Optional)"
                    helperText="Upload a 16:9 banner image (PNG or JPG, max 5MB)"
                    accept="image/*"
                    maxSizeMB={5}
                    bucket="profile-photos"
                    value={sessionFormData.cover_image_url}
                    onUploadSuccess={(url) => setSessionFormData((prev) => ({ ...prev, cover_image_url: url }))}
                  />
                </div>

                {/* Status Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#A1A1AA]">
                    Session Status
                  </label>
                  <select
                    value={sessionFormData.status}
                    onChange={(e) => setSessionFormData({ ...sessionFormData, status: e.target.value as SessionStatus })}
                    className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors"
                  >
                    <option value="upcoming">Upcoming (Scheduled)</option>
                    <option value="live">Live (Happening Now)</option>
                    <option value="completed">Completed (Archived)</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(255,255,255,0.08)]">
                  <button
                    type="button"
                    onClick={() => setIsSessionModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] text-white hover:bg-[#25252b] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
                    style={{
                      background: "linear-gradient(135deg, #FF9D2E 0%, #FF2D8F 38%, #A855F7 70%, #4F46E5 100%)"
                    }}
                  >
                    {submitting && <Loader2 size={16} className="animate-spin" />}
                    {editingSessionId ? "Update Session" : "Create Session"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CREATE / EDIT SPEAKER MODAL */}
        {/* ========================================================================= */}
        {isSpeakerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
            <div className="bg-[#141417] border border-[rgba(255,255,255,0.12)] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl my-auto">
              <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {editingSpeakerId ? "Edit Speaker Profile" : "Add New Speaker"}
                  </h3>
                  <p className="text-xs text-[#A1A1AA] mt-0.5">
                    Fill in the details for the workshop speaker profile.
                  </p>
                </div>
                <button
                  onClick={() => setIsSpeakerModalOpen(false)}
                  className="p-2 rounded-xl text-[#A1A1AA] hover:text-white hover:bg-[#1C1C21] transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {successMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmitSpeaker} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-[0.08em] text-[#A855F7]">
                    Basic Information
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-[#A1A1AA]">
                        Full Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={speakerFormData.full_name}
                        onChange={(e) => setSpeakerFormData({ ...speakerFormData, full_name: e.target.value })}
                        placeholder="e.g. Priya Sharma"
                        className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#71717A] outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-[#A1A1AA]">
                        Headline
                      </label>
                      <input
                        type="text"
                        value={speakerFormData.headline}
                        onChange={(e) => setSpeakerFormData({ ...speakerFormData, headline: e.target.value })}
                        placeholder="e.g. Senior SDE at Google | Ex-Amazon"
                        className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#71717A] outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#A1A1AA]">
                        Speaker Type
                      </label>
                      <select
                        value={speakerFormData.speaker_type}
                        onChange={(e) => setSpeakerFormData({ ...speakerFormData, speaker_type: e.target.value as SpeakerType })}
                        className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors"
                      >
                        <option value="alumni">Alumni</option>
                        <option value="junior">Junior</option>
                        <option value="external">External</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#A1A1AA]">
                        LinkedIn URL
                      </label>
                      <input
                        type="text"
                        value={speakerFormData.linkedin_url}
                        onChange={(e) => setSpeakerFormData({ ...speakerFormData, linkedin_url: e.target.value })}
                        placeholder="https://linkedin.com/in/username"
                        className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#71717A] outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <FileUpload
                      label="Profile Photo"
                      helperText="Upload a square headshot (PNG or JPG, max 5MB)"
                      accept="image/*"
                      maxSizeMB={5}
                      bucket="profile-photos"
                      value={speakerFormData.photo_url}
                      onUploadSuccess={(url) => setSpeakerFormData((prev) => ({ ...prev, photo_url: url }))}
                    />
                  </div>
                </div>

                {/* Academic & Professional Details */}
                <div className="space-y-4 pt-2 border-t border-[rgba(255,255,255,0.08)]">
                  <h4 className="text-xs font-bold uppercase tracking-[0.08em] text-[#A855F7]">
                    Academic & Professional Background
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#A1A1AA]">
                        Batch Year
                      </label>
                      <input
                        type="text"
                        value={speakerFormData.batch_year}
                        onChange={(e) => setSpeakerFormData({ ...speakerFormData, batch_year: e.target.value })}
                        placeholder="e.g. 2018"
                        className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#71717A] outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#A1A1AA]">
                        Branch / Discipline
                      </label>
                      <input
                        type="text"
                        value={speakerFormData.branch}
                        onChange={(e) => setSpeakerFormData({ ...speakerFormData, branch: e.target.value })}
                        placeholder="e.g. Computer Science & Engineering"
                        className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#71717A] outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#A1A1AA]">
                        Current Role
                      </label>
                      <input
                        type="text"
                        value={speakerFormData.current_role}
                        onChange={(e) => setSpeakerFormData({ ...speakerFormData, current_role: e.target.value })}
                        placeholder="e.g. Senior Software Engineer"
                        className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#71717A] outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#A1A1AA]">
                        Current Company
                      </label>
                      <input
                        type="text"
                        value={speakerFormData.current_company}
                        onChange={(e) => setSpeakerFormData({ ...speakerFormData, current_company: e.target.value })}
                        placeholder="e.g. Google"
                        className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#71717A] outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Journey & Mentoring */}
                <div className="space-y-4 pt-2 border-t border-[rgba(255,255,255,0.08)]">
                  <h4 className="text-xs font-bold uppercase tracking-[0.08em] text-[#A855F7]">
                    Journey & Mentoring Note
                  </h4>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#A1A1AA]">
                      My Journey (Long-form prose)
                    </label>
                    <textarea
                      rows={4}
                      value={speakerFormData.my_journey}
                      onChange={(e) => setSpeakerFormData({ ...speakerFormData, my_journey: e.target.value })}
                      placeholder="Share college experiences, preparation, transition into tech..."
                      className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl p-3 text-sm text-white placeholder:text-[#71717A] outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#A1A1AA]">
                      Mentoring Note
                    </label>
                    <textarea
                      rows={2}
                      value={speakerFormData.mentoring_note}
                      onChange={(e) => setSpeakerFormData({ ...speakerFormData, mentoring_note: e.target.value })}
                      placeholder="Advice or guidance for students..."
                      className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl p-3 text-sm text-white placeholder:text-[#71717A] outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Career Milestones */}
                <div className="space-y-4 pt-2 border-t border-[rgba(255,255,255,0.08)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-[0.08em] text-[#A855F7]">
                        Career Milestones
                      </h4>
                      <p className="text-[11px] text-[#A1A1AA]">
                        Chronological steps shown in timeline
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddMilestone}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1C1C21] text-[#A855F7] hover:bg-[rgba(168,85,247,0.15)] border border-[rgba(255,255,255,0.12)] transition-colors flex items-center gap-1.5"
                    >
                      <Plus size={14} /> Add Milestone
                    </button>
                  </div>

                  {speakerFormData.career_milestones.length === 0 ? (
                    <div className="bg-[#1C1C21] border border-dashed border-[rgba(255,255,255,0.1)] rounded-xl p-4 text-center text-xs text-[#71717A]">
                      No milestones added. Click "Add Milestone" to add timeline steps.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {speakerFormData.career_milestones.map((milestone, idx) => (
                        <div
                          key={idx}
                          className="bg-[#1C1C21] border border-[rgba(255,255,255,0.08)] rounded-xl p-3.5 space-y-3 relative group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#A1A1AA]">
                              Milestone #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMilestone(idx)}
                              className="text-[#71717A] hover:text-red-400 p-1 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="sm:col-span-1 space-y-1">
                              <label className="text-[11px] font-medium text-[#A1A1AA]">Year</label>
                              <input
                                type="text"
                                value={milestone.year}
                                onChange={(e) => handleMilestoneChange(idx, "year", e.target.value)}
                                placeholder="e.g. 2021"
                                className="w-full bg-[#141417] border border-[rgba(255,255,255,0.1)] focus:border-[#A855F7] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-[#71717A] outline-none"
                              />
                            </div>
                            <div className="sm:col-span-3 space-y-1">
                              <label className="text-[11px] font-medium text-[#A1A1AA]">Title</label>
                              <input
                                type="text"
                                value={milestone.title}
                                onChange={(e) => handleMilestoneChange(idx, "title", e.target.value)}
                                placeholder="e.g. Joined Google as SDE-1"
                                className="w-full bg-[#141417] border border-[rgba(255,255,255,0.1)] focus:border-[#A855F7] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-[#71717A] outline-none"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-[#A1A1AA]">Description</label>
                            <input
                              type="text"
                              value={milestone.description}
                              onChange={(e) => handleMilestoneChange(idx, "description", e.target.value)}
                              placeholder="e.g. Worked on Core Search distributed systems"
                              className="w-full bg-[#141417] border border-[rgba(255,255,255,0.1)] focus:border-[#A855F7] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-[#71717A] outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Areas of Expertise */}
                <div className="space-y-3 pt-2 border-t border-[rgba(255,255,255,0.08)]">
                  <h4 className="text-xs font-bold uppercase tracking-[0.08em] text-[#A855F7]">
                    Areas of Expertise
                  </h4>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={expertiseInput}
                        onChange={(e) => setExpertiseInput(e.target.value)}
                        onKeyDown={handleAddExpertise}
                        placeholder="Type expertise (e.g. System Design) and press Enter"
                        className="flex-1 bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#71717A] outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = expertiseInput.trim();
                          if (val && !speakerFormData.areas_of_expertise.includes(val)) {
                            setSpeakerFormData((prev) => ({
                              ...prev,
                              areas_of_expertise: [...prev.areas_of_expertise, val],
                            }));
                            setExpertiseInput("");
                          }
                        }}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] text-white hover:border-[rgba(255,255,255,0.25)] transition-colors"
                      >
                        Add
                      </button>
                    </div>

                    {speakerFormData.areas_of_expertise.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {speakerFormData.areas_of_expertise.map((chip, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[rgba(168,85,247,0.12)] border border-[rgba(168,85,247,0.3)] text-[#A855F7]"
                          >
                            <span>{chip}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveExpertise(chip)}
                              className="hover:text-white transition-colors"
                            >
                              <X size={13} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Published Toggle */}
                <div className="pt-2 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between bg-[#1C1C21] p-4 rounded-xl">
                  <div>
                    <h4 className="text-sm font-bold text-white">Publish Speaker</h4>
                    <p className="text-xs text-[#A1A1AA]">
                      When published, this profile will be publicly accessible.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={speakerFormData.is_published}
                      onChange={(e) => setSpeakerFormData({ ...speakerFormData, is_published: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#A855F7]"></div>
                  </label>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(255,255,255,0.08)]">
                  <button
                    type="button"
                    onClick={() => setIsSpeakerModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] text-white hover:bg-[#25252b] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
                    style={{
                      background: "linear-gradient(135deg, #FF9D2E 0%, #FF2D8F 38%, #A855F7 70%, #4F46E5 100%)"
                    }}
                  >
                    {submitting && <Loader2 size={16} className="animate-spin" />}
                    {editingSpeakerId ? "Update Speaker" : "Create Speaker"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* INLINE DELETE CONFIRMATION MODALS */}
        {/* ========================================================================= */}
        {deletingSpeaker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#141417] border border-[rgba(255,255,255,0.12)] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                <Trash2 size={24} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-white">Delete Speaker</h3>
                <p className="text-sm text-[#A1A1AA]">
                  Are you sure you want to delete <span className="text-white font-semibold">{deletingSpeaker.full_name}</span>? This action cannot be undone.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={deletingLoading}
                  onClick={() => setDeletingSpeaker(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] text-white hover:bg-[#25252b] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletingLoading}
                  onClick={handleDeleteSpeaker}
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-500 text-white transition-colors flex items-center justify-center gap-2"
                >
                  {deletingLoading && <Loader2 size={16} className="animate-spin" />}
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {deletingSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#141417] border border-[rgba(255,255,255,0.12)] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                <Trash2 size={24} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-white">Delete Workshop Session</h3>
                <p className="text-sm text-[#A1A1AA]">
                  Are you sure you want to delete <span className="text-white font-semibold">"{deletingSession.title}"</span>? This action cannot be undone.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={deletingLoading}
                  onClick={() => setDeletingSession(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] text-white hover:bg-[#25252b] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletingLoading}
                  onClick={handleDeleteSession}
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-500 text-white transition-colors flex items-center justify-center gap-2"
                >
                  {deletingLoading && <Loader2 size={16} className="animate-spin" />}
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
