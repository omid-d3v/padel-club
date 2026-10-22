import { NextRequest, NextResponse } from "next/server";
import { trustedClient } from "@/lib/supabase/trusted";
import { verifyGateway } from "@/lib/payments/zarinpal";
import { siteUrl } from "@/lib/seo";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const authority = request.nextUrl.searchParams.get("Authority");
  const returnTo = new URL("/account/payments", siteUrl());
  if (!authority || !/^[A-Za-z0-9]{30,64}$/.test(authority))
    return NextResponse.json(
      { error: "شناسه پرداخت معتبر نیست." },
      { status: 400 },
    );
  try {
    const db = trustedClient();
    const { data: p, error } = await db
      .from("payments")
      .select("*")
      .eq("authority", authority)
      .maybeSingle();
    if (error || !p)
      return NextResponse.json({ error: "پرداخت پیدا نشد." }, { status: 404 });
    // Even a forged callback cannot settle without authoritative server-to-server verification.
    const reference = await verifyGateway(authority, p.amount);
    const { error: saveError } = await db.rpc("settle_payment", {
      p_payment: p.id,
      p_reference: reference,
      p_amount: p.amount,
    });
    if (saveError) throw saveError;
    returnTo.searchParams.set("notice", "verified");
  } catch {
    returnTo.searchParams.set("notice", "pending");
  }
  return NextResponse.redirect(returnTo, 303);
}
