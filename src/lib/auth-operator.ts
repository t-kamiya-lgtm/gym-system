import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { OperatorUser } from "@/lib/types";

/**
 * 運営側(社内)ログインは、pm-chat-bot側の既存usersテーブル(Google Workspace認証、
 * admin/staffロール)をそのまま共有する。同じ会社の社内スタッフが両システムを
 * 運用する想定のため、アカウントを二重管理しない。
 * 招待制: 既存usersテーブルに事前登録されたメールアドレスのみログインできる
 * (このシステム側からの新規admin作成は行わない)。
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
  const { data } = await admin
    .from("users")
    .select("id, auth_user_id, email, role")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (!data || (data.role !== "admin" && data.role !== "staff")) return null;

  return {
    id: data.id,
    authUserId: data.auth_user_id,
    email: data.email,
    role: data.role,
  };
}

export async function requireOperator(): Promise<OperatorUser | null> {
  return getCurrentOperator();
}
