import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import { Loader2, Send, Calendar as CalendarIcon, Hourglass, ArrowLeft, CheckCircle2, MessageSquare, Link as LinkIcon, Star, AlertTriangle, Video } from "lucide-react";
import { FREE_MODE } from "../lib/config";

interface ChatProps {
  id: string;
  setActiveTab: (tab: string) => void;
}

export const Chat: React.FC<ChatProps> = ({ id, setActiveTab }) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [request, setRequest] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // Confirmation state
  const [showConfirmForm, setShowConfirmForm] = useState(false);
  const [confirmDate, setConfirmDate] = useState("");
  const [confirmTime, setConfirmTime] = useState("");
  const [confirmDuration, setConfirmDuration] = useState("");
  const [confirming, setConfirming] = useState(false);

  const [meetLinkInput, setMeetLinkInput] = useState("");
  const [savingLink, setSavingLink] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  
  // Post-session state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("mentor_no_show");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  // Rating state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingReview, setRatingReview] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [existingRating, setExistingRating] = useState<number | null>(null);


  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (!user) {
        setActiveTab("auth");
        return;
      }

      // Fetch request details
      const { data: reqData, error: reqErr } = await supabase
        .from("booking_requests")
        .select("*")
        .eq("id", id)
        .single();

      if (reqErr || !reqData) {
        console.error("Error fetching request", reqErr);
        setLoading(false);
        return;
      }

      // Fetch mentor details manually
      const { data: mentorData, error: mentorErr } = await supabase
        .from("mentors")
        .select("id, user_id, full_name, profile_photo_url, free_intro_session, pricing, session_durations")
        .eq("id", reqData.mentor_id)
        .single();

      if (!mentorErr && mentorData) {
        reqData.mentors = mentorData;
      }

      setRequest(reqData);

      // Lock duration to student's originally requested duration (or fallback if older booking)
      const studentRequestedMins = reqData.requested_duration_minutes || reqData.confirmed_duration_minutes;
      if (studentRequestedMins) {
        setConfirmDuration(String(studentRequestedMins));
      } else {
        const rawDurations: string[] = mentorData?.session_durations ?? [];
        if (rawDurations.length > 0) {
          const sorted = [...rawDurations].sort((a, b) => parseInt(a) - parseInt(b));
          setConfirmDuration(parseInt(sorted[0]).toString());
        } else {
          setConfirmDuration("30");
        }
      }

      // Check if the current user has already rated this booking
      if (user) {
        const { data: existingRatingData } = await supabase
          .from('session_ratings')
          .select('rating')
          .eq('booking_request_id', id)
          .eq('rated_by', user.id)
          .maybeSingle();

        if (existingRatingData) {
          setHasRated(true);
          setExistingRating(existingRatingData.rating);
        }
      }

      // Fetch initial messages
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("booking_request_id", id)
        .order("created_at", { ascending: true });

      let currentMsgs = msgs || [];
      
      if (currentMsgs.length === 0) {
        // Auto-insert system message for the first time
        const { data: sysMsg, error: sysErr } = await supabase
          .from("chat_messages")
          .insert({
            booking_request_id: id,
            sender_id: user.id, // required FK, but ignored in UI due to is_system
            message: "Please discuss and confirm your available time here — this chat has a limit of 10 messages, so please use it wisely.",
            is_system: true
          })
          .select()
          .single();

        if (sysMsg && !sysErr) {
          currentMsgs = [sysMsg];
        }
      }

      setMessages(currentMsgs);
      setLoading(false);
      markMessagesAsRead(currentMsgs, user.id);

      // Realtime subscription
      const channelTopic = `chat_${id}_${Date.now()}`;
      const channel = supabase
        .channel(channelTopic)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `booking_request_id=eq.${id}`,
          },
          (payload) => {
            const newMsg = payload.new;
            setMessages((prev) => {
              if (prev.some(m => m.id === newMsg.id)) return prev;

              const tempIndex = prev.findIndex(m => String(m.id).startsWith('temp-') && m.message === newMsg.message && m.sender_id === newMsg.sender_id);
              if (tempIndex !== -1) {
                const next = [...prev];
                next[tempIndex] = newMsg;
                return next;
              }
              
              return [...prev, newMsg];
            });
            
            // Mark read if it's sent to us
            if (newMsg.sender_id !== user.id) {
              markMessagesAsRead([newMsg], user.id);
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "booking_requests",
            filter: `id=eq.${id}`
          },
          (payload) => {
             setRequest((prev: any) => ({ ...prev, ...payload.new }));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanupPromise = init();
    return () => {
      cleanupPromise.then(cleanup => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      });
    };
  }, [id, setActiveTab]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const markMessagesAsRead = async (msgs: any[], userId: string) => {
    const unreadIds = msgs
      .filter((m) => m.sender_id !== userId && !m.read_at)
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      await supabase
        .from("chat_messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", unreadIds);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const realMessagesCount = messages.filter((m) => !m.is_system).length;
    if (!newMessage.trim() || sending || realMessagesCount >= 10 || request?.status === 'time_confirmed') return;

    setSending(true);
    const text = newMessage.trim();
    setNewMessage("");

    const tempId = `temp-${Date.now()}`;
    const tempMsg = {
      id: tempId,
      booking_request_id: id,
      sender_id: currentUser.id,
      message: text,
      created_at: new Date().toISOString(),
      is_system: false,
    };
    
    // Optimistic update
    setMessages((prev) => [...prev, tempMsg]);

    const isFirstMessage = realMessagesCount === 0;

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        booking_request_id: id,
        sender_id: currentUser.id,
        message: text,
      })
      .select()
      .single();

    if (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message.");
      setNewMessage(text); // restore
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } else {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? data : m)));
      
      if (isFirstMessage) {
        // Trigger email for first message
        const otherParticipantId = currentUser.id === request.student_id ? request.mentors.user_id : request.student_id;
        supabase.functions.invoke('send-email', {
          body: {
            type: 'first_message',
            senderId: currentUser.id,
            recipientId: otherParticipantId
          }
        }).catch(console.error);
      }
    }

    setSending(false);
  };

  const handleConfirmSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmDate || !confirmTime || !confirmDuration) return;

    setConfirming(true);
    
    // Check for previous sessions
    const { data: prevBookings } = await supabase
      .from('booking_requests')
      .select('id')
      .eq('student_id', request.student_id)
      .eq('mentor_id', request.mentors.id)
      .in('status', ['time_confirmed'])
      .neq('id', id);
      
    const isFirstSession = !prevBookings || prevBookings.length === 0;
    const isFreeIntro = isFirstSession && request.mentors.free_intro_session && confirmDuration === "15";
    
    const durationKey = `${confirmDuration} min`;
    const amountDueRaw = request.mentors.pricing?.[durationKey];
    const amountDue = amountDueRaw ? parseFloat(amountDueRaw) : 0;
    // FREE_MODE: treat every session like the free-intro path (no payment)
    const paymentStatus = (isFreeIntro || FREE_MODE) ? 'not_required' : 'pending';

    const { error } = await supabase
      .from("booking_requests")
      .update({
        status: "time_confirmed",
        confirmed_date: confirmDate,
        confirmed_time: confirmTime,
        confirmed_duration_minutes: parseInt(confirmDuration),
        is_free_intro: isFreeIntro,
        payment_status: paymentStatus,
        amount_due: (isFreeIntro || FREE_MODE) ? null : amountDue
      })
      .eq("id", id);

    setConfirming(false);

    if (error) {
      console.error("Error confirming session:", error);
      alert("Failed to confirm session.");
    } else {
      setShowConfirmForm(false);
      // Trigger confirmation email
      supabase.functions.invoke('send-email', {
        body: {
          type: 'session_confirmed',
          studentId: request.student_id,
          mentorId: request.mentors.id, // edge func might need user_id or id, pass both if needed
          date: confirmDate,
          time: confirmTime,
        }
      }).catch(console.error);
    }
  };

  
  const handlePayNow = async () => {
    setIsPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: { bookingRequestId: id }
      });
      
      if (error || !data?.order_id) throw error || new Error("Failed to create order");
      
      const razorpayKey = data.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!razorpayKey) {
        console.error("Razorpay key not configured. Please set VITE_RAZORPAY_KEY_ID.");
      }
      
      const options = {
        key: razorpayKey,
        amount: Math.round(request.amount_due * 100),
        currency: "INR",
        name: "Connectors",
        description: `Mentorship Session with ${request.mentors.full_name}`,
        order_id: data.order_id,
        handler: async function (response: any) {
          try {
            const { error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                bookingRequestId: id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              }
            });
            if (verifyError) throw verifyError;
            
            setRequest((prev: any) => ({ ...prev, payment_status: 'paid', razorpay_payment_id: response.razorpay_payment_id }));
            alert("Payment successful! ✅");
          } catch (err) {
            console.error("Verification error", err);
            alert("Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: currentUser.user_metadata?.full_name || "Student",
          email: currentUser.email,
        },
        theme: {
          color: "#4F46E5"
        }
      };
      
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any){
        console.error(response.error);
        alert("Payment failed: " + response.error.description);
      });
      rzp.open();

    } catch (err) {
      console.error(err);
      alert("Failed to initiate payment.");
    } finally {
      setIsPaying(false);
    }
  };

  const handleSaveMeetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetLinkInput.trim()) return;
    setSavingLink(true);
    const { error } = await supabase
      .from('booking_requests')
      .update({ meet_link: meetLinkInput.trim() })
      .eq('id', id);
    if (!error) {
      setRequest((prev: any) => ({ ...prev, meet_link: meetLinkInput.trim() }));
    } else {
      alert("Failed to save link.");
    }
    setSavingLink(false);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReport(true);
    
    const { error } = await supabase
      .from('session_reports')
      .insert({
        booking_request_id: id,
        reported_by: currentUser.id,
        reason: reportReason,
        details: reportDetails
      });
      
    if (error) {
      alert("Failed to submit report.");
    } else {
      await supabase.functions.invoke('send-email', {
        body: {
          type: 'issue_report',
          reporterId: currentUser.id,
          studentId: request.student_id,
          mentorId: request.mentors.id,
          reason: reportReason,
          details: reportDetails,
          bookingId: id
        }
      });
      alert("Report submitted successfully.");
      setShowReportModal(false);
    }
    setSubmittingReport(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 size={40} className="animate-spin text-primary mb-4" />
        <p className="text-on-surface-variant font-medium">Loading conversation...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-2xl font-bold text-on-surface mb-2">Request Not Found</h2>
        <p className="text-on-surface-variant mb-6">This request may have been deleted or you don't have access.</p>
        <button onClick={() => setActiveTab("dashboard")} className="px-6 py-2 bg-primary text-on-primary-fixed rounded-full font-bold">
          Go to Dashboard
        </button>
      </div>
    );
  }

  const isMentorView = currentUser.id === request.mentors?.user_id;
  const realMessagesCount = messages.filter((m) => !m.is_system).length;
  const messageLimitReached = realMessagesCount >= 10;
  const isTimeConfirmed = request.status === "time_confirmed";
  const isCompleted = request.status === "completed";
  const showSessionBlock = isTimeConfirmed || isCompleted;
  // FREE_MODE: suppress payment step entirely
  const needsPayment = !FREE_MODE && showSessionBlock && request.payment_status === "pending" && !isMentorView;
  // Unlock Meet link when: genuinely paid, free-intro, any not_required session, or FREE_MODE is on.
  // 'not_required' guard future-proofs sessions confirmed during FREE_MODE if flag is later turned off.
  const isPaidOrFree = request.is_free_intro || request.payment_status === "paid" || request.payment_status === "not_required" || FREE_MODE;

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ratingValue === 0) { alert("Please select a star rating."); return; }
    setSubmittingRating(true);
    const { error } = await supabase
      .from('session_ratings')
      .insert({
        booking_request_id: id,
        mentor_id: request.mentor_id,
        rated_by: currentUser.id,
        rating: ratingValue,
        review: ratingReview.trim() || null
      });
    if (error) {
      if (error.code === '23505') {
        // Unique constraint — already rated
        setHasRated(true);
      } else {
        alert("Failed to submit rating. Please try again.");
      }
    } else {
      setHasRated(true);
      setExistingRating(ratingValue);
      setShowRatingModal(false);
    }
    setSubmittingRating(false);
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-80px)] p-4 sm:p-6 flex flex-col animate-fade-in">
      <button 
        onClick={() => setActiveTab("dashboard")}
        className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors mb-4 self-start font-medium text-sm"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="glass-card flex-1 rounded-3xl border border-white/10 flex flex-col overflow-hidden shadow-2xl relative">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/5 flex items-center justify-between bg-surface-container/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/20">
              {isMentorView ? (
                <div className="w-full h-full bg-primary/20 flex items-center justify-center font-bold text-primary">S</div>
              ) : (
                request.mentors?.profile_photo_url ? (
                  <img src={request.mentors.profile_photo_url} alt="Mentor" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                    {request.mentors?.full_name?.charAt(0) || "M"}
                  </div>
                )
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-on-surface">
                {isMentorView ? "Student" : request.mentors?.full_name || "Mentor"}
              </h2>
              <p className="text-sm text-on-surface-variant flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-blue-500' : isTimeConfirmed ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                {isCompleted ? 'Session Completed' : isTimeConfirmed ? 'Session Confirmed' : 'Scheduling Phase'}
              </p>
            </div>
          </div>

          {isMentorView && request.status === "accepted" && !showConfirmForm && (
            <button
              onClick={() => setShowConfirmForm(true)}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-on-primary-fixed font-bold text-sm rounded-xl hover:scale-105 transition-all shadow-lg shadow-primary/20"
            >
              <CalendarIcon size={16} /> Confirm Time
            </button>
          )}
        </div>

        {/* Status / Confirmation Banner */}
        {showSessionBlock && (
          <div className="bg-surface-container-low border-b border-white/5 p-4 flex flex-col gap-4">
            
            {/* Time Info */}
            <div className="flex items-center gap-3">
              <div className="bg-green-500/20 p-2 rounded-full text-green-500 shrink-0">
                <CalendarIcon size={24} />
              </div>
              <div>
                <h3 className="font-bold text-on-surface">Scheduled for {new Date(request.confirmed_date).toLocaleDateString()} at {request.confirmed_time}</h3>
                <p className="text-sm text-on-surface-variant mt-0.5">
                  Duration: {request.confirmed_duration_minutes} min {request.is_free_intro && <span className="bg-green-500/20 text-green-500 px-2 py-0.5 rounded ml-2 text-xs font-bold uppercase">Free Intro</span>}
                </p>
              </div>
            </div>

            {/* Payment Banner (Student) — hidden in FREE_MODE */}
            {needsPayment && (
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-primary">Payment Required</h4>
                  <p className="text-sm text-on-surface-variant">Amount due: ₹{request.amount_due}</p>
                </div>
                {!request.amount_due || request.amount_due <= 0 ? (
                  <div className="text-sm text-red-500 font-bold sm:text-right max-w-xs">
                    We're having trouble calculating the price for this session — please contact support.
                  </div>
                ) : (
                  <button 
                    onClick={handlePayNow} 
                    disabled={isPaying}
                    className="w-full sm:w-auto px-6 py-2 bg-primary text-on-primary-fixed rounded-full font-bold hover:scale-105 transition-all flex items-center justify-center disabled:opacity-50"
                  >
                    {isPaying ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                    Pay Now
                  </button>
                )}
              </div>
            )}

            {/* Free Session notice — shown in FREE_MODE instead of payment step */}
            {FREE_MODE && showSessionBlock && !isMentorView && !needsPayment && !request.is_free_intro && request.payment_status !== "paid" && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
                <div className="bg-green-500/20 p-2 rounded-full text-green-500 shrink-0">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-green-400">Free Session</h4>
                  <p className="text-sm text-on-surface-variant">No payment required — your session is confirmed and ready.</p>
                </div>
              </div>
            )}
            
            {/* Payment Success */}
            {request.payment_status === "paid" && (
              <div className="bg-gradient-to-r from-orange-500/10 to-purple-500/10 border border-orange-500/20 rounded-xl p-4 flex items-start sm:items-center gap-4 shadow-sm mb-2">
                <div className="bg-gradient-to-br from-orange-500 to-purple-600 text-white p-2 sm:p-3 rounded-full shrink-0 shadow-lg shadow-orange-500/20">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-on-surface text-base sm:text-lg mb-0.5">🎉 Payment Successful!</h4>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Your session with <span className="font-bold text-on-surface">{isMentorView ? "Student" : request.mentors?.full_name || "Mentor"}</span> is all set. Get ready to gain some real guidance — see you on <span className="font-bold text-on-surface">{new Date(request.confirmed_date).toLocaleDateString()}</span> at <span className="font-bold text-on-surface">{request.confirmed_time}</span>!
                  </p>
                </div>
              </div>
            )}

            {/* Meet Link Section */}
            {isPaidOrFree && (
              <div className="bg-surface-container-high rounded-xl p-4 border border-white/10">
                {request.meet_link ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-500/20 p-2 rounded-full text-blue-500">
                        <Video size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">🔗 Join your session:</p>
                        <a href={request.meet_link} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-sm break-all">
                          {request.meet_link}
                        </a>
                      </div>
                    </div>
                    {showSessionBlock && (
                      <div className="flex gap-2 w-full sm:w-auto">
                        {isCompleted && !isMentorView && (
                          hasRated ? (
                            <button
                              disabled
                              className="flex-1 sm:flex-none px-4 py-2 bg-surface-container text-green-500 rounded-full text-sm font-bold flex items-center justify-center gap-2 border border-green-500/20 opacity-80 cursor-default"
                            >
                              <Star size={14} className="fill-green-500" /> Rated {existingRating}/5 ✓
                            </button>
                          ) : (
                            <button
                              onClick={() => { setRatingValue(0); setRatingHover(0); setRatingReview(""); setShowRatingModal(true); }}
                              className="flex-1 sm:flex-none px-4 py-2 bg-surface-container hover:bg-surface-container-highest text-on-surface rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-white/10"
                            >
                              <Star size={14} className="text-yellow-500" /> Rate
                            </button>
                          )
                        )}
                        <button onClick={() => setShowReportModal(true)} className="flex-1 sm:flex-none px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-red-500/20">
                          <AlertTriangle size={14} /> Report
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  isMentorView ? (
                    <div className="flex flex-col gap-4">
                      <div className="bg-surface-container-low p-4 rounded-xl border border-white/5">
                        <div className="flex items-start gap-3">
                          <div className="mt-1 shrink-0">
                            <Video size={20} className="text-primary" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-on-surface mb-1 flex items-center gap-2">
                              📹 Add Your Session Link
                              <div className="group relative cursor-help">
                                <span className="text-on-surface-variant hover:text-primary transition-colors text-[10px] inline-flex items-center justify-center w-4 h-4 rounded-full border border-current font-bold">i</span>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-surface-container-highest border border-white/10 rounded-xl text-xs text-on-surface shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none">
                                  Don't have a Google Meet link yet? Click 'Create Google Meet', sign in with your Google account if asked, then copy the link from your browser's address bar and paste it below.
                                </div>
                              </div>
                            </h4>
                            <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
                              Click below to create a Google Meet, then copy the link from your browser's address bar and paste it here for your student.
                            </p>
                            <a href="https://meet.google.com/new" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl text-sm font-bold transition-colors">
                              🔗 Create Google Meet
                            </a>
                          </div>
                        </div>
                      </div>

                      <form onSubmit={handleSaveMeetLink} className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          <div className="relative">
                            <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                            <input 
                              type="url" 
                              required 
                              placeholder="Paste your Meet link here..." 
                              value={meetLinkInput} 
                              onChange={e => setMeetLinkInput(e.target.value)}
                              className="w-full bg-surface-container border border-white/10 rounded-xl pl-10 pr-3 py-2 text-sm text-on-surface focus:border-primary/50 outline-none" 
                            />
                          </div>
                        </div>
                        <button type="submit" disabled={savingLink} className="sm:self-end px-4 py-2 bg-primary text-on-primary-fixed rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all">
                          {savingLink ? "Saving..." : "Save Link"}
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="text-sm text-on-surface-variant italic flex items-center gap-2">
                        <Hourglass size={16} /> Waiting for mentor to add meeting link...
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={() => setShowReportModal(true)} className="flex-1 sm:flex-none px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-red-500/20">
                          <AlertTriangle size={14} /> Report
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
            
          </div>
        )}

        {/* Confirm Form Overlay */}
        {showConfirmForm && (
          <div className="absolute top-[80px] left-0 w-full z-10 bg-surface-container-high border-b border-white/10 p-6 shadow-2xl animate-fade-in-down">
            <h3 className="text-lg font-bold text-on-surface mb-4">Confirm Session Details</h3>
            <form onSubmit={handleConfirmSession} className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="w-full sm:w-auto flex-1">
                <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Date</label>
                <input type="date" required value={confirmDate} onChange={e => setConfirmDate(e.target.value)} className="w-full bg-surface-container border border-white/10 rounded-xl p-3 text-on-surface focus:border-primary/50 outline-none" />
              </div>
              <div className="w-full sm:w-auto flex-1">
                <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Time</label>
                <input type="time" required value={confirmTime} onChange={e => setConfirmTime(e.target.value)} className="w-full bg-surface-container border border-white/10 rounded-xl p-3 text-on-surface focus:border-primary/50 outline-none" />
              </div>
              <div className="w-full sm:w-auto flex-1">
                <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">
                  Duration (Requested by Student)
                </label>
                <div className="w-full bg-surface-container/70 border border-white/10 rounded-xl p-3 text-on-surface text-sm font-semibold flex items-center justify-between opacity-90 cursor-not-allowed">
                  <span>
                    {(() => {
                      const mins = parseInt(confirmDuration || "30");
                      return mins >= 60
                        ? `${mins / 60} Hour${mins > 60 ? 's' : ''} (${mins} min)`
                        : `${mins} Minutes`;
                    })()}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                    Locked
                  </span>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                <button type="button" onClick={() => setShowConfirmForm(false)} className="px-4 py-3 bg-surface-container hover:bg-surface-container-highest text-on-surface rounded-xl font-bold flex-1 transition-colors">Cancel</button>
                <button type="submit" disabled={confirming} className="px-6 py-3 bg-primary text-on-primary-fixed rounded-xl font-bold flex-1 hover:opacity-90 disabled:opacity-50 transition-all flex justify-center">
                  {confirming ? <Loader2 size={20} className="animate-spin" /> : "Confirm"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {request.initial_message && (
            <div className="flex justify-center mb-8">
              <div className="bg-surface-container-low border border-white/5 rounded-2xl p-4 max-w-lg text-center text-sm text-on-surface-variant italic">
                <p className="font-bold text-on-surface not-italic mb-1 text-xs uppercase tracking-wider">Initial Request Message</p>
                "{request.initial_message}"
              </div>
            </div>
          )}

          {messages.length === 0 && !request.initial_message && (
            <div className="h-full flex flex-col items-center justify-center text-center text-on-surface-variant space-y-3 opacity-50">
              <MessageSquare size={48} />
              <p>Send a message to start scheduling your session.</p>
            </div>
          )}

          {messages.map((msg) => {
            if (msg.is_system) {
              return (
                <div key={msg.id} className="flex justify-center my-4 w-full">
                  <div className="bg-surface-container-high/50 border border-white/5 rounded-2xl p-4 max-w-md text-center text-sm text-on-surface-variant font-medium">
                    {msg.message}
                  </div>
                </div>
              );
            }

            const isMe = msg.sender_id === currentUser.id;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] sm:max-w-[70%] p-4 rounded-2xl ${
                  isMe 
                    ? 'bg-primary text-on-primary-fixed rounded-tr-sm' 
                    : 'bg-surface-container text-on-surface rounded-tl-sm border border-white/5'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base">{msg.message}</p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-on-surface-variant/60 font-medium">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isMe && msg.read_at && (
                    <span className="text-[10px] text-primary font-bold">Read</span>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {!showSessionBlock && (
          <div className="p-4 sm:p-6 bg-surface-container-low border-t border-white/5">
            <div className="flex items-center justify-between mb-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              <span>Messages Used: <span className={messageLimitReached ? 'text-red-500' : 'text-primary'}>{realMessagesCount}/10</span></span>
              {isMentorView && (
                 <button onClick={() => setShowConfirmForm(true)} className="sm:hidden text-primary underline">Confirm Time Now</button>
              )}
            </div>

            {messageLimitReached ? (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm font-medium text-center">
                You've reached the scheduling message limit. Please confirm a session time to continue, or start a new request if you need more time.
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-surface-container border border-white/10 rounded-full px-6 py-3 sm:py-4 text-on-surface focus:outline-none focus:border-primary/50 transition-colors"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="bg-primary text-on-primary-fixed p-3 sm:p-4 rounded-full hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-lg shadow-primary/20 flex items-center justify-center"
                >
                  {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-1" />}
                </button>
              </form>
            )}
          </div>
        )}
      
        {/* Rate Modal */}
        {showRatingModal && (
          <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-surface-container-high rounded-3xl p-6 w-full max-w-md border border-white/10 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <Star size={24} className="text-yellow-500" />
                <h3 className="text-xl font-bold text-on-surface">Rate Your Session</h3>
              </div>
              <p className="text-sm text-on-surface-variant mb-6">How was your session with <span className="font-bold text-on-surface">{request.mentors?.full_name || 'your mentor'}</span>? Your feedback helps other students.</p>

              <form onSubmit={handleSubmitRating} className="flex flex-col gap-5">
                {/* Star Selector */}
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-3 uppercase tracking-wider">Your Rating</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingValue(star)}
                        onMouseEnter={() => setRatingHover(star)}
                        onMouseLeave={() => setRatingHover(0)}
                        className="text-3xl transition-transform hover:scale-110 focus:outline-none"
                      >
                        <Star
                          size={36}
                          className={`transition-colors ${
                            star <= (ratingHover || ratingValue)
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-on-surface-variant/30'
                          }`}
                        />
                      </button>
                    ))}
                    {(ratingHover || ratingValue) > 0 && (
                      <span className="ml-2 text-sm font-bold text-on-surface-variant">
                        {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][(ratingHover || ratingValue)]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Written Review */}
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Written Review <span className="normal-case font-normal">(optional)</span></label>
                  <textarea
                    value={ratingReview}
                    onChange={e => setRatingReview(e.target.value)}
                    placeholder="Share what you learned, or how the session could be improved..."
                    className="w-full bg-surface-container border border-white/10 rounded-xl p-3 text-on-surface focus:border-primary/50 outline-none resize-none h-28 text-sm"
                  />
                </div>

                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setShowRatingModal(false)}
                    className="flex-1 px-4 py-3 bg-surface-container hover:bg-surface-container-highest text-on-surface rounded-xl font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRating || ratingValue === 0}
                    className="flex-1 px-4 py-3 kinetic-gradient text-white rounded-xl font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                  >
                    {submittingRating ? <Loader2 size={16} className="animate-spin" /> : <><Star size={14} className="fill-white" /> Submit Rating</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Report Modal */}
        {showReportModal && (
          <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-surface-container-high rounded-3xl p-6 w-full max-w-md border border-white/10 shadow-2xl">
              <div className="flex items-center gap-3 text-red-500 mb-4">
                <AlertTriangle size={24} />
                <h3 className="text-xl font-bold text-on-surface">Report an Issue</h3>
              </div>
              <p className="text-sm text-on-surface-variant mb-6">If you experienced an issue during your session, let us know and we'll review it.</p>
              
              <form onSubmit={handleSubmitReport} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Reason</label>
                  <select value={reportReason} onChange={e => setReportReason(e.target.value)} className="w-full bg-surface-container border border-white/10 rounded-xl p-3 text-on-surface focus:border-primary/50 outline-none">
                    <option value="mentor_no_show">Mentor did not show up</option>
                    <option value="mentor_late">Mentor was significantly late</option>
                    <option value="technical_issue">Technical Issues</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Details (Optional)</label>
                  <textarea 
                    value={reportDetails} 
                    onChange={e => setReportDetails(e.target.value)} 
                    placeholder="Provide any additional context..."
                    className="w-full bg-surface-container border border-white/10 rounded-xl p-3 text-on-surface focus:border-primary/50 outline-none resize-none h-24" 
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => setShowReportModal(false)} className="flex-1 px-4 py-3 bg-surface-container hover:bg-surface-container-highest text-on-surface rounded-xl font-bold transition-colors">Cancel</button>
                  <button type="submit" disabled={submittingReport} className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold disabled:opacity-50 transition-all flex items-center justify-center">
                    {submittingReport ? <Loader2 size={16} className="animate-spin" /> : "Submit Report"}
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
