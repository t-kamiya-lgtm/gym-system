import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireOperatorAdmin } from "@/lib/require-operator-role";

const createSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "staff"]),
});

/**
 * 運営側(社内)ユーザーの招待登録。pm-chat-bot側と共有する既存usersテーブルに
 * auth_user_id未設定のレコードを追加するだけで、実際のログインはGoogle Workspace認証の
 * 初回ログイン時にauth_user_idが自動的に紐付く(招待制)。
 */
export async function POST(request: Request) {
  const check = await requireOperatorAdmin();
  if (!check.ok) return check.response;

  const body = createSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }
  const { email, role } = body.data;

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("users").insert({ email, role });

  if (error) {
    const message = /duplicate|unique/i.test(error.message)
      ? "このメールアドレスは既に登録されています"
      : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
