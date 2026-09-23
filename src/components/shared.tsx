import Link from "next/link";
import { ArrowUpLeft, CalendarDays, Trophy, Users } from "lucide-react";
import type { ReactNode } from "react";
import type {
  Player,
  Tournament,
  Status,
  Standing,
  PublicResult,
  Leader,
} from "@/lib/types";
import { cn, date, fullName, number } from "@/lib/utils";
import { Button } from "@/components/ui/button";
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
export function StatusBadge({ status }: { status: Status }) {
  const states = {
    draft: ["آماده شروع", "bg-amber-50 text-amber-800"],
    active: ["در حال برگزاری", "bg-emerald-50 text-emerald-700"],
    completed: ["تکمیل شده", "bg-slate-100 text-slate-600"],
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium",
        states[status][1],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {states[status][0]}
    </span>
  );
}
export function StatCard({
  label,
  value,
  icon,
  detail,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  detail?: string;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="grid size-10 place-items-center rounded-xl bg-muted text-emerald-900">
          {icon}
        </span>
      </div>
      <p className="mt-5 text-3xl font-extrabold tabular-nums">
        {typeof value === "number" ? number(value) : value}
      </p>
      {detail && <p className="mt-2 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel flex min-h-64 flex-col items-center justify-center p-8 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-muted text-emerald-800">
        <Trophy size={25} />
      </span>
      <h2 className="font-bold">{title}</h2>
      <p className="mb-5 mt-2 max-w-md text-sm leading-7 text-muted-foreground">
        {description}
      </p>
      {action}
    </div>
  );
}
export function PlayerAvatar({
  player,
  className,
}: {
  player: Pick<Player, "first_name" | "last_name">;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#eff3e8] text-sm font-bold text-[#59743e]",
        className,
      )}
    >
      {player.first_name.charAt(0)}
      {player.last_name.charAt(0)}
    </span>
  );
}
export function PlayerName({
  player,
  link = false,
}: {
  player: Player;
  link?: boolean;
}) {
  const body = (
    <>
      <PlayerAvatar player={player} />
      <span>{fullName(player)}</span>
    </>
  );
  return link ? (
    <Link
      className="inline-flex min-h-11 items-center gap-3 hover:text-emerald-700"
      href={`/players/${player.id}`}
    >
      {body}
    </Link>
  ) : (
    <span className="inline-flex items-center gap-3">{body}</span>
  );
}
export function TournamentCard({
  tournament: t,
  publicLink = false,
}: {
  tournament: Tournament;
  publicLink?: boolean;
}) {
  return (
    <Link
      href={`/tournaments/${t.id}${publicLink ? "/results" : ""}`}
      className="panel group block p-5 transition hover:border-emerald-300 hover:shadow-sm"
    >
      <div className="flex justify-between gap-2">
        <span className="grid size-11 place-items-center rounded-xl bg-muted text-emerald-800">
          <Trophy size={21} />
        </span>
        <StatusBadge status={t.status} />
      </div>
      <h3 className="mb-4 mt-5 font-bold">{t.title}</h3>
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CalendarDays size={15} />
          {date(t.date)}
        </span>
        <span className="flex items-center gap-1.5">
          <Users size={15} />۸ بازیکن
        </span>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs">
        <span className="text-muted-foreground">
          ۲ زمین <span className="mx-2">•</span> ۷ دور
        </span>
        <span className="flex items-center gap-2 font-semibold text-emerald-800">
          {t.status === "completed" ? "مشاهده نتایج" : "مشاهده مسابقه"}
          <ArrowUpLeft size={16} />
        </span>
      </div>
    </Link>
  );
}
export function TournamentStandings({
  standings,
  players,
  detailed = false,
}: {
  standings: Standing[];
  players: Pick<Player, "id" | "first_name" | "last_name">[];
  detailed?: boolean;
}) {
  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="data-table">
          <caption className="sr-only">رتبه‌بندی بازیکنان در مسابقه</caption>
          <thead>
            <tr>
              <th>رتبه</th>
              <th>بازیکن</th>
              <th>برد بازی</th>
              <th>برد راند</th>
              {detailed && <th>باخت راند</th>}
              <th>تفاضل راند</th>
              {detailed && <th>باخت بازی</th>}
            </tr>
          </thead>
          <tbody>
            {standings.map((s) => {
              const p = players.find((p) => p.id === s.player_id);
              return (
                <tr
                  key={s.player_id}
                  className={s.rank === 1 ? "bg-lime-50/60" : ""}
                >
                  <td>
                    <span className="text-lg">
                      {["🥇", "🥈", "🥉"][s.rank - 1] ?? number(s.rank)}
                    </span>
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-3">
                      {p && <PlayerAvatar player={p} />}
                      <span className="font-medium">
                        {p ? fullName(p) : "بازیکن"}
                      </span>
                    </span>
                  </td>
                  <td className="font-extrabold text-emerald-900">
                    {number(s.total_points)}
                  </td>
                  <td>{number(s.sets_won)}</td>
                  {detailed && <td>{number(s.sets_lost)}</td>}
                  <td>
                    <span dir="ltr">
                      {s.point_difference > 0 ? "+" : ""}
                      {number(s.point_difference)}
                    </span>
                  </td>
                  {detailed && <td>{number(s.matches_lost)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export function Podium({ results }: { results: PublicResult[] }) {
  return (
    <div className="mx-auto mb-8 grid max-w-3xl grid-cols-3 items-end gap-2 md:gap-4">
      {[results[1], results[0], results[2]].filter(Boolean).map((r) => (
        <div
          key={r.player_id}
          className={cn(
            "panel flex flex-col items-center px-2 py-5 text-center",
            r.rank === 1
              ? "min-h-52 border-lime-300 bg-lime-50 md:min-h-60"
              : "min-h-40 md:min-h-48",
          )}
        >
          <span className="mb-4 text-3xl">
            {["🥇", "🥈", "🥉"][r.rank - 1]}
          </span>
          <PlayerAvatar player={r} />
          <p className="mt-3 text-xs font-bold md:text-base">{fullName(r)}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {number(r.total_points)} برد بازی
          </p>
        </div>
      ))}
    </div>
  );
}
export function PlayerBadge({ label }: { label: string }) {
  return (
    <span className="rounded-xl border border-lime-200 bg-lime-50 px-4 py-3 text-sm font-medium">
      {label}
    </span>
  );
}
export function LeaderboardTable({ leaders }: { leaders: Leader[] }) {
  return (
    <div className="panel overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>رتبه</th>
            <th>بازیکن</th>
            <th>تورنمنت</th>
            <th>کل برد بازی</th>
            <th>درصد برد</th>
            <th>پادشاه زمین</th>
          </tr>
        </thead>
        <tbody>
          {leaders.map((l, i) => (
            <tr key={l.player_id}>
              <td>{["🥇", "🥈", "🥉"][i] ?? number(i + 1)}</td>
              <td>
                <span className="inline-flex items-center gap-3">
                  <PlayerAvatar player={l} />
                  {fullName(l)}
                </span>
              </td>
              <td>{number(l.tournaments)}</td>
              <td className="font-bold">{number(l.total_points)}</td>
              <td>{number(l.win_rate)}٪</td>
              <td>👑 {number(l.crowns)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Button variant="outline" asChild>
      <Link href={href}>
        {label}
        <ArrowUpLeft size={16} />
      </Link>
    </Button>
  );
}
