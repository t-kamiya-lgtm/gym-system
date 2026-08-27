import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCorporationStatement } from "@/lib/statements";
import { currentYearMonthJst } from "@/lib/rewards";
import { CreateStoreForm } from "@/components/admin/CreateStoreForm";
import { CreatePartnerUserForm } from "@/components/admin/CreatePartnerUserForm";
import { AddAdjustmentForm } from "@/components/admin/AddAdjustmentForm";

export default async function CorporationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ym?: string }>;
}) {
  const { id } = await params;
  const { ym } = await searchParams;
  const yearMonth = ym ?? currentYearMonthJst();
  const admin = createSupabaseAdminClient();

  const { data: corporation } = await admin
    .from("gym_corporations")
    .select("id, name, invoice_registered, invoice_registration_number")
    .eq("id", id)
    .maybeSingle();
  if (!corporation) notFound();

  const { data: stores } = await admin
    .from("gym_stores")
    .select("id, name")
    .eq("corporation_id", id);

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

  const statement = await getCorporationStatement(admin, id, yearMonth);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{corporation.name}</h1>
        <p className="text-sm text-neutral-500">
          インボイス: {corporation.invoice_registered ? `対象(${corporation.invoice_registration_number})` : "非対象"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card overflow-x-auto">
          <h2 className="mb-3 font-medium">店舗一覧・クーポンコード</h2>
          <table className="w-full min-w-[400px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-2">店舗名</th>
                <th className="py-2">クーポンコード</th>
                <th className="py-2">当月点数</th>
              </tr>
            </thead>
            <tbody>
              {(stores ?? []).map((s) => {
                const storeStatement = statement.stores.find((st) => st.storeId === s.id);
                const couponId = couponIdByStoreId.get(s.id);
                const code = couponId ? codeByCouponId.get(couponId) : null;
                return (
                  <tr key={s.id} className="border-b border-neutral-100">
                    <td className="py-2">{s.name}</td>
                    <td className="py-2 font-mono">{code ?? "-"}</td>
                    <td className="py-2">{storeStatement?.points ?? 0} 点</td>
                  </tr>
                );
              })}
              {(stores ?? []).length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-neutral-400">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card space-y-2">
          <h2 className="font-medium">月次明細({yearMonth})</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-neutral-500">合計点数</dt>
            <dd>{statement.totalPoints.toLocaleString()} 点</dd>
            <dt className="text-neutral-500">単価</dt>
            <dd>¥{statement.unitPrice.toLocaleString()}</dd>
            <dt className="text-neutral-500">基本報酬額</dt>
            <dd>¥{statement.baseAmount.toLocaleString()}</dd>
            <dt className="text-neutral-500">手動調整合計</dt>
            <dd>¥{statement.adjustmentTotal.toLocaleString()}</dd>
            <dt className="font-medium text-neutral-700">最終報酬額</dt>
            <dd className="font-medium">¥{statement.finalAmount.toLocaleString()}</dd>
            <dt className="text-neutral-500">同意状況</dt>
            <dd>{statement.status === "agreed" ? `同意済(${statement.agreedAt})` : "未同意"}</dd>
          </dl>
        </div>
        <AddAdjustmentForm
          corporationId={id}
          yearMonth={yearMonth}
          stores={(stores ?? []).map((s) => ({ id: s.id, name: s.name }))}
        />
      </div>
    </div>
  );
}
