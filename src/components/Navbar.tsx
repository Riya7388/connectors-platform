import React, { useState, useEffect, useRef } from "react";
import { Sun, Moon, Menu, X, LogOut, User, ChevronDown, LayoutDashboard } from "lucide-react";
import { supabase } from "../supabase";
import logoImg from "../assets/logo.png";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMentor, setIsMentor] = useState(false);
  const [mentorProfile, setMentorProfile] = useState<any>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setIsMentor(false);
      setMentorProfile(null);
      return;
    }

    const checkMentorStatus = async () => {
      const { data: mentorProfiles } = await supabase
        .from("mentors")
        .select("*")
        .eq("user_id", user.id);

      const approvedMentor = mentorProfiles?.find(m => m.application_status === "approved");

      if (approvedMentor) {
        setIsMentor(true);
        setMentorProfile(approvedMentor);
      } else {
        setIsMentor(false);
        setMentorProfile(null);
      }
    };

    checkMentorStatus();
  }, [user]);

  const handleToggleOnline = async (checked: boolean) => {
    if (!mentorProfile) return;
    const nowStr = new Date().toISOString();
    
    // Optimistic UI update
    setMentorProfile((prev: any) => prev ? { ...prev, is_online: checked, last_online_at: nowStr } : null);

    const { data, error } = await supabase
      .from("mentors")
      .update({
        is_online: checked,
        last_online_at: nowStr
      })
      .eq("id", mentorProfile.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating online status:", error);
      alert("Failed to update status.");
      // Rollback
      setMentorProfile((prev: any) => prev ? { ...prev, is_online: !checked } : null);
    } else if (data) {
      setMentorProfile(data);
    }
  };

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact", head: true })
        .is("read_at", null)
        .neq("sender_id", user.id);
      
      setUnreadCount(count || 0);
    };

    fetchUnreadCount();

    const channel = supabase
      .channel('unread_messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    setProfileOpen(false);
    setMobileMenuOpen(false);
    await supabase.auth.signOut();
    // App.tsx session guard handles redirect automatically
  };

  const navLinks = [
    { id: "home", label: "Home" },
    { id: "compare", label: "AI Engine" },
    { id: "find-mentor", label: "Mentors" },
    { id: "become-mentor", label: "Become Mentor" },
  ];

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Account";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <nav className="bg-surface/70 backdrop-blur-md dark:bg-surface-dim/70 w-full sticky top-0 z-50 border-b border-outline-variant/20 dark:border-outline/10 transition-all duration-300">
      <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto h-20">
        {/* Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => setActiveTab("home")}
        >
          <img
            alt="Connectors Logo"
            className="h-10 w-10 object-contain group-hover:scale-105 transition-transform duration-300"
            src={logoImg}
          />
          <span className="font-extrabold text-2xl text-primary dark:text-primary-fixed-dim tracking-tight">
            Connectors
          </span>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex gap-8 items-center">
          {navLinks.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id)}
                className={`font-semibold text-sm transition-all duration-200 pb-1 border-b-2 relative group ${
                  isActive
                    ? "text-primary border-primary"
                    : "text-on-surface-variant dark:text-on-surface-variant/80 border-transparent hover:text-primary hover:border-primary/40"
                }`}
              >
                {link.label}
                {/* Subtle glow underline on hover */}
                {!isActive && (
                  <span className="absolute inset-x-0 -bottom-px h-px bg-primary/0 group-hover:bg-primary/40 transition-all duration-200" />
                )}
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Dark mode toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full hover:bg-surface-container-high dark:hover:bg-surface-container text-on-surface-variant hover:text-primary transition-all duration-200 hover:shadow-[0_0_10px_rgba(249,115,22,0.2)]"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Mentor Availability Toggle (Desktop/Tablet) */}
          {user && isMentor && mentorProfile && (
            <div className="hidden md:flex items-center gap-2 bg-surface-container-low dark:bg-surface-container/50 px-3 py-1.5 rounded-full border border-outline-variant/20 dark:border-outline/10 text-xs font-semibold shadow-sm transition-all duration-200">
              <span className={`w-2 h-2 rounded-full ${mentorProfile.is_online ? 'bg-green-500 animate-pulse' : 'bg-on-surface-variant/40'}`}></span>
              <span className="text-on-surface select-none hidden lg:inline-block">
                {mentorProfile.is_online ? "Available" : "Offline"}
              </span>
              <label className="relative inline-flex items-center cursor-pointer ml-1">
                <input 
                  type="checkbox" 
                  checked={!!mentorProfile.is_online}
                  onChange={(e) => handleToggleOnline(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-9 h-5 bg-surface-container-high rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>
          )}

          {user ? (
            /* ---- Authenticated: Profile Dropdown ---- */
            <div ref={profileRef} className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-outline-variant/30 bg-surface-container-low hover:border-primary/40 hover:shadow-[0_0_14px_rgba(249,115,22,0.15)] transition-all duration-200 group"
              >
                {/* Avatar circle */}
                <div className="w-8 h-8 rounded-full kinetic-gradient flex items-center justify-center text-white font-bold text-sm shadow-sm relative">
                  {avatarLetter}
                  {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-surface flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                  )}
                </div>
                <span className="text-sm font-semibold text-on-surface truncate max-w-[100px]">
                  {displayName}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-on-surface-variant transition-transform duration-200 ${
                    profileOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown */}
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-surface-container-low border border-outline-variant/20 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-outline-variant/15">
                    <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">
                      Signed in as
                    </p>
                    <p className="text-sm font-semibold text-on-surface truncate mt-0.5">
                      {user.email}
                    </p>
                  </div>

                  {/* Menu items */}
                  <div className="py-1.5">
                    <button
                      onClick={() => {
                        setActiveTab("home");
                        setProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface hover:bg-primary/10 hover:text-primary transition-colors duration-150 text-left group"
                    >
                      <User size={15} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                      My Profile
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab("dashboard");
                        setProfileOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-on-surface hover:bg-primary/10 hover:text-primary transition-colors duration-150 text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <LayoutDashboard size={15} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                        Dashboard
                      </div>
                      {unreadCount > 0 && (
                        <div className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {unreadCount}
                        </div>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab("become-mentor");
                        setProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface hover:bg-primary/10 hover:text-primary transition-colors duration-150 text-left group"
                    >
                      <LayoutDashboard size={15} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                      My Application
                    </button>
                  </div>

                  <div className="border-t border-outline-variant/15 py-1.5">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors duration-150 text-left"
                    >
                      <LogOut size={15} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ---- Unauthenticated: Login / Sign-up ---- */
            <>
              <button
                onClick={() => setActiveTab("auth")}
                className="hidden md:block text-sm font-semibold text-on-surface hover:text-primary transition-colors duration-200"
              >
                Login
              </button>

              <button
                onClick={() => setActiveTab("auth")}
                className="bg-primary text-on-primary-fixed hover:scale-105 active:scale-95 px-5 py-2 rounded-full font-semibold text-sm transition-all duration-200 hidden md:block hover:shadow-[0_0_18px_rgba(249,115,22,0.45)] shadow-md shadow-primary/20"
              >
                Sign up
              </button>
            </>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-full text-on-surface hover:text-primary transition-colors duration-200"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-surface dark:bg-surface-dim border-b border-outline-variant/20 dark:border-outline/10 flex flex-col p-6 space-y-4 animate-fade-in-down z-40">
          {navLinks.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => {
                  setActiveTab(link.id);
                  setMobileMenuOpen(false);
                }}
                className={`text-left font-semibold text-base py-2 transition-all duration-200 ${
                  isActive
                    ? "text-primary pl-2 border-l-4 border-primary"
                    : "text-on-surface-variant dark:text-on-surface-variant/80 pl-0 hover:text-primary hover:pl-1"
                }`}
              >
                {link.label}
              </button>
            );
          })}

          <hr className="border-outline-variant/20 dark:border-outline/10 my-2" />

          <div className="flex flex-col gap-3 pt-1">
            {user ? (
              <>
                {/* Mobile: user info */}
                <div className="flex items-center gap-3 px-3 py-2.5 bg-surface-container-low rounded-xl border border-outline-variant/20">
                  <div className="w-9 h-9 rounded-full kinetic-gradient flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {avatarLetter}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate">{displayName}</p>
                    <p className="text-xs text-on-surface-variant truncate">{user.email}</p>
                  </div>
                </div>

                {/* Mobile availability toggle */}
                {isMentor && mentorProfile && (
                  <div className="flex items-center justify-between px-3 py-2.5 bg-surface-container-low rounded-xl border border-outline-variant/20">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${mentorProfile.is_online ? 'bg-green-500 animate-pulse' : 'bg-on-surface-variant/40'}`}></span>
                      <span className="text-sm font-semibold text-on-surface">
                        {mentorProfile.is_online ? "I'm Available Now" : "I'm Offline"}
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={!!mentorProfile.is_online}
                        onChange={(e) => handleToggleOnline(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-surface-container rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                  </div>
                )}

                <button
                  onClick={() => {
                    setActiveTab("become-mentor");
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 text-sm font-semibold text-on-surface hover:text-primary py-2 transition-colors duration-200"
                >
                  <LayoutDashboard size={16} className="text-on-surface-variant" />
                  My Application
                </button>

                <button
                  onClick={handleSignOut}
                  className="bg-red-500/10 text-red-400 w-full text-center py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 hover:bg-red-500/20"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setActiveTab("auth");
                    setMobileMenuOpen(false);
                  }}
                  className="text-sm font-semibold text-on-surface hover:text-primary transition-colors duration-200 text-center w-full py-2 border border-outline-variant/20 rounded-full"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setActiveTab("auth");
                    setMobileMenuOpen(false);
                  }}
                  className="bg-primary text-on-primary-fixed w-full text-center py-2.5 rounded-full font-semibold text-sm transition-all duration-200 hover:shadow-[0_0_18px_rgba(249,115,22,0.4)] shadow-md shadow-primary/20"
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
