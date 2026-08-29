import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireOperatorAdmin } from "@/lib/require-operator-role";
import { reopenStatement } from "@/lib/statements";

const schema = z.object({
  corporationId: z.string().uuid(),
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
});

/**
 * 運営側による同意済み明細のロック解除。修正(手動調整の追加等)は
 * このAPIでdraftに戻した上で行う。戻すと法人側は再度同意が必要になる。
 */
export async function POST(request: Request) {
  const check = await requireOperatorAdmin();
  if (!check.ok) return check.response;

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  await reopenStatement(admin, body.data.corporationId, body.data.yearMonth);
  return NextResponse.json({ ok: true });
}
