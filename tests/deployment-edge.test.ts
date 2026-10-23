import { describe, expect, it, vi } from "vitest";
import { routeCalendar } from "../deploy/edge-main/index";
describe("offline self-hosted Edge router", () => {
  it("exposes only POST calendar-sync with a bounded token", async () => {
    const create = vi.fn();
    const request = (path: string, method = "POST", token = "") =>
      new Request(`http://internal${path}`, {
        method,
        headers: token ? { "x-calendar-token": token } : {},
      });
    expect((await routeCalendar(request("/hello"), create, {})).status).toBe(
      404,
    );
    expect(
      (await routeCalendar(request("/calendar-sync", "GET"), create, {}))
        .status,
    ).toBe(405);
    expect(
      (await routeCalendar(request("/calendar-sync"), create, {})).status,
    ).toBe(401);
    expect(
      (
        await routeCalendar(
          request("/calendar-sync", "POST", "x".repeat(201)),
          create,
          {},
        )
      ).status,
    ).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });
  it("does not bypass token verification in calendar-sync or leak runtime errors", async () => {
    const req = new Request("http://internal/calendar-sync", {
      method: "POST",
      headers: { "x-calendar-token": "plausible-but-invalid" },
    });
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 401 }));
    const create = vi.fn().mockResolvedValue({ fetch });
    expect(
      (await routeCalendar(req, create, { SUPABASE_FUNCTION_SLUG: "evil" }))
        .status,
    ).toBe(401);
    expect(fetch).toHaveBeenCalledWith(req);
    expect(create.mock.calls[0][0]).toMatchObject({
      servicePath: "/home/deno/functions/calendar-sync",
      envVars: [["SUPABASE_FUNCTION_SLUG", "calendar-sync"]],
    });
    const result = await routeCalendar(
      req,
      vi.fn().mockRejectedValue(new Error("private-token")),
      {},
    );
    expect(result.status).toBe(503);
    expect(await result.text()).not.toContain("private-token");
  });
});
