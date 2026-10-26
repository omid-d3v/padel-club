import { ownRows, requireMember } from "@/lib/platform/data";
import { PushOptIn } from "@/components/platform/push-opt-in";
import { moment } from "@/lib/platform/format";
import { ActionForm } from "@/components/platform/action-form";
import Link from "next/link";
export default async function Notifications({
  searchParams,
}: {
  searchParams: Promise<{ unread?: string }>;
}) {
  const q = await searchParams;
  const rows = await ownRows("notifications");
  const member = await requireMember();
  return (
    <section className="public-container public-page">
      <h1>خبرهای بازی تو</h1>
      <PushOptIn userId={member.userId} settings />
      <div className="my-6 max-w-xs">
        <ActionForm operation="notifications" label="همه را خواندم" />
      </div>
      <nav className="my-4 flex gap-5" aria-label="فیلتر اعلان‌ها">
        <Link className="min-h-11 underline" href="/account/notifications">
          همه
        </Link>
        <Link
          className="min-h-11 underline"
          href="/account/notifications?unread=1"
        >
          خوانده‌نشده
        </Link>
      </nav>
      {rows
        .filter((n) => q.unread !== "1" || !n.read_at)
        .toSorted((a, b) => b.created_at.localeCompare(a.created_at))
        .map((n) => (
          <article key={n.id} className="platform-card my-4">
            <h2>
              {n.title}
              {!n.read_at && " •"}
            </h2>
            <p className="text-sm">{n.body}</p>
            <p className="my-4 text-xs text-muted-foreground">
              {moment(n.created_at)}
            </p>
            {!n.read_at && (
              <div className="my-3 max-w-40">
                <ActionForm operation="notification-read" label="خواندم">
                  <input type="hidden" name="notification_id" value={n.id} />
                </ActionForm>
              </div>
            )}
            <Link
              href={
                n.href.startsWith("/") && !n.href.startsWith("//")
                  ? n.href
                  : "/account"
              }
              className="text-sm underline"
            >
              مشاهده جزئیات
            </Link>
          </article>
        ))}
      {!rows.length && (
        <p className="mt-7 text-sm text-muted-foreground">
          اعلان تازه‌ای نداری.
        </p>
      )}
    </section>
  );
}
