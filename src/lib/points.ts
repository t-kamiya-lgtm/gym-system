import type { SupabaseClient } from "@supabase/supabase-js";
import { monthRangeJst } from "@/lib/rewards";

export interface StoreOrderRow {
  id: string;
  storeId: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  type: "one_time" | "subscription";
  quantity: number;
  billingCycleNumber: number;
  shippedAt: string;
  status: string;
  importStatus: string;
}

export interface StorePoints {
  storeId: string;
  storeName: string;
  points: number;
  orders: StoreOrderRow[];
}

/**
 * 店舗の月間合計点数は「出荷日ベース」で計上する(決定事項)。
 * 除外対象(単品の出荷前キャンセル・定期の途中解約分)は、import_status='shipped' かつ
 * shipped_atが対象月内にある注文のみを対象とすることで自然に除外される
 * (出荷前にキャンセルされた注文はshipped_atが設定されない)。
 * 明細確定後にキャンセルが判明した場合も、都度この関数を呼び直せば当月分に反映される
 * (当月再計算・決定事項)。
 */
export async function getStorePointsForCorporation(
  admin: SupabaseClient,
  corporationId: string,
  yearMonth: string,
): Promise<{ targetScenarioId: string | null; stores: StorePoints[] }> {
  const { data: settings } = await admin
    .from("gym_settings")
    .select("target_scenario_id")
    .single();
  const targetScenarioId = settings?.target_scenario_id ?? null;

  const { data: stores } = await admin
    .from("gym_stores")
    .select("id, name")
    .eq("corporation_id", corporationId);
  const storeList = stores ?? [];
  if (storeList.length === 0) return { targetScenarioId, stores: [] };

  const storeIds = storeList.map((s) => s.id);
  const { data: storeCoupons } = await admin
    .from("gym_store_coupons")
    .select("store_id, coupon_id")
    .in("store_id", storeIds);
  const couponToStore = new Map((storeCoupons ?? []).map((sc) => [sc.coupon_id, sc.store_id]));
  const couponIds = Array.from(couponToStore.keys());

  const result = new Map<string, StorePoints>(
    storeList.map((s) => [s.id, { storeId: s.id, storeName: s.name, points: 0, orders: [] }]),
  );

  if (couponIds.length === 0 || !targetScenarioId) {
    return { targetScenarioId, stores: Array.from(result.values()) };
  }

  const { startIso, endIso } = monthRangeJst(yearMonth);
  const { data: orders } = await admin
    .from("orders")
    .select(
      "id, customer_id, product_id, coupon_id, type, quantity, billing_cycle_number, shipped_at, status, import_status",
    )
    .eq("scenario_id", targetScenarioId)
    .eq("import_status", "shipped")
    .in("coupon_id", couponIds)
    .gte("shipped_at", startIso)
    .lt("shipped_at", endIso)
    .neq("status", "canceled");

  const orderRows = orders ?? [];
  const customerIds = Array.from(new Set(orderRows.map((o) => o.customer_id)));
  const productIds = Array.from(new Set(orderRows.map((o) => o.product_id)));

  const [{ data: customers }, { data: products }] = await Promise.all([
    customerIds.length
      ? admin.from("customers").select("id, name").in("id", customerIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    productIds.length
      ? admin.from("products").select("id, name").in("id", productIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const customerNameById = new Map((customers ?? []).map((c) => [c.id, c.name]));
  const productNameById = new Map((products ?? []).map((p) => [p.id, p.name]));

  for (const order of orderRows) {
    const storeId = couponToStore.get(order.coupon_id as string);
    if (!storeId) continue;
    const entry = result.get(storeId);
    if (!entry) continue;
    entry.points += order.quantity;
    entry.orders.push({
      id: order.id,
      storeId,
      customerId: order.customer_id,
      customerName: customerNameById.get(order.customer_id) ?? "(不明)",
      productId: order.product_id,
      productName: productNameById.get(order.product_id) ?? "(不明)",
      type: order.type,
      quantity: order.quantity,
      billingCycleNumber: order.billing_cycle_number,
      shippedAt: order.shipped_at,
      status: order.status,
      importStatus: order.import_status,
    });
  }

  return { targetScenarioId, stores: Array.from(result.values()) };
}
