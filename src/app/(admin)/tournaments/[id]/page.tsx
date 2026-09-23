import Link from "next/link";
import { getTournament } from "@/lib/data";
import { PageHeader, StatusBadge } from "@/components/shared";
import { TournamentBoard } from "@/components/tournament-board";
import { Button } from "@/components/ui/button";
import { date, fullName } from "@/lib/utils";
export default async function Tournament({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getTournament(id);
  return (
    <>
      <PageHeader
        title={data.tournament.title}
        description={`${date(data.tournament.date)} • ۸ بازیکن • ۲ زمین • ۷ دور`}
        action={
          <div className="flex gap-3 items-center">
            <StatusBadge status={data.tournament.status} />
            {data.tournament.status === "completed" && (
              <Button asChild>
                <Link href={`/tournaments/${id}/results`}>نتایج نهایی</Link>
              </Button>
            )}
          </div>
        }
      />
      <details className="panel mb-6 p-4">
        <summary className="min-h-7 cursor-pointer text-sm font-medium">
          اسلات بازیکنان و قوانین رتبه‌بندی
        </summary>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {data.participants
            .toSorted((a, b) => a.slot.localeCompare(b.slot))
            .map((p) => (
              <p key={p.id} className="rounded-lg bg-muted p-3 text-xs">
                <b className="me-3">{p.slot}</b>
                {fullName(data.players.find((x) => x.id === p.player_id)!)}
              </p>
            ))}
        </div>
        <p className="mt-4 text-xs leading-7 text-muted-foreground">
          برای هر بازی، برنده هر سه راند را انتخاب کنید. تیمی که حداقل دو راند
          ببرد، برنده بازی است. رتبه بازیکنان ابتدا با تعداد برد بازی و سپس با
          برد و تفاضل راندها تعیین می‌شود.
        </p>
      </details>
      <TournamentBoard data={data} />
    </>
  );
}
