import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireOperatorAdmin } from "@/lib/require-operator-role";
import { reopenStatement } from "@/lib/statements";

/**
 * 問い合わせ対応完了。運営側で確認・修正したうえで、対象法人・対象月の明細のフラグを
 * 解除する(同意状況をclosedへ戻し、パートナー側の再確認・再同意を促す)。
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireOperatorAdmin();
  if (!check.ok) return check.response;

  const { id } = await params;
  const admin = createSupabaseAdminClient();

  const { data: inquiry } = await admin
    .from("gym_statement_inquiries")
    .select("id, corporation_id, year_month")
    .eq("id", id)
    .maybeSingle();
  if (!inquiry) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const yearMonth = String(inquiry.year_month).slice(0, 7);
  await reopenStatement(admin, inquiry.corporation_id, yearMonth);

  const { error } = await admin
    .from("gym_statement_inquiries")
    .update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: check.operator.email })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
