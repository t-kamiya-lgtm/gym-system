import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAllStorePointsInRange } from "@/lib/points";
import { getOrderLinesInDateRange } from "@/lib/order-lines";
import { defaultRange, dayRangeJstToDates } from "@/lib/date-range";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { OrderFilterForm } from "@/components/admin/OrderFilterForm";

const FLAG_LABELS: Record<string, string> = {
  shipped: "出荷済",
  not_shipped: "未出荷",
  canceled: "キャンセル",
  excluded: "その他報酬対象外",
};

const FLAG_BADGE_CLASS: Record<string, string> = {
  shipped: "bg-green-100 text-green-700",
  not_shipped: "bg-orange-100 text-orange-800",
  canceled: "bg-neutral-200 text-neutral-500 line-through",
  excluded: "bg-neutral-100 text-neutral-500",
};

interface DisplayRow {
  id: string;
  date: string;
  orderNumber: string | null;
  customerName: string;
  storeName: string;
  corporationName: string;
  productName: string;
  quantity: number;
  taxExcludedAmount: number | null;
  typeLabel: string;
  gender: string | null;
  age: number | null;
  flag: "shipped" | "not_shipped" | "canceled" | "excluded";
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; corp?: string; store?: string; q?: string }>;
}) {
  const { from: fromParam, to: toParam, corp, store, q } = await searchParams;
  const def = defaultRange();
  const from = fromParam ?? def.from;
  const to = toParam ?? def.to;

  const admin = createSupabaseAdminClient();
  const { startDate, endDate } = dayRangeJstToDates(from, to);
  const [{ stores }, ledgerLines, { data: corporations }] = await Promise.all([
    getAllStorePointsInRange(admin, from, to),
    getOrderLinesInDateRange(admin, startDate, endDate),
    admin.from("gym_corporations").select("id, name"),
  ]);
  const corpNameById = new Map((corporations ?? []).map((c) => [c.id, c.name]));

  const shippedRows: DisplayRow[] = stores.flatMap((s) =>
    s.orders.map((o) => ({
      id: o.id,
      date: o.shippedAt,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      storeName: s.storeName,
      corporationName: s.corporationName,
      productName: o.productName,
      quantity: o.quantity,
      taxExcludedAmount: o.taxExcludedAmount,
      typeLabel: o.type === "subscription" ? `定期(${o.subscriptionIntervalLabel ?? "-"})` : "単品",
      gender: o.customerGender,
      age: o.customerAge,
      flag: "shipped",
    })),
  );

  const unshippedRows: DisplayRow[] = ledgerLines
    .filter((l) => l.shipmentFlag !== "shipped")
    .map((l) => ({
      id: l.id,
      date: l.orderDate,
      orderNumber: l.orderNumber,
      customerName: l.customerName,
      storeName: l.storeName,
      corporationName: corpNameById.get(l.corporationId) ?? "(削除済み法人)",
      productName: l.productName,
      quantity: l.quantity,
      taxExcludedAmount: null,
      typeLabel: l.orderType === "subscription" ? `定期(${l.subscriptionIntervalLabel ?? "-"})` : "単品",
      gender: null,
      age: null,
      flag: l.shipmentFlag,
    }));

  let rows = [...shippedRows, ...unshippedRows];

  const corpNames = Array.from(new Set(rows.map((r) => r.corporationName))).sort((a, b) => a.localeCompare(b, "ja"));
  const storeNames = Array.from(new Set(rows.map((r) => r.storeName))).sort((a, b) => a.localeCompare(b, "ja"));

  if (corp) rows = rows.filter((r) => r.corporationName === corp);
  if (store) rows = rows.filter((r) => r.storeName === store);
  if (q) {
    const needle = q.trim().toLowerCase();
    rows = rows.filter((r) => (r.orderNumber ?? "").toLowerCase().includes(needle));
  }
  rows.sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold">注文一覧</h1>
        <DateRangePicker from={from} to={to} />
      </div>

      <OrderFilterForm corpNames={corpNames} storeNames={storeNames} corp={corp} store={store} q={q} />

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[1160px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2">出荷フラグ</th>
              <th className="py-2">日付</th>
              <th className="py-2">注文番号</th>
              <th className="py-2">会員名</th>
              <th className="py-2">店舗名(法人名)</th>
              <th className="py-2">商品名</th>
              <th className="py-2">購入点数</th>
              <th className="py-2">税別</th>
              <th className="py-2">種別</th>
              <th className="py-2">性別</th>
              <th className="py-2">年齢</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-neutral-100">
                <td className="py-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${FLAG_BADGE_CLASS[r.flag]}`}>
                    {FLAG_LABELS[r.flag]}
                  </span>
                </td>
                <td className="py-2 whitespace-nowrap">{new Date(r.date).toLocaleDateString("ja-JP")}</td>
                <td className="py-2 font-mono">{r.orderNumber ?? "-"}</td>
                <td className="py-2">{r.customerName}</td>
                <td className="py-2">
                  {r.storeName}({r.corporationName})
                </td>
                <td className="py-2">{r.productName}</td>
                <td className="py-2">{r.quantity} 点</td>
                <td className="py-2">{r.taxExcludedAmount !== null ? `¥${r.taxExcludedAmount.toLocaleString()}` : "-"}</td>
                <td className="py-2">{r.typeLabel}</td>
                <td className="py-2">{r.gender ?? "-"}</td>
                <td className="py-2">{r.age ?? "-"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="py-6 text-center text-neutral-400">
                  対象の注文がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
