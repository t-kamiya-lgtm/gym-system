import Link from "next/link";
import { getCurrentPartner } from "@/lib/auth-partner";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStorePointsForCorporationInRange, getActiveSubscriberCountsByStore } from "@/lib/points";
import { unitPriceForPoints } from "@/lib/rewards";
import { defaultRange, rangeForShortcut } from "@/lib/date-range";
import type { RewardTier } from "@/lib/types";
import { DateRangePicker } from "@/components/admin/DateRangePicker";

function tierRowClass(unitPrice: number): string {
  if (unitPrice >= 600) return "bg-pink-50";
  if (unitPrice >= 450) return "bg-yellow-50";
  return "";
}

export default async function PartnerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const partner = await getCurrentPartner();
  if (!partner) return null;
  const { from: fromParam, to: toParam } = await searchParams;
  const def = defaultRange();
  const from = fromParam ?? def.from;
  const to = toParam ?? def.to;

  const admin = createSupabaseAdminClient();
  const thisMonthRange = rangeForShortcut("thisMonth");
  const [{ stores }, { stores: thisMonthStores }, { data: tierRows }, { data: storeCoupons }] = await Promise.all([
    getStorePointsForCorporationInRange(admin, partner.corporationId, from, to),
    getStorePointsForCorporationInRange(admin, partner.corporationId, thisMonthRange.from, thisMonthRange.to),
    admin.from("gym_reward_tiers").select("min_points, max_points, unit_price").order("min_points"),
    admin.from("gym_store_coupons").select("store_id, coupon_id"),
  ]);
  const tiers: RewardTier[] = (tierRows ?? []).map((t) => ({
    minPoints: t.min_points,
    maxPoints: t.max_points,
    unitPrice: t.unit_price,
  }));

  const couponIdByStoreId = new Map((storeCoupons ?? []).map((sc) => [sc.store_id, sc.coupon_id]));
  const couponIds = Array.from(couponIdByStoreId.values());
  const { data: couponRows } = couponIds.length
    ? await admin.from("coupons").select("id, code").in("id", couponIds)
    : { data: [] as { id: string; code: string | null }[] };
  const codeByCouponId = new Map((couponRows ?? []).map((c) => [c.id, c.code]));

  // 単価は店舗単位の月間合計点数に応じて店舗ごとに決まる。トップサマリーは常に「当月」時点のライブ集計(予定額)。
  const thisMonthTotalPoints = thisMonthStores.reduce((sum, s) => sum + s.points, 0);
  const thisMonthRewardAmount = thisMonthStores.reduce(
    (sum, s) => sum + s.points * unitPriceForPoints(s.points, tiers),
    0,
  );
  const thisMonthAverageUnitPrice =
    thisMonthTotalPoints > 0 ? Math.round(thisMonthRewardAmount / thisMonthTotalPoints) : 0;
  const activeCounts = await getActiveSubscriberCountsByStore(admin, stores.map((s) => s.storeId));

  const storeRows = [...stores].sort((a, b) => b.points - a.points);
  const thisMonth = rangeForShortcut("thisMonth");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold">実績サマリー</h1>
        <DateRangePicker from={from} to={to} />
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="text-xs text-neutral-500">当月の合計点数</div>
          <div className="text-lg font-semibold sm:text-xl">{thisMonthTotalPoints.toLocaleString()} 点</div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="text-xs text-neutral-500">当月の平均単価</div>
          <div className="text-lg font-semibold sm:text-xl">¥{thisMonthAverageUnitPrice.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="text-xs text-neutral-500">当月の報酬額</div>
          <div className="text-lg font-semibold sm:text-xl">¥{thisMonthRewardAmount.toLocaleString()}</div>
        </div>
      </div>
      <p className="text-xs text-neutral-500">
        上記は当月時点のライブ集計(予定額)です。単価は店舗ごとの月間合計点数に応じて店舗単位で決まり、平均単価はそれをポイント数で加重平均した参考値です。キャンセルなどを加味した実績は、月末確定処理後、支払い明細書にてご確認ください。
      </p>

      <div className="card overflow-x-auto">
        <h2 className="mb-3 font-medium">店舗別実績</h2>
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2">店舗名</th>
              <th className="py-2">クーポンコード</th>
              <th className="py-2">単品点数</th>
              <th className="py-2">定期点数</th>
              <th className="py-2">合計点数</th>
              <th className="py-2">件数</th>
              <th className="py-2">継続定期人数</th>
              <th className="py-2">報酬単価</th>
              <th className="py-2">報酬合計</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {storeRows.map((s) => {
              const storeUnitPrice = unitPriceForPoints(s.points, tiers);
              const couponId = couponIdByStoreId.get(s.storeId);
              const couponCode = couponId ? codeByCouponId.get(couponId) : null;
              return (
                <tr key={s.storeId} className={`border-b border-neutral-100 ${tierRowClass(storeUnitPrice)}`}>
                  <td className="py-2">
                    <Link
                      href={`/partner/orders?store=${encodeURIComponent(s.storeName)}&from=${thisMonth.from}&to=${thisMonth.to}`}
                      className="text-blue-600 hover:underline"
                    >
                      {s.storeName}
                    </Link>
                  </td>
                  <td className="py-2 font-mono">{couponCode ?? "-"}</td>
                  <td className="py-2">{s.oneTimePoints.toLocaleString()} 点</td>
                  <td className="py-2">{s.subscriptionPoints.toLocaleString()} 点</td>
                  <td className="py-2">{s.points.toLocaleString()} 点</td>
                  <td className="py-2">{s.orderCount.toLocaleString()} 件</td>
                  <td className="py-2">{(activeCounts.get(s.storeId) ?? 0).toLocaleString()} 人</td>
                  <td className="py-2">¥{storeUnitPrice.toLocaleString()}</td>
                  <td className="py-2">¥{(s.points * storeUnitPrice).toLocaleString()}</td>
                  <td className="py-2">
                    <Link
                      href={`/partner/stores/${s.storeId}?from=${from}&to=${to}`}
                      className="text-blue-600 hover:underline"
                    >
                      受注詳細
                    </Link>
                  </td>
                </tr>
              );
            })}
            {storeRows.length === 0 && (
              <tr>
                <td colSpan={10} className="py-6 text-center text-neutral-400">
                  店舗が登録されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-neutral-500">
          報酬単価はこの店舗単独の月間合計点数に応じて決まります(300円=白 / 450円=薄い黄色 / 600円=薄いピンク)。この一覧は選択期間のライブ集計(予定額)で、実際の金額は「支払い明細」メニューで月次に確定します。店舗名をクリックすると、当月の注文一覧が表示されます。
        </p>
      </div>
    </div>
  );
}
