/** Canonical E.164 identity used by Supabase Auth and notification recipients. */
export function iranMobile(input: string): string {
  const digits = input
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
    .replace(/[\s()-]/g, "");
  const local = digits.replace(/^(?:\+98|0098|98)/, "0");
  if (!/^09\d{9}$/.test(local)) throw new Error("INVALID_IRAN_MOBILE");
  return `+98${local.slice(1)}`;
}
