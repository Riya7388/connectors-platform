import React, { useState, useEffect } from "react";
import { Sun, Moon, Menu, X, LogOut, User } from "lucide-react";
import { supabase } from "../supabase";

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

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setActiveTab("home");
  };

  const navLinks = [
    { id: "home", label: "Home" },
    { id: "compare", label: "Colleges" },
    { id: "find-mentor", label: "Mentors" },
    { id: "become-mentor", label: "Become Mentor" },
  ];

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
            className="h-10 w-10 rounded-full group-hover:scale-105 transition-transform duration-300" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCShZCqSHxd2ll50B0RCnGsXQzGKWy-60z0tBU8sIZvCuvVjqJ8Rx-cVmoH1YGidh-ldpsYTKNmQlBEC1uFP7L5uWYEYGc6173bsvaRRC2V9TNHoQ4cgcvctpMkIJ8Vh-5_QZ9_JiUCpnaKVBPiY2IjAnKDeB1AsQaiv9r0Bsi6o9T8l_i1EsLapu20_2CYcJlrRC24PcCz_4H5UunGMHAQJ5diCPOAHpcMmkRMnEAs46zolql7pZLRyl-K_FL3aWTO4JWXD5L5IHY"
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
                className={`font-semibold text-sm transition-all duration-300 pb-1 border-b-2 hover:text-primary ${
                  isActive
                    ? "text-primary border-primary"
                    : "text-on-surface-variant dark:text-on-surface-variant/80 border-transparent"
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full hover:bg-surface-container-high dark:hover:bg-surface-container text-on-surface-variant hover:text-primary transition-all"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          {user ? (
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-on-surface bg-surface-container-low px-3 py-1.5 rounded-full border border-outline-variant/30">
                <User size={16} className="text-primary" />
                <span className="truncate max-w-[120px]">{user.email?.split('@')[0]}</span>
              </div>
              <button 
                onClick={handleSignOut}
                className="text-sm font-semibold text-red-500 hover:text-red-600 transition-colors flex items-center gap-1"
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          ) : (
            <>
              <button 
                onClick={() => setActiveTab("auth")}
                className="hidden md:block text-sm font-semibold text-on-surface hover:text-primary transition-colors"
              >
                Login
              </button>
              
              <button 
                onClick={() => setActiveTab("auth")}
                className="bg-primary text-on-primary-fixed hover:scale-105 active:scale-95 px-5 py-2 rounded-full font-semibold text-sm transition-all duration-300 hidden md:block"
              >
                Sign-up
              </button>
            </>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-full text-on-surface hover:text-primary transition-colors"
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
                className={`text-left font-semibold text-base py-2 transition-all ${
                  isActive
                    ? "text-primary pl-2 border-l-4 border-primary"
                    : "text-on-surface-variant dark:text-on-surface-variant/80 pl-0"
                }`}
              >
                {link.label}
              </button>
            );
          })}
          <hr className="border-outline-variant/20 dark:border-outline/10 my-2" />
          <div className="flex flex-col gap-4 pt-2">
            {user ? (
              <>
                <div className="flex items-center gap-2 text-sm font-medium text-on-surface bg-surface-container-low px-3 py-2 rounded-lg border border-outline-variant/30 justify-center">
                  <User size={16} className="text-primary" />
                  <span className="truncate">{user.email}</span>
                </div>
                <button 
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
                  }}
                  className="bg-red-500/10 text-red-500 w-full text-center py-2.5 rounded-full font-semibold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <LogOut size={16} /> Sign out
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => {
                    setActiveTab("auth");
                    setMobileMenuOpen(false);
                  }}
                  className="text-sm font-semibold text-on-surface hover:text-primary transition-colors text-center w-full py-2 border border-outline-variant/20 rounded-full"
                >
                  Login
                </button>
                <button 
                  onClick={() => {
                    setActiveTab("auth");
                    setMobileMenuOpen(false);
                  }}
                  className="bg-primary text-on-primary-fixed w-full text-center py-2.5 rounded-full font-semibold text-sm transition-all duration-300"
                >
                  Sign-up
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
