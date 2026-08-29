import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireOperatorAdmin } from "@/lib/require-operator-role";
import { closeMonthForCorporation } from "@/lib/statements";

const createSchema = z.object({
  corporationId: z.string().uuid(),
  storeId: z.string().uuid().nullable(),
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.number().int().refine((v) => v !== 0, "0円の調整はできません"),
  reason: z.string().min(1),
});

/**
 * 明細確定後のキャンセル反映漏れ・計算エラー等を吸収するための手動加算/減算(決定事項)。
 * 月次確認(同意)後の修正は運営側管理画面からのみ行う。調整の追加と同時に明細を再集計し、
 * 同意済みだった場合はclosed(未承認)に戻して法人側の再同意を必要とする。
 */
export async function POST(request: Request) {
  const check = await requireOperatorAdmin();
  if (!check.ok) return check.response;

  const body = createSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }
  const { corporationId, storeId, yearMonth, amount, reason } = body.data;

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("gym_statement_adjustments").insert({
    corporation_id: corporationId,
    store_id: storeId,
    year_month: `${yearMonth}-01`,
    amount,
    reason,
    created_by: check.operator.email,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await closeMonthForCorporation(admin, corporationId, yearMonth, check.operator.email);
  return NextResponse.json({ ok: true }, { status: 201 });
}
