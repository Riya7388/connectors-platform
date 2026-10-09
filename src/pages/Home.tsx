import React from "react";
import { Star, Video, ArrowRight, Sparkles, Users, Award, ShieldCheck, Compass, HelpCircle, ExternalLink, MessageSquareHeart } from "lucide-react";
import PricingSection from "../components/PricingSection";
import HowItWorks from "../components/HowItWorks";
import { FAQ_DATA } from "../lib/faqData";
import { FaqAccordion } from "../components/FaqAccordion";

interface HomeProps {
  setActiveTab: (tab: string) => void;
}

export const Home: React.FC<HomeProps> = ({ setActiveTab }) => {


  return (
    <div className="relative min-h-screen">
      {/* Background Glows */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute top-[50vh] right-10 w-96 h-96 bg-secondary-container/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Hero Section */}
      <header className="relative max-w-7xl mx-auto px-6 pt-16 pb-24 lg:pt-24 lg:pb-36 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          <div className="flex flex-col space-y-6">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 glass-card rounded-full w-fit font-bold text-xs text-secondary-fixed-dim border border-white/10">
              <Sparkles size={14} className="text-secondary-fixed-dim" /> ✦ Verified Mentors Across Competitive Exams
            </span>
            <h1 className="font-extrabold text-5xl lg:text-6xl leading-tight text-on-background tracking-tight">
              Find the <span className="brand-gradient-text">Right Mentor.</span> Build the <span className="brand-gradient-text">Right Path.</span>
            </h1>
            <p className="text-lg text-on-surface-variant max-w-xl leading-relaxed">
              Connect with experienced mentors for personalized guidance on competitive exams, colleges, careers, and everything in between.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <button 
                onClick={() => setActiveTab("find-mentor")}
                className="brand-gradient-bg text-white px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 neon-glow-primary hover:shadow-primary/30 transition-all duration-300 flex items-center gap-2"
              >
                Find Mentors <ArrowRight size={18} />
              </button>
              <button 
                onClick={() => setActiveTab("become-mentor")}
                className="border-2 border-secondary-container text-secondary-fixed-dim hover:bg-secondary-container/10 px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-all duration-300"
              >
                Become a Mentor
              </button>
            </div>
          </div>

          {/* Floating Cards (Animated/Responsive Grid) */}
          <div className="relative flex items-center justify-center min-h-[400px] lg:min-h-[500px]">
            {/* Live Video Indicator Card */}
            <div className="glass-card p-6 rounded-xl flex items-center gap-4 border border-primary/20 neon-glow-primary z-20 w-full max-w-sm">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary-container flex items-center justify-center shadow-lg animate-pulse">
                <Video className="text-white" size={28} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-primary">1:1 Mentorship Session</h3>
                <p className="text-sm text-on-surface-variant">Personalized guidance for your goals</p>
              </div>
            </div>

            {/* Rohan Sharma Card */}
            <div className="glass-card p-4 rounded-2xl w-60 floating stagger-1 absolute -top-10 left-4 shadow-xl border border-white/10 hidden md:block">
              <div className="flex items-center gap-3">
                <img 
                  className="w-12 h-12 rounded-full border-2 border-primary object-cover" 
                  alt="Rohan Sharma" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB7lv558cLDBnFtlOLAioxpEKzqMsyPmnIjSuv_3CVk8khpAZ_DifLrch0nDp0O9MUQMr9pw9RG2jmvr_yZmtGRSs6wx-qIXtTw38iQBZc1dByPP4jp7QMezg49AvcmlT385DfyWCbc8qf1NE9GQ4wPXxSQ-ywm6yDmMADUtOhYlzOx9wrwJ4JwCygPQpx5faFfrQ39BHRWqokxzmNN1CHZAXpUTkJW-nlbjxjkFMQWl1jDfDxF6P7TR_7VC1rS8mSaLm1a1nlCv6A"
                />
                <div>
                  <p className="font-bold text-sm text-on-surface">Rohan Sharma</p>
                  <p className="text-xs text-on-surface-variant">IIT Bombay • CSE</p>
                </div>
              </div>
              <div className="mt-3 flex gap-1">
                <span className="bg-secondary-container/20 text-secondary-fixed-dim px-2 py-0.5 rounded text-[10px] font-semibold">JEE Adv Rank 142</span>
              </div>
            </div>

            {/* Ishani Verma Card */}
            <div className="glass-card p-4 rounded-2xl w-64 floating stagger-2 absolute -bottom-10 right-4 shadow-xl border border-white/10 hidden md:block">
              <div className="flex items-center gap-3">
                <img 
                  className="w-12 h-12 rounded-full border-2 border-secondary-container object-cover" 
                  alt="Ishani Verma" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBUOUmwow5NMiB30r9-SPoHr2CpRkVOopEbytNCDDxPyWYvXttGvu7VHlEg2d8Sd5mgePmCYUaRNLtioz0LlNo9xMOtuoeWSiKdrfhVDlAntXUE13VQh-QAXlH9AyDjmssNnA_VG-CdIDI8BNns7CLrMMVt87yq8Ke5tAPRs8fDHGJkLZM44GnEKZZ-08UoxHVqeGXyx3u07spCDxI_GxtAAuwPDE-cCfAr-FVP3dZqsBzwdWaS6h2vQv7BhCfrIZfivUEpv2jawrc"
                />
                <div>
                  <p className="font-bold text-sm text-on-surface">Ishani Verma</p>
                  <p className="text-xs text-on-surface-variant">AIIMS Delhi • MBBS</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-primary flex items-center gap-1 font-bold text-xs">
                  <Star size={12} className="fill-primary text-primary" /> 4.9
                </span>
                <span className="text-xs text-on-surface-variant">Active Now</span>
              </div>
            </div>
          </div>
        </div>
      </header>



      {/* Value Pillars Section */}
      <section className="py-20 w-full overflow-hidden">
        <div className="text-center mb-16 space-y-4 px-6 max-w-7xl mx-auto">
          <span className="text-secondary-fixed-dim uppercase tracking-widest text-xs font-bold">Why Connectors?</span>
          <h2 className="text-4xl font-extrabold">Real Guidance for Every Exam, Every Journey</h2>
          <p className="text-on-surface-variant max-w-xl mx-auto text-sm">
            Skip the generic advice and coaching brochures. Get real, unfiltered guidance from seniors and qualified professionals who've walked the exact path you're on.
          </p>
        </div>
        
        <div className="flex flex-col gap-6 w-full relative">
          {/* Row 1 */}
          <div className="flex w-full group overflow-hidden">
            <div className="flex gap-6 animate-marquee-right whitespace-nowrap px-3 group-hover:[animation-play-state:paused]">
              {[...Array(2)].map((_, i) => (
                <React.Fragment key={i}>
                  <div className="glass-card p-8 rounded-2xl border border-white/5 space-y-4 w-80 md:w-[26rem] flex-shrink-0 whitespace-normal hover:-translate-y-2 hover:shadow-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 neon-glow-hover cursor-default">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-2">
                      <ShieldCheck size={24} />
                    </div>
                    <h3 className="text-xl font-bold">Verified Mentors, Every Field</h3>
                    <p className="text-on-surface-variant text-sm leading-relaxed">
                      From education to careers and professional growth — connect with verified seniors, professionals, and experienced mentors.
                    </p>
                  </div>
                  <div className="glass-card p-8 rounded-2xl border border-white/5 space-y-4 w-80 md:w-[26rem] flex-shrink-0 whitespace-normal hover:-translate-y-2 hover:shadow-secondary/20 hover:border-secondary-fixed-dim/50 hover:bg-secondary-fixed-dim/5 transition-all duration-300 neon-glow-hover cursor-default">
                    <div className="w-12 h-12 bg-secondary-container/10 rounded-xl flex items-center justify-center text-secondary-fixed-dim mb-2">
                      <Sparkles size={24} />
                    </div>
                    <h3 className="text-xl font-bold">AI-Powered College Comparison</h3>
                    <p className="text-on-surface-variant text-sm leading-relaxed">
                      Compare engineering colleges side-by-side with real placement data, NIRF rankings, and semantic insights.
                    </p>
                  </div>
                  <div className="glass-card p-8 rounded-2xl border border-white/5 space-y-4 w-80 md:w-[26rem] flex-shrink-0 whitespace-normal hover:-translate-y-2 hover:shadow-tertiary/20 hover:border-tertiary/50 hover:bg-tertiary/5 transition-all duration-300 neon-glow-hover cursor-default">
                    <div className="w-12 h-12 bg-tertiary-container/10 rounded-xl flex items-center justify-center text-tertiary mb-2">
                      <Users size={24} />
                    </div>
                    <h3 className="text-xl font-bold">Personalized 1-on-1 Sessions</h3>
                    <p className="text-on-surface-variant text-sm leading-relaxed">
                      Chat with your mentor, agree on a time, and connect via Google Meet — real conversations, personalized to your goals.
                    </p>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Row 2 */}
          <div className="flex w-full group overflow-hidden">
            <div className="flex gap-6 animate-marquee-right-slow whitespace-nowrap px-3 group-hover:[animation-play-state:paused]">
              {[...Array(2)].map((_, i) => (
                <React.Fragment key={i}>
                  <div className="glass-card p-8 rounded-2xl border border-white/5 space-y-4 w-80 md:w-[26rem] flex-shrink-0 whitespace-normal hover:-translate-y-2 hover:shadow-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 neon-glow-hover cursor-default">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-2">
                      <Compass size={24} />
                    </div>
                    <h3 className="text-xl font-bold">Guidance for Every Journey</h3>
                    <p className="text-on-surface-variant text-sm leading-relaxed">
                      Get guidance for education, career decisions, skills, entrepreneurship, and professional growth — all in one place.
                    </p>
                  </div>
                  <div className="glass-card p-8 rounded-2xl border border-white/5 space-y-4 w-80 md:w-[26rem] flex-shrink-0 whitespace-normal hover:-translate-y-2 hover:shadow-secondary/20 hover:border-secondary-fixed-dim/50 hover:bg-secondary-fixed-dim/5 transition-all duration-300 neon-glow-hover cursor-default">
                    <div className="w-12 h-12 bg-secondary-container/10 rounded-xl flex items-center justify-center text-secondary-fixed-dim mb-2">
                      <Video size={24} />
                    </div>
                    <h3 className="text-xl font-bold">Free Intro Sessions</h3>
                    <p className="text-on-surface-variant text-sm leading-relaxed">
                      Try before you commit — many mentors offer a free first session to help you find the right fit.
                    </p>
                  </div>
                  <div className="glass-card p-8 rounded-2xl border border-white/5 space-y-4 w-80 md:w-[26rem] flex-shrink-0 whitespace-normal hover:-translate-y-2 hover:shadow-tertiary/20 hover:border-tertiary/50 hover:bg-tertiary/5 transition-all duration-300 neon-glow-hover cursor-default">
                    <div className="w-12 h-12 bg-tertiary-container/10 rounded-xl flex items-center justify-center text-tertiary mb-2">
                      <Star size={24} />
                    </div>
                    <h3 className="text-xl font-bold">Rated & Reviewed</h3>
                    <p className="text-on-surface-variant text-sm leading-relaxed">
                      Every session is rated by the community, helping you discover trusted mentors and make confident decisions.
                    </p>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works — Journey Section */}
      <HowItWorks />

      {/* Pricing Section */}
      <PricingSection setActiveTab={setActiveTab} />

      {/* Interactive Platform Overview Callout */}
      <section className="py-12 max-w-7xl mx-auto px-6 mb-16">
        <div className="glass-card rounded-3xl p-8 lg:p-12 border border-white/10 bg-gradient-to-r from-surface/80 to-surface-container/60 relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-lg">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <Award size={18} /> Elite Campus Partnership program
            </div>
            <h3 className="text-3xl font-bold">Are You Ready to Mentor the Next Generation?</h3>
            <p className="text-on-surface-variant text-sm">
              Empower junior students looking to get into your branch. Earn up to $40/hour hosting interactive Q&A sessions.
            </p>
          </div>
          <button 
            onClick={() => setActiveTab("become-mentor")}
            className="brand-gradient-bg text-white hover:scale-105 active:scale-95 px-8 py-4 rounded-xl font-bold text-sm transition-all"
          >
            Apply to Join as Mentor
          </button>
        </div>
      </section>

      {/* Frequently Asked Questions Section */}
      <section className="py-16 px-6 max-w-3xl mx-auto w-full">
        <div className="text-center mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <HelpCircle size={14} />
            FAQ
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
            Frequently Asked Questions
          </h2>
          <p className="text-sm sm:text-base text-on-surface-variant/80 max-w-md mx-auto">
            Quick answers for students and mentors
          </p>
        </div>

        {/* 5-Item Accordion */}
        <FaqAccordion
          items={[
            FAQ_DATA.find((item) => item.question === "What is Connectors?")!,
            FAQ_DATA.find((item) => item.question === "Is Connectors free?")!,
            FAQ_DATA.find((item) => item.question === "Who can become a mentor?")!,
            FAQ_DATA.find((item) => item.question === "Are mentors verified?")!,
            FAQ_DATA.find((item) => item.question === "Can I report inappropriate behaviour?")!,
          ].filter(Boolean)}
          showNumbers={false}
        />

        {/* View all questions button */}
        <div className="mt-10 text-center">
          <button
            onClick={() => {
              setActiveTab("faq");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 hover:border-primary/40 text-sm font-semibold text-on-surface transition-all duration-200 hover:shadow-[0_0_16px_rgba(249,115,22,0.15)] group"
          >
            View all questions
            <ArrowRight size={16} className="text-primary group-hover:translate-x-1 transition-transform duration-200" />
          </button>
        </div>
      </section>

      {/* Feedback CTA Section (placed between FAQ and Footer) */}
      <section className="py-12 max-w-4xl mx-auto px-6 mb-16">
        <div className="glass-card rounded-3xl p-8 sm:p-10 border border-white/10 bg-gradient-to-r from-surface/80 to-surface-container/60 text-center space-y-5 relative overflow-hidden shadow-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <MessageSquareHeart size={14} />
            <span>Community Feedback</span>
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
              Help Us Get Better
            </h3>
            <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
              Every session, every feature, every fix — it all starts with what you tell us. Take two minutes, we read every single response.
            </p>
          </div>

          <div className="pt-2">
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSdBPsSL8NW7jvUWrzpD9-BSDsOLNjLKucc9Z5fTUDmUbkl6oA/viewform"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 brand-gradient-bg text-white px-8 py-3.5 rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg neon-glow-primary"
            >
              <span>Share Your Feedback</span>
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
