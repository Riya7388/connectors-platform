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
import { Terms } from "./pages/Terms";
import { FAQ } from "./pages/FAQ";
import { Admin } from "./pages/Admin";
import { SpeakerProfile } from "./pages/SpeakerProfile";
import { supabase } from "./supabase";
import "./App.css";

type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"];

function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace(/^#\/?/, "");
    if (hash) return hash;
    return localStorage.getItem("active_tab") || "home";
  });
  const [darkMode, setDarkMode] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Sync activeTab changes to localStorage and hash
  const handleSetActiveTab = (tab: string) => {
    setActiveTab(tab);
    localStorage.setItem("active_tab", tab);
    if (window.location.hash !== `#${tab}`) {
      window.location.hash = tab;
    }
  };

  // Synchronize hash changes with activeTab state
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, "");
      if (hash && hash !== activeTab) {
        setActiveTab(hash);
        localStorage.setItem("active_tab", hash);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [activeTab]);

  // Synchronize dark mode class with HTML tag
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  const checkAdminStatus = async (userId?: string) => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

      setIsAdmin(!!data && !error);
    } catch {
      setIsAdmin(false);
    }
  };

  // Auth guard — session state drives everything
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionLoading(false);
      checkAdminStatus(session?.user?.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setSessionLoading(false);
      checkAdminStatus(session?.user?.id);

      // Post-login redirect on explicit sign-in event only (do not disrupt reloaded/resumed tabs on INITIAL_SESSION)
      if (event === "SIGNED_IN" && session?.user) {
        const { data: mentors } = await supabase
          .from("mentors")
          .select("application_status")
          .eq("user_id", session.user.id);

        const mentor = mentors?.find(m => m.application_status === "approved") || mentors?.[0] || null;

        if (mentor && mentor.application_status !== "approved") {
          // In-progress mentor application → resume
          handleSetActiveTab("become-mentor");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const renderActivePage = () => {
    switch (activeTab) {
      case "home":
        return <Home setActiveTab={handleSetActiveTab} />;
      case "compare":
        return <Compare />;
      case "find-mentor":
        return <FindMentor setActiveTab={handleSetActiveTab} />;
      case "become-mentor":
        return <BecomeMentor />;
      case "terms":
        return <Terms setActiveTab={handleSetActiveTab} />;
      case "faq":
        return <FAQ setActiveTab={handleSetActiveTab} />;
      case "dashboard":
        return <Dashboard setActiveTab={handleSetActiveTab} />;
      case "admin":
        return <Admin setActiveTab={handleSetActiveTab} isAdmin={isAdmin} />;
      default:
        if (activeTab.startsWith("mentor-profile/")) {
          const id = activeTab.split("mentor-profile/")[1];
          return <MentorProfile id={id} setActiveTab={handleSetActiveTab} />;
        }
        if (activeTab.startsWith("speaker-profile/")) {
          const id = activeTab.split("speaker-profile/")[1];
          return <SpeakerProfile id={id} setActiveTab={handleSetActiveTab} />;
        }
        if (activeTab.startsWith("chat/")) {
          const id = activeTab.split("chat/")[1];
          return <Chat id={id} setActiveTab={handleSetActiveTab} />;
        }
        return <Home setActiveTab={handleSetActiveTab} />;
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

  // Public routes accessible without session
  const isPublicRoute = activeTab === "terms" || activeTab === "faq";

  // No session → if viewing a public route, render public shell; otherwise full-screen auth
  if (!session) {
    if (isPublicRoute) {
      return (
        <div className="min-h-screen bg-background text-on-surface flex flex-col font-sans transition-colors duration-300">
          <Navbar
            activeTab={activeTab}
            setActiveTab={handleSetActiveTab}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            isAdmin={isAdmin}
          />
          <div className="flex-1 w-full max-w-7xl mx-auto px-0">
            {renderActivePage()}
          </div>
          <Footer setActiveTab={handleSetActiveTab} />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background text-on-surface font-sans transition-colors duration-300">
        <Auth setActiveTab={handleSetActiveTab} />
      </div>
    );
  }

  // Authenticated → normal app shell
  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-sans transition-colors duration-300">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        isAdmin={isAdmin}
      />

      {/* Main Page Layout Wrapper */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-0">
        {renderActivePage()}
      </div>

      {/* Footer layout */}
      <Footer setActiveTab={handleSetActiveTab} />

      {/* AI Assistant Chatbot */}
      <MentorGenieChat />
    </div>
  );
}

export default App;
