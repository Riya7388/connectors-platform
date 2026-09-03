import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  Search,
  ShieldCheck,
  X,
  ChevronDown,
  Star,
  Filter,
  Gift,
  Globe,
} from "lucide-react";
import { supabase } from "../supabase";
import {
  AREAS_OF_EXPERTISE,
  PRESET_EXPERTISE_OPTIONS,
  LANGUAGES as LANGUAGE_OPTIONS,
} from "../constants/mentorConstants";

/* -------------------------------------------------
   Types
------------------------------------------------- */
interface Mentor {
  id: string;
  user_id: string | null;
  college_id: string | null;
  full_name: string;
  personal_email: string;
  college_name: string;
  branch: string;
  exam_category?: string;
  current_organization?: string;
  years_of_experience?: string;
  exam_branch?: string;
  ca_stage?: string;
  upsc_stage?: string;
  target_exam?: string;
  target_college?: string;
  other_exam?: string;
  graduation_year: number;
  bio: string;
  experience: string;
  linkedin_url: string;
  pricing: Record<string, string> | null;
  profile_photo_url: string;
  verified: boolean;
  areas_of_expertise: string[] | null;
  languages_known: string[] | null;
  free_intro_session: boolean;
  rating: number | null;
  is_online?: boolean;
  last_online_at?: string | null;
  mentor_tag?: string | null;
  mentor_tag_other?: string | null;
  expertise_other?: string | null;
  goals?: string[] | null;
}

/* -------------------------------------------------
   Constants
------------------------------------------------- */
const EXPERTISE_OPTIONS = AREAS_OF_EXPERTISE;

const PRICE_RANGES = [
  { label: "₹0 – ₹200", min: 0, max: 200 },
  { label: "₹200 – ₹500", min: 200, max: 500 },
  { label: "₹500 – ₹1000", min: 500, max: 1000 },
];

const RATING_OPTIONS = [
  { label: "4+ Stars", value: 4 },
  { label: "5 Stars Only", value: 5 },
];

/* -------------------------------------------------
   Helper: get the minimum price from mentor.pricing
   pricing is e.g. { "15 min": "150", "30 min": "300" }
------------------------------------------------- */
function getMinPrice(pricing: Record<string, string> | null): number | null {
  if (!pricing) return null;
  const values = Object.values(pricing)
    .map((v) => parseFloat(v))
    .filter((n) => !isNaN(n));
  return values.length > 0 ? Math.min(...values) : null;
}

/* -------------------------------------------------
   Helper: relative "last seen" text
------------------------------------------------- */
function formatLastSeen(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return null;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* -------------------------------------------------
   Helper Components
------------------------------------------------- */
const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-48 w-full rounded-xl bg-surface-container-high" />
    <div className="h-4 w-3/4 rounded bg-surface-container-high" />
    <div className="h-4 w-1/2 rounded bg-surface-container-high" />
  </div>
);

const ErrorCard: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center gap-4 rounded-2xl p-8 glass-card border border-primary/25">
    <ShieldCheck className="text-primary" size={48} />
    <p className="text-lg font-semibold text-on-surface">{message}</p>
  </div>
);

const EmptyState = ({
  onReset,
}: {
  onReset: () => void;
}) => (
  <div className="flex flex-col items-center gap-6 py-16">
    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
      <Search className="text-primary/60" size={40} />
    </div>
    <div className="text-center space-y-2">
      <p className="text-base font-medium text-on-surface-variant">
        No mentors match your criteria.
      </p>
      <p className="text-sm text-on-surface-variant/70 max-w-md">
        Try adjusting your filters... we're adding new mentors regularly!
      </p>
    </div>
    <button
      onClick={onReset}
      className="px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition"
    >
      Reset All Filters
    </button>
  </div>
);

/* -------------------------------------------------
   Searchable Multi-Select Dropdown
------------------------------------------------- */
interface SearchableMultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

const SearchableMultiSelect: React.FC<SearchableMultiSelectProps> = ({
  label,
  options,
  selected,
  onChange,
  placeholder = "Search...",
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (item: string) => {
    onChange(
      selected.includes(item)
        ? selected.filter((s) => s !== item)
        : [...selected, item]
    );
  };

  return (
    <div ref={ref} className="relative">
      <label className="block mb-1.5 text-xs font-semibold uppercase text-on-surface-variant tracking-wider">
        {label}
        {selected.length > 0 && (
          <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold bg-primary text-white rounded-full px-1">
            {selected.length}
          </span>
        )}
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all ${
          open
            ? "border-primary bg-primary/5"
            : "border-white/10 bg-surface-container-high/30 hover:border-primary/30"
        }`}
      >
        <span className="text-on-surface-variant text-xs truncate">
          {selected.length === 0
            ? `Select ${label.toLowerCase()}`
            : `${selected.length} selected`}
        </span>
        <ChevronDown
          size={14}
          className={`text-on-surface-variant transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-surface-container-low border border-outline-variant/30 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
          {/* Search Input */}
          <div className="sticky top-0 bg-surface-container-low p-2 border-b border-outline-variant/20">
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50"
                size={13}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-surface-container-high/50 border border-outline-variant/20 pl-7 pr-3 py-1.5 rounded-lg text-xs focus:border-primary outline-none text-on-surface"
                autoFocus
              />
            </div>
          </div>

          {/* Options */}
          <div className="overflow-y-auto max-h-48 custom-scrollbar">
            {filtered.length === 0 && (
              <p className="px-3 py-2.5 text-xs text-on-surface-variant">
                No results found
              </p>
            )}
            {filtered.map((option) => {
              const isChecked = selected.includes(option);
              return (
                <label
                  key={option}
                  onClick={() => toggle(option)}
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-primary/10 cursor-pointer transition-colors"
                >
                  <div
                    className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                      isChecked
                        ? "bg-primary border-primary"
                        : "border-outline-variant/40"
                    }`}
                  >
                    {isChecked && (
                      <svg
                        viewBox="0 0 12 12"
                        className="w-2.5 h-2.5 text-white"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`text-xs ${isChecked ? "text-primary font-semibold" : "text-on-surface"}`}
                  >
                    {option}
                  </span>
                </label>
              );
            })}
          </div>

          {/* Clear Selection */}
          {selected.length > 0 && (
            <div className="border-t border-outline-variant/20 p-1.5">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full text-xs text-primary hover:bg-primary/10 rounded-lg py-1.5 transition-colors font-medium"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------
   Filter Section Divider
------------------------------------------------- */
const FilterDivider = () => (
  <div className="border-t border-white/5 -mx-6 px-6" />
);

/* -------------------------------------------------
   Star Renderer
------------------------------------------------- */
const StarRating: React.FC<{ rating: number | null }> = ({ rating }) => {
  if (rating === null || rating === undefined) return null;
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={12}
          className={
            i < fullStars
              ? "text-amber-400 fill-amber-400"
              : i === fullStars && hasHalf
                ? "text-amber-400 fill-amber-400/50"
                : "text-on-surface-variant/30"
          }
        />
      ))}
      <span className="text-xs ml-1 text-on-surface-variant font-medium">
        {rating.toFixed(1)}
      </span>
    </div>
  );
};

// ✅ STATIC complete class strings — Tailwind JIT can scan these at build time.
// DO NOT split into dynamic variables like `bg-${color}-500` — Tailwind won't detect those.
const examCategoryClass: Record<string, string> = {
  JEE:     "bg-blue-500/20 text-blue-300 ring-blue-500/40",
  NEET:    "bg-green-500/20 text-green-300 ring-green-500/40",
  CA:      "bg-purple-500/20 text-purple-300 ring-purple-500/40",
  UPSC:    "bg-orange-500/20 text-orange-300 ring-orange-500/40",
  CAT:     "bg-pink-500/20 text-pink-300 ring-pink-500/40",
  CLAT:    "bg-teal-500/20 text-teal-300 ring-teal-500/40",
  Banking: "bg-yellow-500/20 text-yellow-300 ring-yellow-500/40",
  Defense: "bg-red-500/20 text-red-300 ring-red-500/40",
  CUET:    "bg-indigo-500/20 text-indigo-300 ring-indigo-500/40",
};

const renderMentorBadge = (mentor: Mentor) => {
  const displayTag = mentor.mentor_tag
    ? (mentor.mentor_tag === "Other" ? (mentor.mentor_tag_other || "Other") : mentor.mentor_tag)
    : mentor.exam_category;

  if (!displayTag) return null;

  let cls = "bg-amber-500/20 text-amber-300 ring-amber-500/40";
  if (mentor.mentor_tag && examCategoryClass[mentor.mentor_tag]) {
    cls = examCategoryClass[mentor.mentor_tag];
  } else if (!mentor.mentor_tag && mentor.exam_category && examCategoryClass[mentor.exam_category]) {
    cls = examCategoryClass[mentor.exam_category];
  }

  return (
    <span
      className={`absolute top-6 right-6 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ring-1 shadow-sm ${cls}`}
    >
      {displayTag}
    </span>
  );
};

/* -------------------------------------------------
   Main Component
------------------------------------------------- */
interface FindMentorProps {
  setActiveTab: (tab: string) => void;
}

const FindMentor: React.FC<FindMentorProps> = ({ setActiveTab }) => {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search
  const [searchTerm, setSearchTerm] = useState("");

  // Filter states
  const [selectedExamCategory, setSelectedExamCategory] = useState("All");
  const [selectedColleges, setSelectedColleges] = useState<string[]>([]);
  const [selectedExamColleges, setSelectedExamColleges] = useState<string[]>([]);
  const [selectedExamBranches, setSelectedExamBranches] = useState<string[]>([]);
  const [dbInstitutions, setDbInstitutions] = useState<string[]>([]);
  const [dbExamBranches, setDbExamBranches] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<number | null>(null);
  const [freeIntroOnly, setFreeIntroOnly] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  // Branch list from DB
  const [dbBranches, setDbBranches] = useState<string[]>([]);

  // Master colleges list from public.colleges table
  const [collegesList, setCollegesList] = useState<string[]>([]);



  // Mobile filter toggle
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  /* ------------------- Data Fetch ------------------- */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      // Fetch mentors, branches, and master colleges list in parallel
      const [mentorRes, branchRes, collegesRes] = await Promise.all([
        supabase.from("mentors").select("*").eq('application_status', 'approved').eq('verified', true).order("id", { ascending: true }),
        supabase.from("branches").select("name").order("name", { ascending: true }),
        supabase.from("colleges").select("name").order("name", { ascending: true }),
      ]);

      if (mentorRes.error) {
        setError("Failed to load mentors. Please try again later.");
        setLoading(false);
        return;
      }

      setMentors(mentorRes.data as Mentor[]);

      if (branchRes.data) {
        setDbBranches(branchRes.data.map((b: { name: string }) => b.name));
      }

      if (collegesRes.data) {
        setCollegesList(collegesRes.data.map((c: { name: string }) => c.name));
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  /* ------------------- Fetch institutions from DB when exam category changes ------------------- */
  useEffect(() => {
    const fetchInstitutions = async () => {
      setDbInstitutions([]);
      if (selectedExamCategory === "All" || selectedExamCategory === "JEE") return;
      const { data, error } = await supabase
        .from("institutions")
        .select("name")
        .eq("exam_category", selectedExamCategory)
        .order("name", { ascending: true });
      if (!error && data) {
        const names = data.map((r: { name: string }) => r.name);
        // Always include "Other" as fallback if not already present
        setDbInstitutions(names.length > 0 ? (names.includes("Other") ? names : [...names, "Other"]) : ["Other"]);
      } else {
        setDbInstitutions(["Other"]);
      }
    };
    fetchInstitutions();
  }, [selectedExamCategory]);

  /* ------------------- Fetch exam branches from DB when exam category changes ------------------- */
  useEffect(() => {
    const fetchExamBranches = async () => {
      setDbExamBranches([]);
      if (selectedExamCategory === "All" || selectedExamCategory === "JEE") return;
      const { data, error } = await supabase
        .from("exam_branches")
        .select("name")
        .eq("exam_category", selectedExamCategory)
        .order("name", { ascending: true });
      if (!error && data) {
        const names = data.map((r: { name: string }) => r.name);
        setDbExamBranches(names.length > 0 ? (names.includes("Other") ? names : [...names, "Other"]) : ["Other"]);
      } else {
        setDbExamBranches(["Other"]);
      }
    };
    fetchExamBranches();
  }, [selectedExamCategory]);

  /* ------------------- College List (from master public.colleges table) ------------------- */
  // Options come from the master colleges table so the dropdown is always
  // fully populated, even before any mentors are verified.
  // Actual filtering still matches against mentors.college_name (see filteredMentors below).
  const allColleges = collegesList;

  /* ------------------- Filter Logic ------------------- */
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedExamCategory !== "All") count++;
    if (selectedColleges.length > 0 || selectedExamColleges.length > 0) count++;
    if (selectedBranches.length > 0 || selectedExamBranches.length > 0) count++;
    if (verifiedOnly) count++;
    if (selectedExpertise.length > 0) count++;
    if (selectedPriceRange !== null) count++;
    if (freeIntroOnly) count++;
    if (selectedLanguages.length > 0) count++;
    if (selectedRating !== null) count++;
    return count;
  }, [selectedColleges, selectedBranches, verifiedOnly, selectedExpertise, selectedPriceRange, freeIntroOnly, selectedLanguages, selectedRating]);

  const filteredMentors = useMemo(() => {
    const filtered = mentors.filter((m) => {
      // Text search — matches name, college, branch
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !term ||
        (m.full_name || "").toLowerCase().includes(term) ||
        (m.college_name || "").toLowerCase().includes(term) ||
        (m.branch || "").toLowerCase().includes(term);

      // 0. Exam Category
      const matchesExamCategory =
        selectedExamCategory === "All" ||
        (m.exam_category || "").toUpperCase() === selectedExamCategory.toUpperCase();

      // 1. College filter (OR within) — JEE uses college_name, others use target_college
      const matchesCollege =
        selectedColleges.length === 0 ||
        selectedColleges.includes(m.college_name);

      // 1b. Exam College filter for non-JEE categories
      const matchesExamCollege =
        selectedExamColleges.length === 0 ||
        selectedExamColleges.some(
          (sel) => (m.target_college || "").toLowerCase() === sel.toLowerCase()
        );

      // 2. Branch filter (OR within)
      const matchesBranch =
        selectedBranches.length === 0 ||
        selectedBranches.includes(m.branch);

      // 2b. Exam Branch filter for non-JEE categories
      const matchesExamBranch =
        selectedExamBranches.length === 0 ||
        selectedExamBranches.some(
          (sel) => (m.exam_branch || "").toLowerCase() === sel.toLowerCase()
        );

      // 3. Verified
      const matchesVerified = !verifiedOnly || m.verified;

      // 4. Expertise (OR — ANY overlap)
      const matchesExpertise =
        selectedExpertise.length === 0 ||
        (m.areas_of_expertise &&
          m.areas_of_expertise.some((e) => {
            if (selectedExpertise.includes(e)) return true;
            if (selectedExpertise.includes("Other")) {
              // Matches if mentor has custom expertise not in preset 15
              if (!PRESET_EXPERTISE_OPTIONS.includes(e as any)) return true;
            }
            return false;
          })) ||
        (selectedExpertise.includes("Other") && !!m.expertise_other);

      // 5. Price range
      let matchesPrice = true;
      if (selectedPriceRange !== null) {
        const range = PRICE_RANGES[selectedPriceRange];
        const minPrice = getMinPrice(m.pricing);
        matchesPrice =
          minPrice !== null && minPrice >= range.min && minPrice <= range.max;
      }

      // 6. Free intro session
      const matchesFreeIntro = !freeIntroOnly || m.free_intro_session;

      // 7. Language (OR within)
      const matchesLanguage =
        selectedLanguages.length === 0 ||
        (m.languages_known &&
          m.languages_known.some((l) => selectedLanguages.includes(l)));

      // 8. Rating
      let matchesRating = true;
      if (selectedRating !== null) {
        if (selectedRating === 5) {
          matchesRating = m.rating !== null && m.rating === 5;
        } else {
          matchesRating = m.rating !== null && m.rating >= selectedRating;
        }
      }

      // AND across all categories
      return (
        matchesSearch &&
        matchesExamCategory &&
        matchesCollege &&
        matchesExamCollege &&
        matchesBranch &&
        matchesExamBranch &&
        matchesVerified &&
        matchesExpertise &&
        matchesPrice &&
        matchesFreeIntro &&
        matchesLanguage &&
        matchesRating
      );
    });

    // Pagination
    const startIdx = (currentPage - 1) * pageSize;
    return filtered.slice(startIdx, startIdx + pageSize);
  }, [
    mentors,
    searchTerm,
    selectedExamCategory,
    selectedColleges,
    selectedExamColleges,
    selectedBranches,
    selectedExamBranches,
    verifiedOnly,
    selectedExpertise,
    selectedPriceRange,
    freeIntroOnly,
    selectedLanguages,
    selectedRating,
    currentPage,
  ]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedExamCategory, selectedColleges, selectedExamColleges, selectedBranches, selectedExamBranches, verifiedOnly, selectedExpertise, selectedPriceRange, freeIntroOnly, selectedLanguages, selectedRating]);

  const resetAll = useCallback(() => {
    setSearchTerm("");
    setSelectedExamCategory("All");
    setSelectedExamColleges([]);
    setSelectedExamBranches([]);
    setSelectedColleges([]);
    setSelectedBranches([]);
    setVerifiedOnly(false);
    setSelectedExpertise([]);
    setSelectedPriceRange(null);
    setFreeIntroOnly(false);
    setSelectedLanguages([]);
    setSelectedRating(null);
  }, []);

  /* ------------------- Online Mentors (derived from full list) ------------------- */
  const onlineMentors = useMemo(() => mentors.filter(m => m.is_online), [mentors]);

  /* ------------------- UI ------------------- */
  return (
    <div className="min-h-screen bg-background py-10">

      {/* 🟢 Online Mentors Quick-Access Row — above the sidebar+grid layout */}
      {!loading && onlineMentors.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-8">
          <div className="glass-card rounded-2xl p-5 border border-green-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-green-500/5 rounded-full blur-[60px] pointer-events-none"></div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-green-400 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Online Now
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar -mx-1 px-1">
              {onlineMentors.map((mentor) => (
                <div
                  key={mentor.id}
                  onClick={() => setActiveTab("mentor-profile/" + mentor.id)}
                  className="flex-shrink-0 w-48 bg-surface-container-low/60 border border-white/5 rounded-xl p-4 cursor-pointer hover:border-green-500/30 hover:-translate-y-0.5 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="relative">
                      <img
                        src={mentor.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(mentor.full_name || "M")}`}
                        alt={mentor.full_name}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?size=128&background=cccccc&color=ffffff&name=${encodeURIComponent(mentor.full_name || "M")}`; }}
                        className="h-10 w-10 rounded-full object-cover border-2 border-green-500/40"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-surface-container-low"></span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{mentor.full_name}</p>
                      <p className="text-[10px] text-green-400 font-medium">Online</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-on-surface-variant truncate">
                    {mentor.college_name}
                  </p>
                  {mentor.rating !== null && (
                    <div className="mt-1">
                      <StarRating rating={mentor.rating} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col lg:flex-row gap-8">
        {/* Mobile Filter Toggle */}
        <button
          type="button"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="lg:hidden flex items-center gap-2 glass-card rounded-xl px-4 py-3 border border-white/10 w-full justify-center"
        >
          <Filter size={16} className="text-primary" />
          <span className="text-sm font-semibold">Filters</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 text-[10px] font-bold bg-primary text-white rounded-full px-1.5">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* ---- Sidebar ---- */}
        <aside className={`w-full lg:w-72 flex-shrink-0 ${filtersOpen ? "block" : "hidden lg:block"}`}>
          <div className="glass-card rounded-2xl p-6 sticky top-24 space-y-5 border border-white/10 max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="text-primary" size={16} />
                <h3 className="font-bold text-lg">Filters</h3>
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 text-[10px] font-bold bg-primary text-white rounded-full px-1.5">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetAll}
                  className="text-xs text-primary hover:text-primary/80 font-medium transition"
                >
                  Reset All
                </button>
              )}
            </div>

            
            {/* 0. Exam Category Filter */}
            <div>
              <label className="block mb-2 text-xs font-semibold uppercase text-on-surface-variant tracking-wider">
                Exam Category
              </label>
              <select
                value={selectedExamCategory}
                onChange={(e) => setSelectedExamCategory(e.target.value)}
                className="w-full bg-surface-container-high/50 border border-outline-variant/30 px-4 py-2.5 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface"
              >
                <option value="All">All Exams</option>
                {["JEE", "NEET", "CA", "CAT", "UPSC", "CLAT", "Banking", "Defense", "CUET", "Freelancing", "Web Development", "Digital Marketing", "DSA (Data Structures & Algorithms)", "Content Creation", "Entrepreneurship", "Startup Building", "Software Development", "Career Development", "Career Switching", "Job Search", "Other"].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <FilterDivider />

            {/* 1. College & Branch (Conditional) */}
            {selectedExamCategory === "JEE" && (
              <>
                <SearchableMultiSelect
                  label="College / University"
                  options={allColleges}
                  selected={selectedColleges}
                  onChange={setSelectedColleges}
                  placeholder="Search colleges..."
                />
                <FilterDivider />
                <SearchableMultiSelect
                  label="Branch"
                  options={dbBranches}
                  selected={selectedBranches}
                  onChange={setSelectedBranches}
                  placeholder="Search branches..."
                />
                <FilterDivider />
              </>
            )}

            {(selectedExamCategory !== "All" && selectedExamCategory !== "JEE" && !["Freelancing", "Web Development", "Digital Marketing", "DSA (Data Structures & Algorithms)", "Content Creation", "Entrepreneurship", "Startup Building", "Software Development", "Career Development", "Career Switching", "Job Search"].includes(selectedExamCategory)) && (
              <>
                <SearchableMultiSelect
                  label="College / Institution"
                  options={dbInstitutions}
                  selected={selectedExamColleges}
                  onChange={setSelectedExamColleges}
                  placeholder="Search colleges..."
                />
                <FilterDivider />
                <SearchableMultiSelect
                  label="Branch / Specialization"
                  options={dbExamBranches}
                  selected={selectedExamBranches}
                  onChange={setSelectedExamBranches}
                  placeholder="Search branches..."
                />
                <FilterDivider />
              </>
            )}


            {/* 3. Verified Only — Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-green-400" />
                <span className="text-xs font-semibold uppercase text-on-surface-variant tracking-wider">
                  Verified Only
                </span>
              </div>
              <button
                type="button"
                onClick={() => setVerifiedOnly((v) => !v)}
                className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                  verifiedOnly ? "bg-primary" : "bg-surface-container-highest"
                }`}
                aria-checked={verifiedOnly}
                role="switch"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    verifiedOnly ? "translate-x-5" : "translate-x-0.5"
                  } mt-0.5`}
                />
              </button>
            </div>

            <FilterDivider />

            {/* 4. Expertise / Topic — Multi-Select Checkboxes */}
            <div>
              <label className="block mb-2 text-xs font-semibold uppercase text-on-surface-variant tracking-wider">
                Expertise / Topic
                {selectedExpertise.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold bg-primary text-white rounded-full px-1">
                    {selectedExpertise.length}
                  </span>
                )}
              </label>
              <div className="space-y-1.5">
                {EXPERTISE_OPTIONS.map((topic) => {
                  const isChecked = selectedExpertise.includes(topic);
                  return (
                    <label
                      key={topic}
                      className="flex items-center gap-2.5 cursor-pointer group"
                    >
                      <div
                        className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                          isChecked
                            ? "bg-primary border-primary"
                            : "border-outline-variant/40 group-hover:border-primary/50"
                        }`}
                      >
                        {isChecked && (
                          <svg
                            viewBox="0 0 12 12"
                            className="w-2.5 h-2.5 text-white"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path d="M2 6l3 3 5-5" />
                          </svg>
                        )}
                      </div>
                      <span
                        className={`text-xs transition-colors ${
                          isChecked
                            ? "text-primary font-semibold"
                            : "text-on-surface-variant group-hover:text-on-surface"
                        }`}
                        onClick={() => {
                          setSelectedExpertise((prev) =>
                            prev.includes(topic)
                              ? prev.filter((t) => t !== topic)
                              : [...prev, topic]
                          );
                        }}
                      >
                        {topic}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <FilterDivider />

            {/* 5. Price Range — Radio */}
            <div>
              <label className="block mb-2 text-xs font-semibold uppercase text-on-surface-variant tracking-wider">
                Price Range
              </label>
              <div className="space-y-1.5">
                {PRICE_RANGES.map((range, idx) => (
                  <label
                    key={range.label}
                    className="flex items-center gap-2.5 cursor-pointer group"
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        selectedPriceRange === idx
                          ? "border-primary"
                          : "border-outline-variant/40 group-hover:border-primary/50"
                      }`}
                    >
                      {selectedPriceRange === idx && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <span
                      className={`text-xs transition-colors ${
                        selectedPriceRange === idx
                          ? "text-primary font-semibold"
                          : "text-on-surface-variant group-hover:text-on-surface"
                      }`}
                      onClick={() =>
                        setSelectedPriceRange(
                          selectedPriceRange === idx ? null : idx
                        )
                      }
                    >
                      {range.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <FilterDivider />

            {/* 6. Free Intro Session — Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift size={14} className="text-amber-400" />
                <span className="text-xs font-semibold uppercase text-on-surface-variant tracking-wider">
                  Free Intro Session
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFreeIntroOnly((v) => !v)}
                className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                  freeIntroOnly ? "bg-primary" : "bg-surface-container-highest"
                }`}
                aria-checked={freeIntroOnly}
                role="switch"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    freeIntroOnly ? "translate-x-5" : "translate-x-0.5"
                  } mt-0.5`}
                />
              </button>
            </div>

            <FilterDivider />

            {/* 7. Language — Multi-Select Checkboxes */}
            <div>
              <label className="block mb-2 text-xs font-semibold uppercase text-on-surface-variant tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Globe size={13} className="text-on-surface-variant" />
                  Language
                  {selectedLanguages.length > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold bg-primary text-white rounded-full px-1">
                      {selectedLanguages.length}
                    </span>
                  )}
                </div>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {LANGUAGE_OPTIONS.map((lang) => {
                  const isChecked = selectedLanguages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() =>
                        setSelectedLanguages((prev) =>
                          prev.includes(lang)
                            ? prev.filter((l) => l !== lang)
                            : [...prev, lang]
                        )
                      }
                      className={`px-2.5 py-1 text-[11px] rounded-full border transition-all ${
                        isChecked
                          ? "bg-primary/20 border-primary text-primary font-semibold"
                          : "bg-surface-container-high/30 border-white/10 text-on-surface-variant hover:border-primary/30"
                      }`}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
            </div>

            <FilterDivider />

            {/* 8. Rating — Radio */}
            <div>
              <label className="block mb-2 text-xs font-semibold uppercase text-on-surface-variant tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Star size={13} className="text-amber-400" />
                  Rating
                </div>
              </label>
              <div className="space-y-1.5">
                {RATING_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2.5 cursor-pointer group"
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        selectedRating === opt.value
                          ? "border-primary"
                          : "border-outline-variant/40 group-hover:border-primary/50"
                      }`}
                    >
                      {selectedRating === opt.value && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <span
                      className={`text-xs flex items-center gap-1 transition-colors ${
                        selectedRating === opt.value
                          ? "text-primary font-semibold"
                          : "text-on-surface-variant group-hover:text-on-surface"
                      }`}
                      onClick={() =>
                        setSelectedRating(
                          selectedRating === opt.value ? null : opt.value
                        )
                      }
                    >
                      {opt.label}
                      <div className="flex items-center gap-px ml-0.5">
                        {[...Array(opt.value)].map((_, i) => (
                          <Star
                            key={i}
                            size={10}
                            className="text-amber-400 fill-amber-400"
                          />
                        ))}
                      </div>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* ---- Main Content ---- */}
        <main className="flex-1 space-y-6">
          {/* Search Bar */}
          <div className="glass-card flex items-center gap-3 rounded-2xl p-4 border border-white/10">
            <Search className="text-on-surface-variant" size={20} />
            <input
              type="text"
              placeholder="Search mentors by name, college, or branch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent text-on-surface placeholder-on-surface-variant/50 focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="text-on-surface-variant hover:text-primary transition"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Active Filters Summary */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-on-surface-variant">Active:</span>
              {selectedColleges.map((c) => (
                <span key={c} className="filter-pill">
                  {c}
                  <button onClick={() => setSelectedColleges((p) => p.filter((x) => x !== c))}><X size={10} /></button>
                </span>
              ))}
              {selectedBranches.map((b) => (
                <span key={b} className="filter-pill">
                  {b}
                  <button onClick={() => setSelectedBranches((p) => p.filter((x) => x !== b))}><X size={10} /></button>
                </span>
              ))}
              {verifiedOnly && (
                <span className="filter-pill">
                  Verified
                  <button onClick={() => setVerifiedOnly(false)}><X size={10} /></button>
                </span>
              )}
              {selectedExpertise.map((e) => (
                <span key={e} className="filter-pill">
                  {e}
                  <button onClick={() => setSelectedExpertise((p) => p.filter((x) => x !== e))}><X size={10} /></button>
                </span>
              ))}
              {selectedPriceRange !== null && (
                <span className="filter-pill">
                  {PRICE_RANGES[selectedPriceRange].label}
                  <button onClick={() => setSelectedPriceRange(null)}><X size={10} /></button>
                </span>
              )}
              {freeIntroOnly && (
                <span className="filter-pill">
                  Free Intro
                  <button onClick={() => setFreeIntroOnly(false)}><X size={10} /></button>
                </span>
              )}
              {selectedLanguages.map((l) => (
                <span key={l} className="filter-pill">
                  {l}
                  <button onClick={() => setSelectedLanguages((p) => p.filter((x) => x !== l))}><X size={10} /></button>
                </span>
              ))}
              {selectedRating !== null && (
                <span className="filter-pill">
                  {selectedRating}★+
                  <button onClick={() => setSelectedRating(null)}><X size={10} /></button>
                </span>
              )}
              <button
                onClick={resetAll}
                className="text-[10px] text-primary hover:underline font-medium ml-1"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <LoadingSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Error */}
          {error && <ErrorCard message={error} />}

          {/* Mentor Grid */}
          {!loading && !error && filteredMentors.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredMentors.map((mentor) => (
                <div
                  key={mentor.id}
                  onClick={() => setActiveTab("mentor-profile/" + mentor.id)}
                  className="glass-card relative rounded-2xl p-6 border border-white/5 flex flex-col justify-between hover:-translate-y-1 transition-all cursor-pointer group"
                >
                  {renderMentorBadge(mentor)}
                  {/* Header */}
                  <div className="flex gap-4">
                    <img
                      src={
                        mentor.profile_photo_url ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          mentor.full_name || "M"
                        )}`
                      }
                      alt={mentor.full_name}
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.src =
                          "https://ui-avatars.com/api/?size=128&background=cccccc&color=ffffff&name=" +
                          encodeURIComponent(mentor.full_name || "M");
                      }}
                      className="h-14 w-14 rounded-full border-2 border-primary object-cover"
                    />
                    <div className="flex flex-col justify-center min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-on-surface truncate">
                          {mentor.full_name}
                        </h4>
                        {mentor.verified && (
                          <ShieldCheck
                            size={16}
                            className="text-primary fill-primary/10 flex-shrink-0"
                          />
                        )}
                        {mentor.is_online && (
                          <span className="flex-shrink-0 flex items-center gap-1 bg-green-500/15 text-green-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            Online
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant truncate">
                        {mentor.current_organization ? (
                          `${mentor.current_organization}${mentor.years_of_experience ? ` • ${mentor.years_of_experience} exp` : ''}`
                        ) : (
                          `${mentor.college_name || ''}${mentor.college_name && (mentor.branch || mentor.ca_stage || mentor.upsc_stage || mentor.target_exam || mentor.target_college || mentor.other_exam) ? ' • ' : ''}${
                            mentor.exam_category === 'CA' ? mentor.ca_stage :
                            mentor.exam_category === 'UPSC' ? mentor.upsc_stage :
                            (mentor.exam_category === 'Banking' || mentor.exam_category === 'Defense') ? mentor.target_exam :
                            mentor.exam_category === 'CUET' ? mentor.target_college :
                            mentor.exam_category === 'Other' ? mentor.other_exam :
                            mentor.branch || ''
                          }`
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {mentor.graduation_year ? (
                          <p className="text-xs text-primary">
                            Grad {mentor.graduation_year}
                          </p>
                        ) : mentor.years_of_experience ? (
                          <p className="text-xs text-primary">
                            Exp {mentor.years_of_experience}
                          </p>
                        ) : null}
                        {mentor.rating !== null && (
                          <StarRating rating={mentor.rating} />
                        )}
                        {!mentor.is_online && mentor.last_online_at && (
                          <span className="text-[10px] text-on-surface-variant/60">Last seen {formatLastSeen(mentor.last_online_at)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {mentor.current_organization ? (mentor.years_of_experience ? `${mentor.years_of_experience} exp` : mentor.exam_category) :
                 mentor.exam_category === 'CA' ? mentor.ca_stage :
                 mentor.exam_category === 'UPSC' ? mentor.upsc_stage :
                 (mentor.exam_category === 'Banking' || mentor.exam_category === 'Defense') ? mentor.target_exam :
                 mentor.exam_category === 'CUET' ? mentor.target_college :
                 mentor.exam_category === 'Other' ? mentor.other_exam :
                 mentor.branch || mentor.exam_category}
                    </span>
                    {mentor.verified && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                        Verified
                      </span>
                    )}
                    {mentor.free_intro_session && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                        Free Intro
                      </span>
                    )}
                    {mentor.areas_of_expertise &&
                      mentor.areas_of_expertise.slice(0, 2).map((exp) => (
                        <span
                          key={exp}
                          className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary-container/20 text-secondary"
                        >
                          {exp}
                        </span>
                      ))}
                    {mentor.areas_of_expertise &&
                      mentor.areas_of_expertise.length > 2 && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
                          +{mentor.areas_of_expertise.length - 2}
                        </span>
                      )}
                  </div>

                  {/* Languages */}
                  {mentor.languages_known && mentor.languages_known.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <Globe size={11} className="text-on-surface-variant/50" />
                      <span className="text-[11px] text-on-surface-variant/70">
                        {mentor.languages_known.join(", ")}
                      </span>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t border-outline-variant/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-on-surface-variant">Starting at</p>
                      <p className="text-base font-extrabold text-on-surface">
                        {getMinPrice(mentor.pricing) !== null
                          ? `₹${getMinPrice(mentor.pricing)}`
                          : "—"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {mentor.linkedin_url && (
                        <a
                          href={mentor.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full hover:bg-blue-700 transition"
                        >
                          LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && !error && filteredMentors.length === 0 && (
            <EmptyState onReset={resetAll} />
          )}
        </main>
      </div>


    </div>
  );
};

export { FindMentor };
