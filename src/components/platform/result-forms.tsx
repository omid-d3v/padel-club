"use client";
import { useState } from "react";
import { ActionForm } from "./action-form";
import { Field, CheckField } from "./fields";
import { RoundWinnerPicker } from "./round-winner-picker";
export function EventScoreForm({
  matchId,
  version,
  team1,
  team2,
  winners,
}: {
  matchId: string;
  version: number;
  team1: string;
  team2: string;
  winners: (1 | 2 | null)[];
}) {
  const [values, setValues] = useState(winners);
  return (
    <ActionForm operation="event-score" label="ثبت برندهٔ راندها">
      <input type="hidden" name="match_id" value={matchId} />
      <input type="hidden" name="version" value={version} />
      {[0, 1, 2].map((i) => (
        <fieldset className="space-y-2" key={i}>
          <legend>برندهٔ راند {(i + 1).toLocaleString("fa-IR")}</legend>
          <input type="hidden" name={`set${i + 1}`} value={values[i] ?? ""} />
          <RoundWinnerPicker
            winner={values[i] ?? null}
            onChange={(value) =>
              setValues((old) => old.map((v, n) => (n === i ? value : v)))
            }
            team1={team1}
            team2={team2}
            disabled={false}
          />
        </fieldset>
      ))}
    </ActionForm>
  );
}
export function SubmitResultForm({
  match,
  roster,
}: {
  match: string;
  roster: { user_id: string; name: string }[];
}) {
  const [selected, setSelected] = useState<string[]>(["", "", "", ""]);
  const [scores, setScores] = useState(["", ""]);
  const invalid =
    scores[0] !== "" && scores[1] !== "" && scores[0] === scores[1];
  return (
    <ActionForm
      operation="submit-result"
      label="ثبت نتیجه برای تأیید شرکت‌کنندگان"
      disabled={invalid || new Set(selected.filter(Boolean)).size !== 4}
    >
      <input type="hidden" name="match_id" value={match} />
      <div className="grid gap-4 md:grid-cols-2">
        {["team1a", "team1b", "team2a", "team2b"].map((name, i) => (
          <label className="field" key={name}>
            {
              [
                "نفر اول تیم اول",
                "نفر دوم تیم اول",
                "نفر اول تیم دوم",
                "نفر دوم تیم دوم",
              ][i]
            }
            <select
              name={name}
              required
              value={selected[i]}
              onChange={(e) =>
                setSelected((old) =>
                  old.map((v, n) => (n === i ? e.target.value : v)),
                )
              }
            >
              <option value="">انتخاب کنید</option>
              {roster.map((p) => (
                <option
                  key={p.user_id}
                  value={p.user_id}
                  disabled={selected.some((v, n) => v === p.user_id && n !== i)}
                >
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        ))}
        {[0, 1].map((i) => (
          <Field
            key={i}
            label={`ست بردهٔ تیم ${i === 0 ? "اول" : "دوم"}`}
            name={`sets${i + 1}`}
            type="number"
            min={0}
            max={3}
            required
            value={scores[i]}
            onChange={(e) =>
              setScores((old) =>
                old.map((v, n) => (n === i ? e.target.value : v)),
              )
            }
          />
        ))}
      </div>
      {invalid && (
        <p role="alert" className="text-red-700">
          تعداد ست‌های دو تیم نمی‌تواند برابر باشد.
        </p>
      )}
      <CheckField
        name="competitive"
        label="درخواست بررسی نتیجهٔ رقابتی؛ نیازمند تأیید مدیر"
      />
    </ActionForm>
  );
}
export function ConfirmResultForm({ result }: { result: string }) {
  const [decision, setDecision] = useState("confirm");
  return (
    <ActionForm operation="confirm-result" label="ثبت نظر من">
      <input type="hidden" name="result_id" value={result} />
      <label className="field">
        نظر شما
        <select
          name="decision"
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
        >
          <option value="confirm">نتیجه را تأیید می‌کنم</option>
          <option value="dispute">به نتیجه اعتراض دارم</option>
        </select>
      </label>
      <Field
        label={decision === "dispute" ? "دلیل اعتراض" : "توضیح اختیاری"}
        name="reason"
        required={decision === "dispute"}
        minLength={decision === "dispute" ? 3 : undefined}
        maxLength={1000}
      />
    </ActionForm>
  );
}
