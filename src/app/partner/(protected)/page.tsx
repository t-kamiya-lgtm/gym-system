import Link from "next/link";
import { getCurrentPartner } from "@/lib/auth-partner";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStorePointsForCorporationInRange, getActiveSubscriberCountsByStore } from "@/lib/points";
import { unitPriceForPoints } from "@/lib/rewards";
import { defaultRange } from "@/lib/date-range";
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
  const [{ stores }, { data: tierRows }] = await Promise.all([
    getStorePointsForCorporationInRange(admin, partner.corporationId, from, to),
    admin.from("gym_reward_tiers").select("min_points, max_points, unit_price").order("min_points"),
  ]);
  const tiers: RewardTier[] = (tierRows ?? []).map((t) => ({
    minPoints: t.min_points,
    maxPoints: t.max_points,
    unitPrice: t.unit_price,
  }));

  const totalPoints = stores.reduce((sum, s) => sum + s.points, 0);
  const totalRevenue = stores.reduce((sum, s) => sum + s.revenue, 0);
  const unitPrice = unitPriceForPoints(totalPoints, tiers);
  const rewardAmount = totalPoints * unitPrice;
  const activeCounts = await getActiveSubscriberCountsByStore(admin, stores.map((s) => s.storeId));

  const storeRows = [...stores].sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold">実績サマリー</h1>
        <DateRangePicker from={from} to={to} />
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        <div className="card min-w-[130px] flex-1">
          <div className="text-xs text-neutral-500">合計点数</div>
          <div className="text-xl font-semibold">{totalPoints.toLocaleString()} 点</div>
        </div>
        <div className="card min-w-[130px] flex-1">
          <div className="text-xs text-neutral-500">報酬単価</div>
          <div className="text-xl font-semibold">¥{unitPrice.toLocaleString()}</div>
        </div>
        <div className="card min-w-[130px] flex-1">
          <div className="text-xs text-neutral-500">報酬額</div>
          <div className="text-xl font-semibold">¥{rewardAmount.toLocaleString()}</div>
        </div>
        <div className="card min-w-[130px] flex-1">
          <div className="text-xs text-neutral-500">売上</div>
          <div className="text-xl font-semibold">¥{totalRevenue.toLocaleString()}</div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="mb-3 font-medium">店舗別実績</h2>
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2">店舗名</th>
              <th className="py-2">点数</th>
              <th className="py-2">件数</th>
              <th className="py-2">売上</th>
              <th className="py-2">単品売上</th>
              <th className="py-2">定期売上</th>
              <th className="py-2">継続定期人数</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {storeRows.map((s) => (
              <tr key={s.storeId} className={`border-b border-neutral-100 ${tierRowClass(unitPrice)}`}>
                <td className="py-2">{s.storeName}</td>
                <td className="py-2">{s.points.toLocaleString()} 点</td>
                <td className="py-2">{s.orderCount.toLocaleString()} 件</td>
                <td className="py-2">¥{s.revenue.toLocaleString()}</td>
                <td className="py-2">¥{s.oneTimeRevenue.toLocaleString()}</td>
                <td className="py-2">¥{s.subscriptionRevenue.toLocaleString()}</td>
                <td className="py-2">{(activeCounts.get(s.storeId) ?? 0).toLocaleString()} 人</td>
                <td className="py-2">
                  <Link href={`/partner/stores/${s.storeId}?from=${from}&to=${to}`} className="text-blue-600 hover:underline">
                    受注詳細
                  </Link>
                </td>
              </tr>
            ))}
            {storeRows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-neutral-400">
                  店舗が登録されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-neutral-500">
          報酬単価: 300円=白 / 450円=薄い黄色 / 600円=薄いピンク。この画面は選択期間のライブ集計(参考値)です。実際の支払い明細は「支払い明細」メニューで月次(カレンダー月)で確定します。
        </p>
      </div>
    </div>
  );
}
