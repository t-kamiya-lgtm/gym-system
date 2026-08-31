import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getOrderLinesForCorporationMonth } from "@/lib/order-lines";
import { getCorporationStatement } from "@/lib/statements";
import type { RewardTier } from "@/lib/types";
import { OrderLinesEditor } from "@/components/admin/OrderLinesEditor";

const STATUS_LABEL: Record<string, string> = {
  not_closed: "未確定",
  closed: "確定済み(同意待ち)",
  agreed: "同意済み",
};

export default async function OrderLinesPage({
  params,
}: {
  params: Promise<{ corporationId: string; yearMonth: string }>;
}) {
  const { corporationId, yearMonth } = await params;
  const admin = createSupabaseAdminClient();

  const { data: corporation } = await admin
    .from("gym_corporations")
    .select("id, name")
    .eq("id", corporationId)
    .maybeSingle();
  if (!corporation) notFound();

  const [lines, statement, { data: stores }, { data: tierRows }] = await Promise.all([
    getOrderLinesForCorporationMonth(admin, corporationId, yearMonth),
    getCorporationStatement(admin, corporationId, yearMonth),
    admin.from("gym_stores").select("id, name").eq("corporation_id", corporationId).order("name"),
    admin.from("gym_reward_tiers").select("min_points, max_points, unit_price").order("min_points"),
  ]);

  const tiers: RewardTier[] = (tierRows ?? []).map((t) => ({
    minPoints: t.min_points,
    maxPoints: t.max_points,
    unitPrice: t.unit_price,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/statements" className="text-sm text-neutral-500 hover:underline">
          ← 支払い明細に戻る
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">受注明細</h1>
          <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
            {STATUS_LABEL[statement.status]}
          </span>
        </div>
        <p className="text-sm text-neutral-500">
          {corporation.name} ・ 対象期間 {yearMonth}
        </p>
      </div>

      <OrderLinesEditor
        corporationId={corporationId}
        yearMonth={yearMonth}
        initialLines={lines.map((l) => ({
          id: l.id,
          storeId: l.storeId,
          storeName: l.storeName,
          orderNumber: l.orderNumber,
          orderDate: l.orderDate,
          customerName: l.customerName,
          productName: l.productName,
          quantity: l.quantity,
          shipmentFlag: l.shipmentFlag,
          isManual: l.isManual,
          isReversal: l.isReversal,
        }))}
        initialFinalAmount={statement.finalAmount}
        tiers={tiers}
        storeOptions={(stores ?? []).map((s) => ({ id: s.id, name: s.name }))}
      />
    </div>
  );
}
