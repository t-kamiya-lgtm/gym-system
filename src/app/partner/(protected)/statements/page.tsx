import { getCurrentPartner } from "@/lib/auth-partner";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCorporationStatement } from "@/lib/statements";
import { currentYearMonthJst } from "@/lib/rewards";
import { AgreeButton } from "@/components/partner/AgreeButton";

export default async function PartnerStatementsPage({
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
        <h1 className="text-lg font-semibold">支払い明細</h1>
        <form className="flex items-center gap-2 text-sm">
          <label htmlFor="ym">対象月</label>
          <input type="month" id="ym" name="ym" defaultValue={yearMonth} className="input w-auto" />
          <button type="submit" className="btn-primary text-sm">
            表示
          </button>
        </form>
      </div>

      <div className="card space-y-4">
        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-neutral-500">合計点数</dt>
            <dd className="text-lg font-semibold">{statement.totalPoints.toLocaleString()} 点</dd>
          </div>
          <div>
            <dt className="text-neutral-500">報酬単価</dt>
            <dd className="text-lg font-semibold">¥{statement.unitPrice.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">手動調整</dt>
            <dd className="text-lg font-semibold">¥{statement.adjustmentTotal.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">最終報酬額</dt>
            <dd className="text-lg font-semibold">¥{statement.finalAmount.toLocaleString()}</dd>
          </div>
        </dl>

        {statement.corpLevelAdjustments.length > 0 && (
          <div className="text-sm">
            <p className="mb-1 text-neutral-500">法人全体への調整</p>
            <ul className="list-inside list-disc">
              {statement.corpLevelAdjustments.map((a) => (
                <li key={a.id}>
                  ¥{a.amount.toLocaleString()} - {a.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-4">
          <AgreeButton yearMonth={yearMonth} alreadyAgreed={statement.status === "agreed"} />
          <a
            href={`/api/partner/statements/${yearMonth}/pdf`}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-50"
          >
            PDFをダウンロード
          </a>
          <a
            href={`/api/partner/statements/${yearMonth}/csv`}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-50"
          >
            購入明細CSVをダウンロード
          </a>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="mb-3 font-medium">店舗別内訳</h2>
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2">店舗名</th>
              <th className="py-2">点数</th>
              <th className="py-2">調整額</th>
              <th className="py-2">金額</th>
            </tr>
          </thead>
          <tbody>
            {statement.stores.map((s) => (
              <tr key={s.storeId} className="border-b border-neutral-100">
                <td className="py-2">{s.storeName}</td>
                <td className="py-2">{s.points.toLocaleString()} 点</td>
                <td className="py-2">¥{s.adjustmentTotal.toLocaleString()}</td>
                <td className="py-2">¥{s.finalAmount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
