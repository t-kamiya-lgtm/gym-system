import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCorporationStatement } from "@/lib/statements";
import { currentYearMonthJst } from "@/lib/rewards";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  const { ym } = await searchParams;
  const yearMonth = ym ?? currentYearMonthJst();
  const admin = createSupabaseAdminClient();

  const { data: corporations } = await admin
    .from("gym_corporations")
    .select("id, name")
    .order("name");

  const statements = await Promise.all(
    (corporations ?? []).map((corp) => getCorporationStatement(admin, corp.id, yearMonth)),
  );

  const grandTotalPoints = statements.reduce((sum, s) => sum + s.totalPoints, 0);
  const grandTotalAmount = statements.reduce((sum, s) => sum + s.finalAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">全体ダッシュボード</h1>
        <form className="flex items-center gap-2 text-sm">
          <label htmlFor="ym">対象月</label>
          <input type="month" id="ym" name="ym" defaultValue={yearMonth} className="input w-auto" />
          <button type="submit" className="btn-primary text-sm">
            表示
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="card">
          <div className="text-sm text-neutral-500">法人数</div>
          <div className="text-2xl font-semibold">{corporations?.length ?? 0}</div>
        </div>
        <div className="card">
          <div className="text-sm text-neutral-500">合計点数({yearMonth})</div>
          <div className="text-2xl font-semibold">{grandTotalPoints.toLocaleString()} 点</div>
        </div>
        <div className="card">
          <div className="text-sm text-neutral-500">合計報酬額({yearMonth})</div>
          <div className="text-2xl font-semibold">¥{grandTotalAmount.toLocaleString()}</div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2">法人名</th>
              <th className="py-2">店舗数</th>
              <th className="py-2">合計点数</th>
              <th className="py-2">単価</th>
              <th className="py-2">報酬額</th>
              <th className="py-2">明細状況</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {statements.map((s) => (
              <tr key={s.corporationId} className="border-b border-neutral-100">
                <td className="py-2">{corporations?.find((c) => c.id === s.corporationId)?.name}</td>
                <td className="py-2">{s.stores.length}</td>
                <td className="py-2">{s.totalPoints.toLocaleString()} 点</td>
                <td className="py-2">¥{s.unitPrice.toLocaleString()}</td>
                <td className="py-2">¥{s.finalAmount.toLocaleString()}</td>
                <td className="py-2">
                  {s.status === "agreed" ? (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">同意済</span>
                  ) : (
                    <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">未同意</span>
                  )}
                </td>
                <td className="py-2">
                  <Link href={`/admin/corporations/${s.corporationId}`} className="text-blue-600 hover:underline">
                    詳細
                  </Link>
                </td>
              </tr>
            ))}
            {statements.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-neutral-400">
                  登録された法人がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
