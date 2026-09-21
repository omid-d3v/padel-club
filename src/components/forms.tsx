"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Search,
  Check,
  LoaderCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { PlayerAvatar } from "@/components/shared";
import {
  savePlayer,
  deletePlayer,
  createTournament,
  login,
} from "@/app/actions";
import type { Player } from "@/lib/types";
import { fullName, number, cn } from "@/lib/utils";
export function Pending({
  pending,
  label,
}: {
  pending: boolean;
  label: string;
}) {
  return (
    <>
      {pending && <LoaderCircle size={18} className="animate-spin" />}
      {pending ? "در حال ثبت…" : label}
    </>
  );
}
export function LoginForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        setError("");
        start(async () => {
          try {
            const r = await login(
              String(d.get("email")).trim(),
              String(d.get("password")),
            );
            if (!r.success) setError(r.error);
            else {
              router.replace("/");
            }
          } catch {
            setError("اتصال برقرار نشد؛ دوباره تلاش کنید.");
          }
        });
      }}
    >
      <label className="block text-sm">
        ایمیل مدیر
        <Input
          className="mt-2 text-left"
          dir="ltr"
          type="email"
          name="email"
          autoComplete="username"
          required
          placeholder="you@example.com"
        />
      </label>
      <label className="block text-sm">
        رمز عبور
        <Input
          className="mt-2 text-left"
          dir="ltr"
          type="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <Button disabled={pending} className="w-full">
        <Pending pending={pending} label="ورود به پنل مدیریت" />
      </Button>
    </form>
  );
}
export function PlayerForm({ player }: { player?: Player }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <>
      <Button
        variant={player ? "ghost" : "default"}
        size={player ? "icon" : "default"}
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        aria-label={player ? `ویرایش ${fullName(player)}` : undefined}
      >
        {player ? (
          <Pencil size={17} />
        ) : (
          <>
            <Plus size={18} />
            بازیکن جدید
          </>
        )}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!pending) setOpen(o);
        }}
        title={player ? "ویرایش بازیکن" : "بازیکن جدید"}
        description="نام بازیکن را ثبت کنید؛ شماره موبایل اختیاری است."
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.currentTarget));
            setError("");
            start(async () => {
              try {
                const result = await savePlayer(data, player?.id);
                if (!result.success) {
                  setError(result.error);
                  return;
                }
                toast.success(
                  player ? "اطلاعات بازیکن به‌روز شد" : "بازیکن ثبت شد",
                );
                setOpen(false);
              } catch {
                setError("ثبت انجام نشد؛ دوباره تلاش کنید.");
              }
            });
          }}
        >
          <label className="block text-sm">
            نام <span className="text-red-600">*</span>
            <Input
              name="first_name"
              required
              maxLength={50}
              defaultValue={player?.first_name}
              className="mt-2"
              autoComplete="given-name"
            />
          </label>
          <label className="block text-sm">
            نام خانوادگی <span className="text-red-600">*</span>
            <Input
              name="last_name"
              required
              maxLength={50}
              defaultValue={player?.last_name}
              className="mt-2"
              autoComplete="family-name"
            />
          </label>
          <label className="block text-sm">
            شماره موبایل
            <Input
              name="phone"
              type="tel"
              defaultValue={player?.phone ?? ""}
              className="mt-2"
              autoComplete="tel"
              placeholder="اختیاری"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <Button className="w-full" disabled={pending}>
            <Pending
              pending={pending}
              label={player ? "ذخیره تغییرات" : "ثبت بازیکن"}
            />
          </Button>
        </form>
      </Dialog>
    </>
  );
}
export function DeletePlayer({ player }: { player: Player }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label={`حذف ${fullName(player)}`}
      >
        <Trash2 size={17} />
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!pending) setOpen(o);
        }}
        title="حذف بازیکن"
        description={`آیا ${fullName(player)} حذف شود؟ بازیکنی که سابقه مسابقه دارد قابل حذف نیست.`}
      >
        <div className="flex gap-3">
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                try {
                  const r = await deletePlayer(player.id);
                  if (!r.success) toast.error(r.error);
                  else {
                    toast.success("بازیکن حذف شد");
                    setOpen(false);
                  }
                } catch {
                  toast.error("حذف انجام نشد.");
                }
              })
            }
          >
            <Pending pending={pending} label="حذف بازیکن" />
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            انصراف
          </Button>
        </div>
      </Dialog>
    </>
  );
}
export function CreateTournamentForm({ players }: { players: Player[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        setError("");
        start(async () => {
          try {
            const r = await createTournament({
              title: d.get("title"),
              date: d.get("date"),
              player_ids: selected,
            });
            if (!r.success) {
              setError(r.error);
              return;
            }
            toast.success("مچ‌میکینگ ساخته شد");
            router.push(`/tournaments/${r.id}`);
          } catch {
            setError("ساخت مسابقه انجام نشد؛ دوباره تلاش کنید.");
          }
        });
      }}
      className="grid items-start gap-6 xl:grid-cols-[1fr_320px]"
    >
      <div className="space-y-6">
        <section className="panel p-5 md:p-7">
          <h2 className="mb-6 text-lg font-bold">مشخصات مسابقه</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm">
              عنوان مچ‌میکینگ
              <Input
                name="title"
                className="mt-2"
                required
                minLength={2}
                maxLength={100}
                placeholder="مثلاً پدل پنجشنبه‌ها"
              />
            </label>
            <label className="text-sm">
              تاریخ برگزاری{" "}
              <span className="text-xs text-muted-foreground">
                (ورودی میلادی)
              </span>
              <Input
                name="date"
                type="date"
                className="mt-2"
                required
                defaultValue={new Intl.DateTimeFormat("en-CA", {
                  timeZone: "Asia/Tehran",
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                }).format(new Date())}
              />
            </label>
          </div>
        </section>
        <section className="panel p-5 md:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">انتخاب بازیکنان</h2>
            <span
              aria-live="polite"
              className="rounded-full bg-lime-50 px-3 py-2 text-xs text-emerald-900"
            >
              {number(selected.length)} از ۸ بازیکن انتخاب شده
            </span>
          </div>
          <div className="relative mb-5">
            <Search
              className="absolute end-3 top-3.5 text-muted-foreground"
              size={19}
            />
            <Input
              aria-label="جست‌وجوی بازیکن"
              className="pe-11"
              placeholder="نام بازیکن را جست‌وجو کنید…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {players.length < 8 && (
            <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm leading-7 text-amber-900">
              برای ساخت مسابقه حداقل هشت بازیکن ثبت کنید.{" "}
              <Link className="underline" href="/players">
                رفتن به بازیکنان
              </Link>
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {players
              .filter((p) => fullName(p).includes(search))
              .map((p) => (
                <label
                  key={p.id}
                  className={cn(
                    "flex min-h-20 cursor-pointer items-center gap-3 rounded-xl border p-3",
                    selected.includes(p.id)
                      ? "border-lime-400 bg-lime-50"
                      : "border-border",
                  )}
                >
                  <input
                    type="checkbox"
                    className="size-5 accent-emerald-800"
                    checked={selected.includes(p.id)}
                    disabled={
                      pending ||
                      (!selected.includes(p.id) && selected.length === 8)
                    }
                    onChange={(e) =>
                      setSelected((s) =>
                        e.target.checked
                          ? [...s, p.id]
                          : s.filter((id) => id !== p.id),
                      )
                    }
                  />
                  <PlayerAvatar player={p} />
                  <span className="text-sm">{fullName(p)}</span>
                </label>
              ))}
          </div>
        </section>
      </div>
      <aside className="panel p-6 xl:sticky xl:top-6">
        <span className="text-3xl">🎾</span>
        <h2 className="mb-5 mt-4 text-xl font-bold">همه با هم، در یک زمین</h2>
        <ul className="space-y-4 text-sm text-muted-foreground">
          {[
            "۸ بازیکن با هم‌تیمی‌های چرخشی",
            "۲ زمین هم‌زمان",
            "۷ دور، ۱۴ بازی و ۴۲ ست",
            "تخصیص تصادفی اسلات‌های A تا H",
          ].map((s) => (
            <li key={s} className="flex gap-2">
              <Check size={17} className="text-emerald-700" />
              {s}
            </li>
          ))}
        </ul>
        <p className="my-6 border-t border-border pt-5 text-xs leading-7 text-muted-foreground">
          پس از ساخت، برنامه آماده می‌شود. شروع بازی‌ها را در صفحه مسابقه اعلام
          کنید.
        </p>
        {error && (
          <p role="alert" className="mb-4 text-sm text-red-700">
            {error}
          </p>
        )}
        <Button className="w-full" disabled={pending || selected.length !== 8}>
          <Pending pending={pending} label="ساخت مچ‌میکینگ" />
        </Button>
      </aside>
    </form>
  );
}
