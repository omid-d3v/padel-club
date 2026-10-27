"use client";
import { Button } from "@/components/ui/button";
export function RoundWinnerPicker({
  winner,
  onChange,
  team1,
  team2,
  disabled,
}: {
  winner: 1 | 2 | null;
  onChange: (winner: 1 | 2 | null) => void;
  team1: string;
  team2: string;
  disabled: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        type="button"
        variant={winner === 1 ? "default" : "outline"}
        disabled={disabled}
        aria-pressed={winner === 1}
        aria-label={`تیم اول: ${team1}`}
        onClick={() => onChange(winner === 1 ? null : 1)}
        className="h-auto min-h-12 whitespace-normal px-3 py-2 text-xs leading-6"
      >
        تیم اول
        <span className="sr-only">: {team1}</span>
      </Button>
      <Button
        type="button"
        variant={winner === 2 ? "default" : "outline"}
        disabled={disabled}
        aria-pressed={winner === 2}
        aria-label={`تیم دوم: ${team2}`}
        onClick={() => onChange(winner === 2 ? null : 2)}
        className="h-auto min-h-12 whitespace-normal px-3 py-2 text-xs leading-6"
      >
        تیم دوم
        <span className="sr-only">: {team2}</span>
      </Button>
    </div>
  );
}
