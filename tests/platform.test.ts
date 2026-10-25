import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
const db = new PGlite();
const admin = "20000000-0000-4000-8000-000000000001";
const users = Array.from(
  { length: 12 },
  (_, i) => `20000000-0000-4000-8000-${String(i + 10).padStart(12, "0")}`,
);
let club: string, courts: string[], racket: string, balls: string;
let serial = 0;
async function query<T = Record<string, unknown>>(
  sql: string,
  args: unknown[] = [],
) {
  return (await db.query<T>(sql, args)).rows;
}
async function role(
  name: "postgres" | "anon" | "authenticated" | "service_role",
  uid = admin,
) {
  await db.exec(`reset role;set role ${name}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
}
async function id(sql: string, args: unknown[] = []) {
  return (await query<{ id: string }>(sql, args))[0].id;
}
async function slot(court = courts[0], price = 4000001, day = 2) {
  await role("postgres");
  serial++;
  return id(
    "insert into court_slots(court_id,starts_at,ends_at,court_price) values($1,now()+make_interval(days=>$2,mins=>$3),now()+make_interval(days=>$2,mins=>$3)+interval '90 minutes',$4) returning id",
    [court, day, serial * 120, price],
  );
}
async function request(
  s: string,
  kind = "private",
  key = crypto.randomUUID(),
  eq: unknown[] = [],
  user = users[0],
  min: number | null = null,
  max: number | null = null,
) {
  await role("authenticated", user);
  return id(
    "select request_booking($1,$2,$3,'بازی تست','', $4,$5,$6::jsonb) id",
    [s, kind, key, min, max, JSON.stringify(eq)],
  );
}
async function approve(b: string, minutes = 60) {
  await role("authenticated");
  await db.query(
    "select approve_booking($1,'club-confirmed',now()+make_interval(mins=>$2))",
    [b, minutes],
  );
}
async function participant(b: string, user = users[0]) {
  return id(
    "select id from booking_participants where booking_id=$1 and user_id=$2",
    [b, user],
  );
}
async function paySeat(b: string, user = users[0], ref = crypto.randomUUID()) {
  await role("authenticated", user);
  const bp = await participant(b, user);
  const pid = await id("select start_checkout($1,null) id", [bp]);
  await role("service_role");
  await db.query("select attach_payment_authority($1,$2)", [
    pid,
    `A${pid.replaceAll("-", "")}`,
  ]);
  const p = (
    await query<{ amount: number }>(
      "select amount::float8 amount from payments where id=$1",
      [pid],
    )
  )[0];
  await db.query("select settle_payment($1,$2,$3)", [pid, ref, p.amount]);
  return { pid, ref, amount: p.amount };
}
beforeAll(async () => {
  await db.exec(
    "create schema auth;create role anon;create role authenticated;create role service_role bypassrls;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;",
  );
  const directory = new URL("../supabase/migrations/", import.meta.url);
  const migrations = readdirSync(directory)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const f of migrations.filter((f) => !f.startsWith("202610")))
    await db.exec(readFileSync(new URL(f, directory), "utf8"));
  await db.query("insert into auth.users(id) select unnest($1::uuid[])", [
    [admin, ...users],
  ]);
  await db.query("insert into admins(user_id) values($1)", [admin]);
  const historical = await query<{ id: string }>(
    "insert into players(first_name,last_name) select 'تاریخی',n::text from generate_series(1,8)n returning id",
  );
  await role("authenticated");
  const tid = await id(
    "select create_tournament('سابقه حفظ‌شونده',current_date,$1::uuid[]) id",
    [historical.map((p) => p.id)],
  );
  const before = await query(
    "select * from tournament_results where tournament_id=$1 order by player_id",
    [tid],
  );
  await role("postgres");
  for (const f of migrations.filter((f) => f.startsWith("202610")))
    await db.exec(readFileSync(new URL(f, directory), "utf8"));
  expect(
    await query(
      "select * from tournament_results where tournament_id=$1 order by player_id",
      [tid],
    ),
  ).toEqual(before);
  const city = await id(
    "insert into cities(slug,name) values('test-city','شهر آزمون') returning id",
  );
  club = await id(
    "insert into clubs(city_id,slug,name,address,published) values($1,'test-club','باشگاه آزمون','آدرس واقعی آزمون',true) returning id",
    [city],
  );
  courts = (
    await query<{ id: string }>(
      "insert into courts(club_id,name,hourly_price,platform_fee) values($1,'یک',2000000,50000),($1,'دو',2000000,50000) returning id",
      [club],
    )
  ).map((c) => c.id);
  racket = await id(
    "insert into equipment(club_id,name,kind,stock,price) values($1,'راکت','personal',2,300000) returning id",
    [club],
  );
  balls = await id(
    "insert into equipment(club_id,name,kind,stock,price) values($1,'توپ','shared',2,100001) returning id",
    [club],
  );
  for (let i = 0; i < users.length; i++) {
    await role("authenticated", users[i]);
    await db.query("select save_my_profile($1,$2)", [
      `بازیکن شماره ${i + 1}`,
      i === 11 ? 5 : 1,
    ]);
  }
});
afterAll(async () => db.close());
describe("discounts and administrator waivers", () => {
  it("requires owner consent and a real new reservation while preserving paid amounts", async () => {
    const original = await slot(courts[0], 4000001, 7);
    const replacement = await slot(courts[0], 4000001, 8);
    const b = await request(original);
    await approve(b);
    const paid = await paySeat(b);
    await role("authenticated", users[1]);
    await expect(
      db.query("select propose_booking_slot($1,$2,'زمان قبلی آزاد نیست')", [
        b,
        replacement,
      ]),
    ).rejects.toThrow("ADMIN_REQUIRED");
    await role("authenticated");
    const proposal = await id(
      "select propose_booking_slot($1,$2,'زمان قبلی آزاد نیست') id",
      [b, replacement],
    );
    expect(
      (
        await query<{ slot_id: string }>(
          "select slot_id from bookings where id=$1",
          [b],
        )
      )[0].slot_id,
    ).toBe(original);
    await role("authenticated", users[1]);
    await expect(
      db.query("select reply_booking_slot($1,true)", [proposal]),
    ).rejects.toThrow("FORBIDDEN");
    await role("authenticated", users[0]);
    await db.query("select reply_booking_slot($1,true)", [proposal]);
    await role("service_role");
    await db.query("select run_platform_jobs()");
    expect(
      (
        await query<{ status: string }>(
          "select status from bookings where id=$1",
          [b],
        )
      )[0].status,
    ).toBe("needs_attention");
    await role("authenticated");
    await db.query(
      "select fulfill_booking($1,'new-club-reference',now()+interval '2 hours')",
      [b],
    );
    expect(
      (
        await query(
          "select slot_id,status,fulfillment_state from bookings where id=$1",
          [b],
        )
      )[0],
    ).toMatchObject({
      slot_id: replacement,
      status: "confirmed",
      fulfillment_state: "booked",
    });
    expect(
      (await query("select status from payments where id=$1", [paid.pid]))[0]
        .status,
    ).toBe("paid");
    expect(
      await query("select * from refunds where payment_id=$1", [paid.pid]),
    ).toHaveLength(0);
  });
  it("rechecks target inventory on acceptance and keeps rejected requests in the manager queue", async () => {
    const original = await slot(courts[1], 5000000, 9),
      replacement = await slot(courts[1], 5000000, 10);
    const b = await request(original);
    await role("authenticated");
    const proposal = await id(
      "select propose_booking_slot($1,$2,'پیشنهاد جدید') id",
      [b, replacement],
    );
    await request(replacement, "private", crypto.randomUUID(), [], users[1]);
    await role("authenticated", users[0]);
    await expect(
      db.query("select reply_booking_slot($1,true)", [proposal]),
    ).rejects.toThrow("REPLACEMENT_UNAVAILABLE");
    await db.query("select reply_booking_slot($1,false)", [proposal]);
    expect(
      (
        await query(
          "select slot_id,fulfillment_state from bookings where id=$1",
          [b],
        )
      )[0],
    ).toMatchObject({ slot_id: original, fulfillment_state: "review" });
  });
  it("leases notification delivery and prevents stale workers from changing sent records", async () => {
    await role("postgres");
    await db.exec("update notification_deliveries set status='sent'");
    await db.query(
      "insert into notifications(user_id,title,body,dedupe_key,href) values($1,'آزمون اعلان','پیام آزمون','delivery-test','/account')",
      [users[0]],
    );
    await role("authenticated", users[0]);
    await expect(
      db.query("select claim_notification_deliveries(array['sms'])"),
    ).rejects.toThrow();
    await role("service_role");
    const claimed = (
      await query<{ data: { id: number; lease_token: string }[] }>(
        "select claim_notification_deliveries(array['sms']) data",
      )
    )[0].data[0];
    await db.query(
      "select finish_notification_delivery($1,$2,'sent','sms-ref',null)",
      [claimed.id, crypto.randomUUID()],
    );
    expect(
      (
        await query("select status from notification_deliveries where id=$1", [
          claimed.id,
        ])
      )[0].status,
    ).toBe("processing");
    await db.query(
      "select finish_notification_delivery($1,$2,'sent','sms-ref',null)",
      [claimed.id, claimed.lease_token],
    );
    expect(
      (
        await query("select status from notification_deliveries where id=$1", [
          claimed.id,
        ])
      )[0].status,
    ).toBe("sent");
  });
  it("requires fresh owner consent when an accepted alternative must be replaced again", async () => {
    const original = await slot(courts[1], 6000000, 20),
      first = await slot(courts[1], 6000000, 21),
      second = await slot(courts[1], 6000000, 22);
    const b = await request(original);
    await role("authenticated");
    const firstProposal = await id(
      "select propose_booking_slot($1,$2,'پیشنهاد اول') id",
      [b, first],
    );
    await role("authenticated", users[0]);
    await db.query("select reply_booking_slot($1,true)", [firstProposal]);
    await role("authenticated");
    const nextProposal = await id(
      "select propose_booking_slot($1,$2,'زمان اول دوباره اشغال شد') id",
      [b, second],
    );
    expect(
      (
        await query("select status from booking_reschedules where id=$1", [
          firstProposal,
        ])
      )[0].status,
    ).toBe("superseded");
    await expect(
      db.query(
        "select fulfill_booking($1,'premature',now()+interval '1 hour')",
        [b],
      ),
    ).rejects.toThrow();
    await role("authenticated", users[0]);
    await db.query("select reply_booking_slot($1,true)", [nextProposal]);
    await role("authenticated");
    await db.query(
      "select fulfill_booking($1,'new-confirmed',now()+interval '1 hour')",
      [b],
    );
    expect(
      (await query("select slot_id from bookings where id=$1", [b]))[0].slot_id,
    ).toBe(second);
  });
  it("settles the discounted bank amount and allows admin waiver of a discounted balance", async () => {
    await role("postgres");
    await db.exec(
      "insert into discount_codes(code,kind,value,max_uses,expires_at) values('HALF50','percent',50,10,now()+interval '1 day')",
    );
    const b = await request(await slot());
    await approve(b);
    const p = await participant(b);
    await role("authenticated", users[1]);
    await expect(
      db.query("select apply_booking_benefit($1,'HALF50',null)", [p]),
    ).rejects.toThrow("NOT_ALLOWED");
    expect(await query("select * from discount_codes")).toHaveLength(0);
    await role("authenticated", users[0]);
    await db.query("select apply_booking_benefit($1,'HALF50',null)", [p]);
    const { amount } = await paySeat(b);
    expect(amount).toBe(Math.ceil((4000001 + 50000) / 2));
    await role("postgres");
    expect(
      (
        await query<{ status: string }>(
          "select status from bookings where id=$1",
          [b],
        )
      )[0].status,
    ).toBe("confirmed");
    const b2 = await request(
      await slot(),
      "private",
      crypto.randomUUID(),
      [],
      users[1],
    );
    await approve(b2);
    const p2 = await participant(b2, users[1]);
    await role("authenticated", users[1]);
    await db.query("select apply_booking_benefit($1,'HALF50',null)", [p2]);
    await role("authenticated");
    await db.query(
      "select apply_booking_benefit($1,null,'تکمیل هدیه باشگاه')",
      [p2],
    );
    await role("postgres");
    expect(
      (
        await query<{ status: string }>(
          "select status from bookings where id=$1",
          [b2],
        )
      )[0].status,
    ).toBe("confirmed");
    expect(
      await query("select * from payments where participant_id=$1", [p2]),
    ).toHaveLength(0);
    const benefit = (
      await query<{
        discount: number;
        original: { court_share: number; fee: number };
      }>(
        "select discount::float8 discount,original from booking_benefits where participant_id=$1",
        [p2],
      )
    )[0];
    expect(benefit.discount).toBe(4050001);
    expect(
      Number(benefit.original.court_share) + Number(benefit.original.fee),
    ).toBe(4050001);
  });
  it("blocks adjustments while a bank payment is pending and rejects expired coupons", async () => {
    const b = await request(
      await slot(),
      "private",
      crypto.randomUUID(),
      [],
      users[3],
    );
    await approve(b);
    const p = await participant(b, users[3]);
    await role("postgres");
    await db.exec(
      "insert into discount_codes(code,kind,value,max_uses,expires_at) values('OLD10','fixed',1000,10,now()-interval '1 day')",
    );
    await role("authenticated", users[3]);
    await expect(
      db.query("select apply_booking_benefit($1,'OLD10',null)", [p]),
    ).rejects.toThrow("INVALID_DISCOUNT");
    await db.query("select start_checkout($1,null)", [p]);
    await role("authenticated");
    await expect(
      db.query("select apply_booking_benefit($1,null,'هدیه باشگاه')", [p]),
    ).rejects.toThrow("PAYMENT_CONFLICT");
  });
  it("requires a hold for open matches, never fabricates bank receipts and enforces coupon limits", async () => {
    const b = await request(await slot(), "open");
    await role("postgres");
    const p = await participant(b);
    await role("authenticated", users[0]);
    await expect(
      db.query("select apply_booking_benefit($1,null,'هدیه باشگاه')", [p]),
    ).rejects.toThrow("NOT_ALLOWED");
    await role("authenticated");
    await expect(
      db.query("select apply_booking_benefit($1,null,'هدیه باشگاه')", [p]),
    ).rejects.toThrow("NOT_PAYABLE");
    await approve(b);
    await db.query("select apply_booking_benefit($1,null,'هدیه باشگاه')", [p]);
    await role("postgres");
    expect(
      (
        await query<{ status: string }>(
          "select status from bookings where id=$1",
          [b],
        )
      )[0].status,
    ).toBe("collecting");
    expect(
      await query("select * from payments where participant_id=$1", [p]),
    ).toHaveLength(0);
    const b2 = await request(
      await slot(),
      "private",
      crypto.randomUUID(),
      [],
      users[1],
    );
    await approve(b2);
    await role("postgres");
    const p2 = await participant(b2, users[1]);
    await db.exec(
      "insert into discount_codes(code,kind,value,max_uses,expires_at) values('FREE100','percent',100,1,now()+interval '1 day')",
    );
    await role("authenticated", users[1]);
    await db.query("select apply_booking_benefit($1,'free100',null)", [p2]);
    await db.query("select apply_booking_benefit($1,'free100',null)", [p2]);
    await role("postgres");
    expect(
      (
        await query<{ status: string }>(
          "select status from bookings where id=$1",
          [b2],
        )
      )[0].status,
    ).toBe("confirmed");
    const b3 = await request(
      await slot(),
      "private",
      crypto.randomUUID(),
      [],
      users[2],
    );
    await approve(b3);
    await role("postgres");
    const p3 = await participant(b3, users[2]);
    await role("authenticated", users[2]);
    await expect(
      db.query("select apply_booking_benefit($1,'FREE100',null)", [p3]),
    ).rejects.toThrow("INVALID_DISCOUNT");
  });
});
describe("calendar import isolation and scheduling", () => {
  it("fences workers, protects booking prices, closes missing inventory and rejects stale calendars", async () => {
    await role("postgres");
    const connection = await id(
      "select id from calendar_connections where source='guilan'",
    );
    await db.exec("update calendar_connections set enabled=false");
    await role("authenticated", users[1]);
    await expect(
      db.query("select configure_calendar($1,$2,true,60,7)", [
        connection,
        club,
      ]),
    ).rejects.toThrow("ADMIN_REQUIRED");
    expect(await query("select * from calendar_connections")).toEqual([]);
    await role("authenticated");
    await expect(
      db.query("select configure_calendar($1,$2,true,1,7)", [connection, club]),
    ).rejects.toThrow();
    await db.query("select configure_calendar($1,$2,true,60,7)", [
      connection,
      club,
    ]);
    await role("service_role");
    async function claim() {
      return (
        await query<{ job: { token: string } }>(
          "select claim_calendar_sync() job",
        )
      )[0].job;
    }
    const first = await claim();
    expect(await claim()).toBeNull();
    const from = new Date(Date.now() + 30 * 86400000).toISOString();
    const to = new Date(Date.parse(from) + 86400000).toISOString();
    const external = JSON.stringify([
      { reference: "court-a", name: "زمین خارجی", price: 10000000 },
    ]);
    async function finish(token: string, slots: unknown[], status = "ok") {
      return query<{ result: { imported: number; conflicts: number } }>(
        "select finish_calendar_sync($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7) result",
        [connection, token, status, external, JSON.stringify(slots), from, to],
      );
    }
    await finish(first.token, [], "needs_mapping");
    await role("authenticated");
    await db.query("select map_calendar_court($1,$2,'court-a')", [
      connection,
      courts[0],
    ]);
    await role("service_role");
    const second = await claim();
    await expect(finish(first.token, [])).rejects.toThrow("STALE_CALENDAR_RUN");
    const item = {
      courtRef: "court-a",
      startsAt: from,
      endsAt: new Date(Date.parse(from) + 3600000).toISOString(),
      price: 10000000,
      available: true,
    };
    expect((await finish(second.token, [item]))[0].result.imported).toBe(1);
    await role("postgres");
    const imported = await id(
      "select id from court_slots where calendar_connection_id=$1",
      [connection],
    );
    expect(
      (
        await query<{ fresh: boolean }>(
          "select private.calendar_slot_fresh($1) fresh",
          [imported],
        )
      )[0].fresh,
    ).toBe(true);
    const booking = await request(imported);
    await role("postgres");
    await db.query(
      "update calendar_connections set next_sync_at=now() where id=$1",
      [connection],
    );
    await role("service_role");
    const third = await claim();
    expect(
      (await finish(third.token, [{ ...item, price: 12000000 }]))[0].result
        .conflicts,
    ).toBe(1);
    await role("postgres");
    expect(
      (
        await query<{ court_price: number }>(
          "select court_price::float8 court_price from bookings where id=$1",
          [booking],
        )
      )[0].court_price,
    ).toBe(10000000);
    await db.query(
      "update calendar_connections set next_sync_at=now() where id=$1",
      [connection],
    );
    await role("service_role");
    const fourth = await claim();
    await finish(fourth.token, []);
    await role("postgres");
    expect(
      (
        await query<{ published: boolean }>(
          "select published from court_slots where id=$1",
          [imported],
        )
      )[0].published,
    ).toBe(false);
    expect(
      await query("select id from bookings where id=$1", [booking]),
    ).toHaveLength(1);
    await db.query(
      "update calendar_connections set next_sync_at=now() where id=$1",
      [connection],
    );
    await role("service_role");
    const fifth = await claim();
    const next = {
      ...item,
      startsAt: new Date(Date.parse(from) + 7200000).toISOString(),
      endsAt: new Date(Date.parse(from) + 10800000).toISOString(),
    };
    await finish(fifth.token, [next]);
    await role("postgres");
    const stale = await id(
      "select id from court_slots where calendar_connection_id=$1 and starts_at=$2",
      [connection, next.startsAt],
    );
    await db.query(
      "update court_slots set calendar_checked_at=now()-interval '66 minutes' where id=$1",
      [stale],
    );
    await expect(
      request(stale, "private", crypto.randomUUID(), [], users[2]),
    ).rejects.toThrow("CALENDAR_STALE");
    await role("authenticated");
    await db.query("select configure_calendar($1,$2,false,60,7)", [
      connection,
      club,
    ]);
  });
});
describe("payment-first private bookings", () => {
  async function transfer(day: number) {
    await role("authenticated");
    await db.query(
      "select save_payment_settings(true,true,'4242424242424242','حساب فقط برای آزمون')",
    );
    const b = await request(await slot(courts[1], 4000001, day));
    const bp = await participant(b);
    const pid = await id("select start_payment($1,null,'card_transfer') id", [
      bp,
    ]);
    const receipt = await id(
      "select id from card_transfer_receipts where payment_id=$1",
      [pid],
    );
    return { b, bp, pid, receipt };
  }
  async function submitReceipt(pid: string) {
    const path = `${users[0]}/${pid}/${crypto.randomUUID()}.png`;
    await role("postgres");
    await db.exec(
      "create schema if not exists storage;create table if not exists storage.objects(bucket_id text,name text)",
    );
    await db.query(
      "insert into storage.objects(bucket_id,name) values('payment-receipts',$1)",
      [path],
    );
    await role("authenticated", users[0]);
    await db.query("select submit_card_receipt($1,$2)", [pid, path]);
    return path;
  }
  it("protects settings, honors disabled methods and snapshots the destination card", async () => {
    await role("authenticated", users[0]);
    await expect(
      db.query(
        "select save_payment_settings(false,true,'4242424242424242','حساب آزمون')",
      ),
    ).rejects.toThrow("ADMIN_REQUIRED");
    const { pid } = await transfer(200);
    await role("authenticated");
    await db.query(
      "select save_payment_settings(false,false,'5555555555554444','کارت جدید آزمون')",
    );
    await role("authenticated", users[0]);
    expect(
      (
        await query(
          "select card_number from card_transfer_receipts where payment_id=$1",
          [pid],
        )
      )[0].card_number,
    ).toBe("4242424242424242");
    const b = await request(await slot(courts[1], 4000001, 202));
    const bp = await participant(b);
    await expect(
      db.query("select start_payment($1,null,'card_transfer')", [bp]),
    ).rejects.toThrow("PAYMENT_METHOD_DISABLED");
    await expect(
      db.query("select start_checkout($1,null)", [bp]),
    ).rejects.toThrow("PAYMENT_METHOD_DISABLED");
    await role("authenticated");
    await db.query(
      "select save_payment_settings(true,true,'4242424242424242','حساب آزمون')",
    );
  });
  it("requires an uploaded owned receipt and admin bank reconciliation, not a user claim", async () => {
    const { b, pid, receipt } = await transfer(204);
    await expect(
      db.query("select submit_card_receipt($1,'other-owner/file.png')", [pid]),
    ).rejects.toThrow("INVALID_RECEIPT");
    await submitReceipt(pid);
    expect(
      (await query("select status from payments where id=$1", [pid]))[0].status,
    ).toBe("pending");
    expect(
      (await query("select status from bookings where id=$1", [b]))[0].status,
    ).toBe("awaiting_payment");
    await expect(
      db.query("select review_card_receipt($1,1,true,'','real-bank-id')", [
        receipt,
      ]),
    ).rejects.toThrow("ADMIN_REQUIRED");
    await role("authenticated", users[1]);
    expect(
      await query("select * from card_transfer_receipts where id=$1", [
        receipt,
      ]),
    ).toHaveLength(0);
    await role("service_role");
    await expect(
      db.query("select settle_payment($1,'fake-gateway',4000001)", [pid]),
    ).rejects.toThrow("PAYMENT_METHOD_MISMATCH");
    expect(
      (
        await query<{ claimed: boolean }>(
          "select claim_payment_request($1) claimed",
          [pid],
        )
      )[0].claimed,
    ).toBe(false);
    await role("authenticated");
    await expect(
      db.query("select review_card_receipt($1,1,true,'','')", [receipt]),
    ).rejects.toThrow("BANK_REFERENCE_REQUIRED");
    await db.query(
      "select save_payment_settings(true,false,'4242424242424242','حساب آزمون')",
    );
    const bank = `verified-${receipt}`;
    await db.query("select review_card_receipt($1,1,true,'',$2)", [
      receipt,
      bank,
    ]);
    await db.query("select review_card_receipt($1,1,true,'',$2)", [
      receipt,
      bank,
    ]);
    expect(
      (await query("select status from bookings where id=$1", [b]))[0].status,
    ).toBe("booking_in_progress");
    expect(
      (await query("select status from payments where id=$1", [pid]))[0].status,
    ).toBe("paid");
  });
  it("requires a rejection reason, accepts corrections and fences stale review revisions", async () => {
    const { pid, receipt } = await transfer(206);
    await submitReceipt(pid);
    await role("authenticated");
    await expect(
      db.query("select review_card_receipt($1,1,false,'','')", [receipt]),
    ).rejects.toThrow("REASON_REQUIRED");
    await db.query(
      "select review_card_receipt($1,1,false,'شناسهٔ تراکنش خوانا نیست','')",
      [receipt],
    );
    await role("authenticated", users[0]);
    expect(
      (
        await query(
          "select rejection_reason from card_transfer_receipts where id=$1",
          [receipt],
        )
      )[0].rejection_reason,
    ).toContain("خوانا نیست");
    await submitReceipt(pid);
    await role("authenticated");
    await expect(
      db.query("select review_card_receipt($1,1,true,'','stale-review')", [
        receipt,
      ]),
    ).rejects.toThrow("STALE_RECEIPT");
    await db.query("select review_card_receipt($1,2,true,'',$2)", [
      receipt,
      `corrected-${receipt}`,
    ]);
  });
  it("accepts a receipt after a real club hold without extending beyond that hold", async () => {
    const { b, pid } = await transfer(207);
    await approve(b, 45);
    await submitReceipt(pid);
    const [row] = await query<{
      status: string;
      within_hold: boolean;
      same_deadline: boolean;
    }>(
      `select p.status, p.expires_at<=b.hold_expires_at as within_hold,
       p.expires_at=b.payment_deadline as same_deadline
       from payments p join booking_participants bp on bp.id=p.participant_id
       join bookings b on b.id=bp.booking_id where p.id=$1`,
      [pid],
    );
    expect(row).toEqual({
      status: "pending",
      within_hold: true,
      same_deadline: true,
    });
  });
  it("records late claims but refunds verified late money without resurrecting inventory", async () => {
    const { b, pid, receipt } = await transfer(208);
    await role("postgres");
    await db.query(
      "update payments set expires_at=now()-interval '1 minute' where id=$1",
      [pid],
    );
    await db.query(
      "update bookings set payment_deadline=now()-interval '1 minute' where id=$1",
      [b],
    );
    await role("service_role");
    await db.query("select run_platform_jobs()");
    await submitReceipt(pid);
    await role("authenticated");
    await db.query("select review_card_receipt($1,1,true,'',$2)", [
      receipt,
      `late-${receipt}`,
    ]);
    expect(
      (await query("select status from bookings where id=$1", [b]))[0].status,
    ).toBe("cancelled");
    expect(
      await query("select * from refunds where payment_id=$1", [pid]),
    ).toHaveLength(1);
  });
  it("collects payment without fabricating a hold, queues only paid orders, then requires a real reservation", async () => {
    const b = await request(await slot(courts[1], 4000001, 60));
    expect(
      (
        await query(
          "select status,payment_first,club_reference,hold_expires_at from bookings where id=$1",
          [b],
        )
      )[0],
    ).toMatchObject({
      status: "awaiting_payment",
      payment_first: true,
      club_reference: null,
      hold_expires_at: null,
    });
    await role("postgres");
    expect(
      await query("select * from notifications where dedupe_key like $1", [
        `admin:paid-booking:${b}:%`,
      ]),
    ).toHaveLength(0);
    const paid = await paySeat(b);
    expect(
      (
        await query(
          "select status,fulfillment_state,payment_deadline from bookings where id=$1",
          [b],
        )
      )[0],
    ).toMatchObject({
      status: "booking_in_progress",
      fulfillment_state: "reserve",
      payment_deadline: null,
    });
    expect(
      await query("select * from provider_attempts where booking_id=$1", [b]),
    ).toHaveLength(0);
    await db.query("select settle_payment($1,$2,$3)", [
      paid.pid,
      paid.ref,
      paid.amount,
    ]);
    await role("postgres");
    expect(
      await query("select * from notifications where dedupe_key like $1", [
        `admin:paid-booking:${b}:%`,
      ]),
    ).toHaveLength(1);
    await role("authenticated", users[1]);
    await expect(
      db.query("select fulfill_booking($1,'fake',now()+interval '1 hour')", [
        b,
      ]),
    ).rejects.toThrow("ADMIN_REQUIRED");
    await role("authenticated");
    await db.query(
      "select fulfill_booking($1,'real-reference',now()+interval '1 hour')",
      [b],
    );
    expect(
      (
        await query(
          "select status,fulfillment_state,club_reference from bookings where id=$1",
          [b],
        )
      )[0],
    ).toMatchObject({
      status: "confirmed",
      fulfillment_state: "booked",
      club_reference: "real-reference",
    });
  });
  it("preserves a paid balance through alternative consent and refunds fully before final confirmation", async () => {
    const b = await request(await slot(courts[1], 4000001, 62));
    const paid = await paySeat(b);
    const target = await slot(courts[1], 4000001, 63);
    await role("authenticated");
    const p = await id(
      "select propose_booking_slot($1,$2,'تغییر ظرفیت سانس') id",
      [b, target],
    );
    await role("authenticated", users[0]);
    await db.query("select reply_booking_slot($1,true)", [p]);
    await role("authenticated");
    await db.query(
      "select fulfill_booking($1,'alternative-reference',now()+interval '1 hour')",
      [b],
    );
    expect(
      (await query("select slot_id,status from bookings where id=$1", [b]))[0],
    ).toMatchObject({ slot_id: target, status: "confirmed" });
    expect(
      await query("select * from refunds where payment_id=$1", [paid.pid]),
    ).toHaveLength(0);
    const cancelled = await request(await slot(courts[1], 4000001, 65));
    const payment = await paySeat(cancelled);
    await role("postgres");
    await db.query(
      "update bookings set cancellation_snapshot='{" +
        '"full_refund_hours":9999,"late_refund_percent":0' +
        "}' where id=$1",
      [cancelled],
    );
    await role("authenticated", users[0]);
    await db.query("select cancel_booking($1,'انصراف پیش از تأیید نهایی')", [
      cancelled,
    ]);
    expect(
      Number(
        (
          await query<{ amount: string }>(
            "select amount from refunds where payment_id=$1",
            [payment.pid],
          )
        )[0].amount,
      ),
    ).toBe(payment.amount);
  });
  it("expires unpaid checkout and unfulfilled paid orders without a false confirmation", async () => {
    const b = await request(await slot(courts[1], 4000001, 67));
    await role("postgres");
    await db.query(
      "update bookings set payment_deadline=now()-interval '1 minute' where id=$1",
      [b],
    );
    await role("service_role");
    await db.query("select run_platform_jobs()");
    expect(
      (await query("select status from bookings where id=$1", [b]))[0].status,
    ).toBe("cancelled");
    const paid = await request(await slot(courts[1], 4000001, 69));
    const payment = await paySeat(paid);
    await role("postgres");
    await db.query(
      "update bookings set request_expires_at=now()-interval '1 minute' where id=$1",
      [paid],
    );
    await role("service_role");
    await db.query("select run_platform_jobs()");
    expect(
      await query("select * from refunds where payment_id=$1", [payment.pid]),
    ).toHaveLength(1);
  });
});
describe("platform booking and payment authority", () => {
  it("keeps legacy rankings untouched and all new tables protected by RLS", async () => {
    await role("postgres");
    const rows = await query<{ table: string }>(
      "select c.relname as table from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity",
    );
    expect(rows).toEqual([]);
    expect(
      await query("select * from tournaments where title='سابقه حفظ‌شونده'"),
    ).toHaveLength(1);
  });
  it("uses server prices, preserves cancellation snapshots and rejects unpaid confirmation", async () => {
    const s = await slot();
    const key = crypto.randomUUID();
    const b = await request(s, "private", key, [
      { id: racket, quantity: 1 },
      { id: balls, quantity: 1 },
    ]);
    expect(await request(s, "private", key)).toBe(b);
    await role("authenticated", users[0]);
    const bp = await participant(b);
    const checkout = await id("select start_checkout($1,null) id", [bp]);
    expect(checkout).toBeTruthy();
    await expect(
      db.query("update bookings set status='confirmed' where id=$1", [b]),
    ).rejects.toThrow("permission denied");
    await approve(b, 30);
    const deadline = (
      await query<{ mins: number }>(
        "select extract(epoch from(payment_deadline-now()))/60 mins from bookings where id=$1",
        [b],
      )
    )[0];
    expect(Number(deadline.mins)).toBeLessThanOrEqual(30);
    const payment = await paySeat(b);
    expect(payment.amount).toBe(4000001 + 300000 + 100001 + 50000);
    expect(
      (
        await query<{ status: string }>(
          "select status from bookings where id=$1",
          [b],
        )
      )[0].status,
    ).toBe("confirmed");
    await db.query("select settle_payment($1,$2,$3)", [
      payment.pid,
      payment.ref,
      payment.amount,
    ]);
    await expect(
      db.query("select settle_payment($1,$2,$3)", [
        payment.pid,
        payment.ref,
        payment.amount + 1,
      ]),
    ).rejects.toThrow("PAYMENT_MISMATCH");
    expect(
      await query("select * from payments where id=$1", [payment.pid]),
    ).toHaveLength(1);
    await role("authenticated", users[0]);
    await expect(
      db.query("select settle_payment($1,$2,$3)", [
        payment.pid,
        payment.ref,
        payment.amount,
      ]),
    ).rejects.toThrow("permission denied");
  });
  it("cannot double-book a slot or allocate overlapping equipment across courts", async () => {
    const s = await slot();
    await request(s, "private", crypto.randomUUID(), [
      { id: racket, quantity: 2 },
    ]);
    await expect(
      request(s, "private", crypto.randomUUID(), [], users[1]),
    ).rejects.toThrow("SLOT_UNAVAILABLE");
    await role("postgres");
    const t = (
      await query<{ starts_at: string; ends_at: string }>(
        "select * from court_slots where id=$1",
        [s],
      )
    )[0];
    const other = await id(
      "insert into court_slots(court_id,starts_at,ends_at,court_price) values($1,$2,$3,4000000) returning id",
      [courts[1], t.starts_at, t.ends_at],
    );
    await expect(
      request(
        other,
        "private",
        crypto.randomUUID(),
        [{ id: racket, quantity: 1 }],
        users[2],
      ),
    ).rejects.toThrow("EQUIPMENT_UNAVAILABLE");
    await role("postgres");
    await expect(
      db.query(
        "insert into court_slots(court_id,starts_at,ends_at,court_price) values($1,$2,$3,1)",
        [courts[0], t.starts_at, t.ends_at],
      ),
    ).rejects.toThrow("SLOT_OVERLAP");
  });
  it("enforces four seats, skill restrictions, separate shares and authoritative completion", async () => {
    const s = await slot();
    const b = await request(s, "open", crypto.randomUUID(), [], users[0], 1, 2);
    await approve(b);
    const mid = await id("select id from open_matches where booking_id=$1", [
      b,
    ]);
    await role("authenticated", users[11]);
    await expect(db.query("select join_open_match($1)", [mid])).rejects.toThrow(
      "SKILL_MISMATCH",
    );
    for (const u of users.slice(1, 4)) {
      await role("authenticated", u);
      await db.query("select join_open_match($1)", [mid]);
      await db.query("select join_open_match($1)", [mid]);
    }
    await role("authenticated", users[4]);
    await expect(db.query("select join_open_match($1)", [mid])).rejects.toThrow(
      "MATCH_FULL",
    );
    await role("postgres");
    const totals = (
      await query<{ total: number }>(
        "select sum(court_share)::float8 total from booking_participants where booking_id=$1",
        [b],
      )
    )[0];
    expect(totals.total).toBe(4000001);
    for (const u of users.slice(0, 3)) await paySeat(b, u);
    expect(
      (
        await query<{ status: string }>(
          "select status from bookings where id=$1",
          [b],
        )
      )[0].status,
    ).toBe("collecting");
    await paySeat(b, users[3]);
    expect(
      (
        await query<{ status: string }>(
          "select status from bookings where id=$1",
          [b],
        )
      )[0].status,
    ).toBe("confirmed");
  });
  it("idempotently cancels incomplete games at cutoff and queues full refunds", async () => {
    const b = await request(await slot(), "open");
    await approve(b);
    const p = await paySeat(b);
    await role("postgres");
    await db.query(
      "update open_matches set cutoff_at=now()-interval '1 second' where booking_id=$1",
      [b],
    );
    await role("service_role");
    await db.query("select run_platform_jobs()");
    await db.query("select run_platform_jobs()");
    expect(
      (
        await query<{ status: string }>(
          "select status from bookings where id=$1",
          [b],
        )
      )[0].status,
    ).toBe("cancelled");
    const refunds = await query<{ amount: number }>(
      "select amount::float8 amount from refunds where payment_id=$1",
      [p.pid],
    );
    expect(refunds).toHaveLength(1);
    expect(refunds[0].amount).toBe(p.amount);
  });
  it("never confirms a late but genuinely verified payment; tracks compensation separately", async () => {
    const b = await request(await slot());
    await approve(b);
    await role("authenticated", users[0]);
    const bp = await participant(b);
    const pid = await id("select start_checkout($1,null) id", [bp]);
    await role("postgres");
    await db.query(
      "update booking_participants set lock_expires_at=now()-interval '1 second' where id=$1",
      [bp],
    );
    await role("service_role");
    await db.query("select attach_payment_authority($1,$2)", [
      pid,
      `A${pid.replaceAll("-", "")}`,
    ]);
    const p = (
      await query<{ amount: number }>(
        "select amount::float8 amount from payments where id=$1",
        [pid],
      )
    )[0];
    await db.query("select settle_payment($1,$2,$3)", [
      pid,
      "late-" + pid,
      p.amount,
    ]);
    expect(
      (
        await query<{ status: string }>(
          "select status from bookings where id=$1",
          [b],
        )
      )[0].status,
    ).not.toBe("confirmed");
    expect(
      (
        await query<{ status: string }>(
          "select status from payments where id=$1",
          [pid],
        )
      )[0].status,
    ).toBe("needs_attention");
    expect(
      await query("select * from refunds where payment_id=$1", [pid]),
    ).toHaveLength(1);
  });
  it("uses a single payment-request lease and prevents repeated gateway requests", async () => {
    const b = await request(await slot());
    await approve(b);
    await role("authenticated", users[0]);
    const bp = await participant(b);
    const pid = await id("select start_checkout($1,null) id", [bp]);
    await role("service_role");
    expect(
      (
        await query<{ ok: boolean }>("select claim_payment_request($1) ok", [
          pid,
        ])
      )[0].ok,
    ).toBe(true);
    expect(
      (
        await query<{ ok: boolean }>("select claim_payment_request($1) ok", [
          pid,
        ])
      )[0].ok,
    ).toBe(false);
  });
  it("limits public projections and blocks access to other users financial records", async () => {
    await role("anon");
    expect(await query("select * from clubs")).toHaveLength(1);
    await expect(db.query("select * from payments")).rejects.toThrow(
      "permission denied",
    );
    await expect(db.query("select * from user_profiles")).rejects.toThrow(
      "permission denied",
    );
    const payload = (
      await query<{ rows: Record<string, unknown>[] }>(
        "select discover_matches(null,100,0) rows",
      )
    )[0].rows;
    for (const game of payload) {
      expect(game).not.toHaveProperty("club_reference");
      expect(game).not.toHaveProperty("authority");
      expect(game).not.toHaveProperty("cancellation_snapshot");
    }
    await role("authenticated", users[10]);
    expect(await query("select * from payments")).toEqual([]);
    expect(await query("select * from refunds")).toEqual([]);
    await expect(db.query("select run_platform_jobs()")).rejects.toThrow(
      "permission denied",
    );
  });
  it("requires secured event courts, enforces eight registrations and reuses the seven-round format", async () => {
    const first = await slot(courts[0], 4000000, 500);
    await role("postgres");
    const s = (
      await query<{ starts_at: string; ends_at: string }>(
        "select * from court_slots where id=$1",
        [first],
      )
    )[0];
    const second = await id(
      "insert into court_slots(court_id,starts_at,ends_at,court_price) values($1,$2,$3,4000000) returning id",
      [courts[1], s.starts_at, s.ends_at],
    );
    const eid = await id(
      "insert into platform_events(slug,title,kind,club_id,organizer_id,starts_at,registration_deadline,capacity,entry_fee,published) values('test-americano','امریکانو آزمون','americano',$1,$2,$3,now()+interval '10 days',8,0,true) returning id",
      [club, users[9], s.starts_at],
    );
    await role("authenticated", users[0]);
    await expect(db.query("select register_event($1)", [eid])).rejects.toThrow(
      "EVENT_COURTS_UNSECURED",
    );
    await role("authenticated");
    await db.query("select secure_event_courts($1,$2::uuid[],$3)", [
      eid,
      [first, second],
      "confirmed-event",
    ]);
    for (const u of users.slice(0, 8)) {
      await role("authenticated", u);
      await db.query("select register_event($1)", [eid]);
    }
    await role("authenticated", users[8]);
    await expect(db.query("select register_event($1)", [eid])).rejects.toThrow(
      "EVENT_FULL",
    );
    await role("authenticated", users[9]);
    const tid = await id("select activate_event($1) id", [eid]);
    expect(
      await query("select * from matches where tournament_id=$1", [tid]),
    ).toHaveLength(14);
    const game = (
      await query<{ id: string }>(
        "select id from matches where tournament_id=$1 limit 1",
        [tid],
      )
    )[0];
    await db.query("select save_match_round_winners($1,0,$2::jsonb)", [
      game.id,
      JSON.stringify([1, 2, 3].map((n) => ({ set_number: n, winner_team: 1 }))),
    ]);
    const standings = await query<{ total_points: number }>(
      "select * from tournament_results where tournament_id=$1",
      [tid],
    );
    expect(standings.some((r) => r.total_points === 1)).toBe(true);
    await role("authenticated", users[10]);
    await expect(
      db.query("select save_match_round_winners($1,1,$2::jsonb)", [
        game.id,
        JSON.stringify(
          [1, 2, 3].map((n) => ({ set_number: n, winner_team: 2 })),
        ),
      ]),
    ).rejects.toThrow("ADMIN_REQUIRED");
  });
  it("does not reuse an old bank intent after withdrawal or let late failed intents refund a newly paid seat", async () => {
    const s = await slot();
    const b = await request(s, "open");
    await approve(b);
    const mid = await id("select id from open_matches where booking_id=$1", [
      b,
    ]);
    await role("authenticated", users[1]);
    const bp = await id("select join_open_match($1) id", [mid]);
    const old = await id("select start_checkout($1,null) id", [bp]);
    await role("service_role");
    await db.query("select attach_payment_authority($1,$2)", [
      old,
      "A" + old.replaceAll("-", ""),
    ]);
    const amount = (
      await query<{ amount: number }>(
        "select amount from payments where id=$1",
        [old],
      )
    )[0].amount;
    await role("authenticated", users[1]);
    await db.query("select withdraw_match($1)", [mid]);
    await expect(
      db.query("select join_open_match($1,$2::jsonb)", [
        mid,
        JSON.stringify([{ id: racket, quantity: 1 }]),
      ]),
    ).rejects.toThrow("ADMIN_REVIEW_REQUIRED");
    await role("service_role");
    await db.query("select fail_payment($1)", [old]);
    await role("authenticated", users[1]);
    await db.query("select join_open_match($1,$2::jsonb)", [
      mid,
      JSON.stringify([{ id: racket, quantity: 1 }]),
    ]);
    const current = await paySeat(b, users[1]);
    await db.query("select settle_payment($1,'late-after-failure',$2)", [
      old,
      amount,
    ]);
    expect(
      (
        await query<{ status: string }>(
          "select status from booking_participants where id=$1",
          [bp],
        )
      )[0].status,
    ).toBe("paid");
    expect(
      await query("select * from refunds where payment_id=$1", [old]),
    ).toHaveLength(1);
    expect(
      await query("select * from refunds where payment_id=$1", [current.pid]),
    ).toHaveLength(0);
  });
  it("requires both teams and verified profiles for auditable rating changes; friendlies do not change ratings", async () => {
    for (const competitive of [false, true]) {
      const s = await slot(courts[0], 4000000, -20);
      const b = await id(
        "insert into bookings(user_id,slot_id,kind,status,mode,court_price,cancellation_snapshot,idempotency_key,club_reference) values($1,$2,'open','completed','MANUAL_APPROVAL',4000000,'{}',gen_random_uuid(),'historical-test-fixture') returning id",
        [users[0], s],
      );
      const mid = await id(
        "insert into open_matches(booking_id,organizer_id,title,cutoff_at) values($1,$2,'بازی انجام‌شده آزمون',now()-interval '20 days') returning id",
        [b, users[0]],
      );
      for (let i = 0; i < 4; i++)
        await db.query(
          "insert into booking_participants(booking_id,user_id,seat,status,court_share,shared_share,personal_price,fee) values($1,$2,$3,'paid',1000000,0,0,0)",
          [b, users[i], i + 1],
        );
      await role("authenticated", users[0]);
      const rid = await id(
        "select submit_match_result($1,$2::uuid[],$3::uuid[],2,1,$4) id",
        [mid, users.slice(0, 2), users.slice(2, 4), competitive],
      );
      const changes = JSON.stringify([
        { user_id: users[0], rating_after: 1020 },
      ]);
      await role("authenticated");
      await expect(
        db.query(
          "select resolve_match_result($1,true,'نتیجه بررسی شد',$2::jsonb)",
          [rid, changes],
        ),
      ).rejects.toThrow(
        competitive ? "BOTH_TEAMS_MUST_CONFIRM" : "FRIENDLY_RESULT_NO_RATING",
      );
      await role("authenticated", users[2]);
      await db.query(
        "select confirm_match_result($1,'dispute','نیاز به بررسی')",
        [rid],
      );
      await role("authenticated", users[10]);
      await expect(
        db.query("select confirm_match_result($1,'confirm')", [rid]),
      ).rejects.toThrow("FORBIDDEN");
      await role("authenticated", users[2]);
      await db.query("select confirm_match_result($1,'confirm')", [rid]);
      if (competitive) {
        await role("authenticated");
        await expect(
          db.query(
            "select resolve_match_result($1,true,'نتیجه بررسی شد',$2::jsonb)",
            [rid, changes],
          ),
        ).rejects.toThrow("VERIFIED_PLAYERS_REQUIRED");
        await db.query(
          "update user_profiles set skill_verified=true where user_id=any($1::uuid[])",
          [users.slice(0, 4)],
        );
        await db.query(
          "select resolve_match_result($1,true,'نتیجه بررسی شد',$2::jsonb)",
          [rid, changes],
        );
        await db.query(
          "select resolve_match_result($1,true,'تکرار بدون اثر مالی',$2::jsonb)",
          [rid, changes],
        );
        expect(
          await query("select * from rating_history where result_id=$1", [rid]),
        ).toHaveLength(1);
        await expect(
          db.query(
            "select resolve_match_result($1,false,'رد پس از اعمال رتبه')",
            [rid],
          ),
        ).rejects.toThrow("RATING_RESULT_LOCKED");
      } else {
        await role("authenticated");
        await db.query(
          "select resolve_match_result($1,true,'بازی دوستانه معتبر')",
          [rid],
        );
        expect(
          await query("select * from rating_history where result_id=$1", [rid]),
        ).toHaveLength(0);
      }
      await role("authenticated", users[10]);
      expect(
        (
          await query<{ locations: unknown[] }>(
            "select my_booking_locations() locations",
          )
        )[0].locations,
      ).not.toContainEqual(expect.objectContaining({ booking_id: b }));
    }
  });
  it("does not confuse external payment with a confirmed external reservation", async () => {
    const s = await slot();
    await role("postgres");
    await db.query(
      "update clubs set booking_mode='EXTERNAL_AUTOMATED',provider_key='test-bridge' where id=$1",
      [club],
    );
    const b = await request(s);
    await role("service_role");
    await db.query(
      "select apply_external_quote($1,'live-quote',4000000,now()+interval '60 minutes','provider-hold')",
      [b],
    );
    const payment = await paySeat(b);
    expect(
      (
        await query<{ status: string }>(
          "select status from bookings where id=$1",
          [b],
        )
      )[0].status,
    ).toBe("booking_in_progress");
    const a = (
      await query<{ id: string }>(
        "select * from provider_attempts where booking_id=$1 and operation='confirm'",
        [b],
      )
    )[0];
    await db.query(
      "select record_provider_result($1,'failed',null,'EXTERNAL_UNAVAILABLE')",
      [a.id],
    );
    expect(
      (
        await query<{ status: string }>(
          "select status from bookings where id=$1",
          [b],
        )
      )[0].status,
    ).toBe("cancelled");
    expect(
      await query("select * from refunds where payment_id=$1", [payment.pid]),
    ).toHaveLength(1);
    await role("postgres");
    await db.query(
      "update clubs set booking_mode='MANUAL_APPROVAL',provider_key=null where id=$1",
      [club],
    );
  });
});
