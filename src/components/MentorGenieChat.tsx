import React, { useState, useEffect, useRef } from "react";
import { Sparkles, X, Send, Bot, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabase";

interface Message {
  role: "user" | "model";
  content: string;
  timestamp: string;
}

export const MentorGenieChat: React.FC = () => {
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

    // 3. Track Auth state to send JWT with requests
    supabase.auth.getSession().then(() => {

    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {

    });

    return () => subscription.unsubscribe();
  }, []);

  // Save history to session storage whenever it changes
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem("mentor_genie_history", JSON.stringify(messages));
    }
    // Scroll to bottom
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

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
          sessionId: sessionId
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

      if (!data || !data.text) {
        throw new Error("No response text received from Mentor Genie.");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
            className="glass-card w-[380px] max-w-[calc(100vw-32px)] h-[500px] max-h-[calc(100vh-120px)] rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-4 border border-outline-variant/30"
          >
            {/* Header */}
            <div className="kinetic-gradient p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 p-1.5 rounded-lg">
                  <Bot size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">Mentor Genie</h3>
                  <span className="text-[10px] text-white/80 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-ping"></span>
                    <span>AI Assistant</span>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-surface/90 dark:bg-surface-dim/95">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                      msg.role === "user"
                        ? "bg-primary-container text-on-primary-container rounded-tr-none font-medium"
                        : "bg-surface-container-highest text-on-surface rounded-tl-none"
                    }`}
                  >
                    <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
                    <span className="text-[9px] opacity-60 mt-1 block text-right">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}

              {/* Loading Typing Indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-surface-container-highest text-on-surface rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1">
                    <div className="w-2 h-2 bg-on-surface-variant/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-2 h-2 bg-on-surface-variant/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-2 h-2 bg-on-surface-variant/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
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
              className="p-3 border-t border-outline-variant/20 dark:border-outline/10 bg-surface-container-low/80 dark:bg-surface-container-lowest/80 flex gap-2 items-center"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about exams, colleges, career prep..."
                className="flex-1 bg-surface-container dark:bg-surface-container-high border border-outline-variant/20 dark:border-outline/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-on-surface"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="kinetic-gradient p-2.5 rounded-xl text-white hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-50 transition-all shadow-md shrink-0 flex items-center justify-center"
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
