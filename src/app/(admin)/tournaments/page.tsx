import Link from "next/link";
import { Plus } from "lucide-react";
import { getTournaments } from "@/lib/data";
import { PageHeader } from "@/components/shared";
import { TournamentList } from "@/components/tournament-list";
import { Button } from "@/components/ui/button";
export default async function Tournaments() {
  return (
    <>
      <PageHeader
        title="مچ‌میکینگ‌ها"
        description="از اولین سرویس تا تاج قهرمانی؛ همه رقابت‌ها یک‌جا."
        action={
          <Button asChild>
            <Link href="/tournaments/new">
              <Plus size={18} />
              مچ‌میکینگ جدید
            </Link>
          </Button>
        }
      />
      <TournamentList tournaments={await getTournaments()} />
    </>
  );
}
