import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAllStorePointsInRange, getActiveSubscriberCountsByStore } from "@/lib/points";
import { unitPriceForPoints } from "@/lib/rewards";
import { defaultRange } from "@/lib/date-range";
import { managementCode, type RewardTier } from "@/lib/types";
import { DateRangePicker } from "@/components/admin/DateRangePicker";

function tierRowClass(unitPrice: number): string {
  if (unitPrice >= 600) return "bg-pink-50";
  if (unitPrice >= 450) return "bg-yellow-50";
  return "";
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from: fromParam, to: toParam } = await searchParams;
  const def = defaultRange();
  const from = fromParam ?? def.from;
  const to = toParam ?? def.to;

  const admin = createSupabaseAdminClient();

  const [{ stores }, { data: tierRows }, { data: corporations }, { data: storeMeta }] = await Promise.all([
    getAllStorePointsInRange(admin, from, to),
    admin.from("gym_reward_tiers").select("min_points, max_points, unit_price").order("min_points"),
    admin.from("gym_corporations").select("id, corp_no"),
    admin.from("gym_stores").select("id, store_no"),
  ]);

  const tiers: RewardTier[] = (tierRows ?? []).map((t) => ({
    minPoints: t.min_points,
    maxPoints: t.max_points,
    unitPrice: t.unit_price,
  }));
  const corpNoById = new Map((corporations ?? []).map((c) => [c.id, c.corp_no]));
  const storeNoById = new Map((storeMeta ?? []).map((s) => [s.id, s.store_no]));

  const activeCounts = await getActiveSubscriberCountsByStore(admin, stores.map((s) => s.storeId));

  interface CorpAgg {
    corporationId: string;
    corporationName: string;
    storeCount: number;
    points: number;
    revenue: number;
  }
  const byCorp = new Map<string, CorpAgg>();
  for (const s of stores) {
    let entry = byCorp.get(s.corporationId);
    if (!entry) {
      entry = { corporationId: s.corporationId, corporationName: s.corporationName, storeCount: 0, points: 0, revenue: 0 };
      byCorp.set(s.corporationId, entry);
    }
    entry.storeCount += 1;
    entry.points += s.points;
    entry.revenue += s.revenue;
  }

  const corpRows = Array.from(byCorp.values())
    .map((c) => {
      const unitPrice = unitPriceForPoints(c.points, tiers);
      return { ...c, unitPrice, rewardAmount: c.points * unitPrice };
    })
    .sort((a, b) => b.rewardAmount - a.rewardAmount);

  const grandTotalPoints = corpRows.reduce((sum, c) => sum + c.points, 0);
  const grandTotalRevenue = stores.reduce((sum, s) => sum + s.revenue, 0);
  const grandTotalReward = corpRows.reduce((sum, c) => sum + c.rewardAmount, 0);

  const storeRows = [...stores].sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold">全体ダッシュボード</h1>
        <DateRangePicker from={from} to={to} />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="text-xs text-neutral-500">法人数</div>
          <div className="text-lg font-semibold sm:text-xl">{corpRows.length}</div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="text-xs text-neutral-500">合計点数</div>
          <div className="text-lg font-semibold sm:text-xl">{grandTotalPoints.toLocaleString()} 点</div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="text-xs text-neutral-500">合計報酬額</div>
          <div className="text-lg font-semibold sm:text-xl">¥{grandTotalReward.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="text-xs text-neutral-500">合計売上</div>
          <div className="text-lg font-semibold sm:text-xl">¥{grandTotalRevenue.toLocaleString()}</div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="mb-3 font-medium">法人別実績</h2>
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2">法人No</th>
              <th className="py-2">法人名</th>
              <th className="py-2">店舗数</th>
              <th className="py-2">合計点数</th>
              <th className="py-2">報酬単価</th>
              <th className="py-2">報酬額</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {corpRows.map((c) => (
              <tr key={c.corporationId} className={`border-b border-neutral-100 ${tierRowClass(c.unitPrice)}`}>
                <td className="py-2 font-mono">{managementCode(corpNoById.get(c.corporationId) ?? 0)}</td>
                <td className="py-2">{c.corporationName}</td>
                <td className="py-2">{c.storeCount}</td>
                <td className="py-2">{c.points.toLocaleString()} 点</td>
                <td className="py-2">¥{c.unitPrice.toLocaleString()}</td>
                <td className="py-2">¥{c.rewardAmount.toLocaleString()}</td>
                <td className="py-2">
                  <Link href={`/admin/corporations/${c.corporationId}`} className="text-blue-600 hover:underline">
                    詳細
                  </Link>
                </td>
              </tr>
            ))}
            {corpRows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-neutral-400">
                  対象期間に実績のある法人がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-neutral-500">
          報酬単価: 300円=白 / 450円=薄い黄色 / 600円=薄いピンク。この一覧は選択期間のライブ集計(参考値)で、実際の支払い明細は月次(カレンダー月)で別途確定します。
        </p>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="mb-3 font-medium">店舗別実績</h2>
        <table className="w-full min-w-[1080px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2">店舗No</th>
              <th className="py-2">店舗</th>
              <th className="py-2">法人</th>
              <th className="py-2">点数</th>
              <th className="py-2">件数</th>
              <th className="py-2">売上</th>
              <th className="py-2">単品売上</th>
              <th className="py-2">単品点数</th>
              <th className="py-2">定期売上</th>
              <th className="py-2">定期点数</th>
              <th className="py-2">継続定期人数</th>
              <th className="py-2">報酬単価</th>
              <th className="py-2">報酬合計</th>
            </tr>
          </thead>
          <tbody>
            {storeRows.map((s) => {
              const storeUnitPrice = unitPriceForPoints(s.points, tiers);
              return (
                <tr key={s.storeId} className={`border-b border-neutral-100 ${tierRowClass(storeUnitPrice)}`}>
                  <td className="py-2 font-mono">
                    {managementCode(corpNoById.get(s.corporationId) ?? 0, storeNoById.get(s.storeId) ?? 0)}
                  </td>
                  <td className="py-2">{s.storeName}</td>
                  <td className="py-2">{s.corporationName}</td>
                  <td className="py-2">{s.points.toLocaleString()} 点</td>
                  <td className="py-2">{s.orderCount.toLocaleString()} 件</td>
                  <td className="py-2">¥{s.revenue.toLocaleString()}</td>
                  <td className="py-2">¥{s.oneTimeRevenue.toLocaleString()}</td>
                  <td className="py-2">{s.oneTimePoints.toLocaleString()} 点</td>
                  <td className="py-2">¥{s.subscriptionRevenue.toLocaleString()}</td>
                  <td className="py-2">{s.subscriptionPoints.toLocaleString()} 点</td>
                  <td className="py-2">{(activeCounts.get(s.storeId) ?? 0).toLocaleString()} 人</td>
                  <td className="py-2">¥{storeUnitPrice.toLocaleString()}</td>
                  <td className="py-2">¥{(s.points * storeUnitPrice).toLocaleString()}</td>
                </tr>
              );
            })}
            {storeRows.length === 0 && (
              <tr>
                <td colSpan={13} className="py-6 text-center text-neutral-400">
                  店舗が登録されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-neutral-500">
          報酬単価・行の色分けはこの店舗単独の月間合計点数に基づく参考値です(300円=白 / 450円=薄い黄色 / 600円=薄いピンク)。実際の支払い額は法人配下の店舗合計点数で算出したものが正式な金額です(上の法人別実績、および月次明細)。
        </p>
      </div>
    </div>
  );
}
