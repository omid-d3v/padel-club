// Liveness only: no credentials, private data or dependency details are exposed.
export function GET() {
  return Response.json(
    { status: "ok" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
