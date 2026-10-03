import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FAQItem } from "../lib/faqData";

interface FaqAccordionProps {
  items: FAQItem[];
  showNumbers?: boolean;
}

export const FaqAccordion: React.FC<FaqAccordionProps> = ({
  items,
  showNumbers = true,
}) => {
  const [openId, setOpenId] = useState<number | null>(null);

  const toggleItem = (id: number) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-3.5 w-full">
      {items.map((item, index) => {
        const isOpen = openId === item.id;
        const panelId = `faq-panel-${item.id}`;
        const headerId = `faq-header-${item.id}`;

        return (
          <div
            key={item.id}
            className={`rounded-2xl border transition-all duration-300 motion-reduce:transition-none overflow-hidden ${
              isOpen
                ? "bg-surface-container-low border-primary/40 shadow-lg shadow-primary/5"
                : "bg-surface-container-lowest/50 border-white/10 hover:border-white/20 hover:bg-surface-container-low/60"
            }`}
          >
            <button
              id={headerId}
              type="button"
              onClick={() => toggleItem(item.id)}
              className="w-full py-4 sm:py-5 px-5 sm:px-6 flex items-center justify-between text-left gap-4 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 cursor-pointer"
              aria-expanded={isOpen}
              aria-controls={panelId}
            >
              <span className="text-base sm:text-lg font-semibold text-on-surface leading-snug">
                {showNumbers ? `${index + 1}. ` : ""}
                {item.question}
              </span>
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 motion-reduce:transition-none ${
                  isOpen
                    ? "bg-primary text-white rotate-180"
                    : "bg-white/5 text-on-surface-variant hover:bg-white/10"
                }`}
              >
                <ChevronDown size={18} />
              </div>
            </button>

            {/* Smooth CSS Grid accordion transition (0fr -> 1fr) */}
            <div
              id={panelId}
              role="region"
              aria-labelledby={headerId}
              className={`grid transition-[grid-template-rows,opacity] duration-300 motion-reduce:transition-none ease-in-out ${
                isOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0 pointer-events-none"
              }`}
            >
              <div className="overflow-hidden">
                <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-1 text-sm sm:text-base text-on-surface-variant leading-relaxed border-t border-white/5">
                  {item.answer}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FaqAccordion;
