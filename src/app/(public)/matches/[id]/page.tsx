import { requestTime } from "@/lib/platform/request-time";
import Link from "next/link";
import { notFound } from "next/navigation";
import { matches, member, catalog } from "@/lib/platform/data";
import { SKILLS } from "@/lib/platform/types";
import { moment, money, bookingLabels } from "@/lib/platform/format";
import { seo } from "@/lib/seo";
import { JoinForm } from "@/components/platform/join-form";
import { InviteButton } from "@/components/platform/invite-button";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[\da-f-]{36}$/i.test(id))
    return { title: "بازی پیدا نشد", robots: { index: false } };
  const d = await matches(id);
  const m = d.rows[0];
  return m
    ? {
        ...seo(
          m.title,
          `بازی پدل در ${m.club_name}؛ ${moment(m.starts_at)}. سهم پایه ${money(m.price)}.`,
          `/matches/${m.id}`,
        ),
        robots: { index: false, follow: true },
      }
    : { title: "بازی پیدا نشد", robots: { index: false } };
}
export default async function Match({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const now = await requestTime();
  const { id } = await params;
  if (!/^[\da-f-]{36}$/i.test(id)) notFound();
  const [d, m, clubs] = await Promise.all([matches(id), member(), catalog()]);
  const game = d.rows[0];
  if (!game) notFound();
  const closed =
    new Date(game.cutoff_at).getTime() <= now ||
    !["pending_club", "collecting"].includes(game.status);
  return (
    <section className="public-container public-page">
      <span className="status-pill">
        {bookingLabels[game.status] ?? "در حال بررسی"}
      </span>
      <h1 className="mt-5">{game.title}</h1>
      <p className="intro">{game.description}</p>
      <InviteButton title={game.title} />
      <div className="content-grid">
        <div className="space-y-6">
          <div className="platform-card">
            <h2>{game.club_name}</h2>
            <p>
              {game.city_name} · {game.court_name}
            </p>
            <p>{moment(game.starts_at)}</p>
            <p className="mt-4 text-sm">
              سطح مجاز:{" "}
              <bdi>
                {game.min_skill === null
                  ? "همه سطح‌ها"
                  : `${SKILLS[game.min_skill]} تا ${SKILLS[game.max_skill ?? game.min_skill]}`}
              </bdi>
            </p>
            <Link
              className="mt-5 block text-sm underline"
              href={`/clubs/${game.club_slug}`}
            >
              اطلاعات باشگاه
            </Link>
          </div>
          <div className="platform-card">
            <h2>هم‌بازی‌ها</h2>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }, (_, i) => {
                const p = game.roster.find((r) => r.seat === i + 1);
                return (
                  <div className="rounded-xl border border-border p-4" key={i}>
                    <p className="font-bold">{p?.name ?? "جای تو خالیه"}</p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {p
                        ? `${SKILLS[p.skill]} · ${p.verified ? "سطح تأییدشده" : "سطح خوداظهاری"}`
                        : "منتظر هم‌بازی"}
                    </p>
                    {p && (
                      <span className="mt-3 inline-block text-xs">
                        {p.paid ? "پرداخت معتبر ثبت شده" : "هنوز پرداخت نشده"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <aside className="platform-card sticky-card">
          <h2>سهم هر نفر، روشن و جدا</h2>
          <p className="text-2xl font-extrabold">تا {money(game.price)}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            سهم پایه زمین، تجهیزات مشترک و کارمزد؛ تجهیزات شخصی در سوابق سفارش
            جدا محاسبه می‌شوند.
          </p>
          <p className="my-6 text-sm">
            مهلت تکمیل چهار پرداخت:
            <br />
            <b>{moment(game.cutoff_at)}</b>
          </p>
          <p className="mb-6 text-xs leading-7 text-muted-foreground">
            {game.status === "pending_club"
              ? "هنوز نگه‌داشت باشگاه ثبت نشده؛ پیوستن فعلاً اعلام علاقه‌مندی است و پرداخت فعال نیست."
              : "پرداخت در اعتبار نگه‌داشت باشگاه انجام می‌شود. تا پرداخت هر چهار نفر، زمین قطعی اعلام نمی‌شود."}
          </p>
          {m ? (
            <JoinForm
              matchId={id}
              pending={game.status === "pending_club"}
              disabled={closed || game.participants >= 4}
              equipment={clubs.equipment.filter(
                (e) =>
                  e.kind === "personal" &&
                  e.club_id ===
                    clubs.clubs.find((c) => c.slug === game.club_slug)?.id,
              )}
            />
          ) : (
            <Link className="text-emerald-800 underline" href="/login">
              برای پیوستن وارد شوید
            </Link>
          )}
          <p className="mt-5 text-xs text-muted-foreground">
            اگر بازی در مهلت تکمیل نشود، لغو و درخواست استرداد کامل ثبت خواهد
            شد.
          </p>
        </aside>
      </div>
    </section>
  );
}
