import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireOperatorAdmin } from "@/lib/require-operator-role";
import { closeMonthForCorporation, bulkCloseMonth } from "@/lib/statements";

const schema = z.object({
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
  corporationId: z.string().uuid().optional(),
});

/**
 * 運営側の月末確定処理。corporationId指定時はその法人のみ(初回確定・再集計の両方に使う)、
 * 未指定時はまだ未確定の法人すべてを対象に一括確定する。
 */
export async function POST(request: Request) {
  const check = await requireOperatorAdmin();
  if (!check.ok) return check.response;

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }
  const { yearMonth, corporationId } = body.data;

  const admin = createSupabaseAdminClient();
  if (corporationId) {
    await closeMonthForCorporation(admin, corporationId, yearMonth, check.operator.email);
    return NextResponse.json({ ok: true });
  }

  const result = await bulkCloseMonth(admin, yearMonth, check.operator.email);
  return NextResponse.json({ ok: true, closedCount: result.closedCorporationIds.length });
}
