import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireOperator } from "@/lib/require-operator-role";

const createSchema = z.object({
  corporationId: z.string().uuid(),
  name: z.string().min(1),
  couponCode: z.string().min(1),
});

/**
 * 店舗の新規登録・追加登録は常に弊社管理者のみが行う(決定事項)。
 * 登録と同時に、既存coupons(type='manual_code')へ店舗専用コードを発行し、
 * gym_store_couponsで1:1に紐付ける。
 * このクーポンは値引きではなく受注の店舗識別が目的のため、discount_valueは
 * 制約上必須の最小値(1円)を設定する(価格自体は商品側のlist_price/first_time_priceで構成する)。
 */
export async function POST(request: Request) {
  const check = await requireOperator();
  if (!check.ok) return check.response;

  const body = createSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }
  const { corporationId, name, couponCode } = body.data;
  const admin = createSupabaseAdminClient();

  const { data: coupon, error: couponError } = await admin
    .from("coupons")
    .insert({
      type: "manual_code",
      code: couponCode,
      name: `${name} 店舗コード`,
      discount_type: "fixed",
      discount_value: 1,
      is_active: true,
    })
    .select("id")
    .single();

  if (couponError) {
    const message = couponError.message.includes("coupons_code_key")
      ? "このクーポンコードは既に使用されています"
      : couponError.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { data: store, error: storeError } = await admin
    .from("gym_stores")
    .insert({ corporation_id: corporationId, name })
    .select("id")
    .single();

  if (storeError) {
    await admin.from("coupons").delete().eq("id", coupon.id);
    return NextResponse.json({ error: storeError.message }, { status: 500 });
  }

  const { error: linkError } = await admin
    .from("gym_store_coupons")
    .insert({ store_id: store.id, coupon_id: coupon.id });

  if (linkError) {
    await admin.from("gym_stores").delete().eq("id", store.id);
    await admin.from("coupons").delete().eq("id", coupon.id);
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  return NextResponse.json({ id: store.id }, { status: 201 });
}
