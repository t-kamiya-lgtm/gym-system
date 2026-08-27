import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireOperatorAdmin } from "@/lib/require-operator-role";

const createSchema = z.object({
  corporationId: z.string().uuid(),
  storeId: z.string().uuid().nullable(),
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.number().int().refine((v) => v !== 0, "0円の調整はできません"),
  reason: z.string().min(1),
});

/**
 * 明細確定後のキャンセル反映漏れ・計算エラー等を吸収するための手動加算/減算(決定事項)。
 * 支払い明細の同意はロックではなくトリガーのため、同意後でもこの調整を追加できる。
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
  return NextResponse.json({ ok: true }, { status: 201 });
}
