import { redirect } from "next/navigation";
import { MemberNav } from "@/components/platform/member-nav";
import { requireMember } from "@/lib/platform/data";
import { PublicShell } from "@/components/platform/public-shell";
import { logout } from "@/app/actions";
import { PushOptIn } from "@/components/platform/push-opt-in";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "حساب من",
  robots: { index: false, follow: false },
};
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const m = await requireMember();
  if (!m.profile) redirect("/onboarding");
  return (
    <PublicShell>
      <div className="public-container pt-6">
        <MemberNav admin={m.admin}>
          <form action={logout}>
            <button className="min-h-11 px-3 text-sm text-red-700">
              خروج از حساب
            </button>
          </form>
        </MemberNav>
        <PushOptIn userId={m.userId} />
      </div>
      {children}
    </PublicShell>
  );
}
