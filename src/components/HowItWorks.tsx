import { useRef, useState, useEffect } from "react";
import type { MouseEvent } from "react";
import { motion, useInView } from "framer-motion";
import {
  Search,
  Users,
  Calendar,
  Video,
  MessageSquare,
  BadgeCheck,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Step {
  id: string;
  label: string;
  title: string;
  description: string;
  Icon: React.FC<{ size?: number; className?: string }>;
  iconGradient: string;
  glowColor: string;
  borderColor: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const STEPS: Step[] = [
  {
    id: "step-01",
    label: "STEP 01",
    title: "Search",
    description: "Find colleges or specific branches.",
    Icon: Search,
    iconGradient: "from-orange-500 to-pink-500",
    glowColor: "rgba(249,115,22,0.5)",
    borderColor: "rgba(249,115,22,0.5)",
  },
  {
    id: "step-02",
    label: "STEP 02",
    title: "Filter",
    description: "Pick mentors by branch or rank.",
    Icon: Users,
    iconGradient: "from-pink-500 to-rose-500",
    glowColor: "rgba(236,72,153,0.5)",
    borderColor: "rgba(236,72,153,0.45)",
  },
  {
    id: "step-03",
    label: "STEP 03",
    title: "Book",
    description: "Choose a time slot that works.",
    Icon: Calendar,
    iconGradient: "from-rose-500 to-purple-500",
    glowColor: "rgba(168,85,247,0.4)",
    borderColor: "rgba(168,85,247,0.4)",
  },
  {
    id: "step-04",
    label: "STEP 04",
    title: "Connect",
    description: "Join a 1-on-1 private video call.",
    Icon: Video,
    iconGradient: "from-purple-500 to-violet-500",
    glowColor: "rgba(139,92,246,0.45)",
    borderColor: "rgba(139,92,246,0.45)",
  },
  {
    id: "step-05",
    label: "STEP 05",
    title: "Ask",
    description: "Get all your doubts cleared.",
    Icon: MessageSquare,
    iconGradient: "from-violet-500 to-pink-500",
    glowColor: "rgba(167,139,250,0.45)",
    borderColor: "rgba(167,139,250,0.45)",
  },
  {
    id: "step-06",
    label: "STEP 06",
    title: "Decide",
    description: "Lock your college with confidence.",
    Icon: BadgeCheck,
    iconGradient: "from-pink-500 to-purple-600",
    glowColor: "rgba(236,72,153,0.5)",
    borderColor: "rgba(236,72,153,0.5)",
  },
];

// ─── Spotlight Card ───────────────────────────────────────────────────────────

interface SpotlightCardProps {
  step: Step;
  index: number;
  isInView: boolean;
}

function SpotlightCard({ step, index, isInView }: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [spotlight, setSpotlight] = useState({ x: "50%", y: "50%" });
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = `${e.clientX - rect.left}px`;
    const y = `${e.clientY - rect.top}px`;
    setSpotlight({ x, y });
  };

  return (
    <motion.div
      ref={cardRef}
      id={step.id}
      role="article"
      aria-label={`${step.label}: ${step.title}`}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative rounded-2xl p-px cursor-pointer overflow-hidden"
      style={{
        background: hovered
          ? `linear-gradient(135deg, ${step.borderColor}, transparent 60%)`
          : "transparent",
        boxShadow: hovered ? `0 0 32px ${step.glowColor}` : "none",
        transition: "box-shadow 0.5s ease, background 0.5s ease",
      }}
    >
      {/* Spotlight overlay */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(200px circle at ${spotlight.x} ${spotlight.y}, ${step.glowColor.replace("0.5", "0.12")}, transparent 70%)`,
        }}
        aria-hidden="true"
      />

      {/* Card body */}
      <div
        className="relative z-10 flex flex-col gap-4 rounded-2xl p-6 h-full"
        style={{
          background:
            "linear-gradient(135deg, rgba(18,18,22,0.95) 0%, rgba(12,12,16,0.98) 100%)",
          backdropFilter: "blur(20px)",
          border: `1px solid ${hovered ? step.borderColor : "rgba(255,255,255,0.06)"}`,
          transform: hovered ? "translateY(-10px) scale(1.05)" : "none",
          transition:
            "transform 0.5s ease, border-color 0.5s ease",
        }}
      >
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: hovered
              ? `linear-gradient(135deg, ${step.iconGradient.replace("from-", "").replace(" to-", ", ")})`
              : "rgba(255,255,255,0.06)",
            boxShadow: hovered ? `0 0 20px ${step.glowColor}` : "none",
            transition: "background 0.5s ease, box-shadow 0.5s ease",
            transform: hovered ? "rotate(6deg)" : "none",
          }}
        >
          <step.Icon
            size={22}
            className={`transition-all duration-500 ${
              hovered ? "text-white" : "text-white/60"
            }`}
          />
        </div>

        {/* Step label */}
        <span
          className="text-[10px] font-extrabold tracking-[0.2em] uppercase"
          style={{ color: hovered ? "#f97316" : "rgba(249,115,22,0.7)" }}
        >
          {step.label}
        </span>

        {/* Title */}
        <h3
          className="text-xl font-bold leading-tight transition-all duration-500"
          style={{
            background: hovered
              ? "linear-gradient(90deg, #f97316, #ec4899, #a855f7)"
              : "none",
            WebkitBackgroundClip: hovered ? "text" : "unset",
            WebkitTextFillColor: hovered ? "transparent" : "white",
            backgroundClip: hovered ? "text" : "unset",
          }}
        >
          {step.title}
        </h3>

        {/* Description */}
        <p className="text-sm leading-relaxed text-white/50 group-hover:text-white/70 transition-colors duration-500">
          {step.description}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Animated Connector Line ─────────────────────────────────────────────────

function ConnectorLine({ isInView }: { isInView: boolean }) {
  return (
    <div
      className="hidden lg:block absolute top-[3.75rem] left-0 right-0 h-px pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={isInView ? { scaleX: 1, opacity: 1 } : {}}
        transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
        className="w-full h-full origin-left"
        style={{
          background:
            "linear-gradient(90deg, rgba(249,115,22,0.6) 0%, rgba(236,72,153,0.6) 40%, rgba(168,85,247,0.6) 70%, rgba(236,72,153,0.4) 100%)",
          boxShadow: "0 0 8px rgba(236,72,153,0.3)",
          borderRadius: "9999px",
        }}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

  // Prevent hydration issues with framer-motion
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      aria-label="How it works — your journey to the right choice"
      className="relative w-full overflow-hidden"
      style={{ background: "#08080B" }}
    >
      {/* Ambient radial glows */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(168,85,247,0.12) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 left-1/4 w-[400px] h-[300px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(249,115,22,0.08) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-[400px] h-[300px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(236,72,153,0.08) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 lg:py-32">

        {/* ── Heading ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={mounted && isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-20 space-y-5"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={mounted && isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-block px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase"
            style={{
              background: "rgba(168,85,247,0.1)",
              border: "1px solid rgba(168,85,247,0.3)",
              color: "#c084fc",
            }}
          >
            The Process
          </motion.span>

          <h2 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold leading-tight tracking-tight">
            <span className="text-white">Your Journey to the </span>
            <span
              style={{
                background: "linear-gradient(90deg, #f97316, #ec4899, #a855f7)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Right Choice
            </span>
          </h2>

          <p className="text-white/50 text-lg max-w-xl mx-auto leading-relaxed">
            Follow our verified 6-step flow to get the clarity you need before
            admission.
          </p>
        </motion.div>

        {/* ── Journey Cards ── */}
        <div className="relative">
          {/* Connecting line (desktop only) */}
          {mounted && <ConnectorLine isInView={isInView} />}

          {/* Cards grid */}
          <div
            className="
              grid gap-5
              grid-cols-1
              sm:grid-cols-2 sm:gap-4
              md:grid-cols-3 md:gap-5
              lg:grid-cols-6 lg:gap-4
            "
          >
            {STEPS.map((step, i) => (
              <SpotlightCard
                key={step.id}
                step={step}
                index={i}
                isInView={mounted && isInView}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
