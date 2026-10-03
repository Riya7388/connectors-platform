import React from "react";
import { ArrowLeft, ShieldCheck, Mail } from "lucide-react";
import { TERMS_LAST_UPDATED, SUPPORT_EMAIL } from "../lib/legal";

interface TermsProps {
  setActiveTab: (tab: string) => void;
}

export const Terms: React.FC<TermsProps> = ({ setActiveTab }) => {
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
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">
            Terms &amp; Conditions
          </h1>
          <p className="text-sm font-medium text-on-surface-variant/70">
            Last updated: {TERMS_LAST_UPDATED}
          </p>
        </div>

        {/* "In short" Summary Box for school students */}
        <div className="glass-card p-6 sm:p-7 rounded-2xl border border-primary/20 bg-primary/5 mb-12 relative overflow-hidden shadow-lg shadow-primary/5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <ShieldCheck size={20} />
            </div>
            <h2 className="text-lg font-bold text-on-surface tracking-tight">
              In short
            </h2>
          </div>
          <ul className="space-y-3 text-sm sm:text-base text-on-surface-variant leading-relaxed">
            <li className="flex items-start gap-2.5">
              <span className="text-primary font-bold text-lg leading-none mt-0.5">•</span>
              <span>Connectors connects students with mentors who share their own experience. It is not a replacement for professional or official advice.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-primary font-bold text-lg leading-none mt-0.5">•</span>
              <span>Be honest, be respectful, and keep conversations on the platform.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-primary font-bold text-lg leading-none mt-0.5">•</span>
              <span>Mentors will never ask students for money, gifts, personal phone numbers, social media or photos. If anyone does, report it.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-primary font-bold text-lg leading-none mt-0.5">•</span>
              <span>If you are under 18, use Connectors with the knowledge and permission of a parent or guardian.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-primary font-bold text-lg leading-none mt-0.5">•</span>
              <span>Mentorship is currently free. We do not guarantee any rank, admission, or result.</span>
            </li>
          </ul>
        </div>

        {/* Full Terms Text */}
        <div className="space-y-8 text-on-surface-variant leading-relaxed text-sm sm:text-base">
          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-on-surface">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using Connectors, you agree to follow these Terms &amp; Conditions. If you do not agree, please do not use the platform.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-on-surface">
              2. About Connectors
            </h2>
            <p>
              Connectors is a student mentorship platform designed to connect students with mentors for guidance and experience sharing.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-on-surface">
              3. Eligibility and Minors
            </h2>
            <p>
              You must provide accurate information when creating an account or a mentor profile. You must not use false or misleading information. Many of our users are school students and may be under 18. If you are under 18, you should use the platform only with the knowledge and permission of a parent or legal guardian. Mentors must be at least 18 years old.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-on-surface">
              4. Mentor Responsibilities
            </h2>
            <p>
              Mentors agree to: provide accurate information about their background and experience; give genuine guidance based on their own knowledge and experience; attend confirmed sessions on time; communicate respectfully and professionally; not provide misleading or harmful information; and not misuse any student's information. Mentors take part voluntarily. Connectors does not promise any income or reward to mentors. Repeated failure to attend confirmed sessions may lead to warnings, restriction or removal from the platform.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-on-surface">
              5. Student Responsibilities
            </h2>
            <p>
              Students agree to: provide accurate information; attend scheduled sessions on time; communicate respectfully; not misuse the platform; not harass, threaten or abuse mentors; and not share another person's private information without permission. Repeated no-shows may lead to warnings, restriction or blocking of the account.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-on-surface">
              6. Safe Communication and Child Safety
            </h2>
            <p>
              To keep students safe, mentors must not ask students for money, gifts, personal phone numbers, social media accounts, photos or any private information. Mentors must not ask students to meet in person, and must not move conversations outside the platform. Mentors and students must not record sessions without the consent of everyone involved. Anyone who experiences or sees inappropriate, abusive, misleading or unsafe behaviour should report it using the Report option in the chat or by contacting us. Connectors may review reports and take action, including removing a profile or blocking an account.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-on-surface">
              7. Free Mentorship
            </h2>
            <p>
              All mentorship sessions on Connectors are currently provided free of charge. Connectors does not currently charge students or mentors. Connectors reserves the right to introduce paid features or services in the future. Any applicable charges will be clearly communicated before a user is charged. Users must not ask for, offer or accept payments outside the platform for sessions arranged through Connectors.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-on-surface">
              8. Mentor Verification
            </h2>
            <p>
              Connectors may review information submitted by mentors, such as student ID, achievements and supporting documents, before approving a profile. Documents submitted for verification are not displayed publicly. Verification is not a guarantee of a mentor's advice, performance or suitability for any particular student.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-on-surface">
              9. User Conduct
            </h2>
            <p>
              Users must not: provide false information; harass or abuse others; attempt to scam or exploit anyone; share inappropriate or illegal content; misuse another person's personal information; or use the platform for anything other than genuine mentorship. Connectors may suspend or terminate accounts that violate these rules.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-on-surface">
              10. Sessions and Third-Party Tools
            </h2>
            <p>
              Mentorship sessions are for educational and guidance purposes. Sessions may take place using third-party tools such as Google Meet. Connectors does not monitor live sessions held on third-party tools, and is not responsible for how those tools work. Users must follow the rules of those tools as well.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-on-surface">
              11. Information, Estimates and AI Features
            </h2>
            <p>
              Information about colleges, fees, placements and rankings shown on Connectors is for general guidance only. It may be an estimate or may be out of date, and users should verify it from official sources before making decisions. Connectors also offers AI-powered features (such as Mentor Genie and the college comparison tool). AI responses can be incomplete or wrong and should not be treated as professional or official advice.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-on-surface">
              12. Mentors' Views and No Guarantee
            </h2>
            <p>
              Advice from mentors reflects their personal views and experiences and does not necessarily represent the views of Connectors. Students should independently evaluate any advice before making important academic, career or personal decisions. Connectors does not guarantee examination results, ranks, college admissions, scholarships, placements, career outcomes or any other specific result.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-on-surface">
              13. Limitation of Liability
            </h2>
            <p>
              To the extent permitted by law, Connectors is not responsible for any loss or harm arising from advice given by mentors, from decisions made based on information on the platform, or from the conduct of users or third-party tools.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-on-surface">
              14. Privacy and Personal Information
            </h2>
            <p>
              Connectors collects the information needed to create accounts, verify mentors, enable mentorship and improve the platform. We handle personal information with care and use it only for these purposes. A detailed Privacy Policy will be available on the website.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-on-surface">
              15. Suspension and Termination
            </h2>
            <p>
              Connectors may restrict, suspend or permanently block an account, or remove a mentor profile, if these Terms are violated, if false information is provided, if sessions are repeatedly missed, or if we believe it is necessary to keep users safe.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-on-surface">
              16. Changes to the Platform and Terms
            </h2>
            <p>
              Connectors may update, modify or discontinue features when necessary. We may update these Terms from time to time. Important changes will be communicated through the platform, and continued use means you accept the updated Terms.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-on-surface">
              17. Governing Law
            </h2>
            <p>
              These Terms are governed by the laws of India.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-on-surface">
              18. Contact
            </h2>
            <p>
              For questions, complaints or concerns, contact us at{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                <Mail size={15} className="inline" />
                {SUPPORT_EMAIL}
              </a>.
            </p>
          </section>
        </div>

        {/* Bottom Back Button */}
        <div className="mt-14 pt-8 border-t border-white/10 flex justify-between items-center">
          <button
            onClick={() => setActiveTab("home")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft size={16} />
            Back to Home
          </button>
          <button
            onClick={() => {
              setActiveTab("faq");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="text-sm text-on-surface-variant hover:text-primary transition-colors"
          >
            Frequently Asked Questions →
          </button>
        </div>
      </div>
    </div>
  );
};
