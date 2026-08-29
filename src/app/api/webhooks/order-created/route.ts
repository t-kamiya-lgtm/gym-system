import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendNewOrderNotification } from "@/lib/email";

/**
 * Supabaseの gym_order_notify トリガー(0003マイグレーション)から呼ばれる。
 * 新規注文が入った店舗・法人に登録された通知先メールへ「〇〇様の注文が入りました」を送る。
 */
export async function POST(request: Request) {
  const secret = request.headers.get("x-webhook-secret");
  if (!process.env.GYM_ORDER_WEBHOOK_SECRET || secret !== process.env.GYM_ORDER_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { order_id?: string; store_id?: string };
  if (!body.order_id || !body.store_id) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("customer_id")
    .eq("id", body.order_id)
    .maybeSingle();
  if (!order) return NextResponse.json({ ok: true });

  const [{ data: customer }, { data: store }] = await Promise.all([
    admin.from("customers").select("name").eq("id", order.customer_id).maybeSingle(),
    admin.from("gym_stores").select("name, corporation_id").eq("id", body.store_id).maybeSingle(),
  ]);
  if (!store) return NextResponse.json({ ok: true });

  const [{ data: storeEmails }, { data: corpEmails }] = await Promise.all([
    admin.from("gym_notification_emails").select("email").eq("store_id", body.store_id),
    admin.from("gym_notification_emails").select("email").eq("corporation_id", store.corporation_id),
  ]);

  const to = [...(storeEmails ?? []), ...(corpEmails ?? [])].map((e) => e.email);
  if (to.length === 0) return NextResponse.json({ ok: true });

  await sendNewOrderNotification({
    to,
    customerName: customer?.name ?? "(不明)",
    storeName: store.name,
  });

  return NextResponse.json({ ok: true });
}
