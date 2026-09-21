"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, ArrowUpLeft } from "lucide-react";
import { PlayerForm, DeletePlayer } from "@/components/forms";
import { PlayerName, EmptyState } from "@/components/shared";
import { Input } from "@/components/ui/input";
import type { Player } from "@/lib/types";
import { fullName, number } from "@/lib/utils";
export function PlayerList({
  rows,
}: {
  rows: { player: Player; tournaments: number; wins: number; crowns: number }[];
}) {
  const [search, setSearch] = useState("");
  const filtered = rows.filter(
    (r) =>
      fullName(r.player).includes(search) || r.player.phone?.includes(search),
  );
  return (
    <>
      <div className="relative mb-5 max-w-md">
        <Search
          size={19}
          className="absolute end-3 top-3.5 text-muted-foreground"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="جست‌وجوی بازیکنان"
          placeholder="جست‌وجوی نام یا شماره موبایل…"
          className="pe-11"
        />
      </div>
      {!filtered.length ? (
        <EmptyState
          title={
            rows.length
              ? "بازیکنی با این مشخصات پیدا نشد"
              : "هنوز کسی وارد زمین نشده"
          }
          description={
            rows.length
              ? "با نام دیگری جست‌وجو کنید."
              : "اولین بازیکن باشگاه را ثبت کنید. شماره موبایل اجباری نیست."
          }
        />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>بازیکن</th>
                <th>شماره موبایل</th>
                <th>شرکت در مسابقه</th>
                <th>برد بازی</th>
                <th>پادشاه زمین</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ player: p, tournaments, wins, crowns }) => (
                <tr key={p.id}>
                  <td>
                    <PlayerName player={p} link />
                  </td>
                  <td>
                    <span dir="ltr">{p.phone ?? "—"}</span>
                  </td>
                  <td>{number(tournaments)}</td>
                  <td>{number(wins)}</td>
                  <td>{crowns ? `👑 ${number(crowns)}` : "—"}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <PlayerForm player={p} />
                      <DeletePlayer player={p} />
                      <Link
                        aria-label={`پروفایل ${fullName(p)}`}
                        href={`/players/${p.id}`}
                        className="grid size-11 place-items-center rounded-xl hover:bg-muted"
                      >
                        <ArrowUpLeft size={18} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
