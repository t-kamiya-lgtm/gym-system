import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncOrderLineShipped } from "@/lib/order-lines";
import { verifyOrderWebhookSecret } from "@/lib/order-webhook-auth";

/**
 * Supabaseの gym_order_shipped_sync トリガー(0009マイグレーション)から呼ばれる。
 * pm-chat-bot側のimport_statusが'shipped'に変わったタイミングで、対応する受注明細行
 * (gym_order_lines)の出荷フラグを「出荷済」に同期する。
 */
export async function POST(request: Request) {
  if (!verifyOrderWebhookSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { order_id?: string; store_id?: string };
  if (!body.order_id || !body.store_id) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  await syncOrderLineShipped(createSupabaseAdminClient(), body.order_id, body.store_id);

  return NextResponse.json({ ok: true });
}
