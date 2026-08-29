import { getCurrentPartner } from "@/lib/auth-partner";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NotificationEmailsManager, type NotificationEmailRow } from "@/components/partner/NotificationEmailsManager";

export default async function PartnerSettingsPage() {
  const partner = await getCurrentPartner();
  if (!partner) return null;

  const admin = createSupabaseAdminClient();
  const [{ data: corpEmails }, { data: stores }] = await Promise.all([
    admin
      .from("gym_notification_emails")
      .select("id, email")
      .eq("corporation_id", partner.corporationId),
    admin.from("gym_stores").select("id, name").eq("corporation_id", partner.corporationId),
  ]);

  const storeIds = (stores ?? []).map((s) => s.id);
  const { data: storeEmails } = storeIds.length
    ? await admin.from("gym_notification_emails").select("id, email, store_id").in("store_id", storeIds)
    : { data: [] as { id: string; email: string; store_id: string }[] };

  const storeNameById = new Map((stores ?? []).map((s) => [s.id, s.name]));

  const rows: NotificationEmailRow[] = [
    ...(corpEmails ?? []).map((e) => ({ id: e.id, email: e.email, scopeLabel: "法人全体", storeId: null })),
    ...(storeEmails ?? []).map((e) => ({
      id: e.id,
      email: e.email,
      scopeLabel: storeNameById.get(e.store_id) ?? "(削除済み店舗)",
      storeId: e.store_id,
    })),
  ];

  const scopeOptions = [
    { value: "", label: "法人全体" },
    ...(stores ?? []).map((s) => ({ value: s.id, label: s.name })),
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">通知設定</h1>
      <NotificationEmailsManager emails={rows} scopeOptions={scopeOptions} />
    </div>
  );
}
