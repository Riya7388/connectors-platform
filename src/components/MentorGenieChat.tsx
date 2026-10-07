import React, { useState, useEffect, useRef } from "react";
import { Sparkles, X, Send, Bot, AlertCircle, ShieldCheck, Star, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabase";
import { FREE_MODE } from "../lib/config";

interface RecommendedMentor {
  id: string;
  full_name: string;
  college_name: string;
  branch: string;
  exam_category: string | null;
  exam_match?: boolean;
  areas_of_expertise: string[];
  rating: number | null;
  is_online: boolean;
  profile_photo_url: string | null;
  bio: string;
  availability_time: string | null;
  starting_price_inr?: number | null;
}

interface Message {
  role: "user" | "model";
  content: string;
  timestamp: string;
  mentors?: RecommendedMentor[];
}

interface MentorGenieChatProps {
  setActiveTab?: (tab: string) => void;
}

export const MentorGenieChat: React.FC<MentorGenieChatProps> = ({ setActiveTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Generate/Retrieve session ID for anonymous rate limiting
  useEffect(() => {
    let sId = sessionStorage.getItem("mentor_genie_session_id");
    if (!sId) {
      sId = crypto.randomUUID();
      sessionStorage.setItem("mentor_genie_session_id", sId);
    }
    setSessionId(sId);

    // 2. Load message history from sessionStorage if available
    const savedHistory = sessionStorage.getItem("mentor_genie_history");
    if (savedHistory) {
      try {
        setMessages(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse chat history:", e);
      }
    } else {
      // Default initial state
      setMessages([
        {
          role: "model",
          content: "Hi! I'm your Mentor Genie 👋 How can I help you today?",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, []);

  // Save history to session storage whenever it changes
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem("mentor_genie_history", JSON.stringify(messages));
    }
    // Scroll to bottom
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleNavigateToProfile = (mentorId: string) => {
    const tabName = `mentor-profile/${mentorId}`;
    if (setActiveTab) {
      setActiveTab(tabName);
    } else {
      window.location.hash = `#${tabName}`;
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setError(null);

    const newMessages: Message[] = [
      ...messages,
      {
        role: "user",
        content: userMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];

    setMessages(newMessages);
    setIsLoading(true);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("mentor-genie-chat", {
        body: {
          message: userMessage,
          history: messages, // Send history for context
          sessionId: sessionId,
          free_mode: FREE_MODE,
        }
      });

      if (invokeError) {
        console.error("Invoke error:", invokeError);
        const errMsg = invokeError.message || "";
        if (errMsg.includes("rate_limited") || (invokeError as any).status === 429) {
          setError("You've reached today's chat limit. Please try again tomorrow, or book a session with a mentor for detailed help!");
        } else {
          setError("Something went wrong. Please try again.");
        }
        setIsLoading(false);
        return;
      }

      const replyText = data?.reply || data?.text || "";
      if (!replyText) {
        throw new Error("No response text received from Mentor Genie.");
      }

      const returnedMentors: RecommendedMentor[] = Array.isArray(data?.mentors)
        ? data.mentors
        : [];

      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          mentors: returnedMentors.length > 0 ? returnedMentors : undefined,
        }
      ]);
    } catch (err: any) {
      console.error(err);
      setError("Failed to connect to Mentor Genie. Please check your internet connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Need Help Pill Notification */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="mb-3 mr-2 bg-surface-container-high dark:bg-surface-container border border-outline-variant/30 text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg text-primary dark:text-primary-fixed-dim pointer-events-none select-none flex items-center gap-1.5"
          >
            <Sparkles size={12} className="text-secondary-fixed-dim animate-pulse" />
            <span>Need help? Ask Mentor Genie!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="glass-card w-[400px] max-w-[calc(100vw-32px)] h-[560px] max-h-[calc(100vh-100px)] rounded-3xl shadow-2xl flex flex-col overflow-hidden mb-4 border border-outline-variant/30 bg-surface/95 dark:bg-surface-dim/95 backdrop-blur-xl"
          >
            {/* Header */}
            <div className="kinetic-gradient p-4 flex justify-between items-center text-white shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="bg-white/20 p-1.5 rounded-xl backdrop-blur-sm">
                  <Bot size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide flex items-center gap-1.5">
                    Mentor Genie
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-medium">AI</span>
                  </h3>
                  <span className="text-[10px] text-white/80 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse"></span>
                    <span>Online • Smart Mentorship</span>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-surface/80 dark:bg-surface-dim/90">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} space-y-2`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                      msg.role === "user"
                        ? "bg-primary-container text-on-primary-container rounded-tr-none font-medium"
                        : "bg-surface-container-highest/90 text-on-surface rounded-tl-none border border-white/5"
                    }`}
                  >
                    <p className="whitespace-pre-line leading-relaxed text-xs sm:text-sm">{msg.content}</p>
                    <span className="text-[9px] opacity-60 mt-1 block text-right">
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Recommended Mentor Cards */}
                  {msg.mentors && msg.mentors.length > 0 && (
                    <div className="w-full max-w-[92%] space-y-2.5 pt-1">
                      {msg.mentors.slice(0, 3).map((mentor) => {
                        const subtitle = [mentor.college_name, mentor.branch || mentor.exam_category]
                          .filter(Boolean)
                          .join(" • ");

                        return (
                          <div
                            key={mentor.id}
                            className="glass-card p-3 rounded-2xl border border-white/10 bg-surface-container-low/90 shadow-md hover:border-primary/40 transition-all duration-200"
                          >
                            <div className="flex items-start gap-3">
                              {/* Avatar */}
                              <div className="relative flex-shrink-0">
                                {mentor.profile_photo_url ? (
                                  <img
                                    src={mentor.profile_photo_url}
                                    alt={mentor.full_name}
                                    className="w-10 h-10 rounded-full object-cover border border-white/10"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full kinetic-gradient flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                    {mentor.full_name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                {mentor.is_online && (
                                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-surface animate-pulse" />
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1 min-w-0">
                                    <h4 className="font-bold text-xs sm:text-sm text-on-surface truncate">
                                      {mentor.full_name}
                                    </h4>
                                    <ShieldCheck size={13} className="text-primary flex-shrink-0" />
                                  </div>

                                  {/* Badges: Free pill / Price */}
                                  {FREE_MODE ? (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-500/15 text-green-400 border border-green-500/20 flex-shrink-0">
                                      Free
                                    </span>
                                  ) : mentor.starting_price_inr ? (
                                    <span className="text-[10px] font-semibold text-primary flex-shrink-0">
                                      ₹{mentor.starting_price_inr}
                                    </span>
                                  ) : null}
                                </div>

                                {/* College + Branch */}
                                {subtitle && (
                                  <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                                    {subtitle}
                                  </p>
                                )}

                                {/* Status / Tags */}
                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                  {/* Rating */}
                                  <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                                    <Star size={10} className="fill-amber-400" />
                                    <span>
                                      {mentor.rating ? mentor.rating.toFixed(1) : "New mentor"}
                                    </span>
                                  </div>

                                  {/* Online status tag */}
                                  {mentor.is_online && (
                                    <span className="text-[10px] text-green-400 font-medium flex items-center gap-1 bg-green-500/10 px-1.5 py-0.5 rounded">
                                      <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                                      Online
                                    </span>
                                  )}

                                  {/* Exam match indicator if false */}
                                  {mentor.exam_match === false && (
                                    <span className="text-[10px] text-on-surface-variant/70 italic bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                      Different exam focus
                                    </span>
                                  )}
                                </div>

                                {/* Expertise Chips */}
                                {mentor.areas_of_expertise && mentor.areas_of_expertise.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {mentor.areas_of_expertise.slice(0, 3).map((exp, i) => (
                                      <span
                                        key={i}
                                        className="text-[9px] px-1.5 py-0.5 rounded-md bg-surface-container-high/60 text-on-surface-variant border border-white/5 truncate max-w-[120px]"
                                      >
                                        {exp}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Action Button */}
                                <div className="mt-2.5 pt-2 border-t border-white/5 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleNavigateToProfile(mentor.id)}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg kinetic-gradient text-white text-xs font-semibold hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer"
                                  >
                                    <span>View Profile</span>
                                    <ArrowUpRight size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {/* Loading Typing Indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-surface-container-highest text-on-surface rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex justify-center">
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-3 py-2 flex items-start gap-2 max-w-[90%]">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleSend}
              className="p-3 border-t border-outline-variant/20 dark:border-outline/10 bg-surface-container-low/90 dark:bg-surface-container-lowest/90 flex gap-2 items-center"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about exams, mentors, career prep..."
                className="flex-1 bg-surface-container dark:bg-surface-container-high border border-outline-variant/20 dark:border-outline/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-primary transition-colors text-on-surface"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="kinetic-gradient p-2.5 rounded-xl text-white hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-50 transition-all shadow-md shrink-0 flex items-center justify-center cursor-pointer"
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Circular Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="kinetic-gradient w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl hover:shadow-primary-container/20 transition-all cursor-pointer relative"
        aria-label="Toggle chat widget"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X size={24} />
            </motion.div>
          ) : (
            <motion.div
              key="bot"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-center"
            >
              <Bot size={24} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
};
