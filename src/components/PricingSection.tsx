import type { FC } from "react";

interface PricingSectionProps {
  setActiveTab?: (tab: string) => void;
}

const PricingSection: FC<PricingSectionProps> = ({ setActiveTab }) => {
  return (
    <section className="relative py-28 bg-black overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-purple-700/20 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-orange-500/20 blur-[140px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Outer Border */}
        <div className="rounded-[35px] border border-purple-500/40 p-10 bg-[#090909]/90 shadow-[0_0_80px_rgba(168,85,247,.35)]">
          {/* Heading */}
          <h2 className="text-center text-5xl font-bold">
            <span className="text-orange-400">Simple, </span>
            <span className="text-red-400">Transparent </span>
            <span className="text-purple-400">Pricing</span>
          </h2>

          <p className="text-center text-gray-400 mt-4 text-lg">
            No subscriptions, no hidden fees — pay only for the sessions you book. Many mentors offer a free first session.
          </p>

          {/* Cards */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            {/* Budget-Friendly */}
            <div className="rounded-3xl border border-orange-500/60 bg-[#111111]/80 backdrop-blur-xl p-8 shadow-[0_0_40px_rgba(249,115,22,.35)] hover:scale-105 transition-transform duration-300">
              <h3 className="text-orange-400 text-3xl font-bold">Budget-Friendly</h3>
              <p className="text-gray-400 mt-3">Perfect for getting started</p>

              <div className="mt-8">
                <span className="text-4xl font-bold text-orange-400">
                  ₹0 – ₹200
                </span>
                <p className="text-gray-400 mt-3">/ session</p>
              </div>

              <ul className="mt-6 space-y-2 text-sm text-gray-400">
                <li>✓ Quick doubt-clearing sessions</li>
                <li>✓ Guidance from junior mentors</li>
                <li>✓ Great for first-time users</li>
              </ul>

              <button
                onClick={() => setActiveTab && setActiveTab("find-mentor")}
                className="mt-10 w-full rounded-full border border-orange-500 py-3 text-white font-semibold hover:bg-orange-500 transition-colors duration-300"
              >
                Find Mentors
              </button>
            </div>

            {/* Most Popular */}
            <div className="relative rounded-3xl border border-pink-500/70 bg-[#111111]/80 backdrop-blur-xl p-8 shadow-[0_0_50px_rgba(236,72,153,.35)] hover:scale-105 transition-transform duration-300">
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-2 rounded-full text-sm font-semibold text-white whitespace-nowrap">
                Most Popular
              </span>

              <h3 className="text-pink-400 text-3xl font-bold">Most Popular</h3>
              <p className="text-gray-400 mt-3">In-depth guidance from experienced seniors</p>

              <div className="mt-8">
                <span className="text-4xl font-bold text-pink-500">
                  ₹200 – ₹500
                </span>
                <p className="text-gray-400 mt-3">/ session</p>
              </div>

              <ul className="mt-6 space-y-2 text-sm text-gray-400">
                <li>✓ Detailed exam strategy sessions</li>
                <li>✓ Access to top-rated mentors</li>
                <li>✓ Available across all exam categories</li>
              </ul>

              <button
                onClick={() => setActiveTab && setActiveTab("find-mentor")}
                className="mt-10 w-full rounded-full border border-pink-500 py-3 text-white font-semibold hover:bg-pink-500 transition-colors duration-300"
              >
                Find Mentors
              </button>
            </div>

            {/* Premium */}
            <div className="rounded-3xl border border-purple-500/60 bg-[#111111]/80 backdrop-blur-xl p-8 shadow-[0_0_40px_rgba(168,85,247,.35)] hover:scale-105 transition-transform duration-300">
              <h3 className="text-purple-300 text-3xl font-bold">Premium</h3>
              <p className="text-gray-400 mt-3">Extended sessions with top experts</p>

              <div className="mt-8">
                <span className="text-4xl font-bold text-purple-400">
                  ₹500 – ₹1000
                </span>
                <p className="text-gray-400 mt-3">/ session</p>
              </div>

              <ul className="mt-6 space-y-2 text-sm text-gray-400">
                <li>✓ Longer, in-depth sessions</li>
                <li>✓ Highly experienced professionals</li>
                <li>✓ Priority scheduling with top mentors</li>
              </ul>

              <button
                onClick={() => setActiveTab && setActiveTab("find-mentor")}
                className="mt-10 w-full rounded-full border border-purple-500 py-3 text-white font-semibold hover:bg-purple-500 transition-colors duration-300"
              >
                Find Mentors
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PricingSection;
