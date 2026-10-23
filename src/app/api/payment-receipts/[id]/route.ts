import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMember } from "@/lib/platform/data";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success)
    return NextResponse.json({ error: "پیدا نشد" }, { status: 404 });
  const { db } = await requireMember();
  const { data: r, error } = await db
    .from("card_transfer_receipts")
    .select("receipt_path")
    .eq("id", id)
    .maybeSingle();
  if (error || !r?.receipt_path)
    return NextResponse.json({ error: "پیدا نشد" }, { status: 404 });
  const { data, error: signError } = await db.storage
    .from("payment-receipts")
    .createSignedUrl(r.receipt_path, 300);
  if (signError || !data?.signedUrl)
    return NextResponse.json(
      { error: "دریافت رسید انجام نشد" },
      { status: 404 },
    );
  const response = NextResponse.redirect(data.signedUrl, 303);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
