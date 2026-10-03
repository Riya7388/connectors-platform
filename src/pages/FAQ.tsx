import React, { useState } from "react";
import { ArrowLeft, ChevronDown, HelpCircle, Mail } from "lucide-react";
import { SUPPORT_EMAIL } from "../lib/legal";

interface FAQProps {
  setActiveTab: (tab: string) => void;
}

interface FAQItem {
  id: number;
  question: string;
  answer: React.ReactNode;
}

export const FAQ: React.FC<FAQProps> = ({ setActiveTab }) => {
  // All accordions collapsed by default
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  const faqItems: FAQItem[] = [
    {
      id: 1,
      question: "What is Connectors?",
      answer: "Connectors is a student mentorship platform that helps students connect with mentors who can provide experience-based guidance on academics, competitive exams, career decisions, college selection and other areas.",
    },
    {
      id: 2,
      question: "Is Connectors free?",
      answer: "Yes. Connectors is currently completely free for students and mentors. There are no charges for mentorship sessions at present.",
    },
    {
      id: 3,
      question: "How does mentorship work?",
      answer: "Students explore mentors, check their background, experience and areas of expertise, and send a connection request. Once the mentor accepts, you chat to agree on a time. After the mentor confirms the time, the mentor shares a Google Meet link and you join the session at the scheduled time. Sessions are 15 or 30 minutes.",
    },
    {
      id: 4,
      question: "Who can become a mentor?",
      answer: "College students and individuals with relevant experience, knowledge or achievements can apply, including current college students. Mentors are asked for details and proof of their achievements and experience during verification.",
    },
    {
      id: 5,
      question: "Are mentors verified?",
      answer: "Connectors reviews the information and achievement proof submitted by mentors before approving their profiles. However, users should independently evaluate the advice shared by any mentor before relying on it.",
    },
    {
      id: 6,
      question: "What if a student does not attend a scheduled session?",
      answer: "Students are expected to attend scheduled sessions on time. Repeated no-shows or missing sessions without reasonable notice may result in warnings, temporary restrictions or blocking of the account.",
    },
    {
      id: 7,
      question: "What if a mentor does not attend a session?",
      answer: (
        <span>
          Mentors are expected to be available for confirmed sessions. If a mentor repeatedly fails to attend, appropriate action may be taken, including removal from the platform. You can also report the issue from the chat.
        </span>
      ),
    },
    {
      id: 8,
      question: "What kind of guidance can I get?",
      answer: "Mentorship may include competitive exam preparation, study strategy, college and branch guidance, career guidance, coding, communication, interview preparation and other areas based on the mentor's expertise.",
    },
    {
      id: 9,
      question: "Is Connectors only for JEE students?",
      answer: "No. Connectors supports students preparing for different exams and career paths, such as JEE, NEET, CAT, CA, UPSC, CLAT, CUET and more, and the platform will keep expanding.",
    },
    {
      id: 10,
      question: "Is Connectors safe for school students?",
      answer: (
        <span>
          We take safety seriously. Mentors must not ask students for money, gifts, personal phone numbers, social media or photos, and conversations should stay on the platform. If you are under 18, please use Connectors with a parent or guardian's knowledge. If anything feels wrong, report it from the chat or contact us.
        </span>
      ),
    },
    {
      id: 11,
      question: "Can I report inappropriate behaviour?",
      answer: "Yes. You can report inappropriate, misleading, abusive or unacceptable behaviour. Connectors may review the report and take appropriate action, including restricting or blocking an account.",
    },
    {
      id: 12,
      question: "Can the AI tools make mistakes?",
      answer: "Yes. Mentor Genie and the college comparison tool are meant to help you explore options, but they can be incomplete or wrong. College data such as fees and placements may be estimates, so please verify it from official sources.",
    },
    {
      id: 13,
      question: "Does Connectors guarantee a specific result?",
      answer: "No. Mentorship provides guidance and experience-based perspectives. Connectors does not guarantee admission, rank, exam results, placements or any specific outcome.",
    },
    {
      id: 14,
      question: "How can I contact you?",
      answer: (
        <span>
          Write to us at{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-primary hover:underline font-medium inline-flex items-center gap-1"
          >
            <Mail size={14} className="inline" />
            {SUPPORT_EMAIL}
          </a>.
        </span>
      ),
    },
  ];

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

        {/* Accordion List */}
        <div className="space-y-3.5">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={item.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? "bg-surface-container-low border-primary/30 shadow-lg shadow-primary/5"
                    : "bg-surface-container-lowest/50 border-white/10 hover:border-white/20 hover:bg-surface-container-low/60"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(index)}
                  className="w-full py-4 sm:py-5 px-5 sm:px-6 flex items-center justify-between text-left gap-4 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="text-base sm:text-lg font-semibold text-on-surface leading-snug">
                    {item.id}. {item.question}
                  </span>
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-200 ${
                      isOpen
                        ? "bg-primary text-white rotate-180"
                        : "bg-white/5 text-on-surface-variant"
                    }`}
                  >
                    <ChevronDown size={18} />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-1 text-sm sm:text-base text-on-surface-variant leading-relaxed border-t border-white/5 animate-fade-in">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

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
