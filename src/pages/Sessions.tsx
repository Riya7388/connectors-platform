import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import type { WorkshopSession, SessionRegistration } from "../types/workshop";
import { isNitEmail } from "../lib/nitEmail";

// ---------------------------------------------------------------------------
// Razorpay global type (loaded via <script> in index.html)
// ---------------------------------------------------------------------------
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open(): void;
      on(event: string, handler: (...args: unknown[]) => void): void;
    };
  }
}

const FREE_MODE = import.meta.env.VITE_FREE_MODE === "true";
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID as string;
import { 
  Calendar, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  Loader2, 
  Mic2,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  User,
  HelpCircle,
  GraduationCap,
  Share2,
  Check
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

  // User auth and registrations state
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [userRegistrations, setUserRegistrations] = useState<Record<string, SessionRegistration>>({});
  const [registrationCounts, setRegistrationCounts] = useState<Record<string, number>>({});

  // Registration Modal State
  const [selectedSession, setSelectedSession] = useState<WorkshopSession | null>(null);
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regQuestion, setRegQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Cancellation State (inline 2-step confirm modal)
  const [cancellingSession, setCancellingSession] = useState<WorkshopSession | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Payment state (Razorpay)
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Toast / Status notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Speaker row guided hand hint (dismissed permanently on tap or close)
  const [showSpeakerHint, setShowSpeakerHint] = useState<boolean>(() => {
    try {
      return !localStorage.getItem("connectors_speaker_hint_seen");
    } catch {
      return true;
    }
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 2500);
  };

  const dismissSpeakerHint = () => {
    setShowSpeakerHint(false);
    try {
      localStorage.setItem("connectors_speaker_hint_seen", "true");
    } catch {}
  };

  const handleSpeakerRowClick = (speakerId?: string) => {
    if (!speakerId) return;
    dismissSpeakerHint();
    setActiveTab(`speaker-profile/${speakerId}`);
  };

  const handleShareSpeaker = async (
    e: React.MouseEvent,
    speaker: { id: string; full_name: string }
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const shareUrl = `${window.location.origin}/#speaker-profile/${speaker.id}`;
    const shareTitle = `${speaker.full_name} on Connectors`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareTitle,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err?.name === "AbortError") {
          return;
        }
      }
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      showToast("Link copied");
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  useEffect(() => {
    fetchUserDataAndSessions();
  }, []);

  const fetchUserDataAndSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get current logged in user
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // 2. Fetch all sessions
      const { data: sessionData, error: fetchError } = await supabase
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
      setSessions((sessionData as unknown as WorkshopSession[]) || []);

      // 3. Fetch registrations for current user if logged in
      if (user) {
        const { data: regData, error: regError } = await supabase
          .from("session_registrations")
          .select("*")
          .eq("user_id", user.id);

        if (!regError && regData) {
          const regMap: Record<string, SessionRegistration> = {};
          regData.forEach((r: SessionRegistration) => {
            regMap[r.session_id] = r;
          });
          setUserRegistrations(regMap);
        }
      }

      // 4. Fetch total registration counts per session (for capacity checking)
      const { data: countData } = await supabase
        .from("session_registrations")
        .select("session_id");

      if (countData) {
        const counts: Record<string, number> = {};
        countData.forEach((r: { session_id: string }) => {
          counts[r.session_id] = (counts[r.session_id] || 0) + 1;
        });
        setRegistrationCounts(counts);
      }
    } catch (err: any) {
      console.error("Error fetching workshop sessions:", err);
      setError("Failed to load sessions. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRegisterModal = (session: WorkshopSession) => {
    // Anon user — send to auth and remember where they were
    if (!currentUser) {
      const returnHash = window.location.hash || "#sessions";
      localStorage.setItem("auth_return_hash", returnHash);
      setActiveTab("auth");
      return;
    }
    setSelectedSession(session);
    setFormError(null);
    setFormSuccess(null);
    setRegQuestion("");
    // Pre-fill name from user profile metadata if available
    const meta = currentUser?.user_metadata;
    const name = meta?.full_name || meta?.name || meta?.display_name || "";
    setRegName(name);
    setRegPhone(meta?.phone || "");
  };

  const handleCloseRegisterModal = () => {
    setSelectedSession(null);
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(false);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || !currentUser) return;

    // Validate phone number: minimum 10 digits
    const cleanedPhone = regPhone.replace(/\D/g, "");
    if (cleanedPhone.length < 10) {
      setFormError("Please enter a valid 10-digit phone number.");
      return;
    }

    if (!regName.trim()) {
      setFormError("Please enter your full name.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const isNit = isNitEmail(currentUser.email);
    // FREE_MODE makes everyone free regardless of email (useful for testing)
    const isFree = FREE_MODE || selectedSession.access_type === "free_for_all" || isNit;

    if (!isFree) {
      // Non-NIT user on a paid session — hand off to paid flow
      setSubmitting(false);
      await handlePaidRegister();
      return;
    }

    try {
      const { data, error: insertError } = await supabase
        .from("session_registrations")
        .insert({
          session_id: selectedSession.id,
          user_id: currentUser.id,
          full_name: regName.trim(),
          email: currentUser.email,
          phone: regPhone.trim(),
          year_or_class: null,
          question_for_speaker: regQuestion.trim() || null,
          is_nit_verified: isNit,
          payment_status: "not_required",
          amount_paid: 0,
        })
        .select()
        .single();

      if (insertError) {
        // Handle duplicate key error gracefully
        if (
          insertError.code === "23505" ||
          insertError.message?.toLowerCase().includes("unique") ||
          insertError.message?.toLowerCase().includes("duplicate")
        ) {
          setFormError("You're already registered for this session.");
        } else {
          setFormError(insertError.message || "Failed to complete registration.");
        }
        setSubmitting(false);
        return;
      }

      // Successful registration
      const newReg = data as SessionRegistration;
      setUserRegistrations((prev) => ({
        ...prev,
        [selectedSession.id]: newReg,
      }));
      setRegistrationCounts((prev) => ({
        ...prev,
        [selectedSession.id]: (prev[selectedSession.id] || 0) + 1,
      }));

      setToastMessage(`Registered successfully for "${selectedSession.title}"!`);
      setTimeout(() => setToastMessage(null), 5000);
      handleCloseRegisterModal();
    } catch (err: any) {
      console.error("Registration error:", err);
      setFormError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Paid Registration (Razorpay) — non-NIT users on nit_free_others_paid sessions
  // ---------------------------------------------------------------------------
  const handlePaidRegister = async () => {
    if (!selectedSession || !currentUser) return;

    setPaymentProcessing(true);
    setFormError(null);

    let pendingRegId: string | null = null;

    try {
      // Step 1: Validate form fields before inserting
      const cleanedPhone = regPhone.replace(/\D/g, "");
      if (!regName.trim()) {
        setFormError("Please enter your full name.");
        setPaymentProcessing(false);
        return;
      }
      if (cleanedPhone.length < 10) {
        setFormError("Please enter a valid 10-digit phone number.");
        setPaymentProcessing(false);
        return;
      }

      // Step 2: Insert a 'pending' registration row to hold the seat
      const { data: pendingReg, error: insertError } = await supabase
        .from("session_registrations")
        .insert({
          session_id: selectedSession.id,
          user_id: currentUser.id,
          full_name: regName.trim(),
          email: currentUser.email,
          phone: regPhone.trim(),
          year_or_class: null,
          question_for_speaker: regQuestion.trim() || null,
          is_nit_verified: isNitUser,
          payment_status: "pending",
          amount_paid: 0,
        })
        .select()
        .single();

      if (insertError) {
        if (
          insertError.code === "23505" ||
          insertError.message?.toLowerCase().includes("unique") ||
          insertError.message?.toLowerCase().includes("duplicate")
        ) {
          setFormError("You already have a registration (pending or active) for this session.");
        } else {
          setFormError(insertError.message || "Failed to start registration.");
        }
        setPaymentProcessing(false);
        return;
      }

      pendingRegId = (pendingReg as SessionRegistration).id;

      // Step 3: Call create-razorpay-order edge function
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const accessToken = authSession?.access_token;

      const orderRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-razorpay-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
            "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            kind: "workshop_session",
            session_id: selectedSession.id,
            registration_id: pendingRegId,
          }),
        }
      );

      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.order_id) {
        throw new Error(orderData.error || "Failed to create payment order.");
      }

      // Step 4: Open Razorpay checkout (single instance with handler + modal.ondismiss)
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: RAZORPAY_KEY_ID || orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency || "INR",
          order_id: orderData.order_id,
          name: "Connectors",
          description: selectedSession.title,
          prefill: {
            name: regName.trim(),
            email: currentUser.email,
            contact: regPhone.trim(),
          },
          theme: { color: "#A855F7" },
          modal: {
            ondismiss: async () => {
              // User closed modal without paying — delete the pending row to free the seat
              if (pendingRegId) {
                await supabase
                  .from("session_registrations")
                  .delete()
                  .eq("id", pendingRegId)
                  .eq("payment_status", "pending");
              }
              resolve(); // stop spinner without showing an error
            },
          },
          handler: async (response: Record<string, string>) => {
            try {
              // Step 5: Verify payment server-side via edge function
              const verifyRes = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-razorpay-payment`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`,
                    "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
                  },
                  body: JSON.stringify({
                    kind: "workshop_session",
                    registration_id: pendingRegId,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                  }),
                }
              );

              const verifyData = await verifyRes.json();

              if (!verifyRes.ok || !verifyData.success) {
                reject(new Error(verifyData.error || "Payment verification failed."));
                return;
              }

              // Step 6: Update local state — mark registration as paid
              const paidReg: SessionRegistration = {
                ...(pendingReg as SessionRegistration),
                payment_status: "paid",
                razorpay_payment_id: response.razorpay_payment_id,
                amount_paid: selectedSession.price_amount || 0,
              };

              setUserRegistrations((prev) => ({
                ...prev,
                [selectedSession.id]: paidReg,
              }));
              setRegistrationCounts((prev) => ({
                ...prev,
                [selectedSession.id]: (prev[selectedSession.id] || 0) + 1,
              }));

              setToastMessage(`Payment successful! You're registered for "${selectedSession.title}".`);
              setTimeout(() => setToastMessage(null), 6000);
              handleCloseRegisterModal();
              resolve();
            } catch (verifyErr: any) {
              reject(verifyErr);
            }
          },
        });

        rzp.on("payment.failed", (resp: any) => {
          reject(new Error((resp as any)?.error?.description || "Payment failed. Please try again."));
        });

        rzp.open();
      });
    } catch (err: any) {
      console.error("Paid registration error:", err);
      // Try to delete the pending row if something went wrong
      if (pendingRegId) {
        await supabase
          .from("session_registrations")
          .delete()
          .eq("id", pendingRegId)
          .eq("payment_status", "pending");
      }
      setFormError(err.message || "Payment could not be completed. Please try again.");
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!cancellingSession || !currentUser) return;
    setCancelLoading(true);
    setCancelError(null);

    try {
      const { error: delError } = await supabase
        .from("session_registrations")
        .delete()
        .eq("session_id", cancellingSession.id)
        .eq("user_id", currentUser.id);

      if (delError) throw delError;

      // Update local state without full reload
      setUserRegistrations((prev) => {
        const next = { ...prev };
        delete next[cancellingSession.id];
        return next;
      });
      setRegistrationCounts((prev) => ({
        ...prev,
        [cancellingSession.id]: Math.max(0, (prev[cancellingSession.id] || 1) - 1),
      }));

      setToastMessage(`Registration cancelled for "${cancellingSession.title}".`);
      setTimeout(() => setToastMessage(null), 5000);
      setCancellingSession(null);
    } catch (err: any) {
      console.error("Error cancelling registration:", err);
      setCancelError(err.message || "Failed to cancel registration.");
    } finally {
      setCancelLoading(false);
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
  const firstSpeakerSessionId = upcomingSessions.find((s) => !!s.speaker)?.id || sessions.find((s) => !!s.speaker)?.id;

  const renderSessionCard = (session: WorkshopSession, isDimmed = false) => {
    const isFreeForAll = session.access_type === "free_for_all";
    const priceInRupees = Math.round((session.price_amount || 0) / 100);
    const isRegistered = !!userRegistrations[session.id];
    const sessionIsPast = isPast(session);
    const count = registrationCounts[session.id] || 0;
    const isFull = !!(session.capacity && count >= session.capacity);
    const isFirstCardWithSpeaker = session.id === firstSpeakerSessionId;

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
              {isFreeForAll || (session.access_type === "nit_free_others_paid" && currentUser && isNitUser) ? (
                <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide bg-emerald-500/90 text-white backdrop-blur-md shadow-md">
                  FREE
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#141417]/90 text-[#FF9D2E] border border-[#FF9D2E]/30 backdrop-blur-md shadow-md">
                  ₹{priceInRupees}
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
              <div className="relative">
                {/* Hand Hint (first card with speaker only) */}
                {showSpeakerHint && isFirstCardWithSpeaker && (
                  <div
                    role="tooltip"
                    className="flex items-center gap-1.5 mb-2 px-2.5 py-1 rounded-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] shadow-sm text-xs text-white w-fit max-w-full"
                  >
                    <span className="speaker-hand-tap inline-flex items-center justify-center shrink-0" aria-hidden="true">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="url(#speaker-hand-gradient)"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-3.5 h-3.5"
                      >
                        <defs>
                          <linearGradient id="speaker-hand-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FF9D2E" />
                            <stop offset="38%" stopColor="#FF2D8F" />
                            <stop offset="70%" stopColor="#A855F7" />
                            <stop offset="100%" stopColor="#4F46E5" />
                          </linearGradient>
                        </defs>
                        <path d="M22 14a8 8 0 0 1-8 8" />
                        <path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
                        <path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1" />
                        <path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10" />
                        <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
                      </svg>
                    </span>
                    <span className="text-[11px] font-medium text-zinc-200 truncate">
                      See speaker profile
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissSpeakerHint();
                      }}
                      className="p-0.5 -mr-0.5 text-zinc-400 hover:text-white rounded-full transition-colors shrink-0 flex items-center justify-center cursor-pointer"
                      aria-label="Dismiss hint"
                      title="Dismiss"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                <div
                  onClick={() => handleSpeakerRowClick(session.speaker?.id)}
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

                  {/* Share button */}
                  <button
                    type="button"
                    title="Share speaker profile"
                    aria-label={`Share ${session.speaker.full_name}'s profile`}
                    onClick={(e) => handleShareSpeaker(e, session.speaker!)}
                    className="p-2 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors shrink-0 cursor-pointer"
                  >
                    <Share2 size={16} />
                  </button>
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

        {/* Card Footer: Dynamic Register CTA */}
        <div className="p-5 sm:p-6 pt-0">
          {sessionIsPast ? (
            <button
              type="button"
              disabled
              className="w-full py-3 px-4 rounded-xl text-sm font-bold text-zinc-500 bg-[#1C1C21] border border-[rgba(255,255,255,0.06)] cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>Closed</span>
            </button>
          ) : isRegistered ? (
            <div className="space-y-2 w-full">
              <div className="w-full py-2.5 px-4 rounded-xl text-sm font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center gap-2">
                <CheckCircle2 size={16} />
                <span>✓ Registered</span>
              </div>
              <button
                type="button"
                onClick={() => setCancellingSession(session)}
                className="w-full text-center text-xs text-[#71717A] hover:text-red-400 transition-colors py-0.5 cursor-pointer underline underline-offset-2"
              >
                Cancel registration
              </button>
            </div>
          ) : isFull ? (
            <button
              type="button"
              disabled
              className="w-full py-3 px-4 rounded-xl text-sm font-bold text-zinc-400 bg-[#1C1C21] border border-[rgba(255,255,255,0.08)] cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>Session full</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleOpenRegisterModal(session)}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #FF9D2E 0%, #FF2D8F 38%, #A855F7 70%, #4F46E5 100%)"
              }}
            >
              <span>Register for Session</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const isNitUser = isNitEmail(currentUser?.email);

  return (
    <div className="min-h-screen bg-[#09090B] text-white py-8 px-4 sm:px-6 lg:px-8 space-y-12">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-[#141417] border border-emerald-500/40 text-white shadow-2xl flex items-center gap-3 animate-fade-in max-w-md">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <p className="text-xs sm:text-sm font-medium">{toastMessage}</p>
            <button
              onClick={() => setToastMessage(null)}
              className="text-[#71717A] hover:text-white ml-auto"
            >
              <X size={16} />
            </button>
          </div>
        )}

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
              onClick={fetchUserDataAndSessions}
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

      {/* ===================================================================== */}
      {/* REGISTRATION MODAL */}
      {/* ===================================================================== */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="bg-[#141417] border border-[rgba(255,255,255,0.12)] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8">
            {/* Modal Header */}
            <div className="p-6 border-b border-[rgba(255,255,255,0.08)] relative">
              <button
                type="button"
                onClick={handleCloseRegisterModal}
                className="absolute top-6 right-6 text-[#A1A1AA] hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="space-y-2">
                {/* Pill Indicator */}
                {selectedSession.access_type === "free_for_all" ? (
                  <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    LIMITED SEATS
                  </span>
                ) : selectedSession.access_type === "nit_free_others_paid" && isNitUser ? (
                  <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    FREE
                  </span>
                ) : (
                  <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-[#FF9D2E] border border-amber-500/30">
                    ₹{Math.round((selectedSession.price_amount || 0) / 100)}
                  </span>
                )}

                {/* Heading */}
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  {selectedSession.access_type === "free_for_all" || (selectedSession.access_type === "nit_free_others_paid" && isNitUser)
                    ? "Join this session — it's free"
                    : "Join this session"}
                </h2>

                <p className="text-xs text-[#A1A1AA]">
                  Session link will be sent to your email before the start. Zero spam.
                </p>
              </div>

              {/* Session Mini Preview */}
              <div className="mt-4 p-3 rounded-xl bg-[#1C1C21] border border-[rgba(255,255,255,0.06)] flex items-center justify-between gap-3 text-xs text-[#A1A1AA]">
                <div className="truncate font-semibold text-white">
                  {selectedSession.title}
                </div>
                <div className="shrink-0 text-[#FF9D2E] font-medium">
                  {formatSessionDate(selectedSession.session_date)}
                </div>
              </div>
            </div>

            {/* Modal Body & Form */}
            <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Full Name */}
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5 flex items-center gap-1.5">
                  <User size={13} className="text-[#A855F7]" />
                  <span>Full Name <span className="text-red-400">*</span></span>
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C21] border border-[rgba(255,255,255,0.08)] text-white text-sm focus:outline-none focus:border-[#A855F7]"
                />
              </div>

              {/* 2. Email (Read-only + disabled from Auth) */}
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5">
                  Account Email <span className="text-[11px] text-[#71717A]">(Logged-in Identity)</span>
                </label>
                <input
                  type="email"
                  readOnly
                  disabled
                  value={currentUser?.email || ""}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090B] border border-[rgba(255,255,255,0.06)] text-white/60 text-sm cursor-not-allowed select-none font-mono"
                />

                {selectedSession.access_type === "nit_free_others_paid" && isNitUser && (
                  <p className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium mt-1.5">
                    <CheckCircle2 size={13} className="shrink-0" />
                    <span>✓ NIT Raipur verified — this session is free for you</span>
                  </p>
                )}
              </div>

              {/* 3. Phone */}
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5 flex items-center gap-1.5">
                  <Phone size={13} className="text-[#FF9D2E]" />
                  <span>WhatsApp / Phone <span className="text-red-400">*</span></span>
                </label>
                <input
                  type="tel"
                  required
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C21] border border-[rgba(255,255,255,0.08)] text-white text-sm focus:outline-none focus:border-[#A855F7]"
                />
              </div>

              {/* 4. Question for Speaker */}
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1.5 flex items-center gap-1.5">
                  <HelpCircle size={13} className="text-[#4F46E5]" />
                  <span>Question for Speaker <span className="text-[#71717A] font-normal">(optional)</span></span>
                </label>
                <textarea
                  rows={2}
                  value={regQuestion}
                  onChange={(e) => setRegQuestion(e.target.value)}
                  placeholder="Anything specific you'd like the speaker to answer?"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C21] border border-[rgba(255,255,255,0.08)] text-white text-sm focus:outline-none focus:border-[#A855F7] resize-none"
                />
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                {selectedSession.access_type === "free_for_all" || (selectedSession.access_type === "nit_free_others_paid" && isNitUser) ? (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                    style={{
                      background: "linear-gradient(135deg, #FF9D2E 0%, #FF2D8F 38%, #A855F7 70%, #4F46E5 100%)"
                    }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Registering...</span>
                      </>
                    ) : (
                      <span>Register for Session</span>
                    )}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <button
                      type="button"
                      disabled={paymentProcessing || submitting}
                      onClick={handlePaidRegister}
                      className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                      style={{
                        background: "linear-gradient(135deg, #FF9D2E 0%, #FF2D8F 38%, #A855F7 70%, #4F46E5 100%)"
                      }}
                    >
                      {paymentProcessing ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Opening Payment...</span>
                        </>
                      ) : (
                        <span>Pay ₹{Math.round((selectedSession.price_amount || 0) / 100)} &amp; Register</span>
                      )}
                    </button>
                    <p className="text-center text-[11px] text-[#71717A]">
                      Secure payment via Razorpay · UPI, Cards, Net Banking accepted
                    </p>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* CANCEL REGISTRATION CONFIRMATION MODAL (Inline 2-step confirm) */}
      {/* ===================================================================== */}
      {cancellingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#141417] border border-[rgba(255,255,255,0.12)] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Cancel Registration?</h3>
                <p className="text-xs text-[#A1A1AA]">
                  Your seat will be released for others.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1C1C21] border border-[rgba(255,255,255,0.08)] space-y-1 text-xs">
              <div className="font-semibold text-white truncate">
                {cancellingSession.title}
              </div>
              <div className="text-[#A1A1AA]">
                {formatSessionDate(cancellingSession.session_date)} at {formatSessionTime(cancellingSession.start_time)}
              </div>
            </div>

            {cancelError && (
              <p className="text-xs text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                {cancelError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={cancelLoading}
                onClick={() => {
                  setCancellingSession(null);
                  setCancelError(null);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#A1A1AA] hover:text-white bg-[#1C1C21] border border-[rgba(255,255,255,0.08)] transition-all"
              >
                Keep Registration
              </button>
              <button
                type="button"
                disabled={cancelLoading}
                onClick={handleCancelRegistration}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-all flex items-center gap-1.5 shadow-lg shadow-red-950/40"
              >
                {cancelLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Yes, Cancel</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hand Hint Animation Styles */}
      <style>{`
        @keyframes speakerHandTap {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(2.5px) scale(0.96);
          }
        }
        .speaker-hand-tap {
          animation: speakerHandTap 1.2s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .speaker-hand-tap {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};
