import { describe, it, expect } from "vitest";
import {
  iranDate,
  openCalendar,
  parseGuilanCourts,
  parseGuilanSlots,
  parseRespinaCourts,
  parseRespinaSlots,
  parseSabalandSlots,
  slotAt,
} from "../supabase/functions/_shared/calendar-sources";
const court = { reference: "2:3", name: "پدل", price: 10000000 };
describe("official calendar parsers", () => {
  it("decodes Next data without executing scripts and converts toman to IRR", () => {
    const payload = `7:[{"initialCourts":[{"id":"ee947996-0ca6-4b08-9927-06b2d04b612c","name":"پدل ۱","price_per_hour":1000000}],"initialRacketPrices":{}}]`;
    expect(
      parseGuilanCourts(
        `<script>self.__next_f.push([1,${JSON.stringify(payload)}])</script>`,
      )[0].price,
    ).toBe(10000000);
    expect(() => parseGuilanCourts("<html>ورود</html>")).toThrow(
      "SOURCE_CHANGED",
    );
  });
  it("rejects truncated or ambiguous Guilan availability instead of inventing free slots", () => {
    const rows = Array.from({ length: 16 }, (_, i) => ({
      time: `${String(i + 8).padStart(2, "0")}:00`,
      available: i !== 0,
    }));
    expect(parseGuilanSlots({ data: rows }, court, "2026-10-23")).toHaveLength(
      16,
    );
    expect(() =>
      parseGuilanSlots({ data: rows.slice(1) }, court, "2026-10-23"),
    ).toThrow();
    expect(() =>
      parseGuilanSlots(
        { data: [...rows.slice(1), rows[1]] },
        court,
        "2026-10-23",
      ),
    ).toThrow();
    expect(() =>
      parseGuilanSlots(
        { data: rows.map((r) => ({ ...r, available: "true" })) },
        court,
        "2026-10-23",
      ),
    ).toThrow();
  });
  it("reads Respina tennis prices and validates every hourly availability row", () => {
    const [respinaCourt] = parseRespinaCourts([
      {
        id: "cmuv1se2p0074qwjc919v06f5",
        name: "زمین تنیس رسپینا",
        type: "tennis",
        price_per_hour: 1000000,
      },
    ]);
    expect(respinaCourt.price).toBe(10000000);
    const rows = Array.from({ length: 16 }, (_, index) => ({
      time: `${String(index + 8).padStart(2, "0")}:00`,
      available: index !== 0,
    }));
    const slots = parseRespinaSlots(rows, respinaCourt, "2026-10-23");
    expect(slots).toHaveLength(16);
    expect(slots[0]).toMatchObject({
      startsAt: "2026-10-23T04:30:00.000Z",
      available: false,
    });
    expect(() =>
      parseRespinaSlots(rows.slice(1), respinaCourt, "2026-10-23"),
    ).toThrow("INCOMPLETE_CALENDAR");
    expect(() =>
      parseRespinaSlots(
        [{ ...rows[0], available: "true" }, ...rows.slice(1)],
        respinaCourt,
        "2026-10-23",
      ),
    ).toThrow("SOURCE_CHANGED");
    expect(() =>
      parseRespinaSlots(
        [rows[1], rows[0], ...rows.slice(2)],
        respinaCourt,
        "2026-10-23",
      ),
    ).toThrow("SOURCE_CHANGED");
  });
  it("uses only Respina's read-only court and availability endpoints", async () => {
    const calls: string[] = [];
    const fetcher = (async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("/tennis/courts"))
        return Response.json([
          {
            id: "cmuv1se2p0074qwjc919v06f5",
            name: "زمین تنیس رسپینا",
            type: "tennis",
            price_per_hour: 1000000,
          },
        ]);
      return Response.json(
        Array.from({ length: 16 }, (_, index) => ({
          time: `${String(index + 8).padStart(2, "0")}:00`,
          available: true,
        })),
      );
    }) as typeof fetch;
    const calendar = await openCalendar("respina", fetcher);
    const slots = await calendar.slots(
      calendar.courts[0].reference,
      new Date("2026-10-22T20:30:00.000Z"),
      new Date("2026-10-23T20:30:00.000Z"),
    );
    expect(slots).toHaveLength(16);
    expect(calls).toEqual([
      "https://respina.gildev.ir/tennis/courts",
      "https://respina.gildev.ir/tennis/availability?courtId=cmuv1se2p0074qwjc919v06f5&date=2026-10-23",
    ]);
  });
  it("handles Tehran midnight, unavailable slots and Bookly schema changes", () => {
    const row = {
      data: [[2, 3, "2026-10-23 23:00:00", 0]],
      time_text: "23:00 تا 00:00",
      status: "booked",
    };
    const page = {
      has_slots: true,
      has_more_slots: false,
      slots_data: { "2026-10-23": { slots: [row] } },
    };
    const parsed = parseSabalandSlots(page, court);
    expect(parsed.slots[0]).toMatchObject({
      startsAt: "2026-10-23T19:30:00.000Z",
      endsAt: "2026-10-23T20:30:00.000Z",
      available: false,
    });
    expect(iranDate(new Date("2026-10-23T20:45:00Z"))).toBe("2026-10-24");
    expect(() =>
      parseSabalandSlots(
        {
          ...page,
          slots_data: { day: { slots: [{ ...row, status: "unknown" }] } },
        },
        court,
      ),
    ).toThrow();
    expect(() =>
      parseSabalandSlots(
        {
          ...page,
          slots_data: {
            day: { slots: [{ ...row, time_text: "23:00 تا 01:00" }] },
          },
        },
        court,
      ),
    ).toThrow();
    expect(() =>
      parseSabalandSlots(page, { ...court, reference: "2:4" }),
    ).toThrow();
    expect(() => slotAt(court, "2026-10-23", "25:00", true)).toThrow();
  });
});
