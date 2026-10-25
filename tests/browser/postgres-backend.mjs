// Test-only HTTP/Auth boundary. Every table, policy, RPC and mutation below runs
// against the application's REAL SQL migrations in PGlite. Never imported by src/.
import http from "node:http";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
const db = new PGlite();
const uuid = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const admin = uuid(999),
  player = uuid(998),
  mobilePlayer = uuid(997),
  checkoutDesktop = uuid(996),
  checkoutMobile = uuid(995),
  onboardingDesktop = uuid(994),
  onboardingMobile = uuid(993),
  recoveryDesktop = uuid(992),
  recoveryMobile = uuid(991),
  tid = uuid(100);
await db.exec(
  `create schema auth;create role anon;create role authenticated;create role service_role bypassrls;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`,
);
const directory = new URL("../../supabase/migrations/", import.meta.url);
await db.exec(
  `create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb,unique(bucket_id,name));alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;grant usage on schema storage to authenticated,service_role;grant select,insert on storage.objects to authenticated;grant all on storage.objects to service_role;`,
);
for (const file of readdirSync(directory)
  .filter((f) => f.endsWith(".sql"))
  .sort())
  await db.exec(readFileSync(new URL(file, directory), "utf8"));
await db.query(
  "insert into auth.users(id) values($1),($2),($3),($4),($5),($6),($7),($8),($9)",
  [
    admin,
    player,
    mobilePlayer,
    checkoutDesktop,
    checkoutMobile,
    onboardingDesktop,
    onboardingMobile,
    recoveryDesktop,
    recoveryMobile,
  ],
);
await db.query("insert into admins(user_id) values($1)", [admin]);
// Test-only destination, never seeded into the product database.
await db.query("select set_config('request.jwt.claim.sub',$1,false)", [admin]);
await db.query(
  "select save_payment_settings(false,true,'4242424242424242','کارت آزمایشی بدون واریز واقعی')",
);
const names = [
  ["امید", "حسینی"],
  ["علی", "رضایی"],
  ["آرش", "کریمی"],
  ["سینا", "احمدی"],
  ["نیما", "مرادی"],
  ["سامان", "محمدی"],
  ["کیان", "حیدری"],
  ["پارسا", "اکبری"],
];
for (let i = 0; i < 8; i++)
  await db.query(
    "insert into players(id,first_name,last_name) values($1,$2,$3)",
    [uuid(i + 1), ...names[i]],
  );
await db.query(
  "insert into user_profiles(user_id,player_id,display_name,skill_level) values($1,$2,'مدیر آزمون',1)",
  [admin, uuid(1)],
);
await db.query(
  "insert into user_profiles(user_id,player_id,display_name,skill_level) values($1,$2,'بازیکن بازیابی دسکتاپ',1),($3,$4,'بازیکن بازیابی موبایل',1)",
  [recoveryDesktop, uuid(2), recoveryMobile, uuid(3)],
);
await db.query(
  "insert into tournaments(id,title,date,status) values($1,'پدل پنجشنبه‌های باشگاه',current_date,'active')",
  [tid],
);
for (let i = 0; i < 8; i++) {
  await db.query(
    "insert into tournament_players(tournament_id,player_id,slot) values($1,$2,$3)",
    [tid, uuid(i + 1), String.fromCharCode(65 + i)],
  );
  await db.query(
    "insert into tournament_results(tournament_id,player_id,rank) values($1,$2,$3)",
    [tid, uuid(i + 1), i + 1],
  );
}
const schedule = [
  [1, 8, 2, 7],
  [3, 4, 5, 6],
  [1, 2, 3, 6],
  [5, 4, 7, 8],
  [3, 5, 4, 6],
  [1, 7, 8, 2],
  [2, 6, 5, 7],
  [4, 8, 3, 1],
  [7, 4, 6, 1],
  [5, 8, 3, 2],
  [3, 8, 2, 5],
  [1, 4, 6, 7],
  [5, 1, 4, 2],
  [8, 6, 7, 3],
];
for (let r = 0; r < 7; r++) {
  await db.query(
    "insert into tournament_rounds(id,tournament_id,round_number) values($1,$2,$3)",
    [uuid(300 + r), tid, r + 1],
  );
  for (let c = 0; c < 2; c++) {
    const i = r * 2 + c;
    await db.query(
      "insert into matches(id,tournament_id,round_id,court_number,team1_player1_id,team1_player2_id,team2_player1_id,team2_player2_id) values($1,$2,$3,$4,$5,$6,$7,$8)",
      [uuid(400 + i), tid, uuid(300 + r), c + 1, ...schedule[i].map(uuid)],
    );
    await db.query(
      "insert into match_sets(match_id,set_number) select $1,generate_series(1,3)",
      [uuid(400 + i)],
    );
  }
}
await db.query(
  "insert into cities(id,slug,name,description) values($1,'test-city','شهر آزمون','این شهر صرفاً داده آزمون مرورگر است.')",
  [uuid(700)],
);
await db.query(
  "insert into clubs(id,city_id,slug,name,address,description,published,facilities) values($1,$2,'browser-test-club','باشگاه آزمون مرورگر','نشانی صرفاً برای آزمون','باشگاه ساختگی فقط در محیط آزمون، خارج از محصول.',true,array['رختکن','پارکینگ'])",
  [uuid(701), uuid(700)],
);
for (let c = 0; c < 2; c++) {
  await db.query(
    "insert into courts(id,club_id,name,hourly_price,platform_fee) values($1,$2,$3,2000000,50000)",
    [uuid(702 + c), uuid(701), `زمین آزمون ${c + 1}`],
  );
  for (let i = 0; i < 8; i++)
    await db.query(
      "insert into court_slots(id,court_id,starts_at,ends_at,court_price) values($1,$2,now()+interval '2 days'+make_interval(hours=>$3),now()+interval '2 days'+make_interval(hours=>$3)+interval '90 minutes',3000000)",
      [uuid(720 + c * 10 + i), uuid(702 + c), i * 2],
    );
}
await db.query(
  "insert into equipment(id,club_id,name,kind,stock,price) values($1,$2,'راکت آزمون','personal',8,200000)",
  [uuid(760), uuid(701)],
);
const base64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
// Local-only records exercise real pagination, search and status filtering.
for (let i = 0; i < 10; i++)
  await db.query(
    "insert into discount_codes(code,kind,value,max_uses,expires_at,active) values($1,'percent',10,5,now()+interval '1 day',false)",
    ["UI_AUDIT_" + String(i).padStart(2, "0")],
  );
const phones = new Map([
  [admin, "989120000001"],
  [player, "989120000002"],
  [mobilePlayer, "989120000003"],
  [checkoutDesktop, "989120000004"],
  [checkoutMobile, "989120000005"],
  [onboardingDesktop, "989120000006"],
  [onboardingMobile, "989120000007"],
  [recoveryDesktop, "989120000008"],
  [recoveryMobile, "989120000009"],
]);
const passwords = new Map(
  [...phones.keys()].map((id) => [id, "browser-test-password"]),
);
const phoneFor = (id) => phones.get(id);
const idFor = (phone) =>
  [...phones].find(
    ([, value]) => value === String(phone).replace(/^\+/, ""),
  )?.[0];
const verified = new Set([
  admin,
  player,
  mobilePlayer,
  checkoutMobile,
  recoveryDesktop,
  recoveryMobile,
]);
function user(id) {
  return {
    id,
    aud: "authenticated",
    role: "authenticated",
    phone: phoneFor(id),
    phone_confirmed_at: verified.has(id) ? "2026-01-01T00:00:00Z" : null,
    app_metadata: { provider: "phone", providers: ["phone"] },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
}
function session(id) {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: `${base64({ alg: "HS256", typ: "JWT" })}.${base64({ sub: id, aud: "authenticated", role: "authenticated", iat: now, exp: now + 3600 })}.${base64("test-signature")}`,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: `test-refresh-${id}`,
    user: user(id),
  };
}
const identifier = (s) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw new Error("Invalid SQL identifier");
  return `"${s}"`;
};
function subject(req) {
  try {
    return JSON.parse(
      Buffer.from(
        (req.headers.authorization ?? "").split(".")[1],
        "base64url",
      ).toString(),
    ).sub;
  } catch {
    return null;
  }
}
let queue = Promise.resolve();
const testImages = new Map();
http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://127.0.0.1:54321");
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks);
    const body =
      raw.length &&
      String(req.headers["content-type"] ?? "").includes("application/json")
        ? JSON.parse(raw.toString())
        : {};
    const send = (data, status = 200) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify(data, (_, v) => (typeof v === "bigint" ? Number(v) : v)),
      );
    };
    if (url.pathname === "/health") return send({ ok: true });
    // Local Auth test double only: no SMS provider, no real OTP or real account is touched.
    if (url.pathname === "/auth/v1/otp") {
      if (!idFor(body.phone))
        return send(
          { code: "otp_disabled", msg: "Test account not found" },
          422,
        );
      return send({});
    }
    if (url.pathname === "/auth/v1/verify") {
      const id = idFor(body.phone);
      if (!id || body.token !== "123456")
        return send({ code: "otp_expired", msg: "Invalid test OTP" }, 400);
      verified.add(id);
      return send(session(id));
    }
    if (url.pathname === "/auth/v1/token") {
      if (url.searchParams.get("grant_type") === "refresh_token") {
        const id = body.refresh_token?.replace("test-refresh-", "");
        return phones.has(id)
          ? send(session(id))
          : send({ code: "invalid_credentials" }, 400);
      }
      const id = idFor(body.phone);
      if (!id || passwords.get(id) !== body.password)
        return send(
          { code: "invalid_credentials", msg: "Invalid credentials" },
          400,
        );
      return send(session(id));
    }
    if (url.pathname === "/auth/v1/user") {
      const id = subject(req);
      if (!id || !phones.has(id))
        return send({ code: "bad_jwt", msg: "Not authenticated" }, 401);
      if (req.method === "PUT" && body.password)
        passwords.set(id, body.password);
      if (req.method === "PUT" && body.phone)
        phones.set(id, String(body.phone).replace(/^\+/, ""));
      return send(user(id));
    }
    if (url.pathname === "/auth/v1/logout") return send({});
    const task = queue.then(async () => {
      try {
        const uid = subject(req);
        await db.exec(`reset role;set role ${uid ? "authenticated" : "anon"}`);
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
          uid ?? "",
        ]);
        if (
          url.pathname.startsWith("/storage/v1/object/payment-receipts/") &&
          req.method === "POST"
        ) {
          const path = decodeURIComponent(
            url.pathname.slice("/storage/v1/object/payment-receipts/".length),
          );
          const objectId = crypto.randomUUID();
          await db.query(
            "insert into storage.objects(id,bucket_id,name,metadata) values($1,'payment-receipts',$2,$3::jsonb)",
            [
              objectId,
              path,
              JSON.stringify({
                mimetype: req.headers["content-type"],
                size: raw.length,
              }),
            ],
          );
          testImages.set(path, raw);
          return send({ Id: objectId, Key: `payment-receipts/${path}` });
        }
        if (
          url.pathname.startsWith(
            "/storage/v1/object/sign/payment-receipts/",
          ) &&
          req.method === "POST"
        ) {
          const path = decodeURIComponent(
            url.pathname.slice(
              "/storage/v1/object/sign/payment-receipts/".length,
            ),
          );
          const { rows } = await db.query(
            "select id from storage.objects where bucket_id='payment-receipts' and name=$1",
            [path],
          );
          if (!rows.length) return send({ error: "Not found" }, 404);
          return send({
            signedURL: `/object/sign/payment-receipts/${path}?token=test-only`,
          });
        }
        if (
          url.pathname.startsWith(
            "/storage/v1/object/sign/payment-receipts/",
          ) &&
          req.method === "GET"
        ) {
          const path = decodeURIComponent(
              url.pathname.slice(
                "/storage/v1/object/sign/payment-receipts/".length,
              ),
            ),
            bytes = testImages.get(path);
          if (!bytes || url.searchParams.get("token") !== "test-only")
            return send({}, 404);
          res.writeHead(200, { "Content-Type": "image/png" });
          return res.end(bytes);
        }
        if (url.pathname.startsWith("/rest/v1/rpc/")) {
          const fn = identifier(url.pathname.split("/").at(-1));
          const entries = Object.entries(body);
          const values = entries.map(([name, v]) =>
            ["p_equipment", "p_rounds", "p_rating_changes"].includes(name)
              ? JSON.stringify(v)
              : v,
          );
          const args = entries
            .map(([name], i) => `${identifier(name)}=>$${i + 1}`)
            .join(",");
          const { rows: signatures } = await db.query(
            "select proretset from pg_proc where pronamespace='public'::regnamespace and proname=$1",
            [url.pathname.split("/").at(-1)],
          );
          const set = signatures.some((x) => x.proretset);
          const { rows } = await db.query(
            set
              ? `select * from public.${fn}(${args})`
              : `select public.${fn}(${args}) as result`,
            values,
          );
          return send(set ? rows : (rows[0]?.result ?? null));
        }
        const table = identifier(url.pathname.replace("/rest/v1/", ""));
        const parameters = [];
        const wheres = [];
        const bind = (v) => {
          parameters.push(v);
          return `$${parameters.length}`;
        };
        for (const [column, value] of url.searchParams) {
          if (
            ["select", "limit", "offset", "order", "on_conflict"].includes(
              column,
            )
          )
            continue;
          if (column === "or") {
            const ors = value
              .slice(1, -1)
              .split(",")
              .map((term) => {
                const [name, operator, ...rest] = term.split(".");
                if (operator !== "cs")
                  throw new Error("Unsupported fixture or operator");
                return `${identifier(name)} @> ${bind(rest.join("."))}::uuid[]`;
              });
            wheres.push(`(${ors.join(" or ")})`);
            continue;
          }
          if (value.startsWith("eq."))
            wheres.push(`${identifier(column)}=${bind(value.slice(3))}`);
          else if (value.startsWith("in.(")) {
            const vals = value.slice(4, -1).split(",");
            wheres.push(
              `${identifier(column)}::text=any(${bind(vals)}::text[])`,
            );
          }
        }
        const where = wheres.length ? `where ${wheres.join(" and ")}` : "";
        if (req.method === "GET" || req.method === "HEAD") {
          const select = url.searchParams.get("select") ?? "*";
          const columns =
            select === "*" ? "*" : select.split(",").map(identifier).join(",");
          const order = url.searchParams.get("order");
          const ordering = order
            ? "order by " +
              order
                .split(",")
                .map((o) => {
                  const [name, dir] = o.split(".");
                  return `${identifier(name)} ${dir === "desc" ? "desc" : "asc"}`;
                })
                .join(",")
            : "";
          const limit = Math.max(
            0,
            Math.min(1000, Number(url.searchParams.get("limit") ?? 500)),
          );
          const offset = Math.max(
            0,
            Number(url.searchParams.get("offset") ?? 0),
          );
          const { rows } = await db.query(
            `select ${columns} from public.${table} ${where} ${ordering} limit ${limit} offset ${offset}`,
            parameters,
          );
          if (req.headers.accept?.includes("vnd.pgrst.object+json"))
            return rows.length
              ? send(rows[0])
              : send({ message: "Not found", code: "PGRST116" }, 406);
          return send(rows);
        }
        if (req.method === "POST") {
          const row = Array.isArray(body) ? body[0] : body;
          const keys = Object.keys(row);
          const vals = keys.map((k) => row[k]);
          const indexes = keys.map((_, i) => `$${i + 1}`);
          const upsert = req.headers.prefer?.includes(
            "resolution=merge-duplicates",
          );
          const conflict =
            upsert && row.id
              ? ` on conflict(id) do update set ${keys
                  .filter((k) => k !== "id")
                  .map((k) => `${identifier(k)}=excluded.${identifier(k)}`)
                  .join(",")}`
              : "";
          const { rows } = await db.query(
            `insert into public.${table}(${keys.map(identifier).join(",")}) values(${indexes.join(",")})${conflict} returning *`,
            vals,
          );
          return send(rows, 201);
        }
        if (req.method === "PATCH") {
          const keys = Object.keys(body);
          const assignments = keys.map(
            (k) => `${identifier(k)}=${bind(body[k])}`,
          );
          const { rows } = await db.query(
            `update public.${table} set ${assignments.join(",")} ${where} returning *`,
            parameters,
          );
          return send(rows);
        }
        if (req.method === "DELETE") {
          await db.query(`delete from public.${table} ${where}`, parameters);
          return send(null);
        }
        return send({ message: "Unsupported test endpoint" }, 405);
      } catch (error) {
        return send(
          { message: error.message, code: error.code ?? "TEST_ERROR" },
          400,
        );
      }
    });
    queue = task.catch(() => {});
    await task;
  })
  .listen(54321, "127.0.0.1");
