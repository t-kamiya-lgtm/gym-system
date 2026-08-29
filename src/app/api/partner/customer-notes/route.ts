import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePartner } from "@/lib/require-partner-role";

const schema = z.object({
  storeId: z.string().uuid(),
  customerId: z.string().uuid(),
  memo1: z.string().max(500).nullable(),
  memo2: z.string().max(500).nullable(),
});

/** 会員別実績画面の、店舗担当インストラクター名・会員番号等の自由メモ(店舗単位)。 */
export async function POST(request: Request) {
  const check = await requirePartner();
  if (!check.ok) return check.response;

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }
  const { storeId, customerId, memo1, memo2 } = body.data;

  const admin = createSupabaseAdminClient();
  const { data: store } = await admin.from("gym_stores").select("corporation_id").eq("id", storeId).maybeSingle();
  if (!store || store.corporation_id !== check.partner.corporationId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { error } = await admin.from("gym_customer_notes").upsert(
    {
      store_id: storeId,
      customer_id: customerId,
      memo1,
      memo2,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "store_id,customer_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
