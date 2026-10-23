import "server-only";
import { trustedClient } from "@/lib/supabase/trusted";
import { providerFor } from "./providers";
import {
  inquireGateway,
  verifyGateway,
  paymentConfigured,
} from "@/lib/payments/zarinpal";
export async function runWorker() {
  const startedAt = Date.now();
  const db = trustedClient();
  const { error: proposalExpiryError } = await db.rpc(
    "expire_booking_proposals",
  );
  if (proposalExpiryError) throw proposalExpiryError;
  const { data: expired, error: expiryError } =
    await db.rpc("run_platform_jobs");
  if (expiryError) throw expiryError;
  const { data: attempts, error } = await db.rpc("claim_provider_attempt");
  if (error) throw error;
  let processed = 0;
  for (const attempt of attempts ?? []) {
    // Leave time for responses and database writes before the hosting timeout.
    // Unprocessed leases become claimable again after five minutes.
    if (Date.now() - startedAt > 240000) break;
    try {
      const { data: b } = await db
        .from("bookings")
        .select("*")
        .eq("id", attempt.booking_id)
        .single();
      if (!b) throw new Error("BOOKING_NOT_FOUND");
      const { data: s } = await db
        .from("court_slots")
        .select("*")
        .eq("id", b.slot_id)
        .single();
      if (!s) throw new Error("SLOT_NOT_FOUND");
      const { data: c } = await db
        .from("courts")
        .select("*")
        .eq("id", s.court_id)
        .single();
      if (!c?.external_court_ref) throw new Error("COURT_NOT_CONFIGURED");
      const { data: club } = await db
        .from("clubs")
        .select("*")
        .eq("id", c.club_id)
        .single();
      const provider = providerFor(club?.provider_key ?? null);
      if (attempt.operation === "quote_hold") {
        const available = await provider.getAvailability(
          c.external_court_ref,
          s.starts_at,
          s.ends_at,
        );
        if (
          !available.some(
            (x) =>
              (x.available &&
                x.startsAt === s.starts_at &&
                x.endsAt === s.ends_at) ||
              (x.available &&
                new Date(x.startsAt).getTime() ===
                  new Date(s.starts_at).getTime() &&
                new Date(x.endsAt).getTime() === new Date(s.ends_at).getTime()),
          )
        )
          throw new Error("EXTERNAL_UNAVAILABLE");
        const quote = await provider.getQuote(
          c.external_court_ref,
          s.starts_at,
          s.ends_at,
        );
        const hold = provider.capabilities.holds
          ? await provider.createHold(quote.quoteId, attempt.idempotency_key)
          : null;
        const { error: holdError } = await db.rpc("apply_external_quote", {
          p_booking: b.id,
          p_quote_id: quote.quoteId,
          p_price: quote.price,
          p_valid_until: hold
            ? new Date(
                Math.min(
                  Date.parse(hold.expiresAt),
                  Date.parse(quote.validUntil),
                ),
              ).toISOString()
            : quote.validUntil,
          p_hold_reference: hold?.reference ?? null,
        });
        if (holdError) throw holdError;
        const { error: recordError } = await db.rpc("record_provider_result", {
          p_attempt: attempt.id,
          p_status: "succeeded",
          p_reference: hold?.reference ?? null,
        });
        if (recordError) throw recordError;
      } else if (attempt.operation === "confirm") {
        if (!b.external_quote_id) throw new Error("QUOTE_NOT_FOUND");
        // Reconcile first, so retries cannot purchase the court twice.
        let result = await provider.getBookingStatus(attempt.idempotency_key);
        if (result.status === "not_found") {
          const quote = await provider.getQuote(
            c.external_court_ref,
            s.starts_at,
            s.ends_at,
          );
          if (quote.price !== b.court_price)
            throw new Error("EXTERNAL_PRICE_CHANGED");
          result = await provider.confirmBooking(
            quote.quoteId,
            attempt.idempotency_key,
            b.external_hold_reference ?? undefined,
          );
        }
        if (result.status === "confirmed" && !result.reference)
          throw new Error("EXTERNAL_CONFIRMATION_MISSING");
        const { error: recordError } = await db.rpc("record_provider_result", {
          p_attempt: attempt.id,
          p_status:
            result.status === "confirmed"
              ? "succeeded"
              : result.status === "failed"
                ? "failed"
                : "unknown",
          p_reference: result.reference ?? null,
        });
        if (recordError) throw recordError;
      } else if (attempt.operation === "cancel") {
        const reference = b.external_reference ?? b.external_hold_reference;
        if (!reference) throw new Error("EXTERNAL_REFERENCE_MISSING");
        const result = await provider.cancelBooking(
          reference,
          attempt.idempotency_key,
        );
        const { error: recordError } = await db.rpc("record_provider_result", {
          p_attempt: attempt.id,
          p_status: result.status === "cancelled" ? "succeeded" : "unknown",
          p_reference: result.reference ?? reference,
        });
        if (recordError) throw recordError;
      }
      processed++;
    } catch (error) {
      const code = error instanceof Error ? error.message : "PROVIDER_UNKNOWN";
      await db.rpc("record_provider_result", {
        p_attempt: attempt.id,
        p_status:
          code === "EXTERNAL_PRICE_CHANGED" || code === "EXTERNAL_UNAVAILABLE"
            ? "failed"
            : "unknown",
        p_error: code.slice(0, 100),
      });
    }
  }
  // Ambiguous confirmations are reconciled without initiating a second purchase.
  const { data: unresolved } = await db
    .from("provider_attempts")
    .select("*")
    .eq("status", "unknown")
    .eq("operation", "confirm")
    .order("next_attempt_at")
    .limit(5);
  let providerReconciled = 0;
  for (const a of unresolved ?? []) {
    if (Date.now() - startedAt > 240000) break;
    try {
      const { data: b } = await db
        .from("bookings")
        .select("*")
        .eq("id", a.booking_id)
        .single();
      if (!b) continue;
      const { data: s } = await db
        .from("court_slots")
        .select("*")
        .eq("id", b.slot_id)
        .single();
      if (!s) continue;
      const { data: c } = await db
        .from("courts")
        .select("*")
        .eq("id", s.court_id)
        .single();
      if (!c) continue;
      const { data: club } = await db
        .from("clubs")
        .select("*")
        .eq("id", c.club_id)
        .single();
      const status = await providerFor(
        club?.provider_key ?? null,
      ).getBookingStatus(a.idempotency_key);
      if (
        (status.status === "confirmed" && status.reference) ||
        status.status === "failed"
      ) {
        const { error } = await db.rpc("record_provider_result", {
          p_attempt: a.id,
          p_status: status.status === "confirmed" ? "succeeded" : "failed",
          p_reference: status.reference ?? null,
        });
        if (error) throw error;
        providerReconciled++;
      }
    } catch {
      /* Unknown stays visible for operator review; never blindly repurchase. */
    }
  }
  let reconciled = 0;
  if (paymentConfigured()) {
    const { data: pending } = await db
      .from("payments")
      .select("*")
      .in("status", ["pending", "needs_attention"])
      .not("authority", "is", null)
      .limit(20);
    for (const p of pending ?? []) {
      if (Date.now() - startedAt > 240000) break;
      try {
        if (!p.authority) continue;
        const status = await inquireGateway(p.authority);
        if (status === "PAID" || status === "VERIFIED") {
          const reference = await verifyGateway(p.authority, p.amount);
          const { error } = await db.rpc("settle_payment", {
            p_payment: p.id,
            p_reference: reference,
            p_amount: p.amount,
          });
          if (error) throw error;
          reconciled++;
        } else if (["FAILED", "REVERSED"].includes(status)) {
          await db.rpc("fail_payment", { p_payment: p.id });
        }
      } catch {
        /* Keep unresolved attempts visible for safe retries and admin review. */
      }
    }
  }
  return {
    expiry: expired,
    providerAttempts: processed,
    providerReconciled,
    reconciled,
  };
}
