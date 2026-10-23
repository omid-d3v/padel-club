import { requireAdmin } from "@/lib/auth";
import { Shell } from "@/components/shell";
import { PushOptIn } from "@/components/platform/push-opt-in";
export const dynamic = "force-dynamic";
export const metadata = {
  robots: { index: false, follow: false },
  title: "مدیریت باشگاه",
};
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const db = await requireAdmin();
  const { data } = await db.auth.getClaims();
  return (
    <Shell admin>
      <PushOptIn userId={String(data?.claims.sub)} />
      {children}
    </Shell>
  );
}
