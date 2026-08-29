import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireOperatorAdmin } from "@/lib/require-operator-role";

const createSchema = z.object({
  corporationId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(8),
});

/**
 * 法人側ログインアカウントの発行は弊社管理者(admin)のみ。
 * 同じメールアドレスが既に別法人でログインアカウントを持っている場合(例: ある法人の代表者が
 * 個人のフランチャイズ店舗を別法人として持つケース)は、新規にSupabase Authユーザーを
 * 作らず、既存の認証情報にこの法人を追加で紐付ける(パスワードは既存のものがそのまま使われる)。
 */
export async function POST(request: Request) {
  const check = await requireOperatorAdmin();
  if (!check.ok) return check.response;

  const body = createSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }
  const { corporationId, email, password } = body.data;
  const admin = createSupabaseAdminClient();

  const { data: existingLink } = await admin
    .from("gym_partner_users")
    .select("id")
    .eq("corporation_id", corporationId)
    .eq("email", email)
    .maybeSingle();
  if (existingLink) {
    return NextResponse.json({ error: "このメールアドレスは既にこの法人に登録されています" }, { status: 400 });
  }

  let authUserId: string;
  let reusedExistingAccount = false;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (created?.user) {
    authUserId = created.user.id;
  } else if (createError && /already been registered|already exists/i.test(createError.message)) {
    const { data: listed, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }
    const existingAuthUser = listed.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!existingAuthUser) {
      return NextResponse.json({ error: "既存アカウントの検索に失敗しました" }, { status: 500 });
    }
    authUserId = existingAuthUser.id;
    reusedExistingAccount = true;
  } else {
    return NextResponse.json({ error: createError?.message ?? "failed to create auth user" }, { status: 400 });
  }

  const { error: insertError } = await admin.from("gym_partner_users").insert({
    corporation_id: corporationId,
    auth_user_id: authUserId,
    email,
    is_active: true,
  });

  if (insertError) {
    if (!reusedExistingAccount) {
      await admin.auth.admin.deleteUser(authUserId);
    }
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, reusedExistingAccount }, { status: 201 });
}
