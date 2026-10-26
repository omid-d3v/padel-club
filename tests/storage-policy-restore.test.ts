import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";

const db = new PGlite();
const admin = "30000000-0000-4000-8000-000000000001";
const owner = "30000000-0000-4000-8000-000000000002";
const other = "30000000-0000-4000-8000-000000000003";
const repair = readFileSync(
  new URL("../deploy/restore-storage-policies.sql", import.meta.url),
  "utf8",
).replace(/^\\set.*\n/gm, "");
let payment: string, path: string;
async function role(name: string, uid = owner) {
  await db.exec(`reset role; set role ${name}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
}
async function id(sql: string, args: unknown[] = []) {
  const result = await db.query<{ id: string }>(sql, args);
  return result.rows[0].id;
}
beforeAll(async () => {
  await db.exec(`
    create schema auth;
    create role anon; create role authenticated; create role service_role bypassrls;
    create role supabase_storage_admin;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated,service_role;
  `);
  // Reproduce a Cloud restore/baseline: application schema/history exists, but
  // the filtered dump did not include Storage's custom policies.
  const directory = new URL("../supabase/migrations/", import.meta.url);
  for (const file of readdirSync(directory)
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync(new URL(file, directory), "utf8"));
  await db.exec(`
    create schema storage authorization supabase_storage_admin;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(bucket_id text,name text,metadata jsonb,primary key(bucket_id,name));
    alter table storage.buckets owner to supabase_storage_admin;
    alter table storage.objects owner to supabase_storage_admin;
    alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
    grant usage on schema storage to anon,authenticated;
    grant select,insert,update,delete on storage.objects to authenticated;
    grant select on storage.objects to anon;
    insert into storage.buckets values('payment-receipts','payment-receipts',false,5242880,array['image/png']);
    create policy unrelated_policy on storage.objects for select to authenticated using(false);
  `);
  await db.query("insert into auth.users(id) values($1),($2),($3)", [
    admin,
    owner,
    other,
  ]);
  await db.query("insert into admins(user_id) values($1)", [admin]);
  const city = await id(
    "insert into cities(slug,name) values('storage-test','شهر آزمون') returning id",
  );
  const club = await id(
    "insert into clubs(city_id,slug,name,address,published) values($1,'storage-test','باشگاه آزمون','آدرس آزمون',true) returning id",
    [city],
  );
  const court = await id(
    "insert into courts(club_id,name,hourly_price,platform_fee) values($1,'زمین آزمون',2000000,50000) returning id",
    [club],
  );
  const slot = await id(
    "insert into court_slots(court_id,starts_at,ends_at,court_price) values($1,now()+interval '2 days',now()+interval '2 days 90 minutes',4000000) returning id",
    [court],
  );
  await role("authenticated", admin);
  await db.query(
    "select save_payment_settings(false,true,'4242424242424242','حساب آزمایشی')",
  );
  await role("authenticated");
  await db.query("select save_my_profile('کاربر آزمون',1)");
  const booking = await id(
    "select request_booking($1,'private',$2,'آزمون رسید','',null,null,'[]'::jsonb) id",
    [slot, crypto.randomUUID()],
  );
  const participant = await id(
    "select id from booking_participants where booking_id=$1 and user_id=$2",
    [booking, owner],
  );
  payment = await id("select start_payment($1,null,'card_transfer') id", [
    participant,
  ]);
  path = `${owner}/${payment}/${crypto.randomUUID()}.png`;
});
afterAll(async () => db.close());

it("restores a Cloud-baselined user's upload and submission without allowing foreign or public receipt access", async () => {
  await role("authenticated");
  await expect(
    db.query(
      "insert into storage.objects(bucket_id,name) values('payment-receipts',$1)",
      [path],
    ),
  ).rejects.toThrow(/row-level security/);
  await role("postgres");
  await db.exec(repair);
  await db.exec(repair);
  await role("authenticated", other);
  await expect(
    db.query(
      "insert into storage.objects(bucket_id,name) values('payment-receipts',$1)",
      [path],
    ),
  ).rejects.toThrow(/row-level security/);
  await role("authenticated");
  const wrongPayment = `${owner}/${crypto.randomUUID()}/${crypto.randomUUID()}.png`;
  await expect(
    db.query(
      "insert into storage.objects(bucket_id,name) values('payment-receipts',$1)",
      [wrongPayment],
    ),
  ).rejects.toThrow(/row-level security/);
  await db.query(
    "insert into storage.objects(bucket_id,name) values('payment-receipts',$1)",
    [path],
  );
  await db.query("select submit_card_receipt($1,$2)", [payment, path]);
  expect(
    (
      await db.query<{ status: string }>(
        "select status from card_transfer_receipts where payment_id=$1",
        [payment],
      )
    ).rows[0].status,
  ).toBe("pending");
  expect(
    (await db.query("select * from storage.objects where name=$1", [path]))
      .rows,
  ).toHaveLength(1);
  await db.query("update storage.objects set metadata='{}' where name=$1", [
    path,
  ]);
  expect(
    (
      await db.query<{ metadata: unknown }>(
        "select metadata from storage.objects where name=$1",
        [path],
      )
    ).rows[0].metadata,
  ).toBeNull();
  await role("authenticated", other);
  expect(
    (await db.query("select * from storage.objects where name=$1", [path]))
      .rows,
  ).toHaveLength(0);
  await role("anon");
  expect(
    (await db.query("select * from storage.objects where name=$1", [path]))
      .rows,
  ).toHaveLength(0);
  await role("authenticated", admin);
  expect(
    (await db.query("select * from storage.objects where name=$1", [path]))
      .rows,
  ).toHaveLength(1);
});

it("preserves unrelated policies and the private receipt bucket across repeated repairs", async () => {
  await role("postgres");
  expect(
    (
      await db.query(
        "select * from pg_policies where schemaname='storage' and policyname='unrelated_policy'",
      )
    ).rows,
  ).toHaveLength(1);
  expect(
    (
      await db.query<{ public: boolean }>(
        "select public from storage.buckets where id='payment-receipts'",
      )
    ).rows[0].public,
  ).toBe(false);
});

it("restores admin-only club uploads and user-owned avatars without adding receipt update/delete access", async () => {
  await role("authenticated", other);
  await expect(
    db.query(
      "insert into storage.objects(bucket_id,name) values('club-images','test.png')",
    ),
  ).rejects.toThrow(/row-level security/);
  await db.query(
    "insert into storage.objects(bucket_id,name) values('avatars',$1)",
    [`${other}/avatar.png`],
  );
  await expect(
    db.query(
      "insert into storage.objects(bucket_id,name) values('avatars',$1)",
      [`${owner}/avatar.png`],
    ),
  ).rejects.toThrow(/row-level security/);
  await role("authenticated", admin);
  await db.query(
    "insert into storage.objects(bucket_id,name) values('club-images','test.png')",
  );
});
