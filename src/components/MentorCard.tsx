import React from "react";
import { ShieldCheck, Trophy, Globe, Check } from "lucide-react";
import { toTitleCase, getDeterministicGradientAngle, getInitials } from "../lib/formatters";
import { FREE_MODE } from "../lib/config";

export interface MentorData {
  id: string;
  user_id?: string | null;
  full_name: string;
  college_name?: string;
  branch?: string;
  graduation_year?: number;
  profile_photo_url?: string | null;
  top_achievement?: string | null;
  journey_tags?: string[] | null;
  exam_category?: string;
  ca_stage?: string;
  upsc_stage?: string;
  target_exam?: string;
  target_college?: string;
  other_exam?: string;
  current_organization?: string;
  verified?: boolean;
  rating?: number | null;
  areas_of_expertise?: string[] | null;
  expertise_other?: string | null;
  languages_known?: string[] | null;
  pricing?: Record<string, string> | null;
  session_durations?: string[] | null;
  free_intro_session?: boolean;
  is_online?: boolean;
  last_online_at?: string | null;
}

interface MentorCardProps {
  mentor: MentorData;
  onClick: () => void;
}

function getMinPriceInfo(pricing: Record<string, string> | null): { price: number; duration: string } | null {
  if (!pricing) return null;
  let minPrice = Infinity;
  let minDuration = "30 min";
  Object.entries(pricing).forEach(([dur, p]) => {
    const val = parseFloat(p);
    if (!isNaN(val) && val < minPrice) {
      minPrice = val;
      minDuration = dur;
    }
  });
  return minPrice !== Infinity ? { price: minPrice, duration: minDuration } : null;
}

export const MentorCard: React.FC<MentorCardProps> = ({ mentor, onClick }) => {
  const angle = getDeterministicGradientAngle(mentor.id);
  const titleName = toTitleCase(mentor.full_name);
  const initials = getInitials(mentor.full_name);

  // College & Grad year subtitle
  const collegeText = mentor.current_organization || mentor.college_name || "";
  const gradYearText = mentor.graduation_year ? `Grad ${mentor.graduation_year}` : "";
  const subtitle = [collegeText, gradYearText].filter(Boolean).join(" · ");

  // Chips for "CAN HELP WITH" (up to 3 chips, then +N)
  const expertiseList: string[] = Array.isArray(mentor.areas_of_expertise)
    ? mentor.areas_of_expertise
    : typeof mentor.areas_of_expertise === "string"
    ? [mentor.areas_of_expertise]
    : mentor.expertise_other
    ? [mentor.expertise_other]
    : [];

  const visibleExpertise = expertiseList.slice(0, 3);
  const remainingCount = expertiseList.length - 3;

  // Pricing
  const isFree = FREE_MODE || (mentor.pricing && Object.keys(mentor.pricing).length === 0);
  const minPriceInfo = getMinPriceInfo(mentor.pricing || null);

  // Exam tag
  const examTag =
    mentor.current_organization
      ? mentor.exam_category || "Mentor"
      : mentor.exam_category === "CA"
      ? mentor.ca_stage || "CA"
      : mentor.exam_category === "UPSC"
      ? mentor.upsc_stage || "UPSC"
      : mentor.exam_category === "Banking" || mentor.exam_category === "Defense"
      ? mentor.target_exam || mentor.exam_category
      : mentor.exam_category === "CUET"
      ? mentor.target_college || "CUET"
      : mentor.exam_category === "Other"
      ? mentor.other_exam || "Other"
      : mentor.exam_category || mentor.branch || "Mentor";

  const isNewMentor = mentor.rating === null || mentor.rating === undefined;

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col justify-between rounded-2xl bg-[#141417] border border-[rgba(255,255,255,0.08)] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(168,85,247,0.35)] hover:shadow-[0_10px_35px_rgba(168,85,247,0.12)] cursor-pointer"
    >
      {/* 1. Gradient cover band (about 90px), fading into card background */}
      <div className="relative h-[90px] w-full overflow-hidden shrink-0">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(${angle}deg, #FF9D2E 0%, #FF2D8F 38%, #A855F7 70%, #4F46E5 100%)`,
          }}
        />
        {/* Soft fade into card background #141417 */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#141417]/40 to-[#141417]" />
      </div>

      {/* Main Content Area */}
      <div className="px-5 pb-5 -mt-12 flex-1 flex flex-col justify-between space-y-4">
        {/* Top: Avatar, Name, College */}
        <div>
          <div className="flex items-end justify-between">
            {/* 2. Avatar (92px) with gradient ring */}
            <div className="relative">
              <div className="h-[92px] w-[92px] rounded-full p-[3px] bg-gradient-to-tr from-[#FF9D2E] via-[#FF2D8F] to-[#4F46E5] shadow-xl">
                <div className="h-full w-full rounded-full overflow-hidden bg-[#1C1C21] flex items-center justify-center">
                  {mentor.profile_photo_url ? (
                    <img
                      src={mentor.profile_photo_url}
                      alt={titleName}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        const target = e.currentTarget;
                        target.style.display = "none";
                        if (target.parentElement) {
                          target.parentElement.innerHTML = `<span class="text-2xl font-bold font-poppins text-white/90">${initials}</span>`;
                        }
                      }}
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[#1C1C21] to-[#2A2A32] flex items-center justify-center text-2xl font-bold font-poppins text-white/90">
                      {initials}
                    </div>
                  )}
                </div>
              </div>

              {/* Small green verified badge on lower right if verified */}
              {mentor.verified && (
                <div
                  className="absolute bottom-1 right-1 h-6 w-6 rounded-full bg-[#16A34A] border-2 border-[#141417] flex items-center justify-center shadow-md"
                  title="Verified Mentor"
                >
                  <Check size={13} strokeWidth={3} className="text-white" />
                </div>
              )}
            </div>

            {/* Online Indicator if active */}
            {mentor.is_online && (
              <span className="mb-2 flex items-center gap-1.5 bg-[#4ADE80]/10 border border-[#4ADE80]/30 text-[#4ADE80] text-[10px] font-semibold px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
                Online
              </span>
            )}
          </div>

          {/* 3. Name in Poppins (Title Case) + College · Grad YYYY */}
          <div className="mt-3">
            <h3 className="font-poppins text-lg font-bold text-[#FFFFFF] tracking-tight truncate group-hover:text-white transition-colors">
              {titleName}
            </h3>
            {subtitle && (
              <p className="text-xs text-[#D4D4D8] mt-0.5 truncate font-normal">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* 4. Top Achievement box (trophy icon, small uppercase label "TOP ACHIEVEMENT" in #FF9D2E, white text) */}
        {mentor.top_achievement && mentor.top_achievement.trim() !== "" && (
          <div className="gradient-border-box rounded-xl p-3 flex items-start gap-2.5">
            <div className="p-1 rounded-md bg-[#FF9D2E]/15 text-[#FF9D2E] shrink-0 mt-0.5">
              <Trophy size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#FF9D2E]">
                Top Achievement
              </p>
              <p className="text-xs font-medium text-[#FFFFFF] leading-snug mt-0.5 break-words">
                {mentor.top_achievement}
              </p>
            </div>
          </div>
        )}

        {/* 5. Pills row: exam (neutral), Verified (green), New Mentor (purple) */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Exam pill */}
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#1C1C21] text-[#D4D4D8] border border-[rgba(255,255,255,0.08)]">
            {examTag}
          </span>

          {/* Verified pill */}
          {mentor.verified && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#4ADE80] bg-[rgba(34,197,94,0.12)] border border-[rgba(34,197,94,0.35)]">
              <ShieldCheck size={12} className="shrink-0" />
              Verified
            </span>
          )}

          {/* New Mentor pill */}
          {isNewMentor && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#C4A0FF] bg-[rgba(168,85,247,0.14)] border border-[rgba(168,85,247,0.4)]">
              New Mentor
            </span>
          )}
        </div>

        {/* 6. "CAN HELP WITH" label and at most 3 chips, then dashed +N */}
        {visibleExpertise.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">
              Can help with
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {visibleExpertise.map((chip, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#1C1C21] text-[#D4D4D8] border border-[rgba(255,255,255,0.08)]"
                >
                  {chip}
                </span>
              ))}
              {remainingCount > 0 && (
                <span className="px-2 py-1 rounded-lg text-[11px] font-medium bg-transparent text-[#A1A1AA] border border-dashed border-[rgba(255,255,255,0.2)]">
                  +{remainingCount}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 7. Footer: hairline border, price / languages on left, gradient View Profile on right */}
        <div className="pt-3.5 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between gap-3 mt-auto">
          <div className="min-w-0">
            {isFree ? (
              <div>
                <span className="font-poppins font-extrabold text-base brand-gradient-text tracking-wide">
                  FREE
                </span>
                {mentor.languages_known && mentor.languages_known.length > 0 && (
                  <div className="flex items-center gap-1 text-[11px] text-[#A1A1AA] mt-0.5 truncate">
                    <Globe size={11} className="shrink-0" />
                    <span className="truncate">{mentor.languages_known.join(", ")}</span>
                  </div>
                )}
              </div>
            ) : minPriceInfo ? (
              <div>
                <p className="font-poppins font-extrabold text-base text-[#FFFFFF] tracking-tight">
                  ₹{minPriceInfo.price}
                </p>
                <p className="text-[10px] text-[#71717A] mt-0.5">
                  per {minPriceInfo.duration}
                </p>
              </div>
            ) : (
              <div>
                <span className="font-poppins font-extrabold text-base brand-gradient-text">
                  FREE
                </span>
                {mentor.languages_known && mentor.languages_known.length > 0 && (
                  <p className="text-[10px] text-[#A1A1AA] mt-0.5 truncate">
                    {mentor.languages_known.join(", ")}
                  </p>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            className="brand-gradient-bg px-4 py-2 rounded-full text-xs font-semibold text-white shadow-md hover:scale-105 active:scale-95 transition-all shrink-0"
          >
            View Profile
          </button>
        </div>
      </div>
    </div>
  );
};
