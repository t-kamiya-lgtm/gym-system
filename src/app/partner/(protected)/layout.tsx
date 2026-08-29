import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentPartner, getPartnerMemberships } from "@/lib/auth-partner";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PartnerNav } from "@/components/partner/PartnerNav";
import { CorpSwitcher } from "@/components/partner/CorpSwitcher";
import { LogoutButton } from "@/components/LogoutButton";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const partner = await getCurrentPartner();
  if (!partner) {
    redirect("/partner/login");
  }

  const memberships = await getPartnerMemberships();
  const admin = createSupabaseAdminClient();
  const corporationIds = memberships.map((m) => m.corporationId);
  const { data: corporations } = await admin
    .from("gym_corporations")
    .select("id, name")
    .in("id", corporationIds);
  const corporation = (corporations ?? []).find((c) => c.id === partner.corporationId);

  return (
    <div className="min-h-screen bg-sky-50">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex items-center justify-between gap-2 px-3 py-2 sm:px-6 sm:py-3">
          <Link href="/partner" className="shrink-0 text-sm font-semibold leading-tight hover:text-neutral-700">
            プロテインモンスター
            <br />
            オフィシャルパートナー
            <br />
            管理画面
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-right text-xs">
              {memberships.length > 1 ? (
                <CorpSwitcher
                  corporations={(corporations ?? []).map((c) => ({ id: c.id, name: c.name }))}
                  activeCorporationId={partner.corporationId}
                />
              ) : (
                <div className="font-medium text-neutral-700">{corporation?.name}</div>
              )}
              <div className="mt-0.5 text-neutral-500">{partner.email}</div>
            </div>
            <LogoutButton redirectTo="/partner/login" variant="icon" />
          </div>
        </div>
        <PartnerNav />
      </header>
      <main className="mx-auto min-w-0 max-w-screen-2xl overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
