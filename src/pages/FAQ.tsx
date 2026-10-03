import React from "react";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { FAQ_DATA } from "../lib/faqData";
import { FaqAccordion } from "../components/FaqAccordion";

interface FAQProps {
  setActiveTab: (tab: string) => void;
}

export const FAQ: React.FC<FAQProps> = ({ setActiveTab }) => {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Back to Home Button */}
        <button
          onClick={() => setActiveTab("home")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200 mb-8 group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform duration-200" />
          Back to Home
        </button>

        {/* Header */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-3">
            <HelpCircle size={14} />
            Got questions?
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-3">
            Frequently Asked Questions
          </h1>
          <p className="text-sm sm:text-base text-on-surface-variant/80 max-w-xl">
            Find quick answers to common questions about Connectors, mentorship sessions, safety, and our platform.
          </p>
        </div>

        {/* Accordion List (8 items) */}
        <FaqAccordion items={FAQ_DATA} showNumbers={true} />

        {/* Bottom Link to Terms */}
        <div className="mt-12 p-6 rounded-2xl border border-white/10 bg-surface-container-low text-center sm:flex sm:items-center sm:justify-between">
          <p className="text-sm text-on-surface-variant mb-3 sm:mb-0">
            Need more information about our platform policies?
          </p>
          <button
            onClick={() => {
              setActiveTab("terms");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            Read our full Terms &amp; Conditions →
          </button>
        </div>
      </div>
    </div>
  );
};
