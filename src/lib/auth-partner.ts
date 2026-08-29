import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PartnerUser } from "@/lib/types";

export const ACTIVE_CORP_COOKIE = "gym_active_corp_id";

/**
 * 法人側(パートナー)ログイン。Supabase Auth のメール+パスワードサインインを使い、
 * gym_partner_users.auth_user_id で紐付ける。運営側(Google Workspace/既存usersテーブル)とは
 * 別の権限モデルとして扱うため、既存usersテーブルは参照しない。
 *
 * 1つのログイン(同じauth_user_id)が複数の法人に紐付くケースがある
 * (例: ある法人の代表者が、個人のフランチャイズ店舗を別法人として持つ場合)。
 * そのためログイン中のユーザーが所属する法人は複数になり得る。
 */
export async function getPartnerMemberships(): Promise<PartnerUser[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return [];

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("gym_partner_users")
    .select("id, corporation_id, auth_user_id, email, is_active")
    .eq("auth_user_id", authUser.id)
    .eq("is_active", true);

  return (data ?? []).map((row) => ({
    id: row.id,
    corporationId: row.corporation_id,
    authUserId: row.auth_user_id,
    email: row.email,
    isActive: row.is_active,
  }));
}

/**
 * 現在アクティブな(=画面に表示中の)法人としてのパートナー情報。
 * 複数法人に所属する場合、cookieで選択された法人を優先し、未選択/該当なしの場合は先頭を使う。
 */
export async function getCurrentPartner(): Promise<PartnerUser | null> {
  const memberships = await getPartnerMemberships();
  if (memberships.length === 0) return null;

  const cookieStore = await cookies();
  const activeCorporationId = cookieStore.get(ACTIVE_CORP_COOKIE)?.value;
  return memberships.find((m) => m.corporationId === activeCorporationId) ?? memberships[0];
}
