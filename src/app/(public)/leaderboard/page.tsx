import { Crown, Users, Trophy } from "lucide-react";
import { getLeaderboard } from "@/lib/data";
import { PageHeader, StatCard } from "@/components/shared";
import { Leaderboard } from "@/components/leaderboard";
export default async function LeaderboardPage() {
  const leaders = await getLeaderboard();
  return (
    <>
      <PageHeader
        title="لیدربرد بازیکنان"
        description="هر بازی یک قدم بالاتر. آمار تمام مسابقات پایان‌یافته باشگاه."
      />
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="بازیکنان رقابت‌کننده"
          value={leaders.length}
          icon={<Users size={21} />}
        />
        <StatCard
          label="مسابقات پایان‌یافته"
          value={leaders.reduce((s, l) => s + l.tournaments, 0) / 8}
          icon={<Trophy size={21} />}
        />
        <StatCard
          label="قهرمان‌های باشگاه"
          value={leaders.filter((l) => l.crowns > 0).length}
          icon={<Crown size={21} />}
        />
      </div>
      <Leaderboard leaders={leaders} />
      <p className="mt-5 text-xs leading-7 text-muted-foreground">
        رتبه‌بندی بر اساس تعداد تاج، میانگین رتبه بهتر و سپس درصد برد بازی‌هاست.
        مسابقات در حال برگزاری در این آمار حساب نمی‌شوند.
      </p>
    </>
  );
}
