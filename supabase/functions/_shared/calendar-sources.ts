// Fixed-origin, read-only adapters. Never call payment, cart, hold or appointment endpoints.
export type Source = "guilan" | "sabaland" | "respina";
export interface ExternalCourt {
  reference: string;
  name: string;
  price: number;
}
export interface CalendarSlot {
  courtRef: string;
  startsAt: string;
  endsAt: string;
  price: number;
  available: boolean;
}
export class CalendarError extends Error {}
type Fetcher = typeof fetch;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new CalendarError("SOURCE_CHANGED");
  return value as Record<string, unknown>;
}
function amount(value: unknown) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value > 10000000000
  )
    throw new CalendarError("SOURCE_CHANGED");
  return value * 10; // Supported sources display/store toman. Internal amounts are IRR.
}
export function iranDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function slotAt(
  court: ExternalCourt,
  date: string,
  time: string,
  available: boolean,
): CalendarSlot {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)
  )
    throw new CalendarError("SOURCE_CHANGED");
  const start = new Date(`${date}T${time}:00+03:30`);
  if (Number.isNaN(start.getTime())) throw new CalendarError("SOURCE_CHANGED");
  return {
    courtRef: court.reference,
    startsAt: start.toISOString(),
    endsAt: new Date(+start + 3600000).toISOString(),
    price: court.price,
    available,
  };
}
async function request(url: string, init: RequestInit, fetcher: Fetcher) {
  const response = await fetcher(url, {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(12000),
    headers: { "User-Agent": "RallyYar-Calendar/1.0", ...init.headers },
  });
  if (
    response.status === 401 ||
    response.status === 403 ||
    (response.status >= 300 && response.status < 400)
  )
    throw new CalendarError("LOGIN_REQUIRED");
  if (!response.ok)
    throw new CalendarError(
      response.status === 429 ? "RATE_LIMITED" : "SOURCE_UNAVAILABLE",
    );
  if (Number(response.headers.get("content-length")) > 3000000)
    throw new CalendarError("SOURCE_CHANGED");
  return response;
}
export function parseGuilanCourts(html: string): ExternalCourt[] {
  // Decode Next's JSON string payload, never execute scripts from a remote page.
  const payload = [
    ...html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g),
  ]
    .map((m) => JSON.parse(m[1]) as string)
    .join("");
  const match = payload.match(
    /"initialCourts":(\[.*?\]),"initialRacketPrices"/s,
  );
  if (!match) throw new CalendarError("SOURCE_CHANGED");
  const rows: unknown = JSON.parse(match[1]);
  if (!Array.isArray(rows) || !rows.length)
    throw new CalendarError("SOURCE_CHANGED");
  return rows.map((value) => {
    const c = object(value);
    if (
      typeof c.id !== "string" ||
      !/^[a-f\d-]{36}$/.test(c.id) ||
      typeof c.name !== "string"
    )
      throw new CalendarError("SOURCE_CHANGED");
    return { reference: c.id, name: c.name, price: amount(c.price_per_hour) };
  });
}
export function parseGuilanSlots(
  value: unknown,
  court: ExternalCourt,
  date: string,
) {
  const data = object(value).data;
  if (!Array.isArray(data) || data.length !== 16)
    throw new CalendarError("SOURCE_CHANGED");
  const result = data.map((value) => {
    const s = object(value);
    if (
      typeof s.time !== "string" ||
      typeof s.available !== "boolean" ||
      !/^(?:0[89]|1\d|2[0-3]):00$/.test(s.time)
    )
      throw new CalendarError("SOURCE_CHANGED");
    return slotAt(court, date, s.time, s.available);
  });
  if (new Set(result.map((s) => s.startsAt)).size !== 16)
    throw new CalendarError("SOURCE_CHANGED");
  return result;
}
export function parseRespinaCourts(value: unknown): ExternalCourt[] {
  if (!Array.isArray(value) || !value.length)
    throw new CalendarError("SOURCE_CHANGED");
  const courts = value.map((row) => {
    const court = object(row);
    if (
      typeof court.id !== "string" ||
      !/^[a-z0-9]{20,32}$/.test(court.id) ||
      typeof court.name !== "string" ||
      !court.name.trim() ||
      court.type !== "tennis"
    )
      throw new CalendarError("SOURCE_CHANGED");
    return {
      reference: court.id,
      name: court.name,
      price: amount(court.price_per_hour),
    };
  });
  if (new Set(courts.map((court) => court.reference)).size !== courts.length)
    throw new CalendarError("SOURCE_CHANGED");
  return courts;
}
export function parseRespinaSlots(
  value: unknown,
  court: ExternalCourt,
  date: string,
): CalendarSlot[] {
  if (!Array.isArray(value) || value.length !== 16)
    throw new CalendarError("INCOMPLETE_CALENDAR");
  return value.map((row, index) => {
    const slot = object(row);
    if (
      slot.time !== `${String(index + 8).padStart(2, "0")}:00` ||
      typeof slot.available !== "boolean"
    )
      throw new CalendarError("SOURCE_CHANGED");
    return slotAt(court, date, slot.time, slot.available);
  });
}
export async function openCalendar(source: Source, fetcher: Fetcher = fetch) {
  if (source === "guilan") {
    const html = await (
      await request("https://guilanpadelclub.ir/booking", {}, fetcher)
    ).text();
    const courts = parseGuilanCourts(html);
    return {
      courts,
      async slots(reference: string, from: Date, to: Date) {
        const court = courts.find((c) => c.reference === reference);
        if (!court) throw new CalendarError("COURT_REMOVED");
        const slots: CalendarSlot[] = [];
        for (let date = +from; date < +to; date += 86400000) {
          const day = iranDate(new Date(date));
          const response = await request(
            `https://guilanpadelclub.ir/api/availability?${new URLSearchParams({ courtId: reference, date: day })}`,
            {},
            fetcher,
          );
          slots.push(...parseGuilanSlots(await response.json(), court, day));
        }
        return slots;
      },
    };
  }
  if (source === "respina") {
    const courts = parseRespinaCourts(
      await (
        await request("https://respina.gildev.ir/tennis/courts", {}, fetcher)
      ).json(),
    );
    return {
      courts,
      async slots(reference: string, from: Date, to: Date) {
        const court = courts.find((item) => item.reference === reference);
        if (!court) throw new CalendarError("COURT_REMOVED");
        const slots: CalendarSlot[] = [];
        for (let date = +from; date < +to; date += 86400000) {
          const day = iranDate(new Date(date));
          const response = await request(
            `https://respina.gildev.ir/tennis/availability?${new URLSearchParams({ courtId: reference, date: day })}`,
            {},
            fetcher,
          );
          slots.push(...parseRespinaSlots(await response.json(), court, day));
        }
        return slots;
      },
    };
  }
  if (source !== "sabaland") throw new CalendarError("UNKNOWN_SOURCE");
  const html = await (
    await request("https://sabalandcomplex.ir/booking/", {}, fetcher)
  ).text();
  const match = html.match(/var BooklyL10n = (\{.*?\});/);
  if (!match) throw new CalendarError("SOURCE_CHANGED");
  let csrf = object(JSON.parse(match[1])).csrf_token;
  if (typeof csrf !== "string") throw new CalendarError("SOURCE_CHANGED");
  let cookie = "";
  const post = async (fields: Record<string, string>) => {
    const response = await request(
      "https://sabalandcomplex.ir/wp-admin/admin-ajax.php",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: new URLSearchParams({ ...fields, csrf_token: String(csrf) }),
      },
      fetcher,
    );
    const cookies = response.headers.getSetCookie();
    if (cookies.length) {
      const jar = new Map(
        cookie
          .split("; ")
          .filter(Boolean)
          .map((c) => [c.slice(0, c.indexOf("=")), c]),
      );
      for (const c of cookies) {
        const pair = c.split(";")[0];
        jar.set(pair.slice(0, pair.indexOf("=")), pair);
      }
      cookie = [...jar.values()].join("; ");
    }
    const data = object(await response.json());
    if (data.success !== true)
      throw new CalendarError(
        data.error === "session_error" ? "LOGIN_REQUIRED" : "SOURCE_CHANGED",
      );
    if (typeof data.csrf_token === "string") csrf = data.csrf_token;
    return data;
  };
  const form = await post({ action: "bookly_get_form_id" });
  if (typeof form.form_id !== "string")
    throw new CalendarError("SOURCE_CHANGED");
  const form_id = form.form_id;
  const service = await post({
    action: "bookly_render_service",
    form_id,
    new_chain: "true",
  });
  const staff = object(service.staff),
    services = object(service.services);
  const courts: ExternalCourt[] = [];
  for (const [staffId, value] of Object.entries(staff)) {
    const employee = object(value);
    for (const [serviceId, relation] of Object.entries(
      object(employee.services),
    )) {
      const offered = object(services[serviceId]);
      if (offered.duration !== "1 ساعت" || typeof employee.name !== "string")
        throw new CalendarError("SOURCE_CHANGED");
      const locations = object(relation).locations;
      if (!Array.isArray(locations) || locations.length !== 1)
        throw new CalendarError("SOURCE_CHANGED");
      courts.push({
        reference: `${serviceId}:${staffId}`,
        name: employee.name,
        price: amount(object(locations[0]).flat_price),
      });
    }
  }
  if (!courts.length) throw new CalendarError("SOURCE_CHANGED");
  return {
    courts,
    async slots(reference: string, from: Date, to: Date) {
      const court = courts.find((c) => c.reference === reference);
      if (!court) throw new CalendarError("COURT_REMOVED");
      const [serviceId, staffId] = reference.split(":");
      const fields: Record<string, string> = {
        action: "bookly_session_save",
        form_id,
        "chain[0][service_id]": serviceId,
        "chain[0][staff_ids][0]": staffId,
        "chain[0][units]": "1",
        "chain[0][number_of_persons]": "1",
        "chain[0][quantity]": "1",
        date_from: iranDate(from),
        no_extras: "true",
      };
      // Bookly weekdays are 1..7; always ask for all days, then bound results in Tehran time.
      for (let day = 0; day < 7; day++)
        fields[`days[${day}]`] = String(day + 1);
      await post(fields);
      let page = await post({
        action: "bookly_render_time",
        form_id,
        selected_date: iranDate(from),
      });
      const slots = new Map<string, CalendarSlot>();
      let previousLast = "";
      for (let count = 0; count < 16; count++) {
        const parsed = parseSabalandSlots(page, court);
        for (const s of parsed.slots)
          if (Date.parse(s.startsAt) >= +from && Date.parse(s.startsAt) < +to)
            slots.set(s.startsAt, s);
        if (
          page.has_more_slots === false ||
          (parsed.lastStart && Date.parse(parsed.lastStart) >= +to)
        )
          return [...slots.values()];
        if (
          !parsed.lastData ||
          !parsed.lastStart ||
          parsed.lastStart <= previousLast
        )
          throw new CalendarError("INCOMPLETE_CALENDAR");
        previousLast = parsed.lastStart;
        page = await post({
          action: "bookly_render_next_time",
          form_id,
          last_slot: JSON.stringify(parsed.lastData),
        });
      }
      throw new CalendarError("INCOMPLETE_CALENDAR");
    },
  };
}
export function parseSabalandSlots(
  page: Record<string, unknown>,
  court: ExternalCourt,
) {
  if (
    typeof page.has_more_slots !== "boolean" ||
    typeof page.has_slots !== "boolean"
  )
    throw new CalendarError("SOURCE_CHANGED");
  const groups = page.slots_data;
  if (!groups && page.has_slots === false && page.has_more_slots === false)
    return { slots: [] as CalendarSlot[], lastData: null, lastStart: null };
  const slots: CalendarSlot[] = [];
  let lastData: unknown = null,
    lastStart: string | null = null;
  for (const group of Object.values(object(groups))) {
    const rows = object(group).slots;
    if (!Array.isArray(rows)) throw new CalendarError("SOURCE_CHANGED");
    for (const value of rows) {
      const row = object(value);
      if (
        !Array.isArray(row.data) ||
        row.data.length !== 1 ||
        !Array.isArray(row.data[0])
      )
        throw new CalendarError("SOURCE_CHANGED");
      const [service, staff, date] = row.data[0];
      if (
        `${service}:${staff}` !== court.reference ||
        typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:00$/.test(date) ||
        !["", "booked", "waiting-list"].includes(String(row.status))
      )
        throw new CalendarError("SOURCE_CHANGED");
      const s = slotAt(
        court,
        date.slice(0, 10),
        date.slice(11, 16),
        row.status === "",
      );
      // A changed duration must not silently turn into an imported one-hour slot.
      const endTime = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Tehran",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date(s.endsAt));
      if (row.time_text !== `${date.slice(11, 16)} تا ${endTime}`)
        throw new CalendarError("SOURCE_CHANGED");
      slots.push(s);
      lastData = row.data;
      lastStart = s.startsAt;
    }
  }
  if (page.has_slots === true && !slots.length)
    throw new CalendarError("SOURCE_CHANGED");
  return { slots, lastData, lastStart };
}
