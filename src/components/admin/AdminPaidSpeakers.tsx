import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { FileUpload } from "../FileUpload";
import { 
  Sparkles, 
  Search, 
  Plus, 
  Edit3, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  DollarSign, 
  Clock, 
  User, 
  Briefcase, 
  CreditCard
} from "lucide-react";

export interface PaidMentor {
  id: string;
  user_id: string;
  full_name: string;
  profile_photo_url?: string | null;
  current_organization?: string | null;
  years_of_experience?: string | null;
  bio?: string | null;
  linkedin_url?: string | null;
  pricing?: Record<string, string> | null;
  session_durations?: string[] | null;
  is_paid: boolean;
  areas_of_expertise?: string[] | null;
  languages_known?: string[] | null;
  milestones?: string | null;
  help_statement?: string | null;
  payout_settings?: {
    commission_percent?: number | null;
    payout_type?: "upi" | "bank" | null;
    upi_id?: string | null;
    bank_account_number?: string | null;
    bank_ifsc?: string | null;
    bank_account_holder?: string | null;
  } | null;
}

interface AdminPaidSpeakersProps {
  onMentorsUpdated?: () => void;
}

const COMMON_EXPERTISE = [
  "Software Development",
  "Career Counselling & Roadmap",
  "Product Management",
  "Data Science & AI",
  "Startup Building",
  "Entrepreneurship",
  "Exam Strategy & Study Plan",
  "Public Speaking",
  "Web Development",
  "Time Management"
];

const DEFAULT_DURATIONS = ["15 min", "30 min", "60 min"];

export const AdminPaidSpeakers: React.FC<AdminPaidSpeakersProps> = ({ onMentorsUpdated }) => {
  const [mentors, setMentors] = useState<PaidMentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMentorId, setEditingMentorId] = useState<string | null>(null);

  // Form State
  const [accountEmail, setAccountEmail] = useState("");
  const [searchingEmail, setSearchingEmail] = useState(false);
  const [verifiedUserId, setVerifiedUserId] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ found: boolean; message: string; existingMentor?: any } | null>(null);

  const [fullName, setFullName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [currentOrg, setCurrentOrg] = useState("");
  const [yearsExp, setYearsExp] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [bio, setBio] = useState("");
  const [helpStatement, setHelpStatement] = useState("");
  const [milestones, setMilestones] = useState("");
  const [expertise, setExpertise] = useState<string[]>([]);
  const [customExpInput, setCustomExpInput] = useState("");
  const [languages, setLanguages] = useState<string[]>(["English", "Hindi"]);

  // Pricing & Payouts State
  const [prices, setPrices] = useState<Record<string, string>>({
    "15 min": "150",
    "30 min": "300",
    "60 min": "600",
  });
  const [selectedDurations, setSelectedDurations] = useState<string[]>(["15 min", "30 min", "60 min"]);
  const [commissionPercent, setCommissionPercent] = useState("");
  const [payoutType, setPayoutType] = useState<"upi" | "bank">("upi");
  const [upiId, setUpiId] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const fetchPaidMentors = async () => {
    setLoading(true);
    try {
      // 1. Fetch mentors where is_paid = true
      const { data: mentorsData, error: mentorsError } = await supabase
        .from("mentors")
        .select("*")
        .eq("is_paid", true)
        .order("full_name", { ascending: true });

      if (mentorsError) throw mentorsError;

      if (!mentorsData || mentorsData.length === 0) {
        setMentors([]);
        setLoading(false);
        return;
      }

      // 2. Fetch payout settings for these mentors
      const mentorIds = mentorsData.map((m) => m.id);
      const { data: payoutData } = await supabase
        .from("mentor_payout_settings")
        .select("*")
        .in("mentor_id", mentorIds);

      const payoutMap: Record<string, any> = {};
      if (payoutData) {
        payoutData.forEach((ps) => {
          payoutMap[ps.mentor_id] = ps;
        });
      }

      const combined: PaidMentor[] = mentorsData.map((m) => ({
        ...m,
        payout_settings: payoutMap[m.id] || null,
      }));

      setMentors(combined);
    } catch (err: any) {
      console.error("Error fetching paid mentors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaidMentors();
  }, []);

  const handleOpenAdd = () => {
    setEditingMentorId(null);
    setAccountEmail("");
    setVerifiedUserId(null);
    setEmailStatus(null);
    setFullName("");
    setPhotoUrl("");
    setCurrentOrg("");
    setYearsExp("");
    setLinkedinUrl("");
    setBio("");
    setHelpStatement("");
    setMilestones("");
    setExpertise(["Career Counselling & Roadmap"]);
    setCustomExpInput("");
    setLanguages(["English", "Hindi"]);
    setPrices({ "15 min": "150", "30 min": "300", "60 min": "600" });
    setSelectedDurations(["15 min", "30 min", "60 min"]);
    setCommissionPercent("");
    setPayoutType("upi");
    setUpiId("");
    setBankAccountNumber("");
    setBankIfsc("");
    setBankAccountHolder("");
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (mentor: PaidMentor) => {
    setEditingMentorId(mentor.id);
    setVerifiedUserId(mentor.user_id);
    setAccountEmail("");
    setEmailStatus({ found: true, message: "Account linked to verified user ID." });
    setFullName(mentor.full_name || "");
    setPhotoUrl(mentor.profile_photo_url || "");
    setCurrentOrg(mentor.current_organization || "");
    setYearsExp(mentor.years_of_experience || "");
    setLinkedinUrl(mentor.linkedin_url || "");
    setBio(mentor.bio || "");
    setHelpStatement(mentor.help_statement || "");
    setMilestones(mentor.milestones || "");
    setExpertise(Array.isArray(mentor.areas_of_expertise) ? mentor.areas_of_expertise : []);
    setCustomExpInput("");
    setLanguages(Array.isArray(mentor.languages_known) ? mentor.languages_known : ["English", "Hindi"]);

    const mentorPricing = mentor.pricing || {};
    const mentorDurations = Array.isArray(mentor.session_durations) && mentor.session_durations.length > 0
      ? mentor.session_durations
      : Object.keys(mentorPricing).length > 0
      ? Object.keys(mentorPricing)
      : ["15 min", "30 min", "60 min"];

    setPrices({ ...mentorPricing });
    setSelectedDurations(mentorDurations);

    const ps = mentor.payout_settings;
    setCommissionPercent(ps?.commission_percent != null ? String(ps.commission_percent) : "");
    setPayoutType(ps?.payout_type === "bank" ? "bank" : "upi");
    setUpiId(ps?.upi_id || "");
    setBankAccountNumber(ps?.bank_account_number || "");
    setBankIfsc(ps?.bank_ifsc || "");
    setBankAccountHolder(ps?.bank_account_holder || "");

    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleFindAccount = async () => {
    if (!accountEmail.trim()) {
      setEmailStatus({ found: false, message: "Please enter an account email." });
      return;
    }

    setSearchingEmail(true);
    setEmailStatus(null);
    setVerifiedUserId(null);

    try {
      const { data: userId, error } = await supabase.rpc("admin_find_user_by_email", {
        p_email: accountEmail.trim(),
      });

      if (error || !userId) {
        setEmailStatus({
          found: false,
          message: "No account with this email. Ask the speaker to sign up on Connectors first.",
        });
        return;
      }

      setVerifiedUserId(userId);

      // Check if user already has a mentor row
      const { data: existingMentor } = await supabase
        .from("mentors")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingMentor) {
        // Prepopulate fields from existing mentor record
        if (!fullName) setFullName(existingMentor.full_name || "");
        if (!photoUrl) setPhotoUrl(existingMentor.profile_photo_url || "");
        if (!currentOrg) setCurrentOrg(existingMentor.current_organization || "");
        if (!yearsExp) setYearsExp(existingMentor.years_of_experience || "");
        if (!linkedinUrl) setLinkedinUrl(existingMentor.linkedin_url || "");
        if (!bio) setBio(existingMentor.bio || "");

        setEmailStatus({
          found: true,
          message: `Account found! Existing mentor profile "${existingMentor.full_name}" will be converted/updated.`,
          existingMentor,
        });
      } else {
        setEmailStatus({
          found: true,
          message: "Account verified. A new paid speaker-mentor profile will be created.",
        });
      }
    } catch (err: any) {
      console.error("Error looking up user by email:", err);
      setEmailStatus({
        found: false,
        message: err.message || "Failed to lookup account.",
      });
    } finally {
      setSearchingEmail(false);
    }
  };

  const toggleDuration = (dur: string) => {
    setSelectedDurations((prev) =>
      prev.includes(dur) ? prev.filter((d) => d !== dur) : [...prev, dur]
    );
  };

  const handlePriceChange = (dur: string, val: string) => {
    setPrices((prev) => ({
      ...prev,
      [dur]: val,
    }));
  };

  const addCustomExpertise = () => {
    const val = customExpInput.trim();
    if (val && !expertise.includes(val)) {
      setExpertise([...expertise, val]);
      setCustomExpInput("");
    }
  };

  const removeExpertise = (tag: string) => {
    setExpertise(expertise.filter((t) => t !== tag));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!verifiedUserId) {
      setFormError("You must verify the speaker's Connectors account by email before saving.");
      return;
    }

    if (!fullName.trim()) {
      setFormError("Full Name is required.");
      return;
    }

    // Filter active prices for selected durations
    const activePricing: Record<string, string> = {};
    for (const dur of selectedDurations) {
      const priceVal = (prices[dur] || "").trim();
      const num = parseFloat(priceVal);
      if (!isNaN(num) && num > 0) {
        activePricing[dur] = priceVal;
      }
    }

    if (Object.keys(activePricing).length === 0) {
      setFormError("Please configure at least one session duration with a price greater than ₹0.");
      return;
    }

    if (!commissionPercent.trim()) {
      setFormError("Platform commission % is required (0 to 100).");
      return;
    }

    const commissionNum = parseFloat(commissionPercent);
    if (isNaN(commissionNum) || commissionNum < 0 || commissionNum > 100) {
      setFormError("Commission percentage must be between 0 and 100.");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Build mentor row payload
      // NEVER write phone_number, personal_email, date_of_birth, whatsapp_number, city,
      // govt_id_url, student_id urls, or payout/commission data into mentors table.
      const mentorPayload: any = {
        user_id: verifiedUserId,
        full_name: fullName.trim(),
        profile_photo_url: photoUrl || null,
        current_organization: currentOrg.trim() || null,
        years_of_experience: yearsExp.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        bio: bio.trim() || null,
        help_statement: helpStatement.trim() || null,
        milestones: milestones.trim() || null,
        areas_of_expertise: expertise.length > 0 ? expertise : null,
        languages_known: languages.length > 0 ? languages : null,
        session_durations: Object.keys(activePricing),
        pricing: activePricing,
        application_status: "approved",
        verified: true,
        is_paid: true,
        free_intro_session: false,
        profile_updated_at: new Date().toISOString(),
      };

      let savedMentorId = editingMentorId;

      if (savedMentorId) {
        // Update existing mentor row
        const { error: updateError } = await supabase
          .from("mentors")
          .update(mentorPayload)
          .eq("id", savedMentorId);

        if (updateError) throw updateError;
      } else {
        // Check if mentor row for verifiedUserId already exists to prevent duplicate
        const { data: existingRow } = await supabase
          .from("mentors")
          .select("id")
          .eq("user_id", verifiedUserId)
          .maybeSingle();

        if (existingRow) {
          savedMentorId = existingRow.id;
          const { error: updateError } = await supabase
            .from("mentors")
            .update(mentorPayload)
            .eq("id", savedMentorId);

          if (updateError) throw updateError;
        } else {
          const { data: newRow, error: insertError } = await supabase
            .from("mentors")
            .insert([mentorPayload])
            .select("id")
            .single();

          if (insertError) throw insertError;
          savedMentorId = newRow.id;
        }
      }

      if (!savedMentorId) {
        throw new Error("Failed to resolve mentor ID for payout settings.");
      }

      // 2. Upsert into mentor_payout_settings
      const payoutSettingsPayload = {
        mentor_id: savedMentorId,
        commission_percent: commissionNum,
        payout_type: payoutType,
        upi_id: payoutType === "upi" ? upiId.trim() || null : null,
        bank_account_number: payoutType === "bank" ? bankAccountNumber.trim() || null : null,
        bank_ifsc: payoutType === "bank" ? bankIfsc.trim().toUpperCase() || null : null,
        bank_account_holder: payoutType === "bank" ? bankAccountHolder.trim() || null : null,
        updated_at: new Date().toISOString(),
      };

      const { error: payoutError } = await supabase
        .from("mentor_payout_settings")
        .upsert(payoutSettingsPayload);

      if (payoutError) throw payoutError;

      setFormSuccess("Paid speaker-mentor profile saved successfully!");
      await fetchPaidMentors();
      if (onMentorsUpdated) onMentorsUpdated();

      setTimeout(() => {
        setIsModalOpen(false);
      }, 1200);
    } catch (err: any) {
      console.error("Error saving paid mentor:", err);
      setFormError(err.message || "Failed to save paid speaker profile.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMentors = mentors.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.full_name?.toLowerCase().includes(q) ||
      m.current_organization?.toLowerCase().includes(q) ||
      m.bio?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles size={18} className="text-[#A855F7]" />
            Paid Speaker-Mentors
          </h3>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Manage professional speakers offering paid 1-on-1 mentorship sessions and their payout rates.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #FF9D2E 0%, #FF2D8F 38%, #A855F7 70%, #4F46E5 100%)",
          }}
        >
          <Plus size={15} /> Add Paid Speaker
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 bg-[#141417] p-3 rounded-xl border border-[rgba(255,255,255,0.08)]">
        <Search size={16} className="text-[#A1A1AA] shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by speaker name, company, or bio..."
          className="w-full bg-transparent text-xs text-white placeholder:text-[#71717A] outline-none"
        />
        <span className="text-[11px] text-[#71717A] shrink-0 px-2">
          {filteredMentors.length} {filteredMentors.length === 1 ? "speaker" : "speakers"}
        </span>
      </div>

      {/* Table / List View */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl">
          <Loader2 className="animate-spin text-[#A855F7] mb-3" size={30} />
          <p className="text-xs text-[#A1A1AA]">Loading paid speakers...</p>
        </div>
      ) : filteredMentors.length === 0 ? (
        <div className="text-center py-16 bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
          <div className="w-12 h-12 rounded-xl bg-[#1C1C21] flex items-center justify-center text-[#A1A1AA] mx-auto mb-3">
            <User size={24} />
          </div>
          <h4 className="text-sm font-bold text-white mb-1">No Paid Speakers Found</h4>
          <p className="text-xs text-[#A1A1AA] max-w-sm mx-auto mb-4">
            Add a professional speaker by linking their account email and configuring their session rates.
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-[#1C1C21] hover:bg-[#25252b] border border-[rgba(255,255,255,0.12)] rounded-xl text-xs font-semibold text-white transition-colors"
          >
            + Add First Paid Speaker
          </button>
        </div>
      ) : (
        <div className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#A1A1AA]">
              <thead className="bg-[#1C1C21] uppercase font-bold text-[#A1A1AA] tracking-wider border-b border-[rgba(255,255,255,0.08)] text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Speaker</th>
                  <th className="px-5 py-3.5">Role & Company</th>
                  <th className="px-5 py-3.5">Pricing Summary</th>
                  <th className="px-5 py-3.5">Commission</th>
                  <th className="px-5 py-3.5">Payout Details</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.06)]">
                {filteredMentors.map((m) => {
                  const pricingEntries = Object.entries(m.pricing || {});
                  const ps = m.payout_settings;

                  return (
                    <tr key={m.id} className="hover:bg-[#1C1C21]/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {m.profile_photo_url ? (
                            <img
                              src={m.profile_photo_url}
                              alt={m.full_name}
                              className="w-9 h-9 rounded-full object-cover border border-[rgba(255,255,255,0.12)] shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] flex items-center justify-center font-bold text-[#A855F7] shrink-0">
                              {m.full_name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-white text-xs truncate">{m.full_name}</p>
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-0.5">
                              Approved & Verified
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-0.5">
                          <p className="text-white font-medium text-xs truncate">
                            {m.current_organization || "Independent Professional"}
                          </p>
                          {m.years_of_experience && (
                            <p className="text-[11px] text-[#71717A] truncate">
                              {m.years_of_experience}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {pricingEntries.length > 0 ? (
                            pricingEntries.map(([dur, price]) => (
                              <span
                                key={dur}
                                className="px-2 py-0.5 rounded-md bg-[#1C1C21] border border-[rgba(255,255,255,0.08)] text-white text-[11px] font-medium"
                              >
                                {dur}: <strong className="text-[#FF9D2E]">₹{price}</strong>
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-amber-400">No prices set</span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="px-2 py-1 rounded-md text-xs font-bold bg-[rgba(168,85,247,0.12)] text-[#A855F7] border border-[rgba(168,85,247,0.3)]">
                          {ps?.commission_percent != null ? `${ps.commission_percent}%` : "Not set"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="text-[11px] space-y-0.5">
                          {ps?.payout_type === "upi" ? (
                            <p className="text-white truncate">
                              <span className="text-[#71717A]">UPI:</span> {ps.upi_id || "None"}
                            </p>
                          ) : ps?.payout_type === "bank" ? (
                            <p className="text-white truncate">
                              <span className="text-[#71717A]">Bank:</span> A/C ...{ps.bank_account_number?.slice(-4)} ({ps.bank_ifsc})
                            </p>
                          ) : (
                            <span className="text-[#71717A]">Not provided</span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEdit(m)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1C1C21] text-white hover:bg-[#25252b] border border-[rgba(255,255,255,0.12)] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 size={12} /> Edit
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

      {/* Add / Edit Paid Speaker Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="bg-[#141417] border border-[rgba(255,255,255,0.12)] rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles size={18} className="text-[#A855F7]" />
                  {editingMentorId ? "Edit Paid Speaker-Mentor" : "Add Paid Speaker-Mentor"}
                </h3>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  Configure professional guidance pricing, platform commission, and private payout details.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-[#A1A1AA] hover:text-white hover:bg-[#1C1C21] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 size={15} className="shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              {/* Step 1: Account Lookup (Required for Add, read-only for Edit) */}
              <div className="bg-[#1C1C21] p-4 rounded-xl border border-[rgba(255,255,255,0.08)] space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#A855F7] flex items-center gap-1.5">
                  <User size={13} />
                  1. Connectors Account Link
                </h4>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  Speakers must sign up on Connectors first with their email to host 1-on-1 chats and accept sessions.
                </p>

                {!editingMentorId ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={accountEmail}
                        onChange={(e) => setAccountEmail(e.target.value)}
                        placeholder="speaker@example.com"
                        className="flex-1 bg-[#141417] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#71717A] outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleFindAccount}
                        disabled={searchingEmail || !accountEmail.trim()}
                        className="px-4 py-2.5 bg-primary text-on-primary-fixed rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {searchingEmail && <Loader2 size={13} className="animate-spin" />}
                        Find Account
                      </button>
                    </div>

                    {emailStatus && (
                      <div
                        className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                          emailStatus.found
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {emailStatus.found ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        <span>{emailStatus.message}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg">
                    <CheckCircle2 size={14} />
                    <span>Linked to Account User ID: {verifiedUserId}</span>
                  </div>
                )}
              </div>

              {/* Step 2: Public Profile Fields */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#A855F7] flex items-center gap-1.5">
                  <Briefcase size={13} />
                  2. Public Profile Information
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-[#A1A1AA]">
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Sundar Pichai"
                      className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#71717A] outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#A1A1AA]">Current Organization / Company</label>
                    <input
                      type="text"
                      value={currentOrg}
                      onChange={(e) => setCurrentOrg(e.target.value)}
                      placeholder="e.g. Google, Microsoft, Founder"
                      className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#71717A] outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#A1A1AA]">Headline / Years of Experience</label>
                    <input
                      type="text"
                      value={yearsExp}
                      onChange={(e) => setYearsExp(e.target.value)}
                      placeholder="e.g. 8+ years, Tech Lead"
                      className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#71717A] outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-[#A1A1AA]">LinkedIn URL</label>
                    <input
                      type="text"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#71717A] outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <FileUpload
                      label="Profile Photo"
                      helperText="Square headshot (PNG or JPG, max 5MB)"
                      accept="image/*"
                      maxSizeMB={5}
                      bucket="profile-photos"
                      value={photoUrl}
                      onUploadSuccess={(url) => setPhotoUrl(url)}
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-[#A1A1AA]">Short Bio</label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Brief overview of background, leadership, and technical focus..."
                      className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl p-3 text-xs text-white placeholder:text-[#71717A] outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-[#A1A1AA]">Career Milestones / Highlights</label>
                    <textarea
                      rows={2}
                      value={milestones}
                      onChange={(e) => setMilestones(e.target.value)}
                      placeholder="e.g. 2021: Founded TechStartup&#10;2024: Acquired by Unicorn"
                      className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl p-3 text-xs text-white placeholder:text-[#71717A] outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Areas of Expertise Chips */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#A1A1AA]">Areas of Expertise</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {COMMON_EXPERTISE.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          expertise.includes(tag) ? removeExpertise(tag) : setExpertise([...expertise, tag])
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                          expertise.includes(tag)
                            ? "bg-purple-500/20 border-purple-500 text-purple-300"
                            : "bg-[#1C1C21] border-[rgba(255,255,255,0.08)] text-[#A1A1AA] hover:text-white"
                        }`}
                      >
                        {tag} {expertise.includes(tag) ? "✓" : "+"}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customExpInput}
                      onChange={(e) => setCustomExpInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCustomExpertise();
                        }
                      }}
                      placeholder="Add custom expertise and press Enter..."
                      className="flex-1 bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] rounded-xl px-3 py-2 text-xs text-white placeholder:text-[#71717A] outline-none"
                    />
                    <button
                      type="button"
                      onClick={addCustomExpertise}
                      className="px-3 py-2 bg-[#1C1C21] hover:bg-[#25252b] border border-[rgba(255,255,255,0.12)] rounded-xl text-xs text-white"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 3: Pricing, Commission & Payout Details */}
              <div className="space-y-4 pt-4 border-t border-[rgba(255,255,255,0.08)]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#A855F7] flex items-center gap-1.5">
                  <CreditCard size={13} />
                  3. Session Pricing & Payout Configuration
                </h4>

                {/* Session Durations & Rates */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#A1A1AA]">
                    Durations & Student Price (INR) <span className="text-red-400">*</span>
                  </label>
                  <p className="text-[11px] text-[#71717A]">
                    Check each duration this mentor will offer and enter their rate. Paid mentors have no free intro session.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {DEFAULT_DURATIONS.map((dur) => (
                      <div
                        key={dur}
                        className={`p-3 rounded-xl border transition-all ${
                          selectedDurations.includes(dur)
                            ? "bg-[#1C1C21] border-[#A855F7]/40"
                            : "bg-[#141417] border-[rgba(255,255,255,0.06)] opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedDurations.includes(dur)}
                              onChange={() => toggleDuration(dur)}
                              className="rounded bg-[#141417] border-white/20"
                            />
                            {dur}
                          </label>
                        </div>
                        {selectedDurations.includes(dur) && (
                          <div className="flex items-center gap-1 bg-[#141417] rounded-lg px-2.5 py-1.5 border border-[rgba(255,255,255,0.08)]">
                            <span className="text-xs font-bold text-[#FF9D2E]">₹</span>
                            <input
                              type="number"
                              min="1"
                              value={prices[dur] || ""}
                              onChange={(e) => handlePriceChange(dur, e.target.value)}
                              placeholder="Price"
                              className="w-full bg-transparent text-xs text-white font-bold outline-none"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Commission Percent */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#A1A1AA]">
                    Platform Commission % <span className="text-red-400">*</span>
                  </label>
                  <p className="text-[11px] text-[#71717A]">
                    Percentage of each paid booking retained by Connectors. The remaining amount will be tracked as pending payout to the mentor.
                  </p>
                  <div className="flex items-center gap-2 max-w-xs bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] rounded-xl px-3 py-2">
                    <DollarSign size={14} className="text-[#A855F7]" />
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      step="0.5"
                      value={commissionPercent}
                      onChange={(e) => setCommissionPercent(e.target.value)}
                      placeholder="e.g. 15"
                      className="w-full bg-transparent text-xs text-white font-bold outline-none"
                    />
                    <span className="text-xs text-[#71717A] font-bold">%</span>
                  </div>
                </div>

                {/* Payout Details (Admin Only) */}
                <div className="bg-[#1C1C21] p-4 rounded-xl border border-[rgba(255,255,255,0.08)] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard size={13} className="text-[#FF9D2E]" />
                      Mentor Payout Destination (Admin Visible Only)
                    </label>
                    <span className="text-[10px] text-amber-400 font-medium">Never public</span>
                  </div>
                  <p className="text-[11px] text-[#71717A]">
                    These details are stored in an isolated table accessible exclusively to administrators.
                  </p>

                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                      <input
                        type="radio"
                        name="payoutType"
                        value="upi"
                        checked={payoutType === "upi"}
                        onChange={() => setPayoutType("upi")}
                      />
                      UPI ID
                    </label>
                    <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                      <input
                        type="radio"
                        name="payoutType"
                        value="bank"
                        checked={payoutType === "bank"}
                        onChange={() => setPayoutType("bank")}
                      />
                      Bank Account
                    </label>
                  </div>

                  {payoutType === "upi" ? (
                    <div className="space-y-1.5">
                      <label className="text-xs text-[#A1A1AA]">UPI ID / VPA</label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="speaker@okhdfcbank"
                        className="w-full bg-[#141417] border border-[rgba(255,255,255,0.12)] rounded-xl px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs text-[#A1A1AA]">Account Holder Name</label>
                        <input
                          type="text"
                          value={bankAccountHolder}
                          onChange={(e) => setBankAccountHolder(e.target.value)}
                          placeholder="As per bank passbook"
                          className="w-full bg-[#141417] border border-[rgba(255,255,255,0.12)] rounded-xl px-3 py-2 text-xs text-white outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-[#A1A1AA]">Account Number</label>
                        <input
                          type="text"
                          value={bankAccountNumber}
                          onChange={(e) => setBankAccountNumber(e.target.value)}
                          placeholder="Account Number"
                          className="w-full bg-[#141417] border border-[rgba(255,255,255,0.12)] rounded-xl px-3 py-2 text-xs text-white outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-[#A1A1AA]">IFSC Code</label>
                        <input
                          type="text"
                          value={bankIfsc}
                          onChange={(e) => setBankIfsc(e.target.value)}
                          placeholder="e.g. HDFC0001234"
                          className="w-full bg-[#141417] border border-[rgba(255,255,255,0.12)] rounded-xl px-3 py-2 text-xs text-white outline-none uppercase"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(255,255,255,0.08)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#1C1C21] hover:bg-[#25252b] text-xs font-semibold text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, #FF9D2E 0%, #FF2D8F 38%, #A855F7 70%, #4F46E5 100%)",
                  }}
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {editingMentorId ? "Save Changes" : "Save Paid Speaker"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
