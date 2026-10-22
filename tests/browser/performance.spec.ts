import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
test("records local landing and booking performance observations", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = { lcp: 0, layoutShift: 0 };
    Object.assign(window, { __padelPerf: state });
    if (
      PerformanceObserver.supportedEntryTypes.includes(
        "largest-contentful-paint",
      )
    )
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) state.lcp = e.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    if (PerformanceObserver.supportedEntryTypes.includes("layout-shift"))
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          const shift = e as PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          };
          if (!shift.hadRecentInput) state.layoutShift += shift.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
  });
  const observations = [];
  for (const route of ["/", "/clubs/browser-test-club/book"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    observations.push(
      await page.evaluate(() => {
        const nav = performance.getEntriesByType(
          "navigation",
        )[0] as PerformanceNavigationTiming;
        const state = (
          window as typeof window & {
            __padelPerf: { lcp: number; layoutShift: number };
          }
        ).__padelPerf;
        return {
          route: location.pathname,
          ttfbMs: nav.responseStart - nav.requestStart,
          domContentLoadedMs: nav.domContentLoadedEventEnd,
          lcpObservedMs: state.lcp,
          cumulativeLayoutShiftObserved: state.layoutShift,
          resourceTransferBytes: performance
            .getEntriesByType("resource")
            .reduce(
              (n, e) => n + (e as PerformanceResourceTiming).transferSize,
              0,
            ),
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
        };
      }),
    );
  }
  expect(observations.every((o) => !o.horizontalOverflow)).toBe(true);
  await writeFile(
    test.info().outputPath("local-performance.json"),
    JSON.stringify(
      { project: test.info().project.name, observations },
      null,
      2,
    ),
  );
  await test.info().attach("local-performance-observations", {
    body: JSON.stringify(
      {
        environment:
          "local production build, test PostgreSQL, no network or CPU throttling; not field CWV or a guaranteed target",
        project: test.info().project.name,
        observations,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
});
