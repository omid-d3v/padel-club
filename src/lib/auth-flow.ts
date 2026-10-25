import { safeNext } from "@/lib/platform/format";

export type AuthProfile = {
  displayName: string;
  skillLevel: number;
  cityId: string | null;
};
export type PhoneAuthResult = {
  success: boolean;
  message: string;
  needsProfile?: boolean;
  profile?: AuthProfile;
  redirect?: string;
};

export function authDestination(next: unknown, admin = false): string {
  const fallback = admin ? "/admin" : "/account";
  const path = safeNext(next, fallback);
  if (/[\u0000-\u001f\u007f]/.test(path)) return fallback;
  try {
    const decoded = decodeURIComponent(path);
    if (decoded.startsWith("//") || decoded.includes("\\")) return fallback;
    const url = new URL(path, "https://matchsho.invalid");
    if (url.origin !== "https://matchsho.invalid") return fallback;
    if (
      /^\/(login|register|forgot-password|reset-password|onboarding|auth|setup)(\/|$)/.test(
        url.pathname,
      )
    )
      return fallback;
    if (!admin && /^\/admin(\/|$)/.test(url.pathname)) return fallback;
    return path;
  } catch {
    return fallback;
  }
}
