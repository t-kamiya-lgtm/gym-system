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
 * クーポンコード自体はpm-chat-bot側(チャットシステムの管理画面)で既に発行されている前提で、
 * ここではそのコードを検索して店舗に登録する(店舗への告知・実績引用のための紐付けであり、
 * 本システムから新規にクーポンを発行することはしない)。
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
    .select("id")
    .eq("type", "manual_code")
    .eq("code", couponCode)
    .maybeSingle();

  if (couponError) {
    return NextResponse.json({ error: couponError.message }, { status: 500 });
  }
  if (!coupon) {
    return NextResponse.json(
      { error: "このクーポンコードはチャットシステム側にまだ登録されていません。先にチャットシステム側でクーポンを発行してください。" },
      { status: 400 },
    );
  }

  const { data: existingLink } = await admin
    .from("gym_store_coupons")
    .select("id")
    .eq("coupon_id", coupon.id)
    .maybeSingle();
  if (existingLink) {
    return NextResponse.json({ error: "このクーポンコードは既に別の店舗に登録されています" }, { status: 400 });
  }

  const { data: store, error: storeError } = await admin
    .from("gym_stores")
    .insert({ corporation_id: corporationId, name })
    .select("id")
    .single();

  if (storeError) {
    return NextResponse.json({ error: storeError.message }, { status: 500 });
  }

  const { error: linkError } = await admin
    .from("gym_store_coupons")
    .insert({ store_id: store.id, coupon_id: coupon.id });

  if (linkError) {
    await admin.from("gym_stores").delete().eq("id", store.id);
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  return NextResponse.json({ id: store.id }, { status: 201 });
}
