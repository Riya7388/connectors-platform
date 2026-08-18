import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { Clock, CheckCircle2, XCircle, MessageSquare, ChevronRight, AlertCircle, Loader2 } from "lucide-react";

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [isMentor, setIsMentor] = useState(false);
  const [mentorProfile, setMentorProfile] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    if (user) {
      // 1. Fetch My Requests (Student side)
      const { data: studentRequests, error: studentReqError } = await supabase
        .from("booking_requests")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      if (studentReqError) {
        console.error("Error fetching student requests:", studentReqError);
      }

      if (studentRequests && studentRequests.length > 0) {
        const mentorIds = [...new Set(studentRequests.map((req: any) => req.mentor_id))];
        const { data: mentorsData } = await supabase
          .from("mentors")
          .select("id, full_name, profile_photo_url")
          .in("id", mentorIds);
          
        const mentorsMap: Record<string, any> = {};
        if (mentorsData) {
          mentorsData.forEach(m => {
            mentorsMap[m.id] = m;
          });
        }
        
        const requestsWithMentors = studentRequests.map((req: any) => ({
          ...req,
          mentors: mentorsMap[req.mentor_id] || null
        }));
        
        setMyRequests(requestsWithMentors);
      } else if (studentRequests) {
        setMyRequests([]);
      }

      // 2. Check if user is an approved mentor
      const { data: mentorData } = await supabase
        .from("mentors")
        .select("*")
        .eq("user_id", user.id)
        .eq("application_status", "approved")
        .maybeSingle();

      if (mentorData) {
        setIsMentor(true);
        setMentorProfile(mentorData);

        // 3. Fetch Incoming Requests (Mentor side)
        const { data: mentorRequests } = await supabase
          .from("booking_requests")
          .select("*")
          .eq("mentor_id", mentorData.id)
          .order("created_at", { ascending: false });

        if (mentorRequests) setIncomingRequests(mentorRequests);
      }
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    const { error } = await supabase
      .from("booking_requests")
      .update({ status: newStatus })
      .eq("id", requestId);

    if (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status.");
    } else {
      // Trigger email if accepted/declined
      if (newStatus === "accepted" || newStatus === "declined") {
        const request = incomingRequests.find(r => r.id === requestId);
        if (request) {
          supabase.functions.invoke('send-email', {
            body: {
              type: newStatus === "accepted" ? 'request_accepted' : 'request_declined',
              studentId: request.student_id,
              mentorId: mentorProfile.id,
            }
          }).catch(console.error);
        }
      }
      fetchDashboardData();
    }
  };

  const isExpired = (request: any) => {
    if (request.status !== "pending" && request.status !== "accepted") return false;
    return new Date() > new Date(request.expires_at);
  };

  const renderStatusBadge = (status: string, expired: boolean) => {
    if (expired) {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">
          <AlertCircle size={14} /> Expired
        </span>
      );
    }
    switch (status) {
      case "pending":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Clock size={14} /> Pending
          </span>
        );
      case "accepted":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <CheckCircle2 size={14} /> Accepted
          </span>
        );
      case "time_confirmed":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20">
            <CheckCircle2 size={14} /> Confirmed
          </span>
        );
      case "completed":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <CheckCircle2 size={14} /> Completed
          </span>
        );
      case "declined":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-surface-container-high text-on-surface-variant border border-white/10">
            <XCircle size={14} /> Declined
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-background p-6 max-w-5xl mx-auto space-y-12 animate-fade-in pb-20">
      
      {/* Student: My Requests */}
      <div className="space-y-6 pt-6">
        <h2 className="text-2xl font-bold text-on-surface flex items-center gap-2">
          My Sent Requests
        </h2>
        {myRequests.length === 0 ? (
          <div className="glass-card p-10 rounded-3xl text-center border border-white/5">
            <p className="text-on-surface-variant mb-4">You haven't sent any mentorship requests yet.</p>
            <button 
              onClick={() => setActiveTab("find-mentor")}
              className="px-6 py-2.5 rounded-full bg-primary/20 text-primary font-bold hover:bg-primary/30 transition-colors"
            >
              Browse Mentors
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {myRequests.map((req) => {
              const expired = isExpired(req);
              return (
                <div key={req.id} className="bg-surface-container-low border border-white/5 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-surface-container">
                      {req.mentors?.profile_photo_url ? (
                        <img src={req.mentors.profile_photo_url} alt="Mentor" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                          {req.mentors?.full_name?.charAt(0) || "M"}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-on-surface">{req.mentors?.full_name || "Unknown Mentor"}</h3>
                      <p className="text-sm text-on-surface-variant">Sent {new Date(req.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      {renderStatusBadge(req.status, expired)}
                      {(!expired && (req.status === "time_confirmed" || req.status === "completed") && req.confirmed_date && req.confirmed_time) && (
                        <span className="text-xs text-on-surface-variant font-medium flex items-center gap-1.5 whitespace-nowrap bg-surface-container-high px-2 py-1 rounded-md border border-white/5">
                          📅 Confirmed for {new Date(req.confirmed_date).toLocaleDateString()} at {req.confirmed_time}
                        </span>
                      )}
                    </div>
                    
                    {(!expired && (req.status === "accepted" || req.status === "time_confirmed" || req.status === "completed")) && (
                      <button
                        onClick={() => setActiveTab(`chat/${req.id}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary-fixed rounded-full font-bold text-sm hover:scale-105 transition-transform shadow-[0_0_15px_rgba(249,115,22,0.3)]"
                      >
                        <MessageSquare size={16} /> {req.status === "completed" ? "View / Rate" : "Chat"}
                      </button>
                    )}

                    {expired && (
                      <button
                        onClick={() => setActiveTab(`mentor-profile/${req.mentor_id}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-surface-container-high text-on-surface rounded-full font-semibold text-sm hover:bg-surface-container-highest transition-colors"
                      >
                        Try Again
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mentor: Incoming Requests */}
      {isMentor && (
        <div className="space-y-6 pt-8 border-t border-white/10">
          <h2 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            Incoming Mentorship Requests
          </h2>
          {incomingRequests.length === 0 ? (
            <div className="bg-surface-container-low p-10 rounded-3xl text-center border border-white/5">
              <p className="text-on-surface-variant">You have no incoming requests right now.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {incomingRequests.map((req) => {
                const expired = isExpired(req);
                return (
                  <div key={req.id} className="bg-surface-container border border-white/5 rounded-2xl p-5 sm:p-6 flex flex-col gap-4 transition-all hover:border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        {/* Cannot fetch user metadata directly on client, display Student UUID */}
                        <h3 className="font-bold text-lg text-on-surface">Student (ID: {req.student_id.substring(0,6)})</h3>
                        <p className="text-sm text-on-surface-variant">Requested {new Date(req.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap justify-end sm:justify-start">
                        {renderStatusBadge(req.status, expired)}
                        {(!expired && (req.status === "time_confirmed" || req.status === "completed") && req.confirmed_date && req.confirmed_time) && (
                          <span className="text-xs text-on-surface-variant font-medium flex items-center gap-1.5 whitespace-nowrap bg-surface-container-high px-2 py-1 rounded-md border border-white/5">
                            📅 Confirmed for {new Date(req.confirmed_date).toLocaleDateString()} at {req.confirmed_time}
                          </span>
                        )}
                      </div>
                    </div>

                    {req.initial_message && (
                      <div className="bg-surface-container-low p-4 rounded-xl text-sm text-on-surface-variant border border-white/5 italic">
                        "{req.initial_message}"
                      </div>
                    )}

                    {!expired && req.status === "pending" && (
                      <div className="flex gap-3 mt-2">
                        <button
                          onClick={() => handleUpdateStatus(req.id, "accepted")}
                          className="flex-1 py-2.5 bg-green-500/20 text-green-500 border border-green-500/30 rounded-xl font-bold text-sm hover:bg-green-500/30 transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(req.id, "declined")}
                          className="flex-1 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold text-sm hover:bg-red-500/20 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {(!expired && (req.status === "accepted" || req.status === "time_confirmed" || req.status === "completed")) && (
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => setActiveTab(`chat/${req.id}`)}
                          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary-fixed rounded-full font-bold text-sm hover:scale-105 transition-transform shadow-[0_0_15px_rgba(249,115,22,0.3)]"
                        >
                          <MessageSquare size={16} /> {req.status === "completed" ? "View Session" : "Open Chat"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
