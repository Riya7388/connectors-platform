import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value?: string;
  onChange: (value: string) => void;
  options: (string | SelectOption)[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  name?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  disabled = false,
  error,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options to { value, label }
  const normalizedOptions: SelectOption[] = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt
  );

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm text-left transition-all outline-none ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        } ${
          error ? "border-red-500" : "border-[rgba(255,255,255,0.08)]"
        } bg-[#141417] border hover:border-[rgba(255,255,255,0.18)] focus:border-purple-500/50 shadow-sm`}
      >
        <span
          className={`truncate text-[14px] sm:text-[15px] ${
            selectedOption ? "text-[#FFFFFF] font-medium" : "text-[#71717A]"
          }`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-[#A1A1AA] shrink-0 ml-2 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl border border-[rgba(255,255,255,0.12)] bg-[#1C1C21] p-1.5 shadow-2xl custom-scrollbar animate-fade-in"
          style={{ backgroundColor: "#1C1C21" }}
        >
          {placeholder && (
            <div
              onClick={() => handleSelect("")}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-[14px] cursor-pointer transition-colors ${
                !value
                  ? "bg-white/[0.06] text-white font-semibold"
                  : "text-[#71717A] hover:bg-white/[0.06] hover:text-[#D4D4D8]"
              }`}
            >
              <span>{placeholder}</span>
              {!value && <Check size={14} className="text-[#FF9D2E]" />}
            </div>
          )}
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-[14px] sm:text-[15px] cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-gradient-to-r from-[#FF9D2E]/20 via-[#FF2D8F]/20 to-[#A855F7]/20 text-white font-semibold border-l-2 border-[#FF9D2E]"
                    : "text-[#D4D4D8] hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={15} className="text-[#FF9D2E] shrink-0 ml-2" />}
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};
