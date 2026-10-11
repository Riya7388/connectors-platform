/**
 * Formatting helpers for Phase 12 redesign
 */

export function toTitleCase(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (!word) return "";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Deterministic gradient direction for mentor card cover banner based on mentor ID
 * Options: 135deg, 160deg, 110deg, 180deg, 145deg, 120deg, 200deg, 100deg
 */
const GRADIENT_ANGLES = [135, 160, 110, 180, 145, 120, 200, 100, 150, 170];

export function getDeterministicGradientAngle(id: string | null | undefined): number {
  if (!id) return 135;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % GRADIENT_ANGLES.length;
  return GRADIENT_ANGLES[index];
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "M";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
