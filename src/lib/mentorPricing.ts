// Helper functions for mentor pricing and paid speaker-mentors

export interface MentorPricingFields {
  is_paid?: boolean | null;
  pricing?: Record<string, string | number> | null;
  session_durations?: string[] | null;
  free_intro_session?: boolean | null;
}

/**
 * Returns true only when mentor is explicitly marked as paid (is_paid === true)
 * AND pricing has at least one price greater than zero.
 */
export function isPaidMentor(mentor?: MentorPricingFields | null): boolean {
  if (!mentor || mentor.is_paid !== true) {
    return false;
  }

  const pricing = mentor.pricing;
  if (!pricing || typeof pricing !== "object") {
    return false;
  }

  return Object.values(pricing).some((val) => {
    const num = typeof val === "number" ? val : parseFloat(String(val));
    return !isNaN(num) && num > 0;
  });
}

/**
 * Extracts the lowest numeric price from a mentor's pricing map.
 * Returns null if no valid prices exist.
 */
export function getStartingPrice(
  pricing?: Record<string, string | number> | null
): { price: number; duration: string } | null {
  if (!pricing || typeof pricing !== "object") return null;

  let minPrice = Infinity;
  let minDuration = "";

  for (const [dur, val] of Object.entries(pricing)) {
    const num = typeof val === "number" ? val : parseFloat(String(val));
    if (!isNaN(num) && num > 0 && num < minPrice) {
      minPrice = num;
      minDuration = dur;
    }
  }

  if (minPrice === Infinity) return null;
  return { price: minPrice, duration: minDuration };
}
