import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireOperatorAdmin } from "@/lib/require-operator-role";

const createSchema = z.object({
  corporationId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(8),
});

/** 法人側ログインアカウントの発行は弊社管理者(admin)のみ。Supabase Authにemail+passwordユーザーを作成する。 */
export async function POST(request: Request) {
  const check = await requireOperatorAdmin();
  if (!check.ok) return check.response;

  const body = createSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }
  const { corporationId, email, password } = body.data;
  const admin = createSupabaseAdminClient();

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError || !authUser.user) {
    return NextResponse.json({ error: authError?.message ?? "failed to create auth user" }, { status: 400 });
  }

  const { error: insertError } = await admin.from("gym_partner_users").insert({
    corporation_id: corporationId,
    auth_user_id: authUser.user.id,
    email,
    is_active: true,
  });

  if (insertError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    const message = insertError.message.includes("gym_partner_users_email_key")
      ? "このメールアドレスは既に登録されています"
      : insertError.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
