import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { OperatorUser } from "@/lib/types";

function toOperatorUser(row: { id: string; auth_user_id: string | null; email: string; role: string }): OperatorUser {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    email: row.email,
    role: row.role as OperatorUser["role"],
  };
}

/**
 * 運営側(社内)ログインは、pm-chat-bot側の既存usersテーブル(Google Workspace認証、
 * admin/staffロール)をそのまま共有する。同じ会社の社内スタッフが両システムを
 * 運用する想定のため、アカウントを二重管理しない。
 * 招待制: 既存usersテーブルに事前登録されたメールアドレスのみログインできる
 * (このシステム側からの新規admin作成は行わない)。
 * 初回ログイン時に、招待済み(auth_user_idが未設定)のレコードへ現在のGoogleアカウントの
 * auth_user_idを紐付ける(pm-chat-bot側のgetCurrentAppUserと同じ挙動)。
 */
export async function getCurrentOperator(): Promise<OperatorUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) return null;

  const allowedDomain = process.env.ADMIN_ALLOWED_GOOGLE_DOMAIN;
  if (allowedDomain && !authUser.email.endsWith(`@${allowedDomain}`)) {
    return null;
  }

  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("users")
    .select("id, auth_user_id, email, role")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (existing) {
    return existing.role === "admin" || existing.role === "staff" ? toOperatorUser(existing) : null;
  }

  const { data: invited } = await admin
    .from("users")
    .update({ auth_user_id: authUser.id })
    .eq("email", authUser.email)
    .is("auth_user_id", null)
    .select("id, auth_user_id, email, role")
    .maybeSingle();

  if (!invited) return null;
  return invited.role === "admin" || invited.role === "staff" ? toOperatorUser(invited) : null;
}

export async function requireOperator(): Promise<OperatorUser | null> {
  return getCurrentOperator();
}
