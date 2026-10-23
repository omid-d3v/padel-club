import "server-only";
import { createSign } from "node:crypto";

let cached: { token: string; expires: number } | undefined;
export function pushConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}
async function accessToken(fetcher: typeof fetch) {
  if (cached && cached.expires > Date.now()) return cached.token;
  const email = process.env.FIREBASE_CLIENT_EMAIL,
    key = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) throw new Error("PUSH_NOT_CONFIGURED");
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iss: email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
  const signature = createSign("RSA-SHA256")
    .update(unsigned)
    .sign(key, "base64url");
  let response: Response;
  try {
    response = await fetcher("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${unsigned}.${signature}`,
      }),
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
      redirect: "error",
    });
  } catch {
    throw new Error("PUSH_AUTH_UNAVAILABLE");
  }
  const data = (await response.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
  } | null;
  if (!response.ok || !data?.access_token || !data.expires_in)
    throw new Error("PUSH_AUTH_FAILED");
  cached = {
    token: data.access_token,
    expires: Date.now() + Math.min(data.expires_in - 60, 3000) * 1000,
  };
  return cached.token;
}
export async function sendPush(
  token: string,
  notice: { id: string; title: string; body: string; href: string },
  fetcher: typeof fetch = fetch,
) {
  const bearer = await accessToken(fetcher);
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!project || !/^[a-z0-9-]+$/.test(project))
    throw new Error("PUSH_NOT_CONFIGURED");
  const href =
    notice.href.startsWith("/") && !notice.href.startsWith("//")
      ? notice.href
      : "/account/notifications";
  let response: Response;
  try {
    response = await fetcher(
      `https://fcm.googleapis.com/v1/projects/${project}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bearer}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(12000),
        cache: "no-store",
        redirect: "error",
        body: JSON.stringify({
          message: {
            token,
            data: {
              title: notice.title,
              body: notice.body,
              href,
              id: notice.id,
            },
            webpush: {
              headers: { TTL: "86400", Urgency: "normal" },
              fcm_options: {
                link: `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? ""}${href}`,
              },
            },
          },
        }),
      },
    );
  } catch {
    throw new Error("PUSH_DELIVERY_UNKNOWN");
  }
  const data = (await response.json().catch(() => null)) as {
    name?: string;
    error?: { details?: { errorCode?: string }[] };
  } | null;
  if (
    data?.error?.details?.some((detail) => detail.errorCode === "UNREGISTERED")
  )
    return { invalid: true, reference: "" };
  if (!response.ok || !data?.name) throw new Error("PUSH_PROVIDER_REJECTED");
  return { invalid: false, reference: data.name };
}
