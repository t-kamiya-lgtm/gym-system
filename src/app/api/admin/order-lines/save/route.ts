import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireOperatorAdmin } from "@/lib/require-operator-role";
import { closeMonthForCorporation } from "@/lib/statements";
import { dateJstFromIso } from "@/lib/date-range";

const flagEnum = z.enum(["not_shipped", "shipped", "canceled", "excluded"]);

const schema = z.object({
  corporationId: z.string().uuid(),
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
  updates: z.array(
    z.object({
      id: z.string().uuid(),
      quantity: z.number().int(),
      shipmentFlag: flagEnum,
    }),
  ),
  newLines: z.array(
    z.object({
      storeId: z.string().uuid(),
      orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      orderNumber: z.string().optional(),
      customerName: z.string().optional(),
      productName: z.string().min(1),
      quantity: z.number().int(),
      shipmentFlag: flagEnum,
    }),
  ),
});

/**
 * 受注明細画面<B>のセル編集モードからの一括保存。行の点数・出荷フラグ更新と手動行の追加を
 * まとめて反映したあと、既に月末確定済みの月であれば再集計する(未確定の月への編集は
 * 再集計しない = パートナーへの確定通知を誤って送らないようにするため)。
 */
export async function POST(request: Request) {
  const check = await requireOperatorAdmin();
  if (!check.ok) return check.response;

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }
  const { corporationId, yearMonth, updates, newLines } = body.data;

  const admin = createSupabaseAdminClient();

  for (const u of updates) {
    const { error } = await admin
      .from("gym_order_lines")
      .update({ quantity: u.quantity, shipment_flag: u.shipmentFlag, flag_overridden_by_operator: true })
      .eq("id", u.id)
      .eq("corporation_id", corporationId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (newLines.length > 0) {
    const { error } = await admin.from("gym_order_lines").insert(
      newLines.map((line) => ({
        corporation_id: corporationId,
        store_id: line.storeId,
        order_number: line.orderNumber || null,
        order_date: line.orderDate || dateJstFromIso(new Date().toISOString()),
        customer_name: line.customerName || "",
        product_name: line.productName,
        quantity: line.quantity,
        shipment_flag: line.shipmentFlag,
        is_manual: true,
        flag_overridden_by_operator: true,
        created_by: check.operator.email,
      })),
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const { data: existingStatement } = await admin
    .from("gym_monthly_statements")
    .select("id")
    .eq("corporation_id", corporationId)
    .eq("year_month", `${yearMonth}-01`)
    .maybeSingle();

  if (existingStatement) {
    await closeMonthForCorporation(admin, corporationId, yearMonth, check.operator.email);
  }

  return NextResponse.json({ ok: true });
}
