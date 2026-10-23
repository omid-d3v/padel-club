// Independent of Vercel Cron. One request at a time, never an overlapping timer.
import { setTimeout } from "node:timers/promises";
if (!process.env.CRON_SECRET) throw new Error("CRON_SECRET is required");
let stopping = false;
process.on("SIGTERM", () => {
  stopping = true;
});
process.on("SIGINT", () => {
  stopping = true;
});
while (!stopping) {
  try {
    const response = await fetch("http://web:3000/api/jobs", {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      signal: AbortSignal.timeout(290000),
    });
    // Consume response, but never log notification bodies, customer data or keys.
    await response.arrayBuffer();
    if (!response.ok) console.error(`jobs: HTTP ${response.status}`);
  } catch {
    console.error("jobs: request failed");
  }
  if (!stopping) await setTimeout(60000);
}
