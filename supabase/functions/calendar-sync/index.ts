import {
  CalendarError,
  iranDate,
  openCalendar,
  type Source,
} from "../_shared/calendar-sources.ts";

// Uses the function's built-in service credential only inside this server runtime.
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response>): void;
};
const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
async function rpc(name: string, args: unknown = {}) {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("DATABASE_OPERATION_FAILED");
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const token = req.headers.get("x-calendar-token");
  if (!token || token.length > 200) return new Response(null, { status: 401 });
  try {
    if ((await rpc("calendar_worker_authorized", { p_token: token })) !== true)
      return new Response(null, { status: 401 });
    const job = await rpc("claim_calendar_sync");
    if (!job) return Response.json({ processed: 0 });
    const from = new Date(`${iranDate(new Date())}T00:00:00+03:30`);
    const to = new Date(+from + job.horizon_days * 86400000);
    try {
      const deadline = Date.now() + 110000;
      const calendar = await openCalendar(
        job.source as Source,
        (input, init) => {
          const remaining = deadline - Date.now();
          if (remaining < 500) throw new CalendarError("WORKER_TIMEOUT");
          return fetch(input, {
            ...init,
            signal: AbortSignal.timeout(Math.min(12000, remaining)),
          });
        },
      );
      const slots = [];
      for (const mapping of job.mappings) {
        if (Date.now() > deadline) throw new CalendarError("WORKER_TIMEOUT");
        slots.push(...(await calendar.slots(mapping.external_ref, from, to)));
      }
      const result = await rpc("finish_calendar_sync", {
        p_id: job.id,
        p_token: job.token,
        p_status: job.club_id && job.mappings.length ? "ok" : "needs_mapping",
        p_courts: calendar.courts,
        p_slots: slots,
        p_from: from.toISOString(),
        p_to: to.toISOString(),
      });
      return Response.json({ processed: 1, ...result });
    } catch (error) {
      const code =
        error instanceof CalendarError ? error.message : "SOURCE_UNAVAILABLE";
      await rpc("finish_calendar_sync", {
        p_id: job.id,
        p_token: job.token,
        p_status: code === "LOGIN_REQUIRED" ? "login_required" : "error",
        p_courts: [],
        p_slots: [],
        p_from: from.toISOString(),
        p_to: to.toISOString(),
        p_error: code,
      });
      return Response.json({ processed: 1, status: "error" });
    }
  } catch {
    return Response.json({ error: "CALENDAR_WORKER_FAILED" }, { status: 500 });
  }
});
