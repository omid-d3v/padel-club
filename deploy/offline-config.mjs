import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
export const publicKeys = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_VAPID_KEY",
];
export function publicConfig(text) {
  const values = Object.fromEntries(publicKeys.map((k) => [k, ""]));
  for (const line of text.trim().split(/\r?\n/)) {
    const split = line.indexOf("=");
    const key = line.slice(0, split),
      value = line.slice(split + 1);
    if (
      split < 1 ||
      !publicKeys.includes(key) ||
      !/^[a-zA-Z0-9:/._+=,@-]*$/.test(value)
    )
      throw new Error(
        "Only plain public-env.sh output is accepted; never supply private env",
      );
    values[key] = value;
  }
  for (const key of publicKeys.slice(0, 3))
    if (!values[key]) throw new Error(`Missing ${key}`);
  for (const key of publicKeys.slice(0, 2)) {
    const url = new URL(values[key]);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    )
      throw new Error("Expected public HTTPS origin");
  }
  const key = values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (key.startsWith("sb_secret_")) throw new Error("Private key is forbidden");
  if (!key.startsWith("sb_publishable_")) {
    let role;
    try {
      role = JSON.parse(Buffer.from(key.split(".")[1], "base64url")).role;
    } catch {
      throw new Error("Expected anon JWT or publishable key");
    }
    if (role !== "anon") throw new Error("Only anon JWT is public");
  }
  return publicKeys.map((k) => `${k}=${values[k]}\n`).join("");
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const env = publicConfig(process.env.OFFLINE_PUBLIC_ENV ?? "");
  writeFileSync("bundle/public.env", env, { flag: "wx" });
  writeFileSync(process.env.GITHUB_ENV, env, { flag: "a" });
}
