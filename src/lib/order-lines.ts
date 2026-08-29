import type { SupabaseClient } from "@supabase/supabase-js";
import { dateJstFromIso } from "@/lib/date-range";

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
    .select("id, customer_id, product_id, order_number, quantity, created_at")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return;

  const [{ data: customer }, { data: product }] = await Promise.all([
    admin.from("customers").select("name").eq("id", order.customer_id).maybeSingle(),
    admin.from("products").select("name").eq("id", order.product_id).maybeSingle(),
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
