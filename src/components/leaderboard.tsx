"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LeaderboardTable, EmptyState } from "@/components/shared";
import type { Leader } from "@/lib/types";
export function Leaderboard({ leaders }: { leaders: Leader[] }) {
  const [tab, setTab] = useState("ranking");
  const rows = [...leaders]
    .sort((a, b) =>
      tab === "active"
        ? b.tournaments - a.tournaments || b.crowns - a.crowns
        : a.crowns === b.crowns
          ? a.average_rank - b.average_rank || b.win_rate - a.win_rate
          : b.crowns - a.crowns,
    )
    .filter((l) => tab !== "champions" || l.crowns > 0);
  return (
    <>
      <div
        className="mb-6 flex flex-wrap gap-2"
        role="group"
        aria-label="نمایش لیدربرد"
      >
        {[
          ["ranking", "رتبه‌بندی"],
          ["active", "فعال‌ترین‌ها"],
          ["champions", "قهرمان‌ها"],
        ].map(([value, label]) => (
          <Button
            key={value}
            variant={tab === value ? "default" : "outline"}
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      {rows.length ? (
        <LeaderboardTable leaders={rows} />
      ) : (
        <EmptyState
          title="تاج بعدی می‌تواند برای شما باشد"
          description="با پایان اولین مسابقه، آمار واقعی بازیکنان اینجا نمایش داده می‌شود."
        />
      )}
    </>
  );
}
