import Link from "next/link";
import { redirect } from "next/navigation";
import { PanelTop, ArrowUpLeft } from "lucide-react";
import { LoginForm } from "@/components/forms";
import { configured } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!configured()) redirect("/setup");
  const { error } = await searchParams;
  return (
    <main id="main" className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link
            href="/leaderboard"
            className="mb-14 flex items-center gap-3 text-xl font-bold"
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-primary">
              <PanelTop />
            </span>
            پدل کلاب
          </Link>
          <p className="text-sm text-emerald-700">خوش آمدید</p>
          <h1 className="mb-3 mt-3 text-3xl font-extrabold">زمین آماده است.</h1>
          <p className="mb-8 text-sm leading-7 text-muted-foreground">
            وارد شوید و جریان مسابقه را در دست بگیرید.
          </p>
          {error === "admin" && (
            <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm">
              حساب شما دسترسی مدیریت ندارد. با یک حساب ادمین وارد شوید.
            </p>
          )}
          <LoginForm />
          <Link
            className="mt-8 flex min-h-11 items-center justify-center gap-2 text-sm text-muted-foreground"
            href="/leaderboard"
          >
            مشاهده لیدربرد عمومی
            <ArrowUpLeft size={17} />
          </Link>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-[#23493b] p-16 text-white lg:flex lg:flex-col lg:justify-end">
        <div className="absolute start-1/3 top-20 scale-150 opacity-50">
          <div className="court-lines" />
        </div>
        <div className="relative">
          <span className="mb-6 inline-block rounded-full border border-white/30 px-4 py-2 text-xs">
            ۸ بازیکن. ۷ دور. یک پادشاه.
          </span>
          <h2 className="text-5xl font-extrabold leading-relaxed">
            رقابت روی زمین،
            <br />
            <span className="text-primary">رفاقت بیرون زمین.</span>
          </h2>
          <p className="mt-7 text-sm text-white/65">
            از اولین سرویس تا آخرین امتیاز، کنار شما هستیم.
          </p>
        </div>
      </div>
    </main>
  );
}
