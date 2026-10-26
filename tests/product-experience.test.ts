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

it("quotes the coupon before checkout and atomically rejects a changed total", async () => {
  const f = await fixture();
  const slot = await f.slot();
  await role("postgres");
  const code =
    "UX" + crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
  await db.query(
    "insert into discount_codes(code,kind,value,max_uses,expires_at) values($1,'percent',20,10,now()+interval '1 day')",
    [code],
  );
  await role("authenticated", owner);
  const quote = (
    await db.query<{ q: { total: number; discount: number } }>(
      "select quote_booking_discount($1,'private','[]',$2) q",
      [slot, code],
    )
  ).rows[0].q;
  expect(quote.total).toBe(3240000);
  expect(quote.discount).toBe(810000);
  const request =
    "select request_booking_checkout($1,'private',$2,'رزرو آزمایشی','',null,null,'[]',$3,$4) id";
  await expect(
    db.query(request, [slot, crypto.randomUUID(), code, quote.total - 1]),
  ).rejects.toThrow("DISCOUNT_CHANGED");
  expect(
    (await db.query("select id from bookings where slot_id=$1", [slot])).rows,
  ).toHaveLength(0);
  const booking = await id(request, [
    slot,
    crypto.randomUUID(),
    code,
    quote.total,
  ]);
  expect(
    (
      await db.query<{ total: number }>(
        "select court_share+shared_share+personal_price+fee total from booking_participants where booking_id=$1",
        [booking],
      )
    ).rows[0].total,
  ).toBe(quote.total);
  const payment = await id(
    "select start_payment((select id from booking_participants where booking_id=$1),null,'card_transfer') id",
    [booking],
  );
  expect(
    (
      await db.query<{ amount: number }>(
        "select amount from payments where id=$1",
        [payment],
      )
    ).rows[0].amount,
  ).toBe(quote.total);
});
it("keeps cancellation quotes private and rechecks the exact refund at confirmation", async () => {
  const f = await fixture();
  const booking = await f.request(await f.slot());
  const seat = await id(
    "select id from booking_participants where booking_id=$1",
    [booking],
  );
  await role("postgres");
  await db.query(
    "insert into payments(user_id,participant_id,amount,provider,status,request_key,expires_at) values($1,$2,4050000,'card_transfer','paid',$3,now()+interval '1 hour')",
    [owner, seat, crypto.randomUUID()],
  );
  await db.query(
    "update booking_participants set status='paid',lock_expires_at=null where id=$1",
    [seat],
  );
  await role("authenticated", other);
  await expect(
    db.query("select booking_cancellation_quote($1)", [booking]),
  ).rejects.toThrow("FORBIDDEN");
  await role("authenticated", owner);
  const quote = (
    await db.query<{ q: { paid: number; refund: number; allowed: boolean } }>(
      "select booking_cancellation_quote($1) q",
      [booking],
    )
  ).rows[0].q;
  expect(quote).toEqual({ paid: 4050000, refund: 4050000, allowed: true });
  await expect(
    db.query("select cancel_booking_quoted($1,'دلیل لغو',0)", [booking]),
  ).rejects.toThrow("REFUND_CHANGED");
  await db.query("select cancel_booking_quoted($1,'دلیل لغو',$2)", [
    booking,
    quote.refund,
  ]);
  expect(
    (
      await db.query(
        "select * from refunds where payment_id in (select id from payments where participant_id=$1)",
        [seat],
      )
    ).rows,
  ).toHaveLength(1);
});
it("enforces support ownership, idempotency, administrator replies and notification privacy", async () => {
  const f = await fixture();
  const booking = await f.request(await f.slot());
  await role("authenticated", other);
  await expect(
    db.query(
      "select create_support_request($1,'پیگیری رزرو','متن کامل درخواست پیگیری',$2)",
      [crypto.randomUUID(), booking],
    ),
  ).rejects.toThrow("FORBIDDEN");
  await role("authenticated", owner);
  const key = crypto.randomUUID();
  const request = await id(
    "select create_support_request($1,'پیگیری رزرو','متن کامل درخواست پیگیری',$2) id",
    [key, booking],
  );
  expect(
    await id(
      "select create_support_request($1,'پیگیری رزرو','متن کامل درخواست پیگیری',$2) id",
      [key, booking],
    ),
  ).toBe(request);
  await expect(
    db.query("select answer_support_request($1,'پاسخ پشتیبانی')", [request]),
  ).rejects.toThrow("ADMIN_REQUIRED");
  await role("authenticated", other);
  expect(
    (await db.query("select * from support_requests where id=$1", [request]))
      .rows,
  ).toHaveLength(0);
  await role("authenticated", admin);
  await db.query("select answer_support_request($1,'درخواست شما بررسی شد')", [
    request,
  ]);
  await role("authenticated", owner);
  expect(
    (
      await db.query<{ status: string }>(
        "select status from support_requests where id=$1",
        [request],
      )
    ).rows[0].status,
  ).toBe("answered");
  const notice = await id(
    "select id from notifications where user_id=$1 and href like '/account/support%'",
    [owner],
  );
  await db.query("update notifications set read_at=now() where id=$1", [
    notice,
  ]);
  await expect(
    db.query("update notifications set body='تغییر غیرمجاز' where id=$1", [
      notice,
    ]),
  ).rejects.toThrow("permission denied");
});
it("withdraws an event registration once, queues the paid refund and releases capacity", async () => {
  const f = await fixture();
  await role("postgres");
  const event = await id(
    "insert into platform_events(slug,title,kind,club_id,organizer_id,starts_at,registration_deadline,capacity,entry_fee,published) values($1,'رویداد آزمایشی','americano',$2,$3,now()+interval '5 days',now()+interval '4 days',8,100000,true) returning id",
    [crypto.randomUUID(), f.club, admin],
  );
  const registration = await id(
    "insert into event_registrations(event_id,user_id,status,amount) values($1,$2,'paid',100000) returning id",
    [event, owner],
  );
  await db.query(
    "insert into payments(user_id,registration_id,amount,provider,status,request_key,expires_at) values($1,$2,100000,'card_transfer','paid',$3,now()+interval '1 hour')",
    [owner, registration, crypto.randomUUID()],
  );
  await role("authenticated", other);
  await expect(
    db.query("select withdraw_event($1,100000)", [event]),
  ).rejects.toThrow("FORBIDDEN");
  await role("authenticated", owner);
  await expect(
    db.query("select withdraw_event($1,0)", [event]),
  ).rejects.toThrow("REFUND_CHANGED");
  await db.query("select withdraw_event($1,100000)", [event]);
  await db.query("select withdraw_event($1,100000)", [event]);
  expect(
    (
      await db.query<{ status: string }>(
        "select status from event_registrations where id=$1",
        [registration],
      )
    ).rows[0].status,
  ).toBe("refund_pending");
  expect(
    (
      await db.query(
        "select * from refunds where payment_id in (select id from payments where registration_id=$1)",
        [registration],
      )
    ).rows,
  ).toHaveLength(1);
});
it("rejects hiding occupied slots and limits the operations summary to admins", async () => {
  const f = await fixture();
  const occupied = await f.slot();
  await f.request(occupied);
  const free = await f.slot();
  await role("authenticated", owner);
  await expect(db.query("select operations_summary()")).rejects.toThrow(
    "ADMIN_REQUIRED",
  );
  await expect(
    db.query("select set_slot_visibility($1,false)", [free]),
  ).rejects.toThrow("ADMIN_REQUIRED");
  await role("authenticated", admin);
  await expect(
    db.query("select set_slot_visibility($1,false)", [occupied]),
  ).rejects.toThrow("SLOT_HAS_BOOKINGS");
  await db.query("select set_slot_visibility($1,false)", [free]);
  expect(
    (
      await db.query<{ published: boolean }>(
        "select published from court_slots where id=$1",
        [free],
      )
    ).rows[0].published,
  ).toBe(false);
  expect(
    (
      await db.query<{ s: { support: number } }>(
        "select operations_summary() s",
      )
    ).rows[0].s.support,
  ).toBeTypeOf("number");
});
