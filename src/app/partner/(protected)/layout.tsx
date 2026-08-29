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
        <div className="mx-auto flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-6 sm:py-4">
          <Link href="/partner" className="min-w-0 truncate text-sm font-semibold hover:text-neutral-700 sm:text-base">
            <span className="sm:hidden">パートナー管理画面</span>
            <span className="hidden sm:inline">
              プロテインモンスター オフィシャルパートナー {corporation?.name ?? "法人"}様 パートナー管理画面
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            {memberships.length > 1 && (
              <CorpSwitcher
                corporations={(corporations ?? []).map((c) => ({ id: c.id, name: c.name }))}
                activeCorporationId={partner.corporationId}
              />
            )}
            <span className="hidden text-sm text-neutral-500 sm:inline">{partner.email}</span>
            <LogoutButton redirectTo="/partner/login" />
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
