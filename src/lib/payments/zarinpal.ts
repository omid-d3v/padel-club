import "server-only";
import { z } from "zod";
const responseSchema = z.object({
  data: z
    .object({
      code: z.number(),
      authority: z.string().optional(),
      ref_id: z.union([z.string(), z.number()]).optional(),
      status: z.string().optional(),
    })
    .optional(),
  errors: z.unknown().optional(),
});
export const paymentConfigured = () =>
  Boolean(
    process.env.ZARINPAL_MERCHANT_ID &&
    process.env.SUPABASE_SECRET_KEY &&
    process.env.NEXT_PUBLIC_SITE_URL,
  );
function base() {
  return process.env.ZARINPAL_SANDBOX === "true"
    ? "https://sandbox.zarinpal.com"
    : "https://payment.zarinpal.com";
}
async function post(method: string, body: Record<string, unknown>) {
  const merchant = z.uuid().parse(process.env.ZARINPAL_MERCHANT_ID);
  const res = await fetch(`${base()}/pg/v4/payment/${method}.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ merchant_id: merchant, ...body }),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
    redirect: "error",
  });
  if (!res.ok) throw new Error("GATEWAY_UNAVAILABLE");
  return responseSchema.parse(await res.json());
}
export async function requestGateway(
  payment: { id: string; amount: number; request_key: string },
  callback: string,
) {
  if (!Number.isSafeInteger(payment.amount) || payment.amount < 1)
    throw new Error("INVALID_AMOUNT");
  const r = await post("request", {
    amount: payment.amount,
    currency: "IRR",
    description: "پرداخت رزرو یا رویداد رالی‌یار",
    callback_url: callback,
    metadata: { order_id: payment.request_key },
  });
  if (r.data?.code !== 100 || !r.data.authority)
    throw new Error("GATEWAY_REQUEST_REJECTED");
  return r.data.authority;
}
export function gatewayUrl(authority: string) {
  if (!/^[A-Za-z0-9]{30,64}$/.test(authority))
    throw new Error("INVALID_AUTHORITY");
  return `${base()}/pg/StartPay/${encodeURIComponent(authority)}`;
}
export async function verifyGateway(authority: string, amount: number) {
  const r = await post("verify", { authority, amount });
  if (
    !r.data ||
    ![100, 101].includes(r.data.code) ||
    r.data.ref_id === undefined
  )
    throw new Error("PAYMENT_NOT_VERIFIED");
  return String(r.data.ref_id);
}
export async function inquireGateway(authority: string) {
  const r = await post("inquiry", { authority });
  return r.data?.status ?? "UNKNOWN";
}
