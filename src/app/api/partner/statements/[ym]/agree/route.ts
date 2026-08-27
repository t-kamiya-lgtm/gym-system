import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePartner } from "@/lib/require-partner-role";

/**
 * 支払い明細への同意。同意は支払い実行のトリガーとして記録するが、
 * ロックではないため同意後も点数・金額は都度再計算される(手動調整で補正)。
 */
export async function POST(request: Request, { params }: { params: Promise<{ ym: string }> }) {
  const check = await requirePartner();
  if (!check.ok) return check.response;

  const { ym } = await params;
  if (!/^\d{4}-\d{2}$/.test(ym)) {
    return NextResponse.json({ error: "invalid year_month" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("gym_monthly_statements").upsert(
    {
      corporation_id: check.partner.corporationId,
      year_month: `${ym}-01`,
      status: "agreed",
      agreed_at: new Date().toISOString(),
      agreed_by: check.partner.id,
    },
    { onConflict: "corporation_id,year_month" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
