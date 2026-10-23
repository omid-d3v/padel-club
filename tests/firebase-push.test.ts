import { afterEach, describe, it, expect, vi } from "vitest";
import { generateKeyPairSync, verify } from "node:crypto";
vi.mock("server-only", () => ({}));
import { sendPush } from "../src/lib/notifications/firebase";
afterEach(() => vi.unstubAllEnvs());
describe("FCM service-account transport", () => {
  it("signs a short-lived OAuth token server-side and sends same-origin notification targets", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    vi.stubEnv("FIREBASE_CLIENT_EMAIL", "test@example.iam.gserviceaccount.com");
    vi.stubEnv(
      "FIREBASE_PRIVATE_KEY",
      privateKey.export({ format: "pem", type: "pkcs8" }).toString(),
    );
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "test-project");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://rally.example");
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ access_token: "test-access", expires_in: 3600 }),
      )
      .mockResolvedValueOnce(
        Response.json({ name: "projects/test-project/messages/42" }),
      );
    expect(
      await sendPush(
        "device-token",
        {
          id: "notice-1",
          title: "رزرو",
          body: "رزرو تأیید شد",
          href: "https://untrusted.example",
        },
        fetcher,
      ),
    ).toEqual({
      invalid: false,
      reference: "projects/test-project/messages/42",
    });
    const jwt = String(fetcher.mock.calls[0][1].body.get("assertion")),
      parts = jwt.split(".");
    expect(
      verify(
        "RSA-SHA256",
        Buffer.from(parts.slice(0, 2).join(".")),
        publicKey,
        Buffer.from(parts[2], "base64url"),
      ),
    ).toBe(true);
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    expect(claims.exp - claims.iat).toBe(3600);
    const payload = JSON.parse(fetcher.mock.calls[1][1].body);
    expect(payload.message.data.href).toBe("/account/notifications");
    expect(payload.message.webpush.fcm_options.link).toBe(
      "https://rally.example/account/notifications",
    );
    expect(fetcher.mock.calls[1][1].headers.Authorization).toBe(
      "Bearer test-access",
    );
  });
});
