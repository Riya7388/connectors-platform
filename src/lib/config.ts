/**
 * FREE_MODE flag
 *
 * When true, every session behaves like the existing free-intro path —
 * no payment required, Meet link unlocked immediately after mentor confirms time.
 * When false (default / absent), the app behaves exactly as today.
 *
 * To enable locally:  add  VITE_FREE_MODE=true  to your .env file, then restart the dev server.
 * To enable on Vercel: add env var  VITE_FREE_MODE=true  in the project settings, then redeploy.
 * To disable:          set the value to anything other than 'true', or remove the variable entirely.
 */
export const FREE_MODE = import.meta.env.VITE_FREE_MODE === "true";
export const FREE_MODE_DURATIONS = [15, 30];
