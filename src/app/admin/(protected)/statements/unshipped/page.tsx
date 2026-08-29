import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUnshippedLinesBefore } from "@/lib/order-lines";
import { previousYearMonthJst } from "@/lib/rewards";
import { ShipmentFlagSelect } from "@/components/admin/ShipmentFlagSelect";

export default async function UnshippedCheckPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  const { ym } = await searchParams;
  const yearMonth = ym ?? previousYearMonthJst();
  const admin = createSupabaseAdminClient();

  const [lines, { data: corporations }] = await Promise.all([
    getUnshippedLinesBefore(admin, yearMonth),
    admin.from("gym_corporations").select("id, name"),
  ]);
  const corpNameById = new Map((corporations ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/statements" className="text-sm text-neutral-500 hover:underline">
            ← 支払い明細に戻る
          </Link>
          <h1 className="mt-1 text-lg font-semibold">未出荷エラーチェック</h1>
          <p className="text-sm text-neutral-500">{yearMonth}分より前の受注で、未出荷のまま残っている注文</p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2">受注日</th>
              <th className="py-2">注文番号</th>
              <th className="py-2">注文者名</th>
              <th className="py-2">法人名</th>
              <th className="py-2">店舗名</th>
              <th className="py-2 text-right">点数</th>
              <th className="py-2">出荷フラグ</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-b border-neutral-100">
                <td className="py-2 whitespace-nowrap">{l.orderDate}</td>
                <td className="py-2 font-mono">{l.orderNumber ?? "-"}</td>
                <td className="py-2">{l.customerName}</td>
                <td className="py-2">{corpNameById.get(l.corporationId) ?? "-"}</td>
                <td className="py-2">{l.storeName}</td>
                <td className="py-2 text-right">{l.quantity.toLocaleString()}</td>
                <td className="py-2">
                  <ShipmentFlagSelect lineId={l.id} value={l.shipmentFlag} />
                </td>
              </tr>
            ))}
            {lines.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-neutral-400">
                  未出荷のまま残っている注文はありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
