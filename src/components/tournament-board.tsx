"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Flag,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Pending } from "@/components/forms";
import { TournamentStandings } from "@/components/shared";
import { saveRoundWinners, changeStatus, deleteMatch } from "@/app/actions";
import type { Match, MatchSet, Player, TournamentData } from "@/lib/types";
import { cn, fullName, number } from "@/lib/utils";
export function RoundWinnerPicker({
  winner,
  onChange,
  team1,
  team2,
  disabled,
}: {
  winner: 1 | 2 | null;
  onChange: (winner: 1 | 2 | null) => void;
  team1: string;
  team2: string;
  disabled: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        type="button"
        variant={winner === 1 ? "default" : "outline"}
        disabled={disabled}
        aria-pressed={winner === 1}
        aria-label={`تیم اول: ${team1}`}
        onClick={() => onChange(winner === 1 ? null : 1)}
        className="h-auto min-h-12 whitespace-normal px-3 py-2 text-xs leading-6"
      >
        تیم اول
        <span className="sr-only">: {team1}</span>
      </Button>
      <Button
        type="button"
        variant={winner === 2 ? "default" : "outline"}
        disabled={disabled}
        aria-pressed={winner === 2}
        aria-label={`تیم دوم: ${team2}`}
        onClick={() => onChange(winner === 2 ? null : 2)}
        className="h-auto min-h-12 whitespace-normal px-3 py-2 text-xs leading-6"
      >
        تیم دوم
        <span className="sr-only">: {team2}</span>
      </Button>
    </div>
  );
}
export function MatchCard({
  match,
  sets,
  players,
  locked,
  canDelete,
  onDirty,
}: {
  match: Match;
  sets: MatchSet[];
  players: Player[];
  locked: boolean;
  canDelete: boolean;
  onDirty: (id: string, dirty: boolean) => void;
}) {
  const [roundWinners, setRoundWinners] = useState(
    sets.map((s) => ({
      set_number: s.set_number,
      winner_team: s.winner_team,
    })),
  );
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
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
        <div className="flex items-center gap-2">
          {dirty ? (
            <span className="text-xs text-amber-800">ذخیره نشده</span>
          ) : match.winner_team ? (
            <span className="flex items-center gap-1 text-xs text-emerald-700">
              <Check size={16} />
              پایان بازی
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              در انتظار نتیجه
            </span>
          )}
          {canDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={pending}
              onClick={() => setDeleteOpen(true)}
              aria-label={`حذف بازی زمین ${number(match.court_number)}`}
              className="text-red-700 hover:bg-red-50 hover:text-red-800"
            >
              <Trash2 size={17} />
            </Button>
          )}
        </div>
      </div>
      <form
        className="p-5"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          start(async () => {
            try {
              const r = await saveRoundWinners(
                match.id,
                match.version,
                roundWinners,
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
          {roundWinners.map((s, i) => (
            <div
              key={s.set_number}
              className="rounded-xl border border-border p-3"
            >
              <p className="mb-3 text-center text-xs font-semibold text-muted-foreground">
                راند {number(s.set_number)} — کدام تیم برد؟
              </p>
              <RoundWinnerPicker
                disabled={pending || locked}
                team1={team1}
                team2={team2}
                winner={s.winner_team}
                onChange={(winner) => {
                  setDirty(true);
                  onDirty(match.id, true);
                  setRoundWinners((prev) =>
                    prev.map((x, j) =>
                      i === j ? { ...x, winner_team: winner } : x,
                    ),
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
              label={
                match.winner_team ? "ذخیره انتخاب‌های جدید" : "ثبت برنده راندها"
              }
            />
          </Button>
        )}
      </form>
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!pending) setDeleteOpen(open);
        }}
        title="این بازی حذف شود؟"
        description="بازی، انتخاب‌های سه راند و اثر آن در جدول نتایج کاملاً حذف می‌شود. این کار قابل بازگشت نیست."
      >
        <div className="flex gap-3">
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                try {
                  const result = await deleteMatch(
                    match.id,
                    match.tournament_id,
                  );
                  if (!result.success) {
                    toast.error(result.error);
                    return;
                  }
                  setDeleteOpen(false);
                  onDirty(match.id, false);
                  toast.success("بازی و نتیجه‌های آن حذف شد");
                  router.refresh();
                } catch {
                  toast.error("حذف بازی انجام نشد. دوباره تلاش کنید.");
                }
              })
            }
          >
            <Pending pending={pending} label="حذف کامل بازی" />
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => setDeleteOpen(false)}
          >
            انصراف
          </Button>
        </div>
      </Dialog>
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
  const totalMatches = data.matches.length;
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
            {number(completed)} از {number(totalMatches)} بازی کامل شده
          </span>
        </div>
        <progress
          aria-label="پیشرفت مسابقه"
          value={completed}
          max={Math.max(totalMatches, 1)}
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
              canDelete={status !== "completed"}
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
              برد بازی، سپس برد راند و تفاضل راند؛ تساوی کامل بر اساس اسلات
              اولیه.
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
          جدول پس از هر ثبت نتیجه یا حذف بازی به‌روز می‌شود. راندهای ثبت‌شدهٔ
          بازی ناتمام هم در آمار راندها لحاظ می‌شوند.
        </p>
      </section>
      {totalMatches > 0 &&
        completed === totalMatches &&
        status === "active" && (
          <div className="panel flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <h2 className="font-bold">وقت معرفی پادشاه زمین است 👑</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                همه بازی‌های باقی‌مانده ثبت شده‌اند. نتایج را نهایی کنید.
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
        description="با پایان مسابقه، نتایج قفل می‌شوند و در لیدربرد عمومی قرار می‌گیرند. قبل از ادامه، برنده راندها را بررسی کنید."
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
