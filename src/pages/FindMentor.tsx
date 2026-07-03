import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  Search,
  ShieldCheck,
  Calendar,
  X,
} from "lucide-react";
import { supabase } from "../supabase";

/* -------------------------------------------------
   Types
------------------------------------------------- */
interface Mentor {
  id: string;
  user_id: string | null;
  college_id: string | null;
  name: string;
  email: string;
  college: string;
  branch: string;
  year: number;
  bio: string;
  experience: string;
  linkedin: string;
  price: number;
  image_url: string;
  verified: boolean;
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
    <img
      src="https://img.icons8.com/ios-filled/200/000000/empty-box.png"
      alt="Empty"
      className="w-32 h-32 opacity-70"
    />
    <p className="text-base font-medium text-on-surface-variant">
      No mentors match your criteria.
    </p>
    <button
      onClick={onReset}
      className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition"
    >
      Reset Filters
    </button>
  </div>
);

/* -------------------------------------------------
   Main Component
------------------------------------------------- */
const FindMentor: React.FC = () => {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [bookingMentor, setBookingMentor] = useState<Mentor | null>(null);

  // Future‑ready pagination state (UI not rendered yet)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12; // can be adjusted later

  /* ------------------- Data Fetch ------------------- */
  useEffect(() => {
    const fetchMentors = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("mentors")
        .select("*")
        .order("id", { ascending: true });

      if (error) {
        setError("Failed to load mentors. Please try again later.");
        setLoading(false);
        return;
      }

      setMentors(data as Mentor[]);
      setLoading(false);
    };

    fetchMentors();
  }, []);

  /* ------------------- Dynamic Branch List ------------------- */
  const allBranches = useMemo(() => {
    const branchSet = new Set<string>();
    mentors.forEach((m) => branchSet.add(m.branch));
    return Array.from(branchSet).sort();
  }, [mentors]);

  const toggleBranch = useCallback((branch: string) => {
    setSelectedBranches((prev) =>
      prev.includes(branch) ? prev.filter((b) => b !== branch) : [...prev, branch]
    );
  }, []);

  const filteredMentors = useMemo(() => {
    // Apply pagination after all other filters for future‑ready handling
    const filtered = mentors.filter((m) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        m.name.toLowerCase().includes(term) ||
        m.college.toLowerCase().includes(term) ||
        m.branch.toLowerCase().includes(term);

      const matchesBranch =
        selectedBranches.length === 0 || selectedBranches.includes(m.branch);

      const matchesVerified = !verifiedOnly || m.verified;

      return matchesSearch && matchesBranch && matchesVerified;
    });

    // Pagination slice (will be used when pagination UI is added)
    const startIdx = (currentPage - 1) * pageSize;
    return filtered.slice(startIdx, startIdx + pageSize);
  }, [mentors, searchTerm, selectedBranches, verifiedOnly, currentPage]);

  const resetAll = () => {
    setSearchTerm("");
    setSelectedBranches([]);
    setVerifiedOnly(false);
  };

  /* ------------------- UI ------------------- */
  return (
    <div className="min-h-screen bg-background py-10">
      <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row gap-8">
        {/* ---- Sidebar ---- */}
        <aside className="w-full lg:w-72 flex-shrink-0">
          <div className="glass-card rounded-2xl p-6 sticky top-24 space-y-6 border border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xl">Filters</h3>
              <Search className="text-primary" size={18} />
            </div>

            {/* Verified Only */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-on-surface-variant">
                Verified Only
              </span>
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
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    verifiedOnly ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Branches (dynamic) */}
            <div>
              <label className="block mb-2 text-xs font-semibold uppercase text-on-surface-variant">
                Branch
              </label>
              <div className="flex flex-wrap gap-2">
                {allBranches.map((branch) => {
                  const selected = selectedBranches.includes(branch);
                  return (
                    <button
                      key={branch}
                      type="button"
                      onClick={() => toggleBranch(branch)}
                      className={`px-3 py-1 text-xs rounded-full border transition ${
                        selected
                          ? "bg-primary/20 border-primary text-primary"
                          : "bg-surface-container-high border-white/10 text-on-surface-variant hover:border-primary/30"
                      }`}
                    >
                      {branch}
                    </button>
                  );
                })}
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
          </div>

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
                  className="glass-card relative rounded-2xl p-6 border border-white/5 flex flex-col justify-between hover:-translate-y-1 transition-all"
                >
                  {/* Header */}
                  <div className="flex gap-4">
                    <img
                      src={
                        mentor.image_url ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          mentor.name
                        )}`
                      }
                      alt={mentor.name}
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.src =
                          "https://ui-avatars.com/api/?size=128&background=cccccc&color=ffffff&name=" +
                          encodeURIComponent(mentor.name);
                      }}
                      className="h-14 w-14 rounded-full border-2 border-primary object-cover"
                    />
                    <div className="flex flex-col justify-center">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-on-surface">
                          {mentor.name}
                        </h4>
                        {mentor.verified && (
                          <ShieldCheck
                            size={16}
                            className="text-primary fill-primary/10"
                          />
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant">
                        {mentor.college} • {mentor.branch}
                      </p>
                      <p className="text-xs text-primary">
                        {mentor.year} Year
                      </p>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {mentor.branch}
                    </span>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary-container/20 text-secondary">
                      {mentor.experience}
                    </span>
                    {mentor.verified && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                        Verified
                      </span>
                    )}
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-surface-container-high text-on-surface-variant">
                      New Mentor
                    </span>
                  </div>

                  {/* Bio */}
                  <p className="mt-3 text-sm text-on-surface-variant line-clamp-3">
                    {mentor.bio}
                  </p>

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t border-outline-variant/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-on-surface-variant">Rate</p>
                      <p className="text-base font-extrabold text-on-surface">
                        ₹{mentor.price}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {/* LinkedIn Button */}
                      {mentor.linkedin && (
                        <a
                          href={mentor.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full hover:bg-blue-700 transition"
                        >
                          LinkedIn
                        </a>
                      )}
                      {/* Connect Call */}
                      <button
                        onClick={() => setBookingMentor(mentor)}
                        className="brand-gradient-bg hover:scale-105 active:scale-95 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all"
                      >
                        Connect Call
                      </button>
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

      {/* ---- Booking Modal ---- */}
      {bookingMentor && (
        <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50 p-4">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 border border-primary/25 space-y-6 relative">
            <button
              type="button"
              onClick={() => setBookingMentor(null)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-primary transition"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-4">
              <img
                src={bookingMentor.image_url}
                alt={bookingMentor.name}
                className="h-12 w-12 rounded-full border-2 border-primary object-cover"
              />
              <div>
                <h4 className="font-bold text-lg">{bookingMentor.name}</h4>
                <p className="text-sm text-on-surface-variant">
                  {bookingMentor.college} • {bookingMentor.branch}
                </p>
                <p className="text-sm text-primary">
                  {bookingMentor.year} Year
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-on-surface flex items-center gap-1">
                <Calendar size={16} className="text-primary" />
                Session Price: <span className="ml-1 font-bold">₹{bookingMentor.price}</span>
              </p>
              <p className="text-sm text-on-surface-variant line-clamp-3">
                {bookingMentor.bio}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {/* TODO: Integrate Razorpay here */}
              <button
                type="button"
                className="w-full py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                onClick={() => {
                  // Placeholder for future Razorpay integration
                  console.warn("Razorpay integration pending");
                }}
              >
                Pay & Book Session
              </button>
              <button
                type="button"
                className="w-full py-2 px-4 border border-primary text-primary rounded-lg hover:bg-primary/10 transition"
                onClick={() => setBookingMentor(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { FindMentor };
