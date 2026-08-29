import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePartner } from "@/lib/require-partner-role";
import { agreeToStatement } from "@/lib/statements";

/**
 * 支払い明細への同意。同意した時点のライブ計算結果をスナップショットとして固定(ロック)する。
 * ロック後の修正は運営側管理画面からのみ行い、修正されると再度同意が必要になる。
 */
export async function POST(request: Request, { params }: { params: Promise<{ ym: string }> }) {
  const check = await requirePartner();
  if (!check.ok) return check.response;

  const { ym } = await params;
  if (!/^\d{4}-\d{2}$/.test(ym)) {
    return NextResponse.json({ error: "invalid year_month" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  try {
    await agreeToStatement(admin, check.partner.corporationId, ym, check.partner.id);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
