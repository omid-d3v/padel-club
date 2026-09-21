"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Flag,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Pending } from "@/components/forms";
import { TournamentStandings } from "@/components/shared";
import { saveScores, changeStatus } from "@/app/actions";
import type { Match, MatchSet, Player, TournamentData } from "@/lib/types";
import { cn, fullName, number } from "@/lib/utils";
import { normalizeDigits } from "@/lib/validation";
export function ScoreInput({
  value,
  onChange,
  label,
  disabled,
}: {
  value: string;
  onChange: (s: string) => void;
  label: string;
  disabled: boolean;
}) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      pattern="[0-9۰-۹٠-٩]*"
      maxLength={2}
      value={value}
      onChange={(e) => {
        const v = normalizeDigits(e.target.value);
        if (/^\d{0,2}$/.test(v)) onChange(v);
      }}
      aria-label={label}
      placeholder="—"
      disabled={disabled}
      dir="ltr"
      className="h-14 max-w-24 text-center text-2xl font-bold tabular-nums"
    />
  );
}
export function MatchCard({
  match,
  sets,
  players,
  locked,
  onDirty,
}: {
  match: Match;
  sets: MatchSet[];
  players: Player[];
  locked: boolean;
  onDirty: (id: string, dirty: boolean) => void;
}) {
  const [scores, setScores] = useState(
    sets.map((s) => ({
      set_number: s.set_number,
      a: s.team1_score === null ? "" : String(s.team1_score),
      b: s.team2_score === null ? "" : String(s.team2_score),
    })),
  );
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const router = useRouter();
  const name = (id: string) => {
    const p = players.find((p) => p.id === id);
    return p ? fullName(p) : "بازیکن";
  };
  const team1 = `${name(match.team1_player1_id)} + ${name(match.team1_player2_id)}`,
    team2 = `${name(match.team2_player1_id)} + ${name(match.team2_player2_id)}`;
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 className="flex items-center gap-2 font-bold">
          <span className="grid size-8 place-items-center rounded-lg bg-muted text-sm">
            {number(match.court_number)}
          </span>
          زمین {number(match.court_number)}
        </h3>
        {dirty ? (
          <span className="text-xs text-amber-800">ذخیره نشده</span>
        ) : match.winner_team ? (
          <span className="flex items-center gap-1 text-xs text-emerald-700">
            <Check size={16} />
            پایان بازی
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">در انتظار نتیجه</span>
        )}
      </div>
      <form
        className="p-5"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          start(async () => {
            try {
              const r = await saveScores(
                match.id,
                match.version,
                scores.map((s) => ({
                  set_number: s.set_number,
                  team1_score: s.a === "" ? null : Number(s.a),
                  team2_score: s.b === "" ? null : Number(s.b),
                })),
              );
              if (!r.success) {
                setError(r.error);
                return;
              }
              setDirty(false);
              onDirty(match.id, false);
              toast.success("نتیجه بازی ثبت شد");
              router.refresh();
            } catch {
              setError("نتیجه ذخیره نشد؛ دوباره تلاش کنید.");
            }
          });
        }}
      >
        <div className="grid grid-cols-[1fr_26px_1fr] items-center gap-1">
          <div
            className={cn(
              "rounded-xl p-3 text-center text-sm font-semibold leading-7",
              match.winner_team === 1 && !dirty
                ? "bg-lime-100 text-emerald-900"
                : "bg-muted",
            )}
          >
            <p className="mb-1 text-[10px] font-normal text-muted-foreground">
              تیم اول
            </p>
            {team1}
          </div>
          <span className="text-center text-[10px] text-muted-foreground">
            VS
          </span>
          <div
            className={cn(
              "rounded-xl p-3 text-center text-sm font-semibold leading-7",
              match.winner_team === 2 && !dirty
                ? "bg-lime-100 text-emerald-900"
                : "bg-muted",
            )}
          >
            <p className="mb-1 text-[10px] font-normal text-muted-foreground">
              تیم دوم
            </p>
            {team2}
          </div>
        </div>
        <div className="my-6 space-y-4">
          {scores.map((s, i) => (
            <div
              key={s.set_number}
              className="grid grid-cols-[1fr_48px_1fr] items-center justify-items-center gap-3"
            >
              <ScoreInput
                disabled={pending || locked}
                label={`زمین ${match.court_number}، ست ${s.set_number}، تیم اول: ${team1}`}
                value={s.a}
                onChange={(v) => {
                  setDirty(true);
                  onDirty(match.id, true);
                  setScores((prev) =>
                    prev.map((x, j) => (i === j ? { ...x, a: v } : x)),
                  );
                }}
              />
              <span className="text-xs text-muted-foreground">
                ست {number(s.set_number)}
              </span>
              <ScoreInput
                disabled={pending || locked}
                label={`زمین ${match.court_number}، ست ${s.set_number}، تیم دوم: ${team2}`}
                value={s.b}
                onChange={(v) => {
                  setDirty(true);
                  onDirty(match.id, true);
                  setScores((prev) =>
                    prev.map((x, j) => (i === j ? { ...x, b: v } : x)),
                  );
                }}
              />
            </div>
          ))}
        </div>
        {error && (
          <p role="alert" className="mb-4 text-sm leading-7 text-red-700">
            {error}
          </p>
        )}
        {!locked && (
          <Button className="w-full" disabled={pending || !dirty}>
            <Pending
              pending={pending}
              label={match.winner_team ? "ذخیره نتیجه جدید" : "ثبت نتیجه"}
            />
          </Button>
        )}
      </form>
    </section>
  );
}
export function RoundNavigator({
  round,
  onChange,
  disabled,
}: {
  round: number;
  onChange: (n: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={round === 1 || disabled}
        onClick={() => onChange(round - 1)}
      >
        <ChevronRight size={17} />
        دور قبل
      </Button>
      <span className="text-sm font-bold">دور {number(round)} از ۷</span>
      <Button
        variant="outline"
        size="sm"
        disabled={round === 7 || disabled}
        onClick={() => onChange(round + 1)}
      >
        دور بعد
        <ChevronLeft size={17} />
      </Button>
    </div>
  );
}
export function TournamentBoard({ data }: { data: TournamentData }) {
  const router = useRouter();
  const completed = data.matches.filter((m) => m.winner_team !== null).length;
  const firstIncomplete =
    data.rounds.find((r) =>
      data.matches.some((m) => m.round_id === r.id && m.winner_team === null),
    )?.round_number ?? 7;
  const [round, setRound] = useState(firstIncomplete);
  const [dirtyIds, setDirtyIds] = useState<string[]>([]);
  const [finishOpen, setFinishOpen] = useState(false);
  const [pending, start] = useTransition();
  const dirty = dirtyIds.length > 0;
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  const status = data.tournament.status;
  const currentRound = data.rounds.find((r) => r.round_number === round);
  const change = (action: "start" | "finish") =>
    start(async () => {
      try {
        const r = await changeStatus(data.tournament.id, action);
        if (!r.success) {
          toast.error(r.error);
          return;
        }
        toast.success(
          action === "start" ? "مسابقه شروع شد" : "مسابقه با موفقیت پایان یافت",
        );
        if (action === "finish")
          router.push(`/tournaments/${data.tournament.id}/results`);
        else router.refresh();
      } catch {
        toast.error("تغییر وضعیت انجام نشد.");
      }
    });
  return (
    <div className="space-y-6">
      {status === "draft" && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-lime-200 bg-lime-50 p-5">
          <div>
            <h2 className="font-bold">همه‌چیز برای شروع آماده است</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              اسلات‌ها تخصیص داده شده‌اند؛ با شروع مسابقه ثبت نتیجه فعال می‌شود.
            </p>
          </div>
          <Button onClick={() => change("start")} disabled={pending}>
            <Pending pending={pending} label="شروع مسابقه" />
          </Button>
        </div>
      )}
      <div className="panel p-5">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-medium">مسیر مسابقه</span>
          <span className="text-muted-foreground">
            {number(completed)} از ۱۴ بازی کامل شده
          </span>
        </div>
        <progress
          aria-label="پیشرفت مسابقه"
          value={completed}
          max={14}
          className="h-2 w-full overflow-hidden rounded-full accent-lime-500"
        />
        <div className="mt-5">
          <RoundNavigator
            round={round}
            onChange={setRound}
            disabled={dirty || pending}
          />
        </div>
        {dirty && (
          <p role="status" className="mt-4 text-xs text-amber-800">
            پیش از جابه‌جایی دور یا تازه‌سازی، نتیجه‌های ویرایش‌شده را ذخیره
            کنید.
          </p>
        )}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {data.matches
          .filter((m) => m.round_id === currentRound?.id)
          .map((m) => (
            <MatchCard
              key={`${m.id}-${m.version}`}
              match={m}
              sets={data.sets.filter((s) => s.match_id === m.id)}
              players={data.players}
              locked={status !== "active"}
              onDirty={(id, isDirty) =>
                setDirtyIds((prev) =>
                  isDirty
                    ? [...new Set([...prev, id])]
                    : prev.filter((x) => x !== id),
                )
              }
            />
          ))}
      </div>
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">جدول زنده</h2>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              امتیاز، برد ست، سپس تفاضل؛ تساوی کامل بر اساس اسلات اولیه.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            disabled={dirty}
            onClick={() => router.refresh()}
            aria-label="تازه‌سازی جدول"
          >
            <RefreshCw size={19} />
          </Button>
        </div>
        <TournamentStandings
          standings={data.standings}
          players={data.players}
        />
        <p className="mt-3 text-xs text-muted-foreground">
          جدول پس از هر ثبت نتیجه به‌روز می‌شود. ست‌های کاملِ بازی ناتمام هم در
          امتیازها لحاظ می‌شوند.
        </p>
      </section>
      {completed === 14 && status === "active" && (
        <div className="panel flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h2 className="font-bold">وقت معرفی پادشاه زمین است 👑</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              هر ۱۴ بازی ثبت شده. نتایج را نهایی کنید.
            </p>
          </div>
          <Button
            disabled={dirty || pending}
            onClick={() => setFinishOpen(true)}
          >
            <Flag size={18} />
            پایان مچ‌میکینگ
          </Button>
        </div>
      )}
      <Dialog
        open={finishOpen}
        onOpenChange={(o) => {
          if (!pending) setFinishOpen(o);
        }}
        title="نتایج نهایی شوند؟"
        description="با پایان مسابقه، نتایج قفل می‌شوند و در لیدربرد عمومی قرار می‌گیرند. قبل از ادامه، امتیازها را بررسی کنید."
      >
        <div className="flex gap-3">
          <Button disabled={pending} onClick={() => change("finish")}>
            <Pending pending={pending} label="تأیید و پایان مسابقه" />
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => setFinishOpen(false)}
          >
            بازگشت
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
