import { ownRows } from "@/lib/platform/data";
import { moment } from "@/lib/platform/format";
import { ActionForm } from "@/components/platform/action-form";
import Link from "next/link";
export default async function Notifications() {
  const rows = await ownRows("notifications");
  return (
    <section className="public-container public-page">
      <h1>خبرهای بازی تو</h1>
      <div className="my-6 max-w-xs">
        <ActionForm operation="notifications" label="همه را خواندم" />
      </div>
      {rows
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
