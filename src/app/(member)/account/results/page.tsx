import { requireMember, ownRows } from "@/lib/platform/data";
import {
  SubmitResultForm,
  ConfirmResultForm,
} from "@/components/platform/result-forms";
import { requestTime } from "@/lib/platform/request-time";
import { moment } from "@/lib/platform/format";
import { bookingLabels } from "@/lib/platform/format";
export default async function Results() {
  const now = await requestTime();
  const [m, participants] = await Promise.all([
    requireMember(),
    ownRows("booking_participants"),
  ]);
  const ids = participants
    .filter((p) => ["paid", "no_show"].includes(p.status))
    .map((p) => p.booking_id);
  const { data: matches } = ids.length
    ? await m.db.from("open_matches").select("*").in("booking_id", ids)
    : { data: [] };
  const { data: results, error } = await m.db
    .from("result_submissions")
    .select("*")
    .or(`team1_users.cs.{${m.userId}},team2_users.cs.{${m.userId}}`);
  if (error) throw new Error("دریافت نتیجه‌ها انجام نشد.");
  const { data: locations } = await m.db.rpc("my_booking_locations");
  const { data: confirmations } = results?.length
    ? await m.db
        .from("result_confirmations")
        .select("*")
        .in(
          "result_id",
          results.map((r) => r.id),
        )
    : { data: [] };
  const contexts = await Promise.all(
    (matches ?? []).map(async (game) => ({
      id: game.id,
      roster:
        (await m.db.rpc("match_result_context", { p_match: game.id })).data ??
        [],
    })),
  );
  return (
    <section className="public-container public-page">
      <h1>نتیجه روشن، رقابت منصفانه.</h1>
      <p className="intro">
        فقط شرکت‌کنندگان معتبر می‌توانند پس از پایان بازی نتیجه ثبت کنند. هر دو
        تیم امکان تأیید یا اعتراض دارند.
      </p>
      {(matches ?? []).map((game) => {
        const result = results?.find((r) => r.match_id === game.id);
        const roster = contexts.find((c) => c.id === game.id)?.roster ?? [];
        return (
          <article className="platform-card my-6" key={game.id}>
            <h2>{game.title}</h2>
            {result ? (
              <>
                <p className="mb-5 text-sm">
                  {result.team1_sets} — {result.team2_sets} ·{" "}
                  {bookingLabels[result.status]} ·{" "}
                  {result.competitive
                    ? "درخواست رقابتی"
                    : "دوستانه؛ بدون تغییر رتبه"}
                </p>
                <div className="my-4 space-y-2 text-sm">
                  {roster.map((p) => {
                    const c = confirmations?.find(
                      (c) =>
                        c.result_id === result.id && c.user_id === p.user_id,
                    );
                    return (
                      <p key={p.user_id}>
                        {p.name}:{" "}
                        {c?.decision === "confirm"
                          ? "تأیید کرده"
                          : c?.decision === "dispute"
                            ? "اعتراض ثبت کرده"
                            : "در انتظار نظر"}
                        {c?.reason && ` · ${c.reason}`}
                      </p>
                    );
                  })}
                </div>
                {["pending", "disputed"].includes(result.status) && (
                  <ConfirmResultForm result={result.id} />
                )}
              </>
            ) : locations?.find((l) => l.booking_id === game.booking_id) &&
              Date.parse(
                locations.find((l) => l.booking_id === game.booking_id)!
                  .ends_at,
              ) > now ? (
              <p className="text-sm">
                ثبت نتیجه پس از پایان سانس،{" "}
                {moment(
                  locations.find((l) => l.booking_id === game.booking_id)!
                    .ends_at,
                )}{" "}
                فعال می‌شود.
              </p>
            ) : (
              <SubmitResultForm match={game.id} roster={roster} />
            )}
          </article>
        );
      })}
      {!matches?.length && (
        <p className="platform-card mt-8 text-sm text-muted-foreground">
          بعد از شرکت قطعی در بازی باز، امکان ثبت نتیجه اینجا ظاهر می‌شود.
        </p>
      )}
    </section>
  );
}
