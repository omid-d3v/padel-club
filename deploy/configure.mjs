import { createHmac, randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
export function replaceEnv(text, values) {
  for (const [key, value] of Object.entries(values)) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(key) || /[\r\n]/.test(value))
      throw new Error("Invalid environment entry");
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    text = pattern.test(text)
      ? text.replace(pattern, () => line)
      : `${text.trimEnd()}\n${line}\n`;
  }
  return text;
}
export function generateConfig(site, api, email) {
  const hostname =
    /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
  if (
    !hostname.test(site) ||
    !hostname.test(api) ||
    site === api ||
    !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)
  )
    throw new Error(
      "Use distinct bare DNS hostnames and a real certificate email",
    );
  const hex = (n) => randomBytes(n).toString("hex");
  const jwtSecret = hex(32);
  const token = (role) => {
    const iat = Math.floor(Date.now() / 1000);
    const header = Buffer.from(
      JSON.stringify({ alg: "HS256", typ: "JWT" }),
    ).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        role,
        iss: "supabase",
        iat,
        exp: iat + 5 * 365 * 86400,
      }),
    ).toString("base64url");
    const signed = `${header}.${payload}`;
    return `${signed}.${createHmac("sha256", jwtSecret).update(signed).digest("base64url")}`;
  };
  const anon = token("anon"),
    service = token("service_role");
  const hook = `v1,whsec_${randomBytes(32).toString("base64")}`;
  return {
    supabase: {
      POSTGRES_PASSWORD: hex(24),
      JWT_SECRET: jwtSecret,
      ANON_KEY: anon,
      SERVICE_ROLE_KEY: service,
      // This deployment uses official legacy HS256 compatibility; opaque keys stay unset.
      SUPABASE_PUBLISHABLE_KEY: "",
      SUPABASE_SECRET_KEY: "",
      JWT_KEYS: "",
      JWT_JWKS: "",
      DASHBOARD_USERNAME: "matchsho_admin",
      DASHBOARD_PASSWORD: `m${hex(24)}`,
      SECRET_KEY_BASE: randomBytes(48).toString("base64"),
      REALTIME_DB_ENC_KEY: hex(8),
      VAULT_ENC_KEY: hex(16),
      PG_META_CRYPTO_KEY: hex(24),
      LOGFLARE_PUBLIC_ACCESS_TOKEN: hex(24),
      LOGFLARE_PRIVATE_ACCESS_TOKEN: hex(24),
      S3_PROTOCOL_ACCESS_KEY_ID: hex(16),
      S3_PROTOCOL_ACCESS_KEY_SECRET: hex(32),
      MINIO_ROOT_PASSWORD: hex(24),
      SUPABASE_PUBLIC_URL: `https://${api}`,
      API_EXTERNAL_URL: `https://${api}/auth/v1`,
      SITE_URL: `https://${site}`,
      ADDITIONAL_REDIRECT_URLS: `https://${site}/auth/confirm,https://${site}/reset-password`,
      ENABLE_PHONE_SIGNUP: "false",
      ENABLE_PHONE_AUTOCONFIRM: "false",
      ENABLE_ANONYMOUS_USERS: "false",
      FUNCTIONS_VERIFY_JWT: "false",
      OPENAI_API_KEY: "",
      POOLER_TENANT_ID: "matchsho",
      STUDIO_DEFAULT_ORGANIZATION: "MatchSho",
      STUDIO_DEFAULT_PROJECT: "MatchSho",
    },
    app: {
      SITE_HOST: site,
      API_HOST: api,
      ACME_EMAIL: email,
      NEXT_PUBLIC_SITE_URL: `https://${site}`,
      NEXT_PUBLIC_SUPABASE_URL: `https://${api}`,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: anon,
      MATCHSHO_SUPABASE_SECRET_KEY: service,
      CRON_SECRET: hex(32),
      CALENDAR_WORKER_TOKEN: hex(32),
      SUPABASE_SEND_SMS_HOOK_SECRET: hook,
    },
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const values = generateConfig(...process.argv.slice(2));
  const root = fileURLToPath(new URL("../", import.meta.url));
  const upstream = `${root}deploy/runtime/supabase/docker`;
  // wx is intentional: never rotate an existing installation's signing/encryption keys.
  await writeFile(
    `${upstream}/.env`,
    replaceEnv(
      await readFile(`${upstream}/.env.example`, "utf8"),
      values.supabase,
    ),
    { flag: "wx", mode: 0o600 },
  );
  await writeFile(
    `${root}deploy/.env.app`,
    replaceEnv(
      await readFile(`${root}deploy/app.env.example`, "utf8"),
      values.app,
    ),
    { flag: "wx", mode: 0o600 },
  );
  console.log("Private environment files created; no secrets printed.");
}
