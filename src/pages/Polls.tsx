import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import type { Poll, PollOption, PollVote, TopicSuggestion } from "../types/polls";
import { isNitEmail } from "../lib/nitEmail";
import { 
  BarChart3, 
  Vote, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Sparkles, 
  Lightbulb, 
  Send, 
  Loader2, 
  Lock, 
  Trophy, 
  ChevronRight, 
  HelpCircle,
  GraduationCap,
  Layers,
  ArrowRight,
  ShieldCheck,
  X
} from "lucide-react";

interface PollsProps {
  setActiveTab: (tab: string) => void;
}

interface PollWithOptions extends Poll {
  options: PollOption[];
}

export const Polls: React.FC<PollsProps> = ({ setActiveTab }) => {
  const [polls, setPolls] = useState<PollWithOptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User auth state
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isNitUser, setIsNitUser] = useState(false);

  // Votes state
  const [allVotes, setAllVotes] = useState<PollVote[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, string>>({}); // poll_id -> option_id
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({}); // poll_id -> selected option_id
  const [changingVotePollId, setChangingVotePollId] = useState<string | null>(null);
  const [voteSubmitting, setVoteSubmitting] = useState<Record<string, boolean>>({});

  // Suggestion form state
  const [suggestionTitle, setSuggestionTitle] = useState("");
  const [suggestionCategory, setSuggestionCategory] = useState("System Design");
  const [suggestionWhy, setSuggestionWhy] = useState("");
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionSuccess, setSuggestionSuccess] = useState<string | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [userPendingSuggestionsCount, setUserPendingSuggestionsCount] = useState(0);

  // Active view tab
  const [activeView, setActiveView] = useState<"active" | "past" | "suggest">("active");

  const categories = [
    "System Design",
    "DSA & Interview Prep",
    "AI & Machine Learning",
    "Full-Stack Web / Mobile",
    "Cloud & DevOps",
    "Career & Placements",
    "Open Source & Hackathons",
    "Other"
  ];

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Get current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user?.email) {
        setIsNitUser(isNitEmail(user.email));
      }

      // 2. Fetch active and closed polls
      const { data: pollsData, error: pollsErr } = await supabase
        .from("polls")
        .select("*")
        .in("status", ["active", "closed"])
        .order("created_at", { ascending: false });

      if (pollsErr) throw pollsErr;

      // 3. Fetch all options for these polls
      const pollIds = (pollsData || []).map((p) => p.id);
      let optionsData: PollOption[] = [];
      if (pollIds.length > 0) {
        const { data: opts, error: optsErr } = await supabase
          .from("poll_options")
          .select("*")
          .in("poll_id", pollIds)
          .order("sort_order", { ascending: true });

        if (optsErr) throw optsErr;
        optionsData = opts || [];
      }

      // 4. Fetch all votes to calculate totals
      const { data: votesData, error: votesErr } = await supabase
        .from("poll_votes")
        .select("id, poll_id, option_id, user_id, created_at");

      if (votesErr) throw votesErr;
      setAllVotes(votesData || []);

      // Build user votes map
      if (user && votesData) {
        const myVotes: Record<string, string> = {};
        votesData.forEach((v) => {
          if (v.user_id === user.id) {
            myVotes[v.poll_id] = v.option_id;
          }
        });
        setUserVotes(myVotes);
      }

      // 5. Fetch user pending suggestions count
      if (user) {
        const { count, error: countErr } = await supabase
          .from("topic_suggestions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "new");

        if (!countErr && count !== null) {
          setUserPendingSuggestionsCount(count);
        }
      }

      // Combine polls with options
      const combinedPolls: PollWithOptions[] = (pollsData || []).map((p) => ({
        ...p,
        options: optionsData.filter((opt) => opt.poll_id === p.id),
      }));

      setPolls(combinedPolls);
    } catch (err: any) {
      console.error("Error loading polls data:", err);
      setError(err.message || "Failed to load community polls.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ---------------------------------------------------------------------------
  // Voting Handlers
  // ---------------------------------------------------------------------------
  const handleVoteSubmit = async (poll: PollWithOptions) => {
    if (!currentUser) {
      setError("Please sign in to vote in polls.");
      return;
    }

    const selectedOptionId = selectedOptions[poll.id];
    if (!selectedOptionId) {
      setError("Please select an option before submitting.");
      return;
    }

    if (poll.nit_only && !isNitUser) {
      setError("This poll is restricted to NIT Raipur students.");
      return;
    }

    setVoteSubmitting((prev) => ({ ...prev, [poll.id]: true }));
    setError(null);

    try {
      const isUpdating = !!userVotes[poll.id];

      if (isUpdating) {
        // Update existing vote
        const { error: updateErr } = await supabase
          .from("poll_votes")
          .update({ option_id: selectedOptionId })
          .eq("poll_id", poll.id)
          .eq("user_id", currentUser.id);

        if (updateErr) throw updateErr;
      } else {
        // Cast new vote
        const { error: insertErr } = await supabase
          .from("poll_votes")
          .insert({
            poll_id: poll.id,
            option_id: selectedOptionId,
            user_id: currentUser.id,
          });

        if (insertErr) throw insertErr;
      }

      // Refresh votes locally without full reload
      const { data: updatedVotes, error: votesErr } = await supabase
        .from("poll_votes")
        .select("id, poll_id, option_id, user_id, created_at");

      if (!votesErr && updatedVotes) {
        setAllVotes(updatedVotes);
        const myVotes: Record<string, string> = {};
        updatedVotes.forEach((v) => {
          if (v.user_id === currentUser.id) {
            myVotes[v.poll_id] = v.option_id;
          }
        });
        setUserVotes(myVotes);
      }

      setChangingVotePollId(null);
    } catch (err: any) {
      console.error("Vote error:", err);
      setError(err.message || "Failed to cast vote. Please try again.");
    } finally {
      setVoteSubmitting((prev) => ({ ...prev, [poll.id]: false }));
    }
  };

  // ---------------------------------------------------------------------------
  // Topic Suggestion Handler
  // ---------------------------------------------------------------------------
  const handleSuggestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setSuggestionError("Please sign in to suggest workshop topics.");
      return;
    }

    if (!suggestionTitle.trim()) {
      setSuggestionError("Please enter a topic title.");
      return;
    }

    if (userPendingSuggestionsCount >= 3) {
      setSuggestionError("You already have 3 pending suggestions under review. Thank you for your contributions!");
      return;
    }

    setSuggestionLoading(true);
    setSuggestionError(null);
    setSuggestionSuccess(null);

    try {
      const { error: insertErr } = await supabase
        .from("topic_suggestions")
        .insert({
          user_id: currentUser.id,
          email: currentUser.email,
          title: suggestionTitle.trim(),
          category: suggestionCategory,
          why_helpful: suggestionWhy.trim() || null,
          status: "new",
        });

      if (insertErr) throw insertErr;

      setSuggestionSuccess("Topic suggestion submitted! Our team and mentors will review it.");
      setSuggestionTitle("");
      setSuggestionWhy("");
      setUserPendingSuggestionsCount((c) => c + 1);
    } catch (err: any) {
      console.error("Suggestion error:", err);
      setSuggestionError(err.message || "Failed to submit topic suggestion.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const getPollVoteCount = (pollId: string, optionId?: string) => {
    if (optionId) {
      return allVotes.filter((v) => v.poll_id === pollId && v.option_id === optionId).length;
    }
    return allVotes.filter((v) => v.poll_id === pollId).length;
  };

  const getOptionPercentage = (pollId: string, optionId: string) => {
    const total = getPollVoteCount(pollId);
    if (total === 0) return 0;
    const optionVotes = getPollVoteCount(pollId, optionId);
    return Math.round((optionVotes / total) * 100);
  };

  const isPollExpired = (closesAt?: string | null) => {
    if (!closesAt) return false;
    return new Date(closesAt).getTime() < Date.now();
  };

  const activePolls = polls.filter((p) => p.status === "active" && !isPollExpired(p.closes_at));
  const pastPolls = polls.filter((p) => p.status === "closed" || isPollExpired(p.closes_at));

  return (
    <div className="min-h-screen bg-[#09090B] text-white py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* ========================================================================= */}
        {/* HERO SECTION */}
        {/* ========================================================================= */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[rgba(168,85,247,0.12)] border border-[rgba(168,85,247,0.3)] text-xs font-bold text-[#A855F7] uppercase tracking-wider">
            <BarChart3 size={14} /> Community Voice
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            What Should We <span className="bg-gradient-to-r from-[#FF9D2E] via-[#FF2D8F] to-[#A855F7] bg-clip-text text-transparent">Talk About Next?</span>
          </h1>

          <p className="text-base sm:text-lg text-[#A1A1AA] leading-relaxed">
            Vote on upcoming masterclass topics, request technologies, and influence which industry leaders and alumni we invite.
          </p>

          {/* User NIT Status Pill */}
          {currentUser && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#141417] border border-[rgba(255,255,255,0.08)] text-xs text-[#A1A1AA]">
              {isNitUser ? (
                <>
                  <GraduationCap size={15} className="text-emerald-400" />
                  <span>
                    Verified NIT Raipur Student (<span className="text-white font-medium">{currentUser.email}</span>)
                  </span>
                </>
              ) : (
                <>
                  <ShieldCheck size={15} className="text-[#A855F7]" />
                  <span>
                    Signed in as <span className="text-white font-medium">{currentUser.email}</span>
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <X size={16} />
            </button>
          </div>
        )}

        {/* View Switcher Tabs */}
        <div className="flex justify-center">
          <div className="flex bg-[#141417] p-1.5 rounded-2xl border border-[rgba(255,255,255,0.08)]">
            <button
              onClick={() => setActiveView("active")}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeView === "active"
                  ? "bg-[#1C1C21] text-white border border-[rgba(255,255,255,0.12)] shadow-sm"
                  : "text-[#A1A1AA] hover:text-white"
              }`}
            >
              <Vote size={16} />
              Active Polls ({activePolls.length})
            </button>
            <button
              onClick={() => setActiveView("suggest")}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeView === "suggest"
                  ? "bg-[#1C1C21] text-white border border-[rgba(255,255,255,0.12)] shadow-sm"
                  : "text-[#A1A1AA] hover:text-white"
              }`}
            >
              <Lightbulb size={16} />
              Suggest a Topic
            </button>
            <button
              onClick={() => setActiveView("past")}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeView === "past"
                  ? "bg-[#1C1C21] text-white border border-[rgba(255,255,255,0.12)] shadow-sm"
                  : "text-[#A1A1AA] hover:text-white"
              }`}
            >
              <Trophy size={16} />
              Past Results ({pastPolls.length})
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ACTIVE POLLS SECTION */}
        {/* ========================================================================= */}
        {activeView === "active" && (
          <div className="space-y-6">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#A855F7]" />
                <p className="text-sm text-[#A1A1AA]">Loading active polls...</p>
              </div>
            ) : activePolls.length === 0 ? (
              <div className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#1C1C21] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#A855F7] mx-auto">
                  <Vote size={32} />
                </div>
                <h3 className="text-xl font-bold text-white">No Active Polls Right Now</h3>
                <p className="text-sm text-[#A1A1AA]">
                  All current workshop polls have concluded. Have a great idea you'd like us to cover next?
                </p>
                <button
                  onClick={() => setActiveView("suggest")}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-transform hover:scale-[1.02]"
                  style={{
                    background: "linear-gradient(135deg, #FF9D2E 0%, #FF2D8F 38%, #A855F7 70%, #4F46E5 100%)"
                  }}
                >
                  <Lightbulb size={16} />
                  Suggest a Topic
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {activePolls.map((poll) => {
                  const hasVoted = !!userVotes[poll.id];
                  const isChangingVote = changingVotePollId === poll.id;
                  const totalVotes = getPollVoteCount(poll.id);
                  const isRestrictedNonNit = poll.nit_only && !isNitUser;
                  const isSubmitting = voteSubmitting[poll.id];

                  return (
                    <div
                      key={poll.id}
                      className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xl hover:border-[rgba(255,255,255,0.15)] transition-all"
                    >
                      {/* Poll Header */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Active Poll
                            </span>
                            {poll.nit_only && (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[rgba(168,85,247,0.1)] text-[#A855F7] border border-[rgba(168,85,247,0.25)] flex items-center gap-1">
                                <GraduationCap size={12} /> NIT Raipur Only
                              </span>
                            )}
                          </div>

                          {poll.closes_at && (
                            <span className="text-xs text-[#71717A] flex items-center gap-1">
                              <Clock size={13} />
                              Closes {new Date(poll.closes_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>

                        <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                          {poll.question}
                        </h3>

                        {poll.subtitle && (
                          <p className="text-sm text-[#A1A1AA]">{poll.subtitle}</p>
                        )}
                      </div>

                      {/* Poll Body: Voting Mode vs Results Mode */}
                      {(!hasVoted || isChangingVote) && !isRestrictedNonNit ? (
                        /* ---- VOTING MODE ---- */
                        <div className="space-y-4">
                          <div className="space-y-2.5">
                            {poll.options.map((opt) => {
                              const isSelected = (selectedOptions[poll.id] || userVotes[poll.id]) === opt.id;
                              return (
                                <label
                                  key={opt.id}
                                  onClick={() => setSelectedOptions((prev) => ({ ...prev, [poll.id]: opt.id }))}
                                  className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                                    isSelected
                                      ? "bg-[rgba(168,85,247,0.12)] border-[#A855F7] text-white shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                                      : "bg-[#1C1C21] border-[rgba(255,255,255,0.08)] text-[#A1A1AA] hover:text-white hover:border-[rgba(255,255,255,0.2)]"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                      isSelected ? "border-[#A855F7] bg-[#A855F7]" : "border-[rgba(255,255,255,0.3)]"
                                    }`}>
                                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                    </div>
                                    <span className="text-sm font-semibold text-white">{opt.label}</span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>

                          <div className="flex items-center gap-3 pt-2">
                            <button
                              onClick={() => handleVoteSubmit(poll)}
                              disabled={isSubmitting || !(selectedOptions[poll.id] || userVotes[poll.id])}
                              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm text-white shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{
                                background: "linear-gradient(135deg, #FF9D2E 0%, #FF2D8F 38%, #A855F7 70%, #4F46E5 100%)"
                              }}
                            >
                              {isSubmitting ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Vote size={16} />
                              )}
                              {hasVoted ? "Update My Vote" : "Submit My Vote"}
                            </button>

                            {isChangingVote && (
                              <button
                                onClick={() => setChangingVotePollId(null)}
                                className="py-3 px-4 rounded-xl text-sm font-semibold bg-[#1C1C21] border border-[rgba(255,255,255,0.1)] text-[#A1A1AA] hover:text-white transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      ) : isRestrictedNonNit ? (
                        /* ---- NON-NIT RESTRICTION BANNER ---- */
                        <div className="p-6 rounded-2xl bg-[#1C1C21] border border-amber-500/20 text-center space-y-3">
                          <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                            <Lock size={18} />
                          </div>
                          <h4 className="text-sm font-bold text-white">Exclusive to NIT Raipur Students</h4>
                          <p className="text-xs text-[#A1A1AA] max-w-sm mx-auto">
                            This poll is restricted to students with an official <code className="text-[#A855F7]">@nitrr.ac.in</code> email account. You can view the final poll results once voting concludes!
                          </p>
                        </div>
                      ) : (
                        /* ---- RESULTS VIEW (USER HAS VOTED) ---- */
                        <div className="space-y-4">
                          <div className="space-y-3">
                            {poll.options.map((opt) => {
                              const pct = getOptionPercentage(poll.id, opt.id);
                              const count = getPollVoteCount(poll.id, opt.id);
                              const isMyVote = userVotes[poll.id] === opt.id;

                              return (
                                <div key={opt.id} className="space-y-1.5">
                                  <div className="flex items-center justify-between text-xs font-semibold">
                                    <span className="flex items-center gap-2 text-white">
                                      {opt.label}
                                      {isMyVote && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                          Your Choice
                                        </span>
                                      )}
                                    </span>
                                    <span className="text-[#A1A1AA]">
                                      {pct}% ({count})
                                    </span>
                                  </div>

                                  {/* Progress bar */}
                                  <div className="h-3 w-full bg-[#1C1C21] rounded-full overflow-hidden border border-[rgba(255,255,255,0.06)] relative">
                                    <div
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{
                                        width: `${pct}%`,
                                        background: isMyVote
                                          ? "linear-gradient(135deg, #FF9D2E 0%, #FF2D8F 38%, #A855F7 70%, #4F46E5 100%)"
                                          : "linear-gradient(90deg, #A855F7 0%, #6366F1 100%)"
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Footer / Change Vote */}
                          <div className="pt-3 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between">
                            <span className="text-xs text-[#71717A]">
                              Total {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
                            </span>

                            <button
                              onClick={() => {
                                setSelectedOptions((prev) => ({ ...prev, [poll.id]: userVotes[poll.id] }));
                                setChangingVotePollId(poll.id);
                              }}
                              className="text-xs font-semibold text-[#A855F7] hover:text-[#c084fc] transition-colors"
                            >
                              Change My Vote
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TOPIC SUGGESTION FORM SECTION */}
        {/* ========================================================================= */}
        {activeView === "suggest" && (
          <div className="max-w-2xl mx-auto bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-3xl p-6 sm:p-10 space-y-6 shadow-2xl">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(255,157,46,0.12)] border border-[rgba(255,157,46,0.3)] text-xs font-bold text-[#FF9D2E] uppercase tracking-wider">
                <Lightbulb size={13} /> Community Suggestions
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Suggest a Workshop Topic
              </h2>
              <p className="text-sm text-[#A1A1AA]">
                Tell us what you want to learn. We source mentors, alumni, and industry engineers to run hands-on sessions based directly on student demand.
              </p>
            </div>

            {suggestionSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-3">
                <CheckCircle2 size={18} className="shrink-0" />
                <span>{suggestionSuccess}</span>
              </div>
            )}

            {suggestionError && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
                <AlertCircle size={18} className="shrink-0" />
                <span>{suggestionError}</span>
              </div>
            )}

            {userPendingSuggestionsCount >= 3 ? (
              <div className="p-5 rounded-2xl bg-[#1C1C21] border border-[rgba(255,255,255,0.1)] text-center space-y-2">
                <p className="text-sm font-bold text-white">Rate Limit Reached</p>
                <p className="text-xs text-[#A1A1AA]">
                  You currently have 3 suggestions pending review. Once our team evaluates them, you can submit more!
                </p>
              </div>
            ) : (
              <form onSubmit={handleSuggestionSubmit} className="space-y-5">
                {/* User Email (Read-Only) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#A1A1AA] flex items-center justify-between">
                    <span>Your Account Email</span>
                    <span className="text-[10px] text-[#71717A] flex items-center gap-1">
                      <Lock size={10} /> Read-only
                    </span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={currentUser?.email || "Not signed in"}
                    className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-2.5 text-xs text-[#A1A1AA] cursor-not-allowed outline-none"
                  />
                </div>

                {/* Topic Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#A1A1AA]">
                    Topic Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={suggestionTitle}
                    onChange={(e) => setSuggestionTitle(e.target.value)}
                    placeholder="e.g. Distributed Caching & Redis Under the Hood"
                    className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#71717A] outline-none transition-colors"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#A1A1AA]">
                    Domain / Category
                  </label>
                  <select
                    value={suggestionCategory}
                    onChange={(e) => setSuggestionCategory(e.target.value)}
                    className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-3.5 py-3 text-sm text-white outline-none transition-colors"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Why it would be helpful */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#A1A1AA]">
                    Why would this workshop be helpful? (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={suggestionWhy}
                    onChange={(e) => setSuggestionWhy(e.target.value)}
                    placeholder="e.g. Many students are preparing for backend interviews where high-scale caching questions are asked frequently..."
                    className="w-full bg-[#1C1C21] border border-[rgba(255,255,255,0.12)] focus:border-[#A855F7] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#71717A] outline-none resize-none transition-colors"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={suggestionLoading || !currentUser}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg, #FF9D2E 0%, #FF2D8F 38%, #A855F7 70%, #4F46E5 100%)"
                  }}
                >
                  {suggestionLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  Submit Suggestion
                </button>
              </form>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAST POLLS & RESULTS SECTION */}
        {/* ========================================================================= */}
        {activeView === "past" && (
          <div className="space-y-6">
            {pastPolls.length === 0 ? (
              <div className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-3xl p-12 text-center max-w-xl mx-auto">
                <Trophy size={32} className="text-[#A1A1AA] mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white">No Concluded Polls Yet</h3>
                <p className="text-sm text-[#A1A1AA] mt-1">
                  Once active polls close, their finalized community vote rankings will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {pastPolls.map((poll) => {
                  const totalVotes = getPollVoteCount(poll.id);
                  
                  // Find winner option
                  let maxVotes = -1;
                  let winnerOptionId = "";
                  poll.options.forEach((opt) => {
                    const c = getPollVoteCount(poll.id, opt.id);
                    if (c > maxVotes) {
                      maxVotes = c;
                      winnerOptionId = opt.id;
                    }
                  });

                  return (
                    <div
                      key={poll.id}
                      className="bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-3xl p-6 sm:p-8 space-y-6"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                            Concluded Poll
                          </span>
                          <span className="text-xs text-[#71717A]">
                            Total {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
                          </span>
                        </div>

                        <h3 className="text-xl font-bold text-white">{poll.question}</h3>
                        {poll.subtitle && (
                          <p className="text-xs text-[#A1A1AA]">{poll.subtitle}</p>
                        )}
                      </div>

                      <div className="space-y-3">
                        {poll.options.map((opt) => {
                          const pct = getOptionPercentage(poll.id, opt.id);
                          const count = getPollVoteCount(poll.id, opt.id);
                          const isWinner = opt.id === winnerOptionId && maxVotes > 0;

                          return (
                            <div key={opt.id} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-semibold">
                                <span className="flex items-center gap-1.5 text-white">
                                  {isWinner && <Trophy size={13} className="text-[#FF9D2E]" />}
                                  {opt.label}
                                  {isWinner && (
                                    <span className="text-[10px] font-bold text-[#FF9D2E] uppercase">
                                      (Winner)
                                    </span>
                                  )}
                                </span>
                                <span className="text-[#A1A1AA]">
                                  {pct}% ({count})
                                </span>
                              </div>

                              <div className="h-2.5 w-full bg-[#1C1C21] rounded-full overflow-hidden border border-[rgba(255,255,255,0.06)]">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${pct}%`,
                                    background: isWinner
                                      ? "linear-gradient(135deg, #FF9D2E 0%, #FF2D8F 38%, #A855F7 70%, #4F46E5 100%)"
                                      : "rgba(255,255,255,0.15)"
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
