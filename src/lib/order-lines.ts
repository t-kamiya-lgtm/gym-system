import type { SupabaseClient } from "@supabase/supabase-js";
import { dateJstFromIso } from "@/lib/date-range";
import { monthDateRangeJst } from "@/lib/rewards";
import { subscriptionIntervalLabel } from "@/lib/subscription-intervals";

const ORDER_LINE_COLUMNS =
  "id, corporation_id, store_id, source_order_id, order_number, order_date, customer_name, product_name, quantity, shipment_flag, is_manual, is_reversal, locked, order_type, subscription_interval";

export interface OrderLineRow {
  id: string;
  corporationId: string;
  storeId: string;
  storeName: string;
  sourceOrderId: string | null;
  orderNumber: string | null;
  orderDate: string;
  customerName: string;
  productName: string;
  quantity: number;
  shipmentFlag: "not_shipped" | "shipped" | "canceled" | "excluded";
  isManual: boolean;
  isReversal: boolean;
  locked: boolean;
  orderType: "one_time" | "subscription" | null;
  subscriptionIntervalLabel: string | null;
}

interface OrderLineDbRow {
  id: string;
  corporation_id: string;
  store_id: string;
  source_order_id: string | null;
  order_number: string | null;
  order_date: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  shipment_flag: OrderLineRow["shipmentFlag"];
  is_manual: boolean;
  is_reversal: boolean;
  locked: boolean;
  order_type: OrderLineRow["orderType"];
  subscription_interval: string | null;
}

function toOrderLineRow(l: OrderLineDbRow, storeNameById: Map<string, string>): OrderLineRow {
  return {
    id: l.id,
    corporationId: l.corporation_id,
    storeId: l.store_id,
    storeName: storeNameById.get(l.store_id) ?? "(削除済み店舗)",
    sourceOrderId: l.source_order_id,
    orderNumber: l.order_number,
    orderDate: l.order_date,
    customerName: l.customer_name,
    productName: l.product_name,
    quantity: l.quantity,
    shipmentFlag: l.shipment_flag,
    isManual: l.is_manual,
    isReversal: l.is_reversal,
    locked: l.locked,
    orderType: l.order_type,
    subscriptionIntervalLabel: subscriptionIntervalLabel(l.subscription_interval),
  };
}

export interface LedgerStorePoints {
  storeId: string;
  storeName: string;
  points: number;
}

/**
 * pm-chat-bot側のorders 1件から、本システムの受注明細台帳(gym_order_lines)行を作成する。
 * 既に同じsource_order_idの行が存在する場合は何もしない(Webhookの再送に対する冪等性)。
 */
export async function createOrderLineFromOrder(
  admin: SupabaseClient,
  orderId: string,
  storeId: string,
): Promise<void> {
  const { data: store } = await admin
    .from("gym_stores")
    .select("id, corporation_id")
    .eq("id", storeId)
    .maybeSingle();
  if (!store) return;

  const { data: order } = await admin
    .from("orders")
    .select("id, customer_id, product_id, order_number, quantity, type, created_at")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return;

  const [{ data: customer }, { data: product }, { data: subscription }] = await Promise.all([
    admin.from("customers").select("name").eq("id", order.customer_id).maybeSingle(),
    admin.from("products").select("name").eq("id", order.product_id).maybeSingle(),
    order.type === "subscription"
      ? admin.from("subscriptions").select("interval").eq("order_id", order.id).maybeSingle()
      : Promise.resolve({ data: null as { interval: string } | null }),
  ]);

  await admin
    .from("gym_order_lines")
    .upsert(
      {
        corporation_id: store.corporation_id,
        store_id: store.id,
        source_order_id: order.id,
        order_number: order.order_number,
        order_date: dateJstFromIso(order.created_at),
        customer_name: customer?.name ?? "(不明)",
        product_name: product?.name ?? "(不明)",
        quantity: order.quantity,
        shipment_flag: "not_shipped",
        order_type: order.type,
        subscription_interval: subscription?.interval ?? null,
      },
      { onConflict: "source_order_id", ignoreDuplicates: true },
    );
}

/**
 * pm-chat-bot側でimport_statusが'shipped'に変わった注文を、対応する受注明細行に反映する。
 * 対応する行がまだ存在しない場合(本機能導入前の古い注文など)は先に作成してから反映する。
 */
export async function syncOrderLineShipped(admin: SupabaseClient, orderId: string, storeId: string): Promise<void> {
  const { data: line } = await admin
    .from("gym_order_lines")
    .select("id, locked")
    .eq("source_order_id", orderId)
    .maybeSingle();

  if (!line) {
    await createOrderLineFromOrder(admin, orderId, storeId);
    await admin.from("gym_order_lines").update({ shipment_flag: "shipped" }).eq("source_order_id", orderId);
    return;
  }

  await admin.from("gym_order_lines").update({ shipment_flag: "shipped" }).eq("id", line.id);
}

/**
 * pm-chat-bot側でimport_statusが'canceled'に変わった注文を反映する。
 * ・対象行がまだ月末確定前(unlocked)の場合は、そのままshipment_flagを'canceled'に更新する
 *   (報酬集計対象から自然に除外される)。
 * ・既に月末確定済み(locked)の場合、確定済みの数値は変更せず、現在オープン中の期間に
 *   マイナス受注(返品)行を追加して次回の締めで報酬額を相殺する。
 */
export async function syncOrderLineCanceled(admin: SupabaseClient, orderId: string, storeId: string): Promise<void> {
  const { data: line } = await admin
    .from("gym_order_lines")
    .select("id, corporation_id, store_id, order_number, customer_name, product_name, quantity, locked")
    .eq("source_order_id", orderId)
    .maybeSingle();

  if (!line) {
    await createOrderLineFromOrder(admin, orderId, storeId);
    await admin.from("gym_order_lines").update({ shipment_flag: "canceled" }).eq("source_order_id", orderId);
    return;
  }

  if (!line.locked) {
    await admin.from("gym_order_lines").update({ shipment_flag: "canceled" }).eq("id", line.id);
    return;
  }

  await admin.from("gym_order_lines").insert({
    corporation_id: line.corporation_id,
    store_id: line.store_id,
    source_order_id: null,
    order_number: line.order_number,
    order_date: dateJstFromIso(new Date().toISOString()),
    customer_name: line.customer_name,
    product_name: line.product_name,
    quantity: -line.quantity,
    shipment_flag: "shipped",
    is_reversal: true,
    reversal_of_line_id: line.id,
  });
}

/**
 * 法人・対象月の受注明細一覧(受注明細画面<B>の閲覧・編集モード用)。
 * 出荷フラグにかかわらず、対象月(受注日基準)の全行を返す。
 */
export async function getOrderLinesForCorporationMonth(
  admin: SupabaseClient,
  corporationId: string,
  yearMonth: string,
): Promise<OrderLineRow[]> {
  const { startDate, endDate } = monthDateRangeJst(yearMonth);
  const [{ data: lines }, { data: stores }] = await Promise.all([
    admin
      .from("gym_order_lines")
      .select(ORDER_LINE_COLUMNS)
      .eq("corporation_id", corporationId)
      .gte("order_date", startDate)
      .lt("order_date", endDate)
      .order("order_date"),
    admin.from("gym_stores").select("id, name").eq("corporation_id", corporationId),
  ]);
  const storeNameById = new Map((stores ?? []).map((s) => [s.id, s.name]));

  return (lines ?? []).map((l) => toOrderLineRow(l, storeNameById));
}

/**
 * 法人・対象月の「出荷済」行を店舗別に集計する(月次明細の点数計算のベース)。
 * ロック済み(既に月末確定済み)の行も含める(再計算時に同じ行を再集計するため)。
 */
export async function getShippedPointsByStoreForMonth(
  admin: SupabaseClient,
  corporationId: string,
  yearMonth: string,
): Promise<LedgerStorePoints[]> {
  const { data: stores } = await admin.from("gym_stores").select("id, name").eq("corporation_id", corporationId);
  const storeList = stores ?? [];
  if (storeList.length === 0) return [];

  const { startDate, endDate } = monthDateRangeJst(yearMonth);
  const { data: lines } = await admin
    .from("gym_order_lines")
    .select("store_id, quantity")
    .eq("corporation_id", corporationId)
    .eq("shipment_flag", "shipped")
    .gte("order_date", startDate)
    .lt("order_date", endDate);

  const pointsByStore = new Map<string, number>();
  for (const l of lines ?? []) {
    pointsByStore.set(l.store_id, (pointsByStore.get(l.store_id) ?? 0) + l.quantity);
  }
  return storeList.map((s) => ({ storeId: s.id, storeName: s.name, points: pointsByStore.get(s.id) ?? 0 }));
}

/**
 * 前月以前の受注で、まだ出荷フラグが「未出荷」のまま残っている行を横断的に一覧する
 * (運営側の未出荷エラーチェック機能用)。beforeYearMonth自身は含まない(その月より前が対象)。
 */
export async function getUnshippedLinesBefore(
  admin: SupabaseClient,
  beforeYearMonth: string,
): Promise<OrderLineRow[]> {
  const { startDate } = monthDateRangeJst(beforeYearMonth);
  const [{ data: lines }, { data: stores }] = await Promise.all([
    admin
      .from("gym_order_lines")
      .select(ORDER_LINE_COLUMNS)
      .eq("shipment_flag", "not_shipped")
      .lt("order_date", startDate)
      .order("order_date"),
    admin.from("gym_stores").select("id, name"),
  ]);
  const storeNameById = new Map((stores ?? []).map((s) => [s.id, s.name]));

  return (lines ?? []).map((l) => toOrderLineRow(l, storeNameById));
}

/**
 * 受注日ベースで期間を横断した受注明細一覧(運営側の注文一覧画面で、出荷済に加えて
 * 未出荷・キャンセル等も表示するために使う)。
 */
export async function getOrderLinesInDateRange(
  admin: SupabaseClient,
  startDate: string,
  endDate: string,
): Promise<OrderLineRow[]> {
  const [{ data: lines }, { data: stores }] = await Promise.all([
    admin
      .from("gym_order_lines")
      .select(ORDER_LINE_COLUMNS)
      .gte("order_date", startDate)
      .lt("order_date", endDate)
      .order("order_date"),
    admin.from("gym_stores").select("id, name"),
  ]);
  const storeNameById = new Map((stores ?? []).map((s) => [s.id, s.name]));

  return (lines ?? []).map((l) => toOrderLineRow(l, storeNameById));
}

/** 店舗ごとの累計出荷済点数(全期間)。店舗・クーポン管理タブの「累計販売数」に使う。 */
export async function getLifetimeShippedQuantityByStore(admin: SupabaseClient): Promise<Map<string, number>> {
  const { data: lines } = await admin.from("gym_order_lines").select("store_id, quantity").eq("shipment_flag", "shipped");
  const totals = new Map<string, number>();
  for (const l of lines ?? []) {
    totals.set(l.store_id, (totals.get(l.store_id) ?? 0) + l.quantity);
  }
  return totals;
}
