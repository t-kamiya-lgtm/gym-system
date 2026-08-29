import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireOperatorAdmin } from "@/lib/require-operator-role";

const schema = z.object({
  shipmentFlag: z.enum(["not_shipped", "shipped", "canceled", "excluded"]),
});

/**
 * 未出荷エラーチェック画面からの、単一行の出荷フラグ変更。
 * まだ月末確定前の行を対象とした簡易な上書きのため、再集計は行わない
 * (数値は月末確定処理の時点で改めて集計される)。
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireOperatorAdmin();
  if (!check.ok) return check.response;

  const { id } = await params;
  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("gym_order_lines")
    .update({ shipment_flag: body.data.shipmentFlag })
    .eq("id", id)
    .eq("locked", false);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
