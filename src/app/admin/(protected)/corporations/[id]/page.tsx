import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStorePointsForCorporation } from "@/lib/points";
import { currentYearMonthJst } from "@/lib/rewards";
import { managementCode } from "@/lib/types";
import { CreateStoreForm } from "@/components/admin/CreateStoreForm";
import { CreatePartnerUserForm } from "@/components/admin/CreatePartnerUserForm";
import { EditCorporationForm } from "@/components/admin/EditCorporationForm";

export default async function CorporationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yearMonth = currentYearMonthJst();
  const admin = createSupabaseAdminClient();

  const { data: corporation } = await admin
    .from("gym_corporations")
    .select(
      "id, corp_no, name, invoice_registered, invoice_registration_number, address, tel, hp_url, contact_name, contact_tel, contact_email, bank_name, bank_branch_name, bank_account_type, bank_account_number, bank_account_holder",
    )
    .eq("id", id)
    .maybeSingle();
  if (!corporation) notFound();

  const { data: stores } = await admin
    .from("gym_stores")
    .select("id, name, store_no")
    .eq("corporation_id", id)
    .order("store_no");

  const storeIds = (stores ?? []).map((s) => s.id);
  const { data: storeCoupons } = storeIds.length
    ? await admin.from("gym_store_coupons").select("store_id, coupon_id").in("store_id", storeIds)
    : { data: [] as { store_id: string; coupon_id: string }[] };
  const couponIds = (storeCoupons ?? []).map((sc) => sc.coupon_id);
  const { data: couponRows } = couponIds.length
    ? await admin.from("coupons").select("id, code").in("id", couponIds)
    : { data: [] as { id: string; code: string | null }[] };
  const codeByCouponId = new Map((couponRows ?? []).map((c) => [c.id, c.code]));
  const couponIdByStoreId = new Map((storeCoupons ?? []).map((sc) => [sc.store_id, sc.coupon_id]));

  const { data: partnerUsers } = await admin
    .from("gym_partner_users")
    .select("id, email, is_active")
    .eq("corporation_id", id);

  const { stores: storePoints } = await getStorePointsForCorporation(admin, id, yearMonth);
  const pointsByStoreId = new Map(storePoints.map((s) => [s.storeId, s.points]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">
            <span className="mr-2 font-mono text-neutral-400">{managementCode(corporation.corp_no)}</span>
            {corporation.name}
          </h1>
          <p className="text-sm text-neutral-500">
            店舗数: {(stores ?? []).length}店舗 ・ インボイス:{" "}
            {corporation.invoice_registered ? `対象(${corporation.invoice_registration_number})` : "非対象"}
          </p>
          {(corporation.address || corporation.tel || corporation.hp_url) && (
            <p className="mt-1 text-xs text-neutral-400">
              {corporation.address}
              {corporation.tel && <> ・ TEL: {corporation.tel}</>}
              {corporation.hp_url && <> ・ {corporation.hp_url}</>}
            </p>
          )}
          {(corporation.contact_name || corporation.contact_tel || corporation.contact_email) && (
            <p className="mt-1 text-xs text-neutral-400">
              担当者: {corporation.contact_name}
              {corporation.contact_tel && <> ・ TEL: {corporation.contact_tel}</>}
              {corporation.contact_email && <> ・ {corporation.contact_email}</>}
            </p>
          )}
        </div>
        <Link href={`/admin/corporations/${id}/statement`} className="btn-primary text-sm">
          月次明細を見る
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <EditCorporationForm
          corporationId={id}
          initial={{
            name: corporation.name,
            invoiceRegistered: corporation.invoice_registered,
            invoiceRegistrationNumber: corporation.invoice_registration_number,
            address: corporation.address,
            tel: corporation.tel,
            hpUrl: corporation.hp_url,
            contactName: corporation.contact_name,
            contactTel: corporation.contact_tel,
            contactEmail: corporation.contact_email,
            bankName: corporation.bank_name,
            bankBranchName: corporation.bank_branch_name,
            bankAccountType: corporation.bank_account_type,
            bankAccountNumber: corporation.bank_account_number,
            bankAccountHolder: corporation.bank_account_holder,
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card overflow-x-auto">
          <h2 className="mb-3 font-medium">店舗一覧・クーポンコード</h2>
          <table className="w-full min-w-[440px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-2">店舗No</th>
                <th className="py-2">店舗名</th>
                <th className="py-2">クーポンコード</th>
                <th className="py-2">当月点数</th>
              </tr>
            </thead>
            <tbody>
              {(stores ?? []).map((s) => {
                const couponId = couponIdByStoreId.get(s.id);
                const code = couponId ? codeByCouponId.get(couponId) : null;
                return (
                  <tr key={s.id} className="border-b border-neutral-100">
                    <td className="py-2 font-mono">{managementCode(corporation.corp_no, s.store_no)}</td>
                    <td className="py-2">{s.name}</td>
                    <td className="py-2 font-mono">{code ?? "-"}</td>
                    <td className="py-2">{pointsByStoreId.get(s.id) ?? 0} 点</td>
                  </tr>
                );
              })}
              {(stores ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-neutral-400">
                    店舗が登録されていません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <CreateStoreForm corporationId={id} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-medium">法人側ログインアカウント</h2>
          <ul className="space-y-1 text-sm">
            {(partnerUsers ?? []).map((u) => (
              <li key={u.id} className="flex items-center justify-between">
                <span>{u.email}</span>
                <span className={u.is_active ? "text-green-700" : "text-neutral-400"}>
                  {u.is_active ? "有効" : "無効"}
                </span>
              </li>
            ))}
            {(partnerUsers ?? []).length === 0 && <li className="text-neutral-400">未発行</li>}
          </ul>
        </div>
        <CreatePartnerUserForm corporationId={id} />
      </div>
    </div>
  );
}
