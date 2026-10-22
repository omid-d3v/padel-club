import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AuthorizedBridge,
  providerConfigured,
} from "../src/lib/booking/providers";
import { requestGateway, verifyGateway } from "../src/lib/payments/zarinpal";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("authorized provider contract against a test-only mock transport", () => {
  const capabilities = {
    holds: true,
    cancellation: true,
    idempotency: true,
    authorizationCapture: false,
  };
  const bridge = () =>
    new AuthorizedBridge({
      baseUrl: "https://bridge.example/api",
      token: "test-only",
      capabilities,
    });
  it("passes stable idempotency keys and reconciles authoritative references", async () => {
    const mock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ status: "not_found" }))
      .mockResolvedValueOnce(
        Response.json({ status: "confirmed", reference: "club-order-42" }),
      );
    vi.stubGlobal("fetch", mock);
    expect(await bridge().getBookingStatus("booking:confirm")).toEqual({
      status: "not_found",
    });
    expect(
      await bridge().confirmBooking("quote", "booking:confirm", "hold"),
    ).toEqual({ status: "confirmed", reference: "club-order-42" });
    const [, options] = mock.mock.calls[1];
    expect(options.headers["Idempotency-Key"]).toBe("booking:confirm");
    expect(options.redirect).toBe("error");
    expect(JSON.parse(options.body)).toEqual({
      quoteId: "quote",
      hold: "hold",
    });
  });
  it("rejects missing credentials, unsupported holds, malformed prices and HTTP failures", async () => {
    vi.stubEnv("BOOKING_PROVIDERS_JSON", "{}");
    expect(providerConfigured("missing")).toBe(false);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          quoteId: "bad",
          price: -1,
          validUntil: "2099-01-01T00:00:00Z",
        }),
      ),
    );
    await expect(bridge().getQuote("court", "start", "end")).rejects.toThrow();
    await expect(
      new AuthorizedBridge({
        baseUrl: "https://bridge.example",
        token: "test",
        capabilities: { ...capabilities, holds: false },
      }).createHold("q", "k"),
    ).rejects.toThrow("HOLD_UNSUPPORTED");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 503 })),
    );
    await expect(bridge().getBookingStatus("k")).rejects.toThrow(
      "PROVIDER_RESPONSE_ERROR",
    );
  });
});
describe("Zarinpal authoritative verification using test-only bank responses", () => {
  it("uses stored IRR amounts and accepts verify 100/101, never an unverified response", async () => {
    vi.stubEnv("ZARINPAL_MERCHANT_ID", "30000000-0000-4000-8000-000000000001");
    vi.stubEnv("ZARINPAL_SANDBOX", "true");
    const mock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ data: { code: 100, authority: "A".repeat(36) } }),
      )
      .mockResolvedValueOnce(
        Response.json({ data: { code: 101, ref_id: 123456 } }),
      )
      .mockResolvedValueOnce(Response.json({ data: { code: -21 } }));
    vi.stubGlobal("fetch", mock);
    await requestGateway(
      { id: "order", amount: 4000001, request_key: "stable-order" },
      "https://site.example/callback",
    );
    expect(mock.mock.calls[0][0]).toBe(
      "https://sandbox.zarinpal.com/pg/v4/payment/request.json",
    );
    expect(JSON.parse(mock.mock.calls[0][1].body)).toMatchObject({
      amount: 4000001,
      currency: "IRR",
    });
    expect(await verifyGateway("A".repeat(36), 4000001)).toBe("123456");
    expect(JSON.parse(mock.mock.calls[1][1].body).amount).toBe(4000001);
    await expect(verifyGateway("A".repeat(36), 4000001)).rejects.toThrow(
      "PAYMENT_NOT_VERIFIED",
    );
  });
});
