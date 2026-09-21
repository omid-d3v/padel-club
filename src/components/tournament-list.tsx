"use client";
import { useState } from "react";
import { TournamentCard, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import type { Tournament, Status } from "@/lib/types";
export function TournamentList({ tournaments }: { tournaments: Tournament[] }) {
  const [filter, setFilter] = useState<Status | "all">("all");
  const rows = tournaments.filter(
    (t) => filter === "all" || t.status === filter,
  );
  return (
    <>
      <div
        className="mb-6 flex flex-wrap gap-2"
        role="group"
        aria-label="فیلتر وضعیت مسابقات"
      >
        {(
          [
            ["all", "همه مسابقات"],
            ["active", "در حال برگزاری"],
            ["draft", "آماده شروع"],
            ["completed", "تکمیل شده"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            aria-pressed={filter === value}
            variant={value === filter ? "default" : "outline"}
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      {rows.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((t) => (
            <TournamentCard key={t.id} tournament={t} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="هنوز مسابقه‌ای در این بخش نیست"
          description="یک مچ‌میکینگ جدید بسازید یا فیلتر دیگری انتخاب کنید."
        />
      )}
    </>
  );
}
