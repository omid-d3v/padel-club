import Link from "next/link";
import {
  ArrowUpLeft,
  MoveUpLeft,
  ShieldCheck,
  CalendarDays,
  Users,
  MapPin,
} from "lucide-react";
import { catalog, matches, events } from "@/lib/platform/data";
import { seo, siteUrl, jsonLd } from "@/lib/seo";
import {
  ClubCard,
  MatchCardPublic,
  EventCard,
  PublicEmpty,
  DataNotice,
} from "@/components/platform/cards";
import {
  LandingMotion,
  JourneyDemo,
} from "@/components/platform/landing-motion";
import { Button } from "@/components/ui/button";
export const metadata = seo(
  "رزرو زمین پدل، پیدا کردن هم‌بازی و مسابقات",
  "باشگاه پدل پیدا کنید، با بازیکنان هم‌سطح بازی کنید و در امریکانو و تورنمنت‌های پدل شرکت کنید.",
  "/",
);
const faqs = [
  [
    "چگونه زمین رزرو کنم؟",
    "باشگاه، زمین و سانس منتشرشده را انتخاب کنید. درخواست دستی ابتدا به تأیید باشگاه نیاز دارد؛ سپس تا پایان مهلت اعلام‌شده می‌توانید پرداخت کنید.",
  ],
  [
    "چطور هم‌بازی پیدا کنم؟",
    "در بخش بازی‌های باز، سطح و زمان مناسب را پیدا کنید یا بازی خودتان را بسازید. ظرفیت هر بازی چهار نفر است.",
  ],
  [
    "هزینه هر نفر چطور محاسبه می‌شود؟",
    "سهم زمین، سهم تجهیزات مشترک، تجهیزات شخصی و کارمزد به‌صورت جداگانه نمایش داده می‌شوند. مبلغ نهایی از سمت سرور محاسبه می‌شود.",
  ],
  [
    "اگر بازی تکمیل نشود چه می‌شود؟",
    "اگر تا چهار ساعت پیش از شروع، هر چهار نفر پرداخت نکرده باشند، بازی لغو و درخواست استرداد کامل پرداخت‌های معتبر ثبت می‌شود. انجام استرداد با مرجع بانکی قابل پیگیری است.",
  ],
  [
    "چطور در امریکانو شرکت کنم؟",
    "رویداد منتشرشده را انتخاب و ثبت‌نام کنید. فرمت هشت‌نفره روی دو زمین در هفت دور برگزار می‌شود و هر بازیکن یک بار با همه هم‌تیمی می‌شود.",
  ],
  [
    "سطح بازیکن‌ها چطور مشخص می‌شود؟",
    "سطح اولیه از خوداظهاری C− تا A انتخاب می‌شود. تأیید سطح جداگانه است و نتایج دوستانه به‌صورت خودکار رتبه رقابتی را تغییر نمی‌دهند.",
  ],
];
export default async function Home() {
  const [data, games, ev] = await Promise.all([catalog(), matches(), events()]);
  return (
    <>
      <LandingMotion />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@graph": [
              { "@type": "Organization", name: "مچ شو", url: siteUrl() },
              {
                "@type": "WebSite",
                name: "مچ شو",
                url: siteUrl(),
                inLanguage: "fa-IR",
              },
            ],
          }),
        }}
      />
      <section className="landing-hero">
        <div className="hero-noise" aria-hidden />
        <div className="public-container hero-layout">
          <div className="hero-copy">
            <p className="hero-kicker">
              <span />
              دنیای بازی‌های راکتی
            </p>
            <h1>
              بازی بعدیت
              <br />
              <span>همین‌جاست.</span>
            </h1>
            <p className="hero-description">
              زمین موردعلاقه‌ت رو رزرو کن، هم‌بازی‌های هم‌سطحت رو پیدا کن و وارد
              رقابت شو. از بازی دوستانه تا امریکانو، همه‌چیز توی مچ شو کنار
              همه.
            </p>
            <div className="hero-actions">
              <Button asChild>
                <Link href="/matches">
                  پیدا کردن بازی
                  <ArrowUpLeft size={20} />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/clubs">رزرو زمین</Link>
              </Button>
            </div>
            <a href="#how-it-works" className="how-link">
              چطور کار می‌کنه؟
              <MoveUpLeft size={16} />
            </a>
          </div>
          <div className="hero-art" aria-label="تصویرسازی زمین پدل و توپ">
            <div className="hero-orbit" />
            <svg
              className="hero-court"
              viewBox="0 0 620 650"
              role="img"
              aria-label="زمین پدل سبز با خطوط سفید و توپ لیمویی"
            >
              <defs>
                <pattern
                  id="court-grain"
                  width="8"
                  height="8"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="1" cy="1" r=".6" fill="#fff" opacity=".08" />
                </pattern>
                <linearGradient id="court-floor" x2="1" y2="1">
                  <stop stopColor="#316957" />
                  <stop offset="1" stopColor="#173e34" />
                </linearGradient>
                <radialGradient id="ball-light" cx=".3" cy=".2">
                  <stop stopColor="#ecffac" />
                  <stop offset="1" stopColor="#b6df54" />
                </radialGradient>
              </defs>
              <g
                className="court-plane"
                transform="translate(130 66) rotate(13 160 240)"
              >
                <rect
                  width="340"
                  height="500"
                  rx="12"
                  fill="#071d18"
                  transform="translate(12 15)"
                />
                <rect
                  width="340"
                  height="500"
                  rx="10"
                  fill="url(#court-floor)"
                />
                <rect width="340" height="500" fill="url(#court-grain)" />
                <g fill="none" stroke="#d8ebc9" strokeWidth="2.5" opacity=".8">
                  <rect x="22" y="22" width="296" height="456" />
                  <path d="M22 120h296M22 380h296M170 22v456M0 250h340" />
                </g>
                <g stroke="#d9efc5" opacity=".3">
                  <path d="M0 246h340M0 254h340M0 262h340M20 242v24M40 242v24M60 242v24M80 242v24M100 242v24M120 242v24M140 242v24M160 242v24M180 242v24M200 242v24M220 242v24M240 242v24M260 242v24M280 242v24M300 242v24M320 242v24" />
                </g>
                <circle cx="80" cy="170" r="13" fill="#e2f4d0" />
                <circle cx="245" cy="330" r="13" fill="#bbde76" />
              </g>
              <g className="hero-ball">
                <ellipse
                  cx="400"
                  cy="490"
                  rx="60"
                  ry="17"
                  fill="#091d15"
                  opacity=".5"
                />
                <circle cx="402" cy="423" r="63" fill="url(#ball-light)" />
                <path
                  d="M351 386c72 2 14 65 92 83M391 362c-42 61 67 44 45 114"
                  fill="none"
                  stroke="#f4ffce"
                  strokeWidth="4"
                />
              </g>
            </svg>
            <div className="hero-floating">
              <Users size={18} />
              <div>
                <b>چهار نفر، یک قرار</b>
                <span>با هم‌سطح‌های خودت بازی کن</span>
              </div>
              <ArrowUpLeft size={20} />
            </div>
            <span className="hero-side-label">
              از اولین سرویس تا آخرین امتیاز
            </span>
          </div>
        </div>
        <div className="hero-proof public-container">
          <span>
            <ShieldCheck size={17} />
            قیمت روشن، تأیید واقعی
          </span>
          <span>
            <CalendarDays size={17} />
            سانس مناسب برنامه تو
          </span>
          <span>
            <Users size={17} />
            رقابت، رفاقت، تکرار
          </span>
        </div>
      </section>
      <section className="public-section public-container" data-reveal>
        <div className="section-heading">
          <div>
            <p className="eyebrow">جای تو توی این بازی خالیه</p>
            <h2>یه بازی خوب منتظرته.</h2>
          </div>
          <Link href="/matches">
            همه بازی‌ها
            <ArrowUpLeft size={18} />
          </Link>
        </div>
        <DataNotice unavailable={games.unavailable} />
        {games.rows.length ? (
          <div className="discovery-grid">
            {games.rows.slice(0, 3).map((m) => (
              <MatchCardPublic key={m.id} match={m} />
            ))}
          </div>
        ) : (
          <PublicEmpty
            title="بازی بعدی می‌تواند بازی تو باشد."
            body="هنوز بازیِ باز منتشر نشده است. باشگاه و سانس مناسب را پیدا کن و اولین قرار را بساز."
          />
        )}
      </section>
      <section className="public-section public-container" data-reveal>
        <div className="section-heading">
          <div>
            <p className="eyebrow">همین نزدیکی، یک زمین منتظرته</p>
            <h2>زمین خوب، شروع یه بازی خوبه.</h2>
          </div>
          <Link href="/clubs">
            کاوش باشگاه‌ها
            <ArrowUpLeft size={18} />
          </Link>
        </div>
        <DataNotice unavailable={data.unavailable} />
        {data.clubs.length ? (
          <div className="discovery-grid">
            {data.clubs
              .toSorted((a, b) => Number(b.featured) - Number(a.featured))
              .slice(0, 3)
              .map((c) => (
                <ClubCard
                  key={c.id}
                  club={c}
                  courts={data.courts}
                  city={data.cities.find((x) => x.id === c.city_id)}
                />
              ))}
          </div>
        ) : (
          <PublicEmpty
            title="باشگاه‌ها بعد از بررسی اینجا می‌آیند."
            body="فقط اطلاعات باشگاه‌های منتشرشده و سانس‌های معتبر نمایش داده می‌شود."
          />
        )}
      </section>
      <section id="how-it-works" className="landing-journey" data-reveal>
        <div className="public-container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">کمتر هماهنگ کن؛ بیشتر بازی کن</p>
              <h2>از تصمیم تا بازی، فقط چند قدم.</h2>
            </div>
          </div>
          <JourneyDemo />
        </div>
      </section>
      <section className="public-section public-container" data-reveal>
        <div className="competition-intro">
          <div>
            <p className="eyebrow">هر دور، یک داستان تازه</p>
            <h2>
              رقابت فقط
              <br />
              یه بازی نیست.
            </h2>
            <p>
              در امریکانو همه با هم بازی می‌کنند. هشت بازیکن، دو زمین، هفت دور؛
              و در پایان، یک پادشاه زمین.
            </p>
            <Link
              className="inline-flex items-center gap-2 text-sm font-bold"
              href="/events"
            >
              امریکانو و مسابقات
              <ArrowUpLeft size={18} />
            </Link>
          </div>
          <div className="rank-illustration">
            <span>نمایش آموزشی پروفایل</span>
            <div className="rank-avatar">🎾</div>
            <h3>هر بازی، یه قدم جلوتر.</h3>
            <p>سطح خوداظهاری · سابقه بازی · نتایج قابل پیگیری</p>
            <div className="flex justify-center gap-2">
              {["بازی کن", "نتیجه ثبت کن", "پیشرفتت را ببین"].map((s) => (
                <b key={s}>{s}</b>
              ))}
            </div>
            <Link href="/leaderboard">رتبه‌بندی واقعی باشگاه ↖</Link>
          </div>
        </div>
        {ev.rows.filter((e) => e.published).length > 0 && (
          <div className="discovery-grid mt-12">
            {ev.rows
              .filter((e) => e.published)
              .slice(0, 3)
              .map((e) => (
                <EventCard
                  key={e.id}
                  event={e}
                  club={data.clubs.find((c) => c.id === e.club_id)}
                />
              ))}
          </div>
        )}
      </section>
      {data.cities.some((c) =>
        data.clubs.some((cl) => cl.city_id === c.id),
      ) && (
        <section className="public-container pb-16">
          <h2 className="mb-6 text-2xl font-extrabold">بازی در شهر تو</h2>
          <div className="flex flex-wrap gap-3">
            {data.cities
              .filter((c) => data.clubs.some((cl) => cl.city_id === c.id))
              .map((c) => (
                <Link
                  href={`/cities/${c.slug}/padel`}
                  key={c.id}
                  className="city-link"
                >
                  <MapPin size={17} />
                  {c.name}
                  <ArrowUpLeft size={16} />
                </Link>
              ))}
          </div>
        </section>
      )}
      <section
        className="public-section public-container faq-section"
        data-reveal
      >
        <div>
          <p className="eyebrow">قبل از اولین سرویس</p>
          <h2>سؤالی مونده؟</h2>
          <p className="mt-4 text-sm leading-8 text-muted-foreground">
            قواعد روشن، بازی راحت‌تر.
            <br />
            شرایط هر رزرو را قبل از پرداخت بخوان.
          </p>
        </div>
        <div>
          {faqs.map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <span>+</span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <section
        className="public-section public-container rally-story"
        data-reveal
      >
        <p className="eyebrow">از گیلان، برای رالی‌های بیشتر</p>
        <h2>مچ شو، فراتر از رزرو زمین.</h2>
        <p className="intro">
          ما مچ شو رو ساختیم تا هماهنگ کردن بازی راحت‌تر بشه. جایی برای پیدا
          کردن هم‌بازی، تجربه رقابت‌های تازه و کنار هم قرار گرفتن آدم‌هایی که از
          بازی لذت می‌برن. شروع ما با پدل در گیلانه؛ زمین‌ها و بازی‌های منتشرشده
          رو همین‌جا ببین.
        </p>
        <Link href="/matches">پیدا کردن هم‌بازی ↖</Link>
      </section>
      <section className="final-cta">
        <div className="public-container">
          <span aria-hidden>↖</span>
          <p>قرار بعدی، توی زمین.</p>
          <h2>
            وقتشه رالی بعدی
            <br />
            رو شروع کنی.
          </h2>
          <Button asChild>
            <Link href="/clubs">
              بریم زمین
              <ArrowUpLeft size={21} />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
