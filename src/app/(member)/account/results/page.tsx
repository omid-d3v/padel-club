import { requireMember, ownRows } from "@/lib/platform/data";
import { ActionForm } from "@/components/platform/action-form";
import { Field, CheckField, SelectField } from "@/components/platform/fields";
import { bookingLabels } from "@/lib/platform/format";
export default async function Results() {
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
                {["pending", "disputed"].includes(result.status) && (
                  <ActionForm operation="confirm-result" label="ثبت نظر من">
                    <input name="result_id" type="hidden" value={result.id} />
                    <label className="field">
                      نظر شما
                      <select name="decision">
                        <option value="confirm">نتیجه را تأیید می‌کنم</option>
                        <option value="dispute">به نتیجه اعتراض دارم</option>
                      </select>
                    </label>
                    <Field
                      label="توضیح؛ برای اعتراض دلیل را بنویسید"
                      name="reason"
                      maxLength={1000}
                    />
                  </ActionForm>
                )}
              </>
            ) : (
              <ActionForm
                operation="submit-result"
                label="ثبت نتیجه برای تأیید شرکت‌کنندگان"
              >
                <input name="match_id" type="hidden" value={game.id} />
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ["team1a", "نفر اول تیم اول"],
                    ["team1b", "نفر دوم تیم اول"],
                    ["team2a", "نفر اول تیم دوم"],
                    ["team2b", "نفر دوم تیم دوم"],
                  ].map(([name, label]) => (
                    <SelectField
                      key={name}
                      name={name}
                      label={label}
                      options={roster.map((p) => ({
                        id: p.user_id,
                        name: p.name,
                      }))}
                    />
                  ))}
                  <Field
                    name="sets1"
                    label="ست برده تیم اول"
                    type="number"
                    min={0}
                    max={3}
                    required
                  />
                  <Field
                    name="sets2"
                    label="ست برده تیم دوم"
                    type="number"
                    min={0}
                    max={3}
                    required
                  />
                </div>
                <CheckField
                  name="competitive"
                  label="درخواست بررسی نتیجه رقابتی؛ تغییر رتبه نیازمند تأیید جداگانه مدیر است"
                />
              </ActionForm>
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
