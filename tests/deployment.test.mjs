import { describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { createHash, createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { generateConfig, replaceEnv } from "../deploy/configure.mjs";
import {
  loadMigrations,
  migrationPlan,
  stripTransaction,
  jobsPlan,
} from "../deploy/migrations.mjs";
const runnable = (plan) => plan.replace(/^\\set.*\n/gm, "");
const row = (version, sql) => ({
  version,
  sql,
  checksum: createHash("sha256").update(sql).digest("hex"),
});
async function database() {
  const db = new PGlite();
  await db.exec(
    "create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;",
  );
  return db;
}
describe("self-hosted deployment", () => {
  it("generates separate private keys, valid signed legacy API keys and safe URLs", () => {
    const config = generateConfig(
      "match-sho.com",
      "api.match-sho.com",
      "ops@example.com",
    );
    const [header, payload, signature] =
      config.app.MATCHSHO_SUPABASE_SECRET_KEY.split(".");
    expect(JSON.parse(Buffer.from(payload, "base64url")).role).toBe(
      "service_role",
    );
    expect(
      createHmac("sha256", config.supabase.JWT_SECRET)
        .update(`${header}.${payload}`)
        .digest("base64url"),
    ).toBe(signature);
    expect(config.app.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).not.toBe(
      config.app.MATCHSHO_SUPABASE_SECRET_KEY,
    );
    expect(config.supabase.ENABLE_PHONE_AUTOCONFIRM).toBe("false");
    expect(config.supabase.SUPABASE_SECRET_KEY).toBe("");
    expect(config.app).not.toHaveProperty("SUPABASE_SECRET_KEY");
    expect(config.app.CRON_SECRET).not.toBe(config.app.CALENDAR_WORKER_TOKEN);
    expect(
      generateConfig("match-sho.com", "api.match-sho.com", "ops@example.com")
        .supabase.JWT_SECRET,
    ).not.toBe(config.supabase.JWT_SECRET);
    expect(() =>
      generateConfig("bad;evil.com", "api.match-sho.com", "ops@example.com"),
    ).toThrow();
    expect(() =>
      generateConfig("match-sho.com", "match-sho.com", "ops@example.com"),
    ).toThrow();
    expect(replaceEnv("KEY=old\n", { KEY: "a$&b" })).toBe("KEY=a$&b\n");
    expect(() => replaceEnv("", { KEY: "bad\nline" })).toThrow();
  });
  it("executes all real migrations atomically and is repeatable", async () => {
    const db = await database();
    try {
      const rows = await loadMigrations(
        new URL("../supabase/migrations/", import.meta.url),
      );
      const plan = runnable(migrationPlan(rows));
      await db.exec(plan);
      await db.exec(plan);
      expect(
        (
          await db.query(
            "select count(*)::int n from _matchsho_deploy.migrations",
          )
        ).rows[0].n,
      ).toBe(rows.length);
      expect(
        (await db.query("select card_enabled from payment_settings")).rows[0]
          .card_enabled,
      ).toBe(false);
      expect(
        (
          await db.query(
            "select has_schema_privilege('anon','_matchsho_deploy','usage') allowed",
          )
        ).rows[0].allowed,
      ).toBe(false);
    } finally {
      await db.close();
    }
  });
  it("refuses changed migrations and rolls back partial failures", async () => {
    const db = await database();
    try {
      await db.exec(
        runnable(
          migrationPlan([
            row("20260101000000", "create table public.test_item(id int);"),
          ]),
        ),
      );
      await expect(
        db.exec(runnable(migrationPlan([row("20260101000000", "select 42;")]))),
      ).rejects.toThrow(/Applied migration changed/);
      await db.exec("ROLLBACK");
      await expect(
        db.exec(
          runnable(
            migrationPlan([
              row("20260101000000", "create table public.test_item(id int);"),
              row(
                "20260102000000",
                "create table public.will_rollback(id int); select missing_function();",
              ),
            ]),
          ),
        ),
      ).rejects.toThrow();
      await db.exec("ROLLBACK");
      expect(
        (await db.query("select to_regclass('public.will_rollback') name"))
          .rows[0].name,
      ).toBeNull();
    } finally {
      await db.close();
    }
  });
  it("never replays restored Cloud data and baselines only matching Cloud history", async () => {
    const db = await database();
    const rows = [row("20260101000000", "create table public.admins(id int);")];
    try {
      await db.exec(
        "create table public.admins(id int); create table public.bookings(id int); insert into public.bookings values(77);",
      );
      await expect(db.exec(runnable(migrationPlan(rows)))).rejects.toThrow(
        /Existing app database/,
      );
      await db.exec("ROLLBACK");
      await db.exec(
        "create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key);",
      );
      await expect(
        db.exec(runnable(migrationPlan(rows, "baseline-cloud"))),
      ).rejects.toThrow(/Cloud history does not match/);
      await db.exec("ROLLBACK");
      await db.exec(
        "insert into supabase_migrations.schema_migrations values('20260101000000');",
      );
      await db.exec(runnable(migrationPlan(rows, "baseline-cloud")));
      await db.exec(runnable(migrationPlan(rows)));
      expect(
        (await db.query("select id from public.bookings")).rows[0].id,
      ).toBe(77);
    } finally {
      await db.close();
    }
  });
  it("handles outer transactions without changing PL/pgSQL and refuses invalid token/jobs", () => {
    const body =
      "create function foo() returns void language plpgsql as $$begin null; end$$;";
    expect(stripTransaction(`begin;\n${body}\ncommit;`)).toContain(body);
    expect(() => stripTransaction("begin;\nbegin;\ncommit;")).toThrow();
    expect(() => jobsPlan("unsafe")).toThrow();
    expect(jobsPlan("a".repeat(64))).toContain(
      "http://api-gw:8000/functions/v1/calendar-sync",
    );
  });
  it("excludes credentials from Docker build and preserves private gateway exposure", async () => {
    const dockerfile = await readFile(
      new URL("../Dockerfile", import.meta.url),
      "utf8",
    );
    const ignore = await readFile(
      new URL("../.dockerignore", import.meta.url),
      "utf8",
    );
    const compose = await readFile(
      new URL("../deploy/compose.yml", import.meta.url),
      "utf8",
    );
    expect(dockerfile).not.toMatch(
      /^ARG (SUPABASE_SECRET_KEY|POSTGRES_PASSWORD|CRON_SECRET)/m,
    );
    expect(dockerfile).toContain("USER node");
    expect(ignore).toContain("**/.env*");
    expect(compose).toContain('"127.0.0.1:5432:5432"');
    expect(compose).toContain('"127.0.0.1:8000:8000"');
  });
});
