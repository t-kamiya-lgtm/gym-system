import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { managementCode } from "@/lib/types";
import { getLifetimeShippedQuantityByStore } from "@/lib/order-lines";
import { CreateCorporationForm } from "@/components/admin/CreateCorporationForm";
import { StorePrefectureSelect } from "@/components/admin/StorePrefectureSelect";

const TABS = [
  { key: "corporations", label: "法人管理" },
  { key: "stores", label: "店舗・クーポン管理" },
] as const;

async function CorporationsTab({ admin }: { admin: SupabaseClient }) {
  const { data: corporations } = await admin
    .from("gym_corporations")
    .select("id, corp_no, name, invoice_registered, created_at")
    .order("created_at", { ascending: false });

  const { data: stores } = await admin.from("gym_stores").select("id, corporation_id");
  const storeCountByCorp = new Map<string, number>();
  for (const s of stores ?? []) {
    storeCountByCorp.set(s.corporation_id, (storeCountByCorp.get(s.corporation_id) ?? 0) + 1);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-2">法人No</th>
                <th className="py-2">法人名</th>
                <th className="py-2">店舗数</th>
                <th className="py-2">インボイス</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {(corporations ?? []).map((c) => (
                <tr key={c.id} className="border-b border-neutral-100">
                  <td className="py-2 font-mono">{managementCode(c.corp_no)}</td>
                  <td className="py-2">{c.name}</td>
                  <td className="py-2">{storeCountByCorp.get(c.id) ?? 0}</td>
                  <td className="py-2">{c.invoice_registered ? "対象" : "非対象"}</td>
                  <td className="py-2">
                    <Link href={`/admin/corporations/${c.id}`} className="text-blue-600 hover:underline">
                      詳細・店舗管理
                    </Link>
                  </td>
                </tr>
              ))}
              {(corporations ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-neutral-400">
                    登録された法人がありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <CreateCorporationForm />
      </div>
    </div>
  );
}

async function StoresTab({ admin }: { admin: SupabaseClient }) {
  const [{ data: stores }, { data: corporations }, { data: storeCoupons }, lifetimeByStore] = await Promise.all([
    admin
      .from("gym_stores")
      .select("id, name, store_no, corporation_id, prefecture")
      .order("corporation_id")
      .order("store_no"),
    admin.from("gym_corporations").select("id, name, corp_no"),
    admin.from("gym_store_coupons").select("store_id, coupon_id"),
    getLifetimeShippedQuantityByStore(admin),
  ]);

  const corpById = new Map((corporations ?? []).map((c) => [c.id, c]));
  const couponIdByStoreId = new Map((storeCoupons ?? []).map((sc) => [sc.store_id, sc.coupon_id]));
  const couponIds = Array.from(couponIdByStoreId.values());
  const { data: couponRows } = couponIds.length
    ? await admin.from("coupons").select("id, code").in("id", couponIds)
    : { data: [] as { id: string; code: string | null }[] };
  const codeByCouponId = new Map((couponRows ?? []).map((c) => [c.id, c.code]));

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2">法人店舗cd</th>
            <th className="py-2">法人名</th>
            <th className="py-2">店舗名</th>
            <th className="py-2">都道府県</th>
            <th className="py-2">クーポンコード</th>
            <th className="py-2 text-right">累計販売数</th>
          </tr>
        </thead>
        <tbody>
          {(stores ?? []).map((s) => {
            const corp = corpById.get(s.corporation_id);
            const couponId = couponIdByStoreId.get(s.id);
            const code = couponId ? codeByCouponId.get(couponId) : null;
            return (
              <tr key={s.id} className="border-b border-neutral-100">
                <td className="py-2 font-mono">{managementCode(corp?.corp_no ?? 0, s.store_no)}</td>
                <td className="py-2">{corp?.name ?? "(削除済み法人)"}</td>
                <td className="py-2">{s.name}</td>
                <td className="py-2">
                  <StorePrefectureSelect storeId={s.id} value={s.prefecture} />
                </td>
                <td className="py-2 font-mono">{code ?? "-"}</td>
                <td className="py-2 text-right">{(lifetimeByStore.get(s.id) ?? 0).toLocaleString()} 点</td>
              </tr>
            );
          })}
          {(stores ?? []).length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-neutral-400">
                店舗が登録されていません
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default async function CorporationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab = tabParam === "stores" ? "stores" : "corporations";
  const admin = createSupabaseAdminClient();

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">法人・店舗管理</h1>

      <div className="flex gap-1 border-b border-neutral-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "corporations" ? "/admin/corporations" : "/admin/corporations?tab=stores"}
            className={`px-3 py-2 text-sm ${
              tab === t.key ? "border-b-2 border-neutral-900 font-medium" : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "corporations" ? <CorporationsTab admin={admin} /> : <StoresTab admin={admin} />}
    </div>
  );
}
