"use client";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TournamentCard, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { deleteTournament } from "@/app/actions";
import type { Tournament, Status } from "@/lib/types";
export function TournamentList({ tournaments }: { tournaments: Tournament[] }) {
  const [filter, setFilter] = useState<Status | "all">("all");
  const [selected, setSelected] = useState<Tournament | null>(null);
  const [pending, startTransition] = useTransition();
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
            <TournamentCard
              key={t.id}
              tournament={t}
              action={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => setSelected(t)}
                  aria-label={`حذف کامل مچ‌میکینگ ${t.title}`}
                  className="w-full text-red-700 hover:bg-red-50 hover:text-red-800"
                >
                  <Trash2 size={17} />
                  حذف کامل مچ‌میکینگ
                </Button>
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="هنوز مسابقه‌ای در این بخش نیست"
          description="یک مچ‌میکینگ جدید بسازید یا فیلتر دیگری انتخاب کنید."
        />
      )}
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setSelected(null);
        }}
        title="این مچ‌میکینگ کامل حذف شود؟"
        description={`«${selected?.title ?? ""}» همراه همه دورها، بازی‌ها، راندها و نتایج آن برای همیشه حذف می‌شود. بازیکنان باشگاه حذف نمی‌شوند. این کار قابل بازگشت نیست.`}
      >
        <div className="flex gap-3">
          <Button
            type="button"
            variant="destructive"
            disabled={pending || !selected}
            onClick={() => {
              if (!selected) return;
              const tournamentId = selected.id;
              startTransition(async () => {
                try {
                  const result = await deleteTournament(tournamentId);
                  if (!result.success) {
                    toast.error(result.error);
                    return;
                  }
                  setSelected(null);
                  toast.success("مچ‌میکینگ و تمام نتایج آن حذف شد");
                } catch {
                  toast.error("حذف مچ‌میکینگ انجام نشد. دوباره تلاش کنید.");
                }
              });
            }}
          >
            <Trash2 size={17} />
            {pending ? "در حال حذف…" : "حذف برای همیشه"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => setSelected(null)}
          >
            انصراف
          </Button>
        </div>
      </Dialog>
    </>
  );
}
