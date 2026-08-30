import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireOperatorAdmin } from "@/lib/require-operator-role";

const updateSchema = z.object({
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
});

/**
 * 法人側ログインアカウントの管理(メールアドレス変更・有効/停止の切り替え)。
 * ・is_active: 対象法人への紐付け行のみを切り替える(1つのログインが複数法人に紐付く場合、
 *   他法人への紐付けには影響しない)。
 * ・email: Supabase Authのメールアドレス自体を変更したうえで、同じauth_user_idに紐付く
 *   すべての法人向けgym_partner_users行のメールアドレス表示も合わせて更新する
 *   (1つのログインを複数法人で共有しているケースがあるため)。
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireOperatorAdmin();
  if (!check.ok) return check.response;

  const { id } = await params;
  const body = updateSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: partnerUser } = await admin
    .from("gym_partner_users")
    .select("id, auth_user_id")
    .eq("id", id)
    .maybeSingle();
  if (!partnerUser) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (body.data.isActive !== undefined) {
    const { error } = await admin.from("gym_partner_users").update({ is_active: body.data.isActive }).eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (body.data.email !== undefined) {
    const { error: authError } = await admin.auth.admin.updateUserById(partnerUser.auth_user_id, {
      email: body.data.email,
    });
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const { error: syncError } = await admin
      .from("gym_partner_users")
      .update({ email: body.data.email })
      .eq("auth_user_id", partnerUser.auth_user_id);
    if (syncError) {
      return NextResponse.json({ error: syncError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
