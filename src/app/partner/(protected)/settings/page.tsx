import { getCurrentPartner } from "@/lib/auth-partner";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NotificationEmailsManager } from "@/components/partner/NotificationEmailsManager";

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

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">新規注文の通知先メール設定</h1>
      <p className="text-sm text-neutral-500">
        新規注文が入ると、登録したメールアドレスへ「〇〇様の注文が入りました」という通知が送信されます。
        法人・店舗それぞれ複数登録できます。
      </p>

      <NotificationEmailsManager
        scopeLabel="法人全体"
        storeId={null}
        emails={(corpEmails ?? []).map((e) => ({ id: e.id, email: e.email, storeId: null, storeName: null }))}
      />

      {(stores ?? []).map((store) => (
        <NotificationEmailsManager
          key={store.id}
          scopeLabel={store.name}
          storeId={store.id}
          emails={(storeEmails ?? [])
            .filter((e) => e.store_id === store.id)
            .map((e) => ({ id: e.id, email: e.email, storeId: store.id, storeName: store.name }))}
        />
      ))}
    </div>
  );
}
