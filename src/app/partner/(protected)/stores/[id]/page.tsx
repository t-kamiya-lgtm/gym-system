import { notFound } from "next/navigation";
import { getCurrentPartner } from "@/lib/auth-partner";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStorePointsForCorporation } from "@/lib/points";
import { currentYearMonthJst } from "@/lib/rewards";

export default async function PartnerStoreDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ym?: string }>;
}) {
  const partner = await getCurrentPartner();
  if (!partner) return null;
  const { id } = await params;
  const { ym } = await searchParams;
  const yearMonth = ym ?? currentYearMonthJst();

  const admin = createSupabaseAdminClient();
  const { data: store } = await admin
    .from("gym_stores")
    .select("id, name, corporation_id")
    .eq("id", id)
    .maybeSingle();

  if (!store || store.corporation_id !== partner.corporationId) notFound();

  const { stores } = await getStorePointsForCorporation(admin, partner.corporationId, yearMonth);
  const storeData = stores.find((s) => s.storeId === id);
  const orders = storeData?.orders ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">
        {store.name} 受注詳細({yearMonth})
      </h1>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2">会員名</th>
              <th className="py-2">商品名</th>
              <th className="py-2">種別</th>
              <th className="py-2">数量(点)</th>
              <th className="py-2">回数</th>
              <th className="py-2">出荷日</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-neutral-100">
                <td className="py-2">{o.customerName}</td>
                <td className="py-2">{o.productName}</td>
                <td className="py-2">{o.type === "subscription" ? "定期" : "単品"}</td>
                <td className="py-2">{o.quantity}</td>
                <td className="py-2">{o.type === "subscription" ? `${o.billingCycleNumber}回目` : "-"}</td>
                <td className="py-2">{new Date(o.shippedAt).toLocaleDateString("ja-JP")}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-neutral-400">
                  対象月の出荷済み注文がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-neutral-500">
          ※ 出荷前にキャンセルされた単品注文・定期の途中解約分はここには表示されません(点数集計の対象外)。
        </p>
      </div>
    </div>
  );
}
