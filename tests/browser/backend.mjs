// HTTP fixtures only for browser presentation tests. Never imported by the app.
// Scoring and RLS are tested against the real migration in database.test.ts.
import http from "node:http";
const uuid = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const tid = uuid(100),
  uid = uuid(999);
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
const players = names.map(([first_name, last_name], i) => ({
  id: uuid(i + 1),
  first_name,
  last_name,
  phone: null,
  created_at: "2026-09-21T10:00:00Z",
}));
const tournaments = [
  {
    id: tid,
    title: "پدل پنجشنبه‌های باشگاه",
    date: "2026-09-21",
    status: "active",
    court_count: 2,
    total_rounds: 7,
    created_at: "2026-09-21T10:00:00Z",
  },
];
const participants = players.map((p, i) => ({
  id: uuid(200 + i),
  player_id: p.id,
  tournament_id: tid,
  slot: String.fromCharCode(65 + i),
}));
const rounds = Array.from({ length: 7 }, (_, i) => ({
  id: uuid(300 + i),
  tournament_id: tid,
  round_number: i + 1,
}));
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
const matches = schedule.map((p, i) => ({
  id: uuid(400 + i),
  tournament_id: tid,
  round_id: rounds[Math.floor(i / 2)].id,
  court_number: (i % 2) + 1,
  team1_player1_id: uuid(p[0]),
  team1_player2_id: uuid(p[1]),
  team2_player1_id: uuid(p[2]),
  team2_player2_id: uuid(p[3]),
  winner_team: null,
  version: 0,
}));
const sets = matches.flatMap((m, i) =>
  Array.from({ length: 3 }, (_, s) => ({
    id: uuid(500 + i * 3 + s),
    match_id: m.id,
    set_number: s + 1,
    winner_team: null,
  })),
);
const results = players.map((p, i) => ({
  id: uuid(600 + i),
  tournament_id: tid,
  player_id: p.id,
  total_points: 0,
  sets_won: 0,
  sets_lost: 0,
  matches_won: 0,
  matches_lost: 0,
  point_difference: 0,
  rank: i + 1,
}));
const tables = {
  players,
  tournaments,
  tournament_players: participants,
  tournament_rounds: rounds,
  matches,
  match_sets: sets,
  tournament_results: results,
  public_results: [],
  public_leaderboard: [],
};
const user = {
  id: uid,
  aud: "authenticated",
  role: "authenticated",
  email: "admin@example.com",
  email_confirmed_at: "2026-01-01T00:00:00Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};
const base64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
function session() {
  const now = Math.floor(Date.now() / 1000);
  const token = `${base64({ alg: "HS256", typ: "JWT" })}.${base64({ sub: uid, aud: "authenticated", role: "authenticated", iss: "http://127.0.0.1:54321/auth/v1", iat: now, exp: now + 3600 })}.${base64("fixture-signature")}`;
  return {
    access_token: token,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: "browser-fixture-refresh",
    user,
  };
}
http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://127.0.0.1:54321");
    const send = (value, status = 200) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(value));
    };
    if (url.pathname === "/health") return send({ ok: true });
    if (url.pathname === "/auth/v1/user") return send(user);
    if (url.pathname === "/auth/v1/token") return send(session());
    if (url.pathname === "/auth/v1/logout") return send({});
    if (url.pathname === "/rest/v1/rpc/is_admin") return send(true);
    const name = url.pathname.replace("/rest/v1/", "");
    if (!(name in tables))
      return send({ message: "Unsupported fixture endpoint" }, 404);
    if (req.method !== "GET" && req.method !== "HEAD")
      return send({ message: "Read-only browser fixtures" }, 405);
    let rows = [...tables[name]];
    for (const [key, value] of url.searchParams) {
      if (value.startsWith("eq."))
        rows = rows.filter((r) => String(r[key]) === value.slice(3));
      if (value.startsWith("in.(")) {
        const accepted = value.slice(4, -1).split(",");
        rows = rows.filter((r) => accepted.includes(String(r[key])));
      }
    }
    const orders = url.searchParams.get("order");
    if (orders)
      for (const order of orders.split(",").reverse()) {
        const [key, dir] = order.split(".");
        rows.sort(
          (a, b) =>
            String(a[key]).localeCompare(String(b[key]), undefined, {
              numeric: true,
            }) * (dir === "desc" ? -1 : 1),
        );
      }
    if (req.headers.accept?.includes("vnd.pgrst.object+json"))
      return send(rows[0] ?? null);
    return send(rows);
  })
  .listen(54321, "127.0.0.1");
