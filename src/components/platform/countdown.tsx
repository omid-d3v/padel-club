"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Timer } from "lucide-react";
import { persianDigits } from "@/lib/date-time";
export function Countdown({
  deadline,
  now,
  label,
}: {
  deadline: string;
  now: number;
  label: string;
}) {
  const router = useRouter();
  const [left, setLeft] = useState(() =>
    Math.max(0, Date.parse(deadline) - now),
  );
  useEffect(() => {
    const start = performance.now();
    let refreshed = false;
    const tick = () => {
      const remaining = Math.max(
        0,
        Date.parse(deadline) - now - (performance.now() - start),
      );
      setLeft(remaining);
      if (!remaining && !refreshed) {
        refreshed = true;
        router.refresh();
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline, now, router]);
  const seconds = Math.ceil(left / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return (
    <div
      className={`rounded-2xl border p-4 ${left < 300000 ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}
    >
      <p className="flex items-center gap-2 text-xs">
        <Timer size={16} />
        {label}
      </p>
      <p
        role="timer"
        aria-label={label}
        className="mt-2 text-3xl font-extrabold tabular-nums"
        dir="ltr"
      >
        {left
          ? persianDigits(
              `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`,
            )
          : "مهلت تمام شد"}
      </p>
    </div>
  );
}
