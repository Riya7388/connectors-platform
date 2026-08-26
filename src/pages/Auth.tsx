import React, { useState } from "react";
import { supabase } from "../supabase";
import { Mail, Lock, LogIn, UserPlus, Zap } from "lucide-react";
import logoImg from "../assets/logo.png";

interface AuthProps {
  setActiveTab: (tab: string) => void;
}

/* Google "G" SVG icon */
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export const Auth: React.FC<AuthProps> = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // Redirect is handled by App.tsx onAuthStateChange
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({
          type: "success",
          text: "Registration successful! Check your email to confirm, then sign in.",
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Authentication failed",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Google sign-in failed",
      });
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-secondary-container/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <img
              src={logoImg}
              alt="Connectors Logo"
              className="w-10 h-10 object-contain"
            />
            <span className="font-extrabold text-2xl text-primary tracking-tight">
              Connectors
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">
            {isLogin ? "Welcome back" : "Join the network"}
          </h1>
          <p className="text-on-surface-variant text-sm mt-2">
            {isLogin
              ? "Sign in to access your dashboard and mentors."
              : "Create your account to connect with elite college mentors."}
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
          {/* Card inner glow */}
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-primary/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-secondary-container/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-5">
            {/* Status message */}
            {message && (
              <div
                className={`p-4 rounded-xl text-sm font-medium border ${
                  message.type === "error"
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : "bg-green-500/10 text-green-400 border-green-500/20"
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Google OAuth */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/30 text-sm font-semibold text-on-surface transition-all duration-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.08)] disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-on-surface-variant border-t-transparent rounded-full animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-outline-variant/20" />
              <span className="text-xs text-on-surface-variant/50 font-medium uppercase tracking-wider">
                or
              </span>
              <div className="flex-1 h-px bg-outline-variant/20" />
            </div>

            {/* Email / Password form */}
            <form onSubmit={handleAuth} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-container-low/50 border border-outline-variant/30 px-4 py-3 pl-11 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:shadow-[0_0_14px_rgba(249,115,22,0.2)] outline-none text-on-surface transition-all duration-200 placeholder:text-on-surface-variant/40"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50"
                    size={17}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-surface-container-low/50 border border-outline-variant/30 px-4 py-3 pl-11 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:shadow-[0_0_14px_rgba(249,115,22,0.2)] outline-none text-on-surface transition-all duration-200 placeholder:text-on-surface-variant/40"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                  />
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50"
                    size={17}
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full kinetic-gradient text-white font-bold text-sm px-8 py-3.5 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:shadow-xl mt-2"
              >
                {loading ? (
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : isLogin ? (
                  <>
                    <LogIn size={17} /> Sign In
                  </>
                ) : (
                  <>
                    <UserPlus size={17} /> Create Account
                  </>
                )}
              </button>
            </form>

            {/* Toggle login / sign-up */}
            <div className="text-center pt-2 border-t border-outline-variant/10">
              <p className="text-sm text-on-surface-variant">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setMessage(null);
                  }}
                  className="text-primary font-bold hover:underline transition-colors"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-on-surface-variant/40 mt-6">
          By continuing, you agree to Connectors' Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};
