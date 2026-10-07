import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import type { Speaker, CareerMilestone, SpeakerType } from "../types/workshop";
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
  Tag
} from "lucide-react";

interface AdminProps {
  setActiveTab: (tab: string) => void;
  isAdmin: boolean;
}

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

const initialFormData: SpeakerFormData = {
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

export const Admin: React.FC<AdminProps> = ({ setActiveTab, isAdmin }) => {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SpeakerFormData>(initialFormData);
  const [expertiseInput, setExpertiseInput] = useState("");

  // Delete confirmation modal state (inline confirmation, no window.confirm)
  const [deletingSpeaker, setDeletingSpeaker] = useState<Speaker | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchSpeakers();
    }
  }, [isAdmin]);

  const fetchSpeakers = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from("speakers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching speakers:", error);
        setErrorMsg("Failed to load speakers list.");
      } else {
        setSpeakers((data as Speaker[]) || []);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("An unexpected error occurred while loading speakers.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingSpeakerId(null);
    setFormData(initialFormData);
    setExpertiseInput("");
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (speaker: Speaker) => {
    setEditingSpeakerId(speaker.id);
    setFormData({
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
    setIsModalOpen(true);
  };

  const handleAddMilestone = () => {
    setFormData((prev) => ({
      ...prev,
      career_milestones: [
        ...prev.career_milestones,
        { year: "", title: "", description: "" },
      ],
    }));
  };

  const handleMilestoneChange = (index: number, field: keyof CareerMilestone, value: string) => {
    setFormData((prev) => {
      const updated = [...prev.career_milestones];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, career_milestones: updated };
    });
  };

  const handleRemoveMilestone = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      career_milestones: prev.career_milestones.filter((_, i) => i !== index),
    }));
  };

  const handleAddExpertise = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = expertiseInput.trim();
      if (val && !formData.areas_of_expertise.includes(val)) {
        setFormData((prev) => ({
          ...prev,
          areas_of_expertise: [...prev.areas_of_expertise, val],
        }));
        setExpertiseInput("");
      }
    }
  };

  const handleRemoveExpertise = (chip: string) => {
    setFormData((prev) => ({
      ...prev,
      areas_of_expertise: prev.areas_of_expertise.filter((item) => item !== chip),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!formData.full_name.trim()) {
      setErrorMsg("Full name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        full_name: formData.full_name.trim(),
        headline: formData.headline.trim() || null,
        photo_url: formData.photo_url || null,
        speaker_type: formData.speaker_type,
        batch_year: formData.batch_year.trim() || null,
        branch: formData.branch.trim() || null,
        current_role: formData.current_role.trim() || null,
        current_company: formData.current_company.trim() || null,
        linkedin_url: formData.linkedin_url.trim() || null,
        my_journey: formData.my_journey.trim() || null,
        career_milestones: formData.career_milestones.filter(m => m.year || m.title),
        areas_of_expertise: formData.areas_of_expertise,
        mentoring_note: formData.mentoring_note.trim() || null,
        is_published: formData.is_published,
        updated_at: new Date().toISOString(),
      };

      if (editingSpeakerId) {
        // Update existing speaker
        const { error } = await supabase
          .from("speakers")
          .update(payload)
          .eq("id", editingSpeakerId);

        if (error) throw error;
        setSuccessMsg("Speaker updated successfully!");
      } else {
        // Insert new speaker
        const { error } = await supabase
          .from("speakers")
          .insert([payload]);

        if (error) throw error;
        setSuccessMsg("Speaker created successfully!");
      }

      await fetchSpeakers();
      setTimeout(() => {
        setIsModalOpen(false);
      }, 700);
    } catch (err: any) {
      console.error("Error saving speaker:", err);
      setErrorMsg(err.message || "Failed to save speaker. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
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
              Speakers Management
            </h1>
            <p className="text-sm text-[#A1A1AA] mt-1">
              Create, edit, and publish speaker profiles for workshops and masterclasses.
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #FF9D2E 0%, #FF2D8F 38%, #A855F7 70%, #4F46E5 100%)"
            }}
          >
            <Plus size={18} />
            Add Speaker
          </button>
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

        {/* Speaker List Section */}
        {loading ? (
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
              onClick={handleOpenCreateModal}
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
                    onClick={() => handleOpenEditModal(spk)}
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

        {/* ========================================================================= */}
        {/* Inline Delete Confirmation Modal */}
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
                  onClick={handleDelete}
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-500 text-white transition-colors flex items-center justify-center gap-2"
                >
                  {deletingLoading && <Loader2 size={16} className="animate-spin" />}
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Create / Edit Speaker Modal Form */}
        {/* ========================================================================= */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
            <div className="bg-[#141417] border border-[rgba(255,255,255,0.12)] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl my-auto">
              {/* Modal Header */}
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
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl text-[#A1A1AA] hover:text-white hover:bg-[#1C1C21] transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Success / Error Notification in Modal */}
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

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Basic Information */}
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
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
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
                        value={formData.headline}
                        onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                        placeholder="e.g. Senior SDE at Google | Ex-Amazon"
                        className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#71717A] outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#A1A1AA]">
                        Speaker Type
                      </label>
                      <select
                        value={formData.speaker_type}
                        onChange={(e) => setFormData({ ...formData, speaker_type: e.target.value as SpeakerType })}
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
                        value={formData.linkedin_url}
                        onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                        placeholder="https://linkedin.com/in/username"
                        className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#71717A] outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Profile Photo Upload */}
                  <div>
                    <FileUpload
                      label="Profile Photo"
                      helperText="Upload a square headshot (PNG or JPG, max 5MB)"
                      accept="image/*"
                      maxSizeMB={5}
                      bucket="profile-photos"
                      value={formData.photo_url}
                      onUploadSuccess={(url) => setFormData((prev) => ({ ...prev, photo_url: url }))}
                    />
                  </div>
                </div>

                {/* 2. Academic & Professional Details */}
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
                        value={formData.batch_year}
                        onChange={(e) => setFormData({ ...formData, batch_year: e.target.value })}
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
                        value={formData.branch}
                        onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
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
                        value={formData.current_role}
                        onChange={(e) => setFormData({ ...formData, current_role: e.target.value })}
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
                        value={formData.current_company}
                        onChange={(e) => setFormData({ ...formData, current_company: e.target.value })}
                        placeholder="e.g. Google"
                        className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#71717A] outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. My Journey & Mentoring Note */}
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
                      value={formData.my_journey}
                      onChange={(e) => setFormData({ ...formData, my_journey: e.target.value })}
                      placeholder="Share your college experience, how you prepared for placements/higher studies, career transitions, and learnings..."
                      className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl p-3 text-sm text-white placeholder:text-[#71717A] outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#A1A1AA]">
                      Mentoring Note (Quote/Advice for students)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.mentoring_note}
                      onChange={(e) => setFormData({ ...formData, mentoring_note: e.target.value })}
                      placeholder="e.g. Always focus on fundamental concepts before jumping into frameworks. Happy to help juniors navigate tech careers!"
                      className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl p-3 text-sm text-white placeholder:text-[#71717A] outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* 4. Career Milestones (Repeatable Rows) */}
                <div className="space-y-4 pt-2 border-t border-[rgba(255,255,255,0.08)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-[0.08em] text-[#A855F7]">
                        Career Milestones
                      </h4>
                      <p className="text-[11px] text-[#A1A1AA]">
                        Chronological steps shown in the vertical timeline
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

                  {formData.career_milestones.length === 0 ? (
                    <div className="bg-[#1C1C21] border border-dashed border-[rgba(255,255,255,0.1)] rounded-xl p-4 text-center text-xs text-[#71717A]">
                      No milestones added. Click "Add Milestone" to add career timeline steps.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.career_milestones.map((milestone, idx) => (
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
                              title="Remove milestone"
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
                              placeholder="e.g. Worked on Core Search distributed systems and indexing"
                              className="w-full bg-[#141417] border border-[rgba(255,255,255,0.1)] focus:border-[#A855F7] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-[#71717A] outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5. Areas of Expertise (Tag Input) */}
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
                          if (val && !formData.areas_of_expertise.includes(val)) {
                            setFormData((prev) => ({
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

                    {formData.areas_of_expertise.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {formData.areas_of_expertise.map((chip, idx) => (
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

                {/* 6. Published Status Toggle */}
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
                      checked={formData.is_published}
                      onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#A855F7]"></div>
                  </label>
                </div>

                {/* Form Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(255,255,255,0.08)]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
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
      </div>
    </div>
  );
};
