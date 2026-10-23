import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runWorker } from "@/lib/booking/worker";
import { runNotificationWorker } from "@/lib/notifications/worker";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const actualBytes = Buffer.from(header);
  const expectedBytes = Buffer.from(expected);
  if (
    !secret ||
    actualBytes.length !== expectedBytes.length ||
    !timingSafeEqual(actualBytes, expectedBytes)
  )
    return NextResponse.json({ error: "دسترسی مجاز نیست." }, { status: 401 });
  try {
    const [booking, notifications] = await Promise.allSettled([
      runWorker(),
      runNotificationWorker(),
    ]);
    return NextResponse.json(
      {
        ...(booking.status === "fulfilled"
          ? booking.value
          : { booking_error: "BOOKING_WORKER_FAILED" }),
        notifications:
          notifications.status === "fulfilled"
            ? notifications.value
            : { error: "NOTIFICATION_WORKER_FAILED" },
      },
      {
        status:
          booking.status === "fulfilled" && notifications.status === "fulfilled"
            ? 200
            : 503,
      },
    );
  } catch {
    console.error("Platform worker failed");
    return NextResponse.json(
      { error: "اجرای پردازش کامل نشد؛ گزارش امن سرور را بررسی کنید." },
      { status: 503 },
    );
  }
}
