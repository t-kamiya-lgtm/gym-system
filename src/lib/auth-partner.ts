import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PartnerUser } from "@/lib/types";

/**
 * 法人側(パートナー)ログイン。Supabase Auth のメール+パスワードサインインを使い、
 * gym_partner_users.auth_user_id で紐付ける。運営側(Google Workspace/既存usersテーブル)とは
 * 別の権限モデルとして扱うため、既存usersテーブルは参照しない。
 */
export async function getCurrentPartner(): Promise<PartnerUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("gym_partner_users")
    .select("id, corporation_id, auth_user_id, email, is_active")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (!data || !data.is_active) return null;

  return {
    id: data.id,
    corporationId: data.corporation_id,
    authUserId: data.auth_user_id,
    email: data.email,
    isActive: data.is_active,
  };
}
