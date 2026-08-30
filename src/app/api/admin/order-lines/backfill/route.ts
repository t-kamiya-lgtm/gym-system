import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireOperatorAdmin } from "@/lib/require-operator-role";
import { backfillOrderLines } from "@/lib/order-lines";

/**
 * 受注明細台帳の再同期(リカバリ用)。Webhook配信の失敗等で反映されていない過去の注文を
 * まとめて取り込む。既に取り込み済みの注文はスキップされる(何度実行しても安全)。
 */
export async function POST() {
  const check = await requireOperatorAdmin();
  if (!check.ok) return check.response;

  const admin = createSupabaseAdminClient();
  const result = await backfillOrderLines(admin);
  return NextResponse.json(result);
}
