import type { SupabaseClient } from "@supabase/supabase-js";
import { monthRangeJst } from "@/lib/rewards";
import { dayRangeJstToIso } from "@/lib/date-range";
import { calcTaxExcluded, calcAge } from "@/lib/tax";
import { subscriptionIntervalLabel } from "@/lib/subscription-intervals";

export interface StoreOrderRow {
  id: string;
  storeId: string;
  customerId: string;
  customerName: string;
  customerGender: string | null;
  customerAge: number | null;
  productId: string;
  productName: string;
  orderNumber: string | null;
  type: "one_time" | "subscription";
  quantity: number;
  billingCycleNumber: number;
  shippedAt: string;
  status: string;
  importStatus: string;
  revenue: number;
  taxExcludedAmount: number;
  subscriptionIntervalLabel: string | null;
}

export interface StorePoints {
  storeId: string;
  storeName: string;
  corporationId: string;
  corporationName: string;
  points: number;
  orderCount: number;
  revenue: number;
  oneTimeRevenue: number;
  oneTimePoints: number;
  subscriptionRevenue: number;
  subscriptionPoints: number;
  orders: StoreOrderRow[];
}

interface OrderMoneyFields {
  amount: number;
  addon_amount: number | null;
  shipping_fee: number;
  payment_fee: number;
  discount_amount: number | null;
  first_time_discount_amount: number | null;
}

/** アドオン加算・値引反映後の請求額(pm-chat-bot側の計算式と同じ)。 */
function orderRevenue(order: OrderMoneyFields): number {
  return (
    order.amount +
    (order.addon_amount ?? 0) +
    order.shipping_fee +
    order.payment_fee -
    (order.discount_amount ?? 0) -
    (order.first_time_discount_amount ?? 0)
  );
}

function emptyStorePoints(storeId: string, storeName: string, corporationId: string, corporationName: string): StorePoints {
  return {
    storeId,
    storeName,
    corporationId,
    corporationName,
    points: 0,
    orderCount: 0,
    revenue: 0,
    oneTimeRevenue: 0,
    oneTimePoints: 0,
    subscriptionRevenue: 0,
    subscriptionPoints: 0,
    orders: [],
  };
}

/**
 * 店舗の合計点数は「出荷日ベース」で計上する(決定事項)。
 * 除外対象(単品の出荷前キャンセル・定期の途中解約分)は、import_status='shipped' かつ
 * shipped_atが対象期間内にある注文のみを対象とすることで自然に除外される
 * (出荷前にキャンセルされた注文はshipped_atが設定されない)。
 */
async function computeStorePoints(
  admin: SupabaseClient,
  storeRows: { id: string; name: string; corporation_id: string; corporationName: string }[],
  startIso: string,
  endIso: string,
): Promise<{ targetScenarioId: string | null; stores: StorePoints[] }> {
  const { data: settings } = await admin.from("gym_settings").select("target_scenario_id").single();
  const targetScenarioId = settings?.target_scenario_id ?? null;

  const result = new Map<string, StorePoints>(
    storeRows.map((s) => [s.id, emptyStorePoints(s.id, s.name, s.corporation_id, s.corporationName)]),
  );
  if (storeRows.length === 0) return { targetScenarioId, stores: [] };

  const storeIds = storeRows.map((s) => s.id);
  const { data: storeCoupons } = await admin
    .from("gym_store_coupons")
    .select("store_id, coupon_id")
    .in("store_id", storeIds);
  const couponToStore = new Map((storeCoupons ?? []).map((sc) => [sc.coupon_id, sc.store_id]));
  const couponIds = Array.from(couponToStore.keys());

  if (couponIds.length === 0 || !targetScenarioId) {
    return { targetScenarioId, stores: Array.from(result.values()) };
  }

  const { data: orders } = await admin
    .from("orders")
    .select(
      "id, customer_id, product_id, coupon_id, order_number, type, quantity, billing_cycle_number, shipped_at, status, import_status, amount, addon_amount, shipping_fee, payment_fee, discount_amount, first_time_discount_amount",
    )
    .eq("scenario_id", targetScenarioId)
    .eq("import_status", "shipped")
    .in("coupon_id", couponIds)
    .gte("shipped_at", startIso)
    .lt("shipped_at", endIso)
    .neq("status", "canceled");

  const orderRows = orders ?? [];
  const orderIds = orderRows.map((o) => o.id);
  const customerIds = Array.from(new Set(orderRows.map((o) => o.customer_id)));
  const productIds = Array.from(new Set(orderRows.map((o) => o.product_id)));

  const [{ data: customers }, { data: products }, { data: subscriptions }] = await Promise.all([
    customerIds.length
      ? admin.from("customers").select("id, name, gender, birth_date").in("id", customerIds)
      : Promise.resolve({ data: [] as { id: string; name: string; gender: string | null; birth_date: string | null }[] }),
    productIds.length
      ? admin.from("products").select("id, name, tax_rate").in("id", productIds)
      : Promise.resolve({ data: [] as { id: string; name: string; tax_rate: number }[] }),
    orderIds.length
      ? admin.from("subscriptions").select("order_id, interval").in("order_id", orderIds)
      : Promise.resolve({ data: [] as { order_id: string; interval: string }[] }),
  ]);
  const customerById = new Map((customers ?? []).map((c) => [c.id, c]));
  const productById = new Map((products ?? []).map((p) => [p.id, p]));
  const intervalByOrderId = new Map((subscriptions ?? []).map((s) => [s.order_id, s.interval]));

  const today = new Date();
  for (const order of orderRows) {
    const storeId = couponToStore.get(order.coupon_id as string);
    if (!storeId) continue;
    const entry = result.get(storeId);
    if (!entry) continue;

    const customer = customerById.get(order.customer_id);
    const product = productById.get(order.product_id);
    const revenue = orderRevenue(order);
    const taxExcludedAmount = calcTaxExcluded(revenue, product?.tax_rate ?? 8);
    const age = calcAge(customer?.birth_date ?? null, today);

    entry.points += order.quantity;
    entry.orderCount += 1;
    entry.revenue += revenue;
    if (order.type === "subscription") {
      entry.subscriptionPoints += order.quantity;
      entry.subscriptionRevenue += revenue;
    } else {
      entry.oneTimePoints += order.quantity;
      entry.oneTimeRevenue += revenue;
    }

    entry.orders.push({
      id: order.id,
      storeId,
      customerId: order.customer_id,
      customerName: customer?.name ?? "(不明)",
      customerGender: customer?.gender ?? null,
      customerAge: age,
      productId: order.product_id,
      productName: product?.name ?? "(不明)",
      orderNumber: order.order_number,
      type: order.type,
      quantity: order.quantity,
      billingCycleNumber: order.billing_cycle_number,
      shippedAt: order.shipped_at,
      status: order.status,
      importStatus: order.import_status,
      revenue,
      taxExcludedAmount,
      subscriptionIntervalLabel: subscriptionIntervalLabel(intervalByOrderId.get(order.id) ?? null),
    });
  }

  return { targetScenarioId, stores: Array.from(result.values()) };
}

async function storeRowsForCorporation(admin: SupabaseClient, corporationId: string) {
  const { data: corp } = await admin.from("gym_corporations").select("name").eq("id", corporationId).maybeSingle();
  const { data: stores } = await admin
    .from("gym_stores")
    .select("id, name, corporation_id")
    .eq("corporation_id", corporationId);
  return (stores ?? []).map((s) => ({ ...s, corporationName: corp?.name ?? "" }));
}

/** 月次の報酬・明細計算用(カレンダー月単位、決定事項)。 */
export async function getStorePointsForCorporation(
  admin: SupabaseClient,
  corporationId: string,
  yearMonth: string,
): Promise<{ targetScenarioId: string | null; stores: StorePoints[] }> {
  const { startIso, endIso } = monthRangeJst(yearMonth);
  const storeRows = await storeRowsForCorporation(admin, corporationId);
  return computeStorePoints(admin, storeRows, startIso, endIso);
}

/** 実績レポート閲覧用(任意の期間、法人単位)。 */
export async function getStorePointsForCorporationInRange(
  admin: SupabaseClient,
  corporationId: string,
  from: string,
  to: string,
): Promise<{ targetScenarioId: string | null; stores: StorePoints[] }> {
  const { startIso, endIso } = dayRangeJstToIso(from, to);
  const storeRows = await storeRowsForCorporation(admin, corporationId);
  return computeStorePoints(admin, storeRows, startIso, endIso);
}

/** 実績レポート閲覧用(任意の期間、全法人横断)。 */
export async function getAllStorePointsInRange(
  admin: SupabaseClient,
  from: string,
  to: string,
): Promise<{ targetScenarioId: string | null; stores: StorePoints[] }> {
  const { startIso, endIso } = dayRangeJstToIso(from, to);
  const { data: corporations } = await admin.from("gym_corporations").select("id, name");
  const nameByCorpId = new Map((corporations ?? []).map((c) => [c.id, c.name]));
  const { data: stores } = await admin.from("gym_stores").select("id, name, corporation_id");
  const storeRows = (stores ?? []).map((s) => ({
    ...s,
    corporationName: nameByCorpId.get(s.corporation_id) ?? "(削除済み法人)",
  }));
  return computeStorePoints(admin, storeRows, startIso, endIso);
}

/**
 * 継続定期人数(解約していない定期継続中残存人数)。月次の集計とは独立した、
 * 現時点でのスナップショット(status='active'なsubscriptionsの件数)として算出する。
 */
export async function getActiveSubscriberCountsByStore(
  admin: SupabaseClient,
  storeIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>(storeIds.map((id) => [id, 0]));
  if (storeIds.length === 0) return counts;

  const { data: storeCoupons } = await admin
    .from("gym_store_coupons")
    .select("store_id, coupon_id")
    .in("store_id", storeIds);
  const couponToStore = new Map((storeCoupons ?? []).map((sc) => [sc.coupon_id, sc.store_id]));
  const couponIds = Array.from(couponToStore.keys());
  if (couponIds.length === 0) return counts;

  const { data: orders } = await admin
    .from("orders")
    .select("id, coupon_id")
    .in("coupon_id", couponIds)
    .eq("type", "subscription");
  const storeByOrderId = new Map((orders ?? []).map((o) => [o.id, couponToStore.get(o.coupon_id as string)]));
  const orderIds = (orders ?? []).map((o) => o.id);
  if (orderIds.length === 0) return counts;

  const { data: activeSubs } = await admin
    .from("subscriptions")
    .select("order_id")
    .in("order_id", orderIds)
    .eq("status", "active");

  for (const sub of activeSubs ?? []) {
    const storeId = storeByOrderId.get(sub.order_id);
    if (!storeId) continue;
    counts.set(storeId, (counts.get(storeId) ?? 0) + 1);
  }
  return counts;
}

export interface MemberRow {
  storeId: string;
  storeName: string;
  customerId: string;
  customerName: string;
  oneTimePoints: number;
  subscriptionPoints: number;
  totalPoints: number;
  lastPurchaseDate: string;
}

/**
 * 会員別実績。同じ会員が複数店舗に出現する場合は店舗ごとに別行として集計する
 * (店舗担当インストラクター名等のメモが店舗単位のため)。累計購入点数の多い順。
 */
export function aggregateMembers(stores: StorePoints[]): MemberRow[] {
  const byKey = new Map<string, MemberRow>();
  for (const store of stores) {
    for (const order of store.orders) {
      const key = `${store.storeId}:${order.customerId}`;
      let entry = byKey.get(key);
      if (!entry) {
        entry = {
          storeId: store.storeId,
          storeName: store.storeName,
          customerId: order.customerId,
          customerName: order.customerName,
          oneTimePoints: 0,
          subscriptionPoints: 0,
          totalPoints: 0,
          lastPurchaseDate: order.shippedAt,
        };
        byKey.set(key, entry);
      }
      if (order.type === "subscription") {
        entry.subscriptionPoints += order.quantity;
      } else {
        entry.oneTimePoints += order.quantity;
      }
      entry.totalPoints += order.quantity;
      if (order.shippedAt > entry.lastPurchaseDate) {
        entry.lastPurchaseDate = order.shippedAt;
      }
    }
  }
  return Array.from(byKey.values()).sort((a, b) => b.totalPoints - a.totalPoints);
}
