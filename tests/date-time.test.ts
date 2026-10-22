import { describe, it, expect } from "vitest";
import {
  formatJalaliInput,
  formatPersianMoment,
  formatTehranTime,
  isGregorianDate,
  jalaliMonth,
  jalaliParts,
  jalaliToGregorian,
  parseJalaliInput,
  tehranDateTime,
  tehranLocalToISO,
  tehranToday,
} from "@/lib/date-time";
describe("Persian civil dates and Tehran time", () => {
  it("round-trips Nowruz and leap Esfand without normalizing invalid dates", () => {
    expect(jalaliToGregorian(1403, 1, 1)).toBe("2024-03-20");
    expect(jalaliToGregorian(1404, 1, 1)).toBe("2025-03-21");
    expect(jalaliToGregorian(1403, 12, 30)).toBe("2025-03-20");
    expect(jalaliToGregorian(1404, 12, 30)).toBeNull();
    expect(jalaliToGregorian(1405, 7, 31)).toBeNull();
    expect(jalaliMonth(1403, 12).length).toBe(30);
    expect(jalaliMonth(1404, 12).length).toBe(29);
    for (const year of [1399, 1400, 1403, 1404, 1405])
      for (let month = 1; month <= 12; month++) {
        const length = jalaliMonth(year, month).length;
        for (const day of [1, length])
          expect(jalaliParts(jalaliToGregorian(year, month, day)!)).toEqual({
            year,
            month,
            day,
          });
      }
  });
  it("accepts Persian/Arabic digits and preserves canonical form contracts", () => {
    expect(parseJalaliInput("۱۴۰۵/۰۷/۳۰")).toBe("2026-10-22");
    expect(parseJalaliInput("١٤٠٥/٧/٣٠ ٠٩:٠٥", true)).toBe("2026-10-22T09:05");
    expect(formatJalaliInput("2026-10-22T09:05", true)).toBe(
      "۱۴۰۵/۰۷/۳۰ ۰۹:۰۵",
    );
    expect(parseJalaliInput("۱۴۰۴/۱۲/۳۰")).toBeNull();
    expect(parseJalaliInput("۱۴۰۵/۰۷/۳۰ ۲۴:۰۰", true)).toBeNull();
    expect(parseJalaliInput("2026-10-22")).toBeNull();
    expect(isGregorianDate("2026-02-30")).toBe(false);
  });
  it("uses Tehran midnight and converts wall-clock time independently of host TZ", () => {
    expect(tehranLocalToISO("2026-10-23T00:30")).toBe(
      "2026-10-22T21:00:00.000Z",
    );
    const instant = new Date("2026-10-22T21:00:00Z");
    expect(tehranToday(instant)).toBe("2026-10-23");
    expect(tehranDateTime(instant)).toBe("2026-10-23T00:30");
    expect(formatTehranTime(instant.toISOString())).toBe("۰۰:۳۰");
    expect(formatPersianMoment(instant.toISOString())).toContain("آبان");
    expect(() => tehranLocalToISO("2026-02-30T09:30")).toThrow("INVALID_DATE");
    expect(() => tehranLocalToISO("2026-10-22T25:00")).toThrow("INVALID_DATE");
    // Tehran had daylight saving before 2023; a fixed +03:30 offset would be wrong here.
    expect(tehranLocalToISO("2021-07-01T12:00")).toBe(
      "2021-07-01T07:30:00.000Z",
    );
  });
});
