import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCorporationStatement } from "@/lib/statements";
import { getStorePointsForCorporation } from "@/lib/points";
import { currentYearMonthJst, dailyPointBreakdown } from "@/lib/rewards";
import { AddAdjustmentForm } from "@/components/admin/AddAdjustmentForm";
import { ReopenStatementButton } from "@/components/admin/ReopenStatementButton";

export default async function CorporationStatementPage({
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
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (!corporation) notFound();

  const { data: stores } = await admin.from("gym_stores").select("id, name").eq("corporation_id", id);

  const [statement, { stores: liveStores }] = await Promise.all([
    getCorporationStatement(admin, id, yearMonth),
    getStorePointsForCorporation(admin, id, yearMonth),
  ]);
  const dailyBreakdown = dailyPointBreakdown(liveStores.flatMap((s) => s.orders));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{corporation.name} 月次明細</h1>
          <p className="text-sm text-neutral-500">対象月: {yearMonth}</p>
        </div>
        <form className="flex items-center gap-2 text-sm">
          <label htmlFor="ym">対象月</label>
          <input type="month" id="ym" name="ym" defaultValue={yearMonth} className="input w-auto" />
          <button type="submit" className="btn-primary text-sm">
            表示
          </button>
        </form>
      </div>

      <div className="card space-y-2">
        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <dt className="text-neutral-500">合計点数</dt>
          <dd>{statement.totalPoints.toLocaleString()} 点</dd>
          <dt className="text-neutral-500">報酬単価</dt>
          <dd>¥{statement.unitPrice.toLocaleString()}</dd>
          <dt className="text-neutral-500">基本報酬額</dt>
          <dd>¥{statement.baseAmount.toLocaleString()}</dd>
          <dt className="text-neutral-500">手動調整合計</dt>
          <dd>¥{statement.adjustmentTotal.toLocaleString()}</dd>
          <dt className="font-medium text-neutral-700">最終報酬額</dt>
          <dd className="font-medium">¥{statement.finalAmount.toLocaleString()}</dd>
          <dt className="text-neutral-500">同意状況</dt>
          <dd>
            {statement.status === "agreed" ? (
              <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                同意済・ロック中({statement.agreedAt})
              </span>
            ) : (
              <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">未同意(ライブ計算中)</span>
            )}
          </dd>
        </dl>

        {statement.status === "agreed" && (
          <div className="border-t border-neutral-100 pt-3">
            <p className="mb-2 text-xs text-neutral-500">
              同意済みの明細を修正するには、まずロックを解除してください。解除すると法人側は再度同意が必要になります。
            </p>
            <ReopenStatementButton corporationId={id} yearMonth={yearMonth} />
          </div>
        )}

        <div className="flex flex-wrap gap-3 border-t border-neutral-100 pt-3">
          <a
            href={`/api/admin/statements/${id}/${yearMonth}/pdf`}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-50"
          >
            PDFをダウンロード
          </a>
          <a
            href={`/api/admin/statements/${id}/${yearMonth}/csv`}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-50"
          >
            購入明細CSVをダウンロード
          </a>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="mb-3 font-medium">日別件数(参考・現在のDB状態に基づくライブ集計)</h2>
        <table className="w-full min-w-[300px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2">日付</th>
              <th className="py-2">点数</th>
            </tr>
          </thead>
          <tbody>
            {dailyBreakdown.map((d) => (
              <tr key={d.date} className="border-b border-neutral-100">
                <td className="py-2">{d.date}</td>
                <td className="py-2">{d.points.toLocaleString()} 点</td>
              </tr>
            ))}
            {dailyBreakdown.length === 0 && (
              <tr>
                <td colSpan={2} className="py-6 text-center text-neutral-400">
                  対象月の出荷済み注文がありません
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-neutral-300 font-medium">
              <td className="py-2">合計(報酬単価 ¥{statement.unitPrice.toLocaleString()})</td>
              <td className="py-2">
                {dailyBreakdown.reduce((sum, d) => sum + d.points, 0).toLocaleString()} 点 / ¥
                {statement.finalAmount.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <AddAdjustmentForm
        corporationId={id}
        yearMonth={yearMonth}
        stores={(stores ?? []).map((s) => ({ id: s.id, name: s.name }))}
      />
    </div>
  );
}
