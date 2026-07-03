import React, { useState } from "react";
import { supabase } from "../supabase";
import { Mail, Lock, LogIn, UserPlus } from "lucide-react";

interface AuthProps {
  setActiveTab: (tab: string) => void;
}

export const Auth: React.FC<AuthProps> = ({ setActiveTab }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setActiveTab("home");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Registration successful! You can now log in.' });
        setIsLogin(true); // Switch to login view
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Authentication failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md glass-card p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-secondary-container/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-on-surface-variant text-sm mt-2">
              {isLogin ? 'Sign in to access your dashboard' : 'Join the network of elite mentors'}
            </p>
          </div>

          {message && (
            <div className={`p-4 mb-6 rounded-xl text-sm font-medium ${message.type === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Email</label>
              <div className="relative">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-container-low/50 border border-outline-variant/30 px-4 py-3 pl-11 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-on-surface transition-all" 
                  placeholder="you@example.com" 
                  required
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={18} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Password</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-container-low/50 border border-outline-variant/30 px-4 py-3 pl-11 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-on-surface transition-all" 
                  placeholder="••••••••" 
                  required
                  minLength={6}
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={18} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full brand-gradient-bg text-white font-bold text-sm px-8 py-3.5 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
            >
              {loading ? (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
              ) : isLogin ? (
                <><LogIn size={18} /> Sign In</>
              ) : (
                <><UserPlus size={18} /> Sign Up</>
              )}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-outline-variant/10 pt-6">
            <p className="text-sm text-on-surface-variant">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button 
                type="button" 
                onClick={() => setIsLogin(!isLogin)} 
                className="text-primary font-bold hover:underline"
              >
                {isLogin ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
