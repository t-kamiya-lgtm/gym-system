import Link from "next/link";
import { getCurrentPartner } from "@/lib/auth-partner";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCorporationStatement } from "@/lib/statements";
import { currentYearMonthJst } from "@/lib/rewards";

export default async function PartnerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  const partner = await getCurrentPartner();
  if (!partner) return null;
  const { ym } = await searchParams;
  const yearMonth = ym ?? currentYearMonthJst();

  const admin = createSupabaseAdminClient();
  const statement = await getCorporationStatement(admin, partner.corporationId, yearMonth);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">実績サマリー</h1>
        <form className="flex items-center gap-2 text-sm">
          <label htmlFor="ym">対象月</label>
          <input type="month" id="ym" name="ym" defaultValue={yearMonth} className="input w-auto" />
          <button type="submit" className="btn-primary text-sm">
            表示
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card">
          <div className="text-sm text-neutral-500">合計点数</div>
          <div className="text-2xl font-semibold">{statement.totalPoints.toLocaleString()} 点</div>
        </div>
        <div className="card">
          <div className="text-sm text-neutral-500">適用単価</div>
          <div className="text-2xl font-semibold">¥{statement.unitPrice.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="text-sm text-neutral-500">報酬額(基本)</div>
          <div className="text-2xl font-semibold">¥{statement.baseAmount.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="text-sm text-neutral-500">最終報酬額</div>
          <div className="text-2xl font-semibold">¥{statement.finalAmount.toLocaleString()}</div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="mb-3 font-medium">店舗別実績</h2>
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2">店舗名</th>
              <th className="py-2">点数</th>
              <th className="py-2">報酬額</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {statement.stores.map((s) => (
              <tr key={s.storeId} className="border-b border-neutral-100">
                <td className="py-2">{s.storeName}</td>
                <td className="py-2">{s.points.toLocaleString()} 点</td>
                <td className="py-2">¥{s.finalAmount.toLocaleString()}</td>
                <td className="py-2">
                  <Link href={`/partner/stores/${s.storeId}?ym=${yearMonth}`} className="text-blue-600 hover:underline">
                    受注詳細
                  </Link>
                </td>
              </tr>
            ))}
            {statement.stores.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-neutral-400">
                  店舗が登録されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
