import { getPlayers } from "@/lib/data";
import { PageHeader, BackLink } from "@/components/shared";
import { CreateTournamentForm } from "@/components/forms";
export default async function New() {
  return (
    <>
      <PageHeader
        title="یک رقابت تازه بسازید"
        description="هشت نفر را انتخاب کنید؛ برنامه هفت دور به‌صورت خودکار آماده می‌شود."
        action={<BackLink href="/tournaments" label="همه مسابقات" />}
      />
      <CreateTournamentForm players={await getPlayers()} />
    </>
  );
}
