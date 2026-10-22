import "server-only";
import { z } from "zod";
export interface ProviderCapabilities {
  holds: boolean;
  cancellation: boolean;
  idempotency: boolean;
  authorizationCapture: boolean;
}
export interface ProviderSlot {
  reference: string;
  startsAt: string;
  endsAt: string;
  price: number;
  available: boolean;
}
export interface Quote {
  quoteId: string;
  price: number;
  validUntil: string;
  cancellationPolicy: unknown;
}
export interface ProviderBooking {
  status: "confirmed" | "pending" | "cancelled" | "failed" | "not_found";
  reference?: string;
  price?: number;
}
export interface BookingProvider {
  capabilities: ProviderCapabilities;
  getAvailability(
    court: string,
    from: string,
    to: string,
  ): Promise<ProviderSlot[]>;
  getQuote(court: string, startsAt: string, endsAt: string): Promise<Quote>;
  createHold(
    quoteId: string,
    key: string,
  ): Promise<{ reference: string; expiresAt: string }>;
  confirmBooking(
    quoteId: string,
    key: string,
    hold?: string,
  ): Promise<ProviderBooking>;
  getBookingStatus(key: string): Promise<ProviderBooking>;
  cancelBooking(reference: string, key: string): Promise<ProviderBooking>;
  getCancellationPolicy(): Promise<unknown>;
}
const iso = z.string().datetime({ offset: true });
const slotSchema = z.object({
  reference: z.string(),
  startsAt: iso,
  endsAt: iso,
  price: z.number().int().nonnegative().max(1e12),
  available: z.boolean(),
});
const quoteSchema = z.object({
  quoteId: z.string().min(1),
  price: z.number().int().nonnegative().max(1e12),
  validUntil: iso,
  cancellationPolicy: z.unknown(),
});
const bookingSchema = z.object({
  status: z.enum(["confirmed", "pending", "cancelled", "failed", "not_found"]),
  reference: z.string().optional(),
  price: z.number().int().nonnegative().optional(),
});
const configSchema = z.record(
  z.string(),
  z.object({
    baseUrl: z.url().refine((s) => new URL(s).protocol === "https:"),
    token: z.string().min(1),
    capabilities: z.object({
      holds: z.boolean(),
      cancellation: z.boolean(),
      idempotency: z.literal(true),
      authorizationCapture: z.boolean(),
    }),
  }),
);
// This is OUR authorized middleware contract, not a claim about any club's website API.
// Every write carries the persistent platform idempotency key. Redirects are forbidden.
export class AuthorizedBridge implements BookingProvider {
  constructor(
    private config: {
      baseUrl: string;
      token: string;
      capabilities: ProviderCapabilities;
    },
  ) {}
  get capabilities() {
    return this.config.capabilities;
  }
  private async call(path: string, payload: unknown, key?: string) {
    const res = await fetch(
      `${this.config.baseUrl.replace(/\/$/, "")}/${path}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.token}`,
          ...(key ? { "Idempotency-Key": key } : {}),
        },
        body: JSON.stringify(payload),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(12000),
      },
    );
    if (!res.ok) throw new Error("PROVIDER_RESPONSE_ERROR");
    return res.json() as Promise<unknown>;
  }
  async getAvailability(court: string, from: string, to: string) {
    return z
      .array(slotSchema)
      .parse(await this.call("availability", { court, from, to }));
  }
  async getQuote(court: string, startsAt: string, endsAt: string) {
    return quoteSchema.parse(
      await this.call("quote", { court, startsAt, endsAt }),
    );
  }
  async createHold(quoteId: string, key: string) {
    if (!this.capabilities.holds) throw new Error("HOLD_UNSUPPORTED");
    return z
      .object({ reference: z.string().min(1), expiresAt: iso })
      .parse(await this.call("holds", { quoteId }, key));
  }
  async confirmBooking(quoteId: string, key: string, hold?: string) {
    return bookingSchema.parse(
      await this.call("bookings/confirm", { quoteId, hold }, key),
    );
  }
  async getBookingStatus(key: string) {
    return bookingSchema.parse(
      await this.call("bookings/status", { idempotencyKey: key }),
    );
  }
  async cancelBooking(reference: string, key: string) {
    if (!this.capabilities.cancellation)
      throw new Error("CANCELLATION_REQUIRES_ADMIN");
    return bookingSchema.parse(
      await this.call("bookings/cancel", { reference }, key),
    );
  }
  async getCancellationPolicy() {
    return this.call("cancellation-policy", {});
  }
}
export function providerFor(key: string | null) {
  if (!key) throw new Error("PROVIDER_NOT_CONFIGURED");
  const configs = configSchema.parse(
    JSON.parse(process.env.BOOKING_PROVIDERS_JSON || "{}"),
  );
  const config = configs[key];
  if (!config) throw new Error("PROVIDER_NOT_CONFIGURED");
  return new AuthorizedBridge(config);
}
export function providerConfigured(key: string | null) {
  try {
    providerFor(key);
    return true;
  } catch {
    return false;
  }
}
