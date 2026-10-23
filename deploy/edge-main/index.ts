// Dedicated self-hosted calendar router. No remote JSR/npm imports on an Iran host.
// calendar-sync verifies its private token against Vault before claiming any job.
export {};
declare const Deno: {
  env: { toObject(): Record<string, string> };
  serve(handler: (req: Request) => Promise<Response>): void;
};
type WorkerOptions = {
  servicePath: string;
  memoryLimitMb: number;
  workerTimeoutMs: number;
  noModuleCache: boolean;
  envVars: string[][];
};
declare const EdgeRuntime: {
  userWorkers: {
    create(
      options: WorkerOptions,
    ): Promise<{ fetch(req: Request): Promise<Response> }>;
  };
};
export async function routeCalendar(
  req: Request,
  create: (
    options: WorkerOptions,
  ) => Promise<{ fetch(req: Request): Promise<Response> }>,
  env: Record<string, string>,
) {
  if (new URL(req.url).pathname !== "/calendar-sync")
    return new Response(null, { status: 404 });
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const token = req.headers.get("x-calendar-token");
  if (!token || token.length > 200) return new Response(null, { status: 401 });
  try {
    const worker = await create({
      servicePath: "/home/deno/functions/calendar-sync",
      memoryLimitMb: 150,
      workerTimeoutMs: 150_000,
      noModuleCache: false,
      envVars: Object.entries({
        ...env,
        SUPABASE_FUNCTION_SLUG: "calendar-sync",
      }),
    });
    return await worker.fetch(req);
  } catch {
    console.error("Calendar worker unavailable");
    return new Response(null, { status: 503 });
  }
}
if (typeof Deno !== "undefined") {
  Deno.serve((req) =>
    routeCalendar(
      req,
      (options) => EdgeRuntime.userWorkers.create(options),
      Deno.env.toObject(),
    ),
  );
}
