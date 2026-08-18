const fs = require('fs');
const path = require('path');

const chatPath = path.join(__dirname, 'src', 'pages', 'Chat.tsx');
let content = fs.readFileSync(chatPath, 'utf8');

// 1. Update imports
content = content.replace(
  /import { Loader2, Send, Calendar as CalendarIcon, Clock, Hourglass, ArrowLeft, CheckCircle2 } from "lucide-react";/g,
  `import { Loader2, Send, Calendar as CalendarIcon, Clock, Hourglass, ArrowLeft, CheckCircle2, MessageSquare, Link as LinkIcon, Star, Flag, AlertTriangle, Video } from "lucide-react";`
);

// 2. Fetch query
content = content.replace(
  /mentors \( id, user_id, full_name, profile_photo_url \)/g,
  `mentors ( id, user_id, full_name, profile_photo_url, free_intro_session, pricing )`
);

// 3. Add states
const statesToAdd = `
  const [meetLinkInput, setMeetLinkInput] = useState("");
  const [savingLink, setSavingLink] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  
  // Post-session state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("mentor_no_show");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
`;
content = content.replace(
  /const \[confirming, setConfirming\] = useState\(false\);/g,
  `const [confirming, setConfirming] = useState(false);\n${statesToAdd}`
);

// 4. Update handleConfirmSession
const oldConfirmSession = `  const handleConfirmSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmDate || !confirmTime || !confirmDuration) return;

    setConfirming(true);
    const { error } = await supabase
      .from("booking_requests")
      .update({
        status: "time_confirmed",
        confirmed_date: confirmDate,
        confirmed_time: confirmTime,
        confirmed_duration_minutes: parseInt(confirmDuration),
      })
      .eq("id", id);`;

const newConfirmSession = `  const handleConfirmSession = async (e: React.FormEvent) => {
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
    
    const amountDue = request.mentors.pricing?.[confirmDuration] || 0;
    const paymentStatus = isFreeIntro ? 'not_required' : 'pending';

    const { error } = await supabase
      .from("booking_requests")
      .update({
        status: "time_confirmed",
        confirmed_date: confirmDate,
        confirmed_time: confirmTime,
        confirmed_duration_minutes: parseInt(confirmDuration),
        is_free_intro: isFreeIntro,
        payment_status: paymentStatus,
        amount_due: isFreeIntro ? null : amountDue
      })
      .eq("id", id);`;

content = content.replace(oldConfirmSession, newConfirmSession);

// 5. Add new handlers
const newHandlers = `
  const handlePayNow = async () => {
    setIsPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: { bookingRequestId: id }
      });
      
      if (error || !data?.order_id) throw error || new Error("Failed to create order");
      
      const options = {
        key: 'rzp_test_TIuUPwIxONhdqH',
        amount: Math.round(request.amount_due * 100),
        currency: "INR",
        name: "Connectors",
        description: \`Mentorship Session with \${request.mentors.full_name}\`,
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
`;
content = content.replace(/if \(loading\) {/, `${newHandlers}\n  if (loading) {`);

// 6. UI flags
const oldFlags = `  const isMentorView = currentUser.id === request.mentors?.user_id;
  const realMessagesCount = messages.filter((m) => !m.is_system).length;
  const messageLimitReached = realMessagesCount >= 10;
  const isTimeConfirmed = request.status === "time_confirmed";`;

const newFlags = `  const isMentorView = currentUser.id === request.mentors?.user_id;
  const realMessagesCount = messages.filter((m) => !m.is_system).length;
  const messageLimitReached = realMessagesCount >= 10;
  const isTimeConfirmed = request.status === "time_confirmed";
  const needsPayment = isTimeConfirmed && request.payment_status === "pending" && !isMentorView;
  const isPaidOrFree = request.is_free_intro || request.payment_status === "paid";
  
  let isSessionOver = false;
  if (isTimeConfirmed && request.confirmed_date && request.confirmed_time) {
    const scheduledEnd = new Date(\`\${request.confirmed_date}T\${request.confirmed_time}\`).getTime() + (request.confirmed_duration_minutes * 60000);
    isSessionOver = Date.now() > scheduledEnd;
  }`;

content = content.replace(oldFlags, newFlags);

// 7. Render Banner logic
const oldBanner = `        {/* Confirmation Banner */}
        {isTimeConfirmed && (
          <div className="bg-green-500/10 border-b border-green-500/20 p-4 flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-500/20 p-2 rounded-full text-green-500 shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="font-bold text-green-500">Session Confirmed!</h3>
                <p className="text-sm text-green-500/80 mt-0.5">
                  Scheduled for {new Date(request.confirmed_date).toLocaleDateString()} at {request.confirmed_time} ({request.confirmed_duration_minutes} min).
                </p>
              </div>
            </div>
          </div>
        )}`;

const newBanner = `        {/* Status / Confirmation Banner */}
        {isTimeConfirmed && (
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

            {/* Payment Banner (Student) */}
            {needsPayment && (
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-primary">Payment Required</h4>
                  <p className="text-sm text-on-surface-variant">Amount due: ₹{request.amount_due}</p>
                </div>
                <button 
                  onClick={handlePayNow} 
                  disabled={isPaying}
                  className="w-full sm:w-auto px-6 py-2 bg-primary text-on-primary-fixed rounded-full font-bold hover:scale-105 transition-all flex items-center justify-center disabled:opacity-50"
                >
                  {isPaying ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                  Pay Now
                </button>
              </div>
            )}
            
            {/* Payment Success (Mentor sees it's paid) */}
            {request.payment_status === "paid" && (
               <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-2 text-green-500 text-sm font-bold">
                 <CheckCircle2 size={16} /> Payment Completed
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
                        <p className="text-sm font-bold text-on-surface">Google Meet Link</p>
                        <a href={request.meet_link} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-sm break-all">
                          {request.meet_link}
                        </a>
                      </div>
                    </div>
                    {isSessionOver && (
                      <div className="flex gap-2 w-full sm:w-auto">
                        {!isMentorView && (
                           <button onClick={() => alert("Rate session flow")} className="flex-1 sm:flex-none px-4 py-2 bg-surface-container hover:bg-surface-container-highest text-on-surface rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-white/10">
                             <Star size={14} className="text-yellow-500" /> Rate
                           </button>
                        )}
                        <button onClick={() => setShowReportModal(true)} className="flex-1 sm:flex-none px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-red-500/20">
                          <AlertTriangle size={14} /> Report
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  isMentorView ? (
                    <form onSubmit={handleSaveMeetLink} className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Add Meet Link</label>
                        <div className="relative">
                          <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                          <input 
                            type="url" 
                            required 
                            placeholder="https://meet.google.com/..." 
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
                  ) : (
                    <div className="text-sm text-on-surface-variant italic flex items-center gap-2">
                      <Hourglass size={16} /> Waiting for mentor to add meeting link...
                    </div>
                  )
                )}
              </div>
            )}
            
          </div>
        )}`;

content = content.replace(oldBanner, newBanner);

// 8. Add Report Modal
const reportModal = `
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
`;
content = content.replace(/<\/div>\n    <\/div>\n  \);\n};\n$/, `${reportModal}\n      </div>\n    </div>\n  );\n};\n`);

fs.writeFileSync(chatPath, content);
console.log("Updated Chat.tsx");
