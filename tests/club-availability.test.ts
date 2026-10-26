import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";

const db = new PGlite();
const admin = "50000000-0000-4000-8000-000000000001";
const owner = "50000000-0000-4000-8000-000000000002";
const other = "50000000-0000-4000-8000-000000000003";
const manager = "50000000-0000-4000-8000-000000000004";
let serial = 0;
async function role(name: string, user = owner) {
  await db.exec(`reset role;set role ${name}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
}
async function id(sql: string, args: unknown[] = []) {
  return (await db.query<{ id: string }>(sql, args)).rows[0].id;
}
async function fixture() {
  await role("postgres");
  const city = await id(
    "insert into cities(slug,name) values($1,'شهر آزمون') returning id",
    [crypto.randomUUID()],
  );
  const club = await id(
    "insert into clubs(city_id,slug,name,address,published) values($1,$2,'باشگاه آزمون','آدرس آزمون',true) returning id",
    [city, crypto.randomUUID()],
  );
  const courts: string[] = [];
  for (let i = 0; i < 2; i++)
    courts.push(
      await id(
        "insert into courts(club_id,name,hourly_price,platform_fee) values($1,$2,2000000,50000) returning id",
        [club, String(i)],
      ),
    );
  const equipment = await id(
    "insert into equipment(club_id,name,kind,stock,price) values($1,'راکت','personal',2,10000) returning id",
    [club],
  );
  async function slot(court = courts[0]) {
    await role("postgres");
    return id(
      "insert into court_slots(court_id,starts_at,ends_at,court_price) values($1,now()+interval '5 days'+make_interval(hours=>$2),now()+interval '5 days 90 minutes'+make_interval(hours=>$2),4000000) returning id",
      [court, serial++ * 2],
    );
  }
  async function request(slotId: string, kind = "private") {
    await role("authenticated", owner);
    return id(
      "select request_booking($1,$2,$3,'آزمون باشگاه','',null,null,'[]'::jsonb) id",
      [slotId, kind, crypto.randomUUID()],
    );
  }
  async function active(enabled: boolean) {
    await role("authenticated", admin);
    await db.query("select set_club_availability($1,$2)", [club, enabled]);
  }
  return { city, club, courts, equipment, slot, request, active };
}
beforeAll(async () => {
  await db.exec(
    "create schema auth;create role anon;create role authenticated;create role service_role bypassrls;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated,service_role;",
  );
  const dir = new URL("../supabase/migrations/", import.meta.url);
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync(new URL(file, dir), "utf8"));
  await db.query("insert into auth.users(id) values($1),($2),($3),($4)", [
    admin,
    owner,
    other,
    manager,
  ]);
  await db.query("insert into admins(user_id) values($1)", [admin]);
  for (const user of [admin, owner, other, manager]) {
    await role("authenticated", user);
    await db.query("select save_my_profile('کاربر آزمایشی',1)");
  }
  await role("authenticated", admin);
  await db.query(
    "select save_payment_settings(true,true,'4242424242424242','حساب آزمایشی')",
  );
});
afterAll(async () => db.close());

it("does not let the gateway worker initiate a new bank request after deactivation", async () => {
  const f = await fixture();
  const booking = await f.request(await f.slot());
  const participant = await id(
    "select id from booking_participants where booking_id=$1",
    [booking],
  );
  const payment = await id("select start_payment($1,null,'zarinpal') id", [
    participant,
  ]);
  await f.active(false);
  await role("service_role");
  expect(
    (
      await db.query<{ claimed: boolean }>(
        "select claim_payment_request($1) claimed",
        [payment],
      )
    ).rows[0].claimed,
  ).toBe(false);
  await f.active(true);
  await role("service_role");
  expect(
    (
      await db.query<{ claimed: boolean }>(
        "select claim_payment_request($1) claimed",
        [payment],
      )
    ).rows[0].claimed,
  ).toBe(true);
});

it("allows only admins to change availability, including direct API updates by a club manager", async () => {
  const f = await fixture();
  await role("postgres");
  await db.query("insert into club_managers(club_id,user_id) values($1,$2)", [
    f.club,
    manager,
  ]);
  await role("authenticated", other);
  await expect(
    db.query("select set_club_availability($1,false)", [f.club]),
  ).rejects.toThrow("ADMIN_REQUIRED");
  await role("authenticated", manager);
  await expect(
    db.query("update clubs set published=false where id=$1", [f.club]),
  ).rejects.toThrow("ADMIN_REQUIRED");
  await f.active(false);
  await role("anon");
  expect(
    (await db.query("select * from clubs where id=$1", [f.club])).rows,
  ).toHaveLength(0);
  await role("authenticated", admin);
  expect(
    (await db.query("select * from clubs where id=$1", [f.club])).rows,
  ).toHaveLength(1);
});

it("hides club, courts, equipment and availability; blocks known-slot booking and permits reactivation", async () => {
  const f = await fixture();
  const slot = await f.slot();
  await f.active(false);
  for (const userRole of ["anon", "authenticated"]) {
    await role(userRole, other);
    for (const [table, key, value] of [
      ["clubs", "id", f.club],
      ["courts", "club_id", f.club],
      ["court_slots", "id", slot],
      ["equipment", "id", f.equipment],
    ]) {
      expect(
        (await db.query(`select * from ${table} where ${key}=$1`, [value]))
          .rows,
      ).toHaveLength(0);
    }
    expect(
      (
        await db.query(
          "select * from discover_slots($1,now(),now()+interval '30 days')",
          [f.courts[0]],
        )
      ).rows,
    ).toEqual([]);
  }
  await expect(f.request(slot)).rejects.toThrow(
    /SLOT_UNAVAILABLE|CLUB_UNAVAILABLE/,
  );
  await f.active(true);
  expect(await f.request(slot)).toMatch(/^[0-9a-f-]{36}$/);
});

it("blocks joining a known open game or event and hides their public discovery and roster", async () => {
  const f = await fixture();
  const booking = await f.request(await f.slot(), "open");
  await role("authenticated", admin);
  await db.query(
    "select approve_booking($1,'آزمون تأیید',now()+interval '1 hour')",
    [booking],
  );
  await role("postgres");
  const match = await id("select id from open_matches where booking_id=$1", [
    booking,
  ]);
  const first = await f.slot();
  const start = (
    await db.query<{ starts_at: string; ends_at: string }>(
      "select starts_at,ends_at from court_slots where id=$1",
      [first],
    )
  ).rows[0];
  const second = await id(
    "insert into court_slots(court_id,starts_at,ends_at,court_price) values($1,$2,$3,4000000) returning id",
    [f.courts[1], start.starts_at, start.ends_at],
  );
  const event = await id(
    "insert into platform_events(slug,title,kind,club_id,organizer_id,starts_at,registration_deadline,capacity,entry_fee,published) values($1,'رویداد آزمون','americano',$2,$3,$4,now()+interval '1 day',8,0,true) returning id",
    [crypto.randomUUID(), f.club, admin, start.starts_at],
  );
  await role("authenticated", admin);
  await db.query("select secure_event_courts($1,$2::uuid[],'آزمون سانس')", [
    event,
    [first, second],
  ]);
  await role("authenticated", owner);
  await db.query("select register_event($1)", [event]);
  await f.active(false);
  await role("authenticated", other);
  await expect(db.query("select join_open_match($1)", [match])).rejects.toThrow(
    "CLUB_UNAVAILABLE",
  );
  await expect(db.query("select register_event($1)", [event])).rejects.toThrow(
    "CLUB_UNAVAILABLE",
  );
  for (const userRole of ["anon", "authenticated"]) {
    await role(userRole, other);
    expect(
      (await db.query("select * from open_matches where id=$1", [match])).rows,
    ).toHaveLength(0);
    expect(
      (await db.query("select * from platform_events where id=$1", [event]))
        .rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query<{ roster: unknown[] }>(
          "select event_roster($1) roster",
          [event],
        )
      ).rows[0].roster,
    ).toEqual([]);
    expect(
      (
        await db.query<{ matches: unknown[] }>(
          "select discover_matches(p_id=>$1) matches",
          [match],
        )
      ).rows[0].matches,
    ).toEqual([]);
  }
  await f.active(true);
  await role("authenticated", other);
  expect(await id("select join_open_match($1) id", [match])).toMatch(
    /^[0-9a-f-]{36}$/,
  );
  expect(await id("select register_event($1) id", [event])).toMatch(
    /^[0-9a-f-]{36}$/,
  );
});

it("rejects cached checkout but keeps historical orders and previously transferred receipts reviewable", async () => {
  const f = await fixture();
  const booking = await f.request(await f.slot());
  const participant = await id(
    "select id from booking_participants where booking_id=$1",
    [booking],
  );
  const payment = await id("select start_payment($1,null,'card_transfer') id", [
    participant,
  ]);
  await f.active(false);
  await role("authenticated", owner);
  await expect(
    db.query("select start_payment($1,null,'card_transfer')", [participant]),
  ).rejects.toThrow("CLUB_UNAVAILABLE");
  await expect(
    db.query("select start_checkout($1,null)", [participant]),
  ).rejects.toThrow("CLUB_UNAVAILABLE");
  expect(
    (await db.query("select * from bookings where id=$1", [booking])).rows,
  ).toHaveLength(1);
  expect(
    (await db.query("select * from payments where id=$1", [payment])).rows,
  ).toHaveLength(1);
  const path = `${owner}/${payment}/${crypto.randomUUID()}.png`;
  await db.query("select submit_card_receipt($1,$2)", [payment, path]);
  expect(
    (
      await db.query<{ status: string }>(
        "select status from card_transfer_receipts where payment_id=$1",
        [payment],
      )
    ).rows[0].status,
  ).toBe("pending");
});
