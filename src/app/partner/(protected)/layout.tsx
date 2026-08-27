import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentPartner } from "@/lib/auth-partner";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PartnerNav } from "@/components/partner/PartnerNav";
import { LogoutButton } from "@/components/LogoutButton";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const partner = await getCurrentPartner();
  if (!partner) {
    redirect("/partner/login");
  }

  const admin = createSupabaseAdminClient();
  const { data: corporation } = await admin
    .from("gym_corporations")
    .select("name")
    .eq("id", partner.corporationId)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-sky-50">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-4">
          <Link href="/partner" className="font-semibold hover:text-neutral-700">
            {corporation?.name ?? "法人"}様 パートナー管理画面
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-500">{partner.email}</span>
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
