import { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { MentorGenieChat } from "./components/MentorGenieChat";
import { Home } from "./pages/Home";
import { Compare } from "./pages/Compare";
import { FindMentor } from "./pages/FindMentor";
import { BecomeMentor } from "./pages/BecomeMentor";
import { MentorProfile } from "./pages/MentorProfile";
import { Auth } from "./pages/Auth";
import { Dashboard } from "./pages/Dashboard";
import { Chat } from "./pages/Chat";
import { supabase } from "./supabase";
import "./App.css";

type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"];

function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [darkMode, setDarkMode] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Synchronize dark mode class with HTML tag
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  // Auth guard — session state drives everything
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setSessionLoading(false);

      // Post-login redirect: check mentor table (robust against multiple mentor profiles)
      if (session?.user) {
        const { data: mentors } = await supabase
          .from("mentors")
          .select("application_status")
          .eq("user_id", session.user.id);

        const mentor = mentors?.find(m => m.application_status === "approved") || mentors?.[0] || null;

        if (mentor && mentor.application_status !== "approved") {
          // In-progress mentor application → resume
          setActiveTab("become-mentor");
        } else {
          // Student, approved mentor, or no row → home
          setActiveTab("home");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const renderActivePage = () => {
    switch (activeTab) {
      case "home":
        return <Home setActiveTab={setActiveTab} />;
      case "compare":
        return <Compare />;
      case "find-mentor":
        return <FindMentor setActiveTab={setActiveTab} />;
      case "become-mentor":
        return <BecomeMentor />;
      case "dashboard":
        return <Dashboard setActiveTab={setActiveTab} />;
      default:
        if (activeTab.startsWith("mentor-profile/")) {
          const id = activeTab.split("mentor-profile/")[1];
          return <MentorProfile id={id} setActiveTab={setActiveTab} />;
        }
        if (activeTab.startsWith("chat/")) {
          const id = activeTab.split("chat/")[1];
          return <Chat id={id} setActiveTab={setActiveTab} />;
        }
        return <Home setActiveTab={setActiveTab} />;
    }
  };

  // While checking session — blank screen to avoid flash
  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // No session → full-screen auth (no navbar / footer / chatbot)
  if (!session) {
    return (
      <div className="min-h-screen bg-background text-on-surface font-sans transition-colors duration-300">
        <Auth setActiveTab={setActiveTab} />
      </div>
    );
  }

  // Authenticated → normal app shell
  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-sans transition-colors duration-300">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {/* Main Page Layout Wrapper */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-0">
        {renderActivePage()}
      </div>

      {/* Footer layout */}
      <Footer setActiveTab={setActiveTab} />

      {/* AI Assistant Chatbot */}
      <MentorGenieChat />
    </div>
  );
}

export default App;
