import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/platform/format";
import { siteUrl } from "@/lib/seo";
export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get("token_hash"),
    code = request.nextUrl.searchParams.get("code"),
    type = request.nextUrl.searchParams.get("type"),
    next = safeNext(
      request.nextUrl.searchParams.get("next"),
      "/account/profile",
    );
  const db = await createClient();
  let failed = true;
  if (code) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    failed = !!error;
  } else if (
    token_hash &&
    (type === "signup" || type === "recovery" || type === "email")
  ) {
    const { error } = await db.auth.verifyOtp({ token_hash, type });
    failed = !!error;
  }
  return NextResponse.redirect(
    new URL(failed ? "/login?error=confirmation" : next, siteUrl()),
    303,
  );
}
