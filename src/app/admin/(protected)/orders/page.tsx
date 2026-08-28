import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAllStorePointsInRange } from "@/lib/points";
import { defaultRange } from "@/lib/date-range";
import { DateRangePicker } from "@/components/admin/DateRangePicker";

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
  const { stores } = await getAllStorePointsInRange(admin, from, to);

  const corpNames = Array.from(new Set(stores.map((s) => s.corporationName))).sort((a, b) => a.localeCompare(b, "ja"));
  const storeNames = Array.from(new Set(stores.map((s) => s.storeName))).sort((a, b) => a.localeCompare(b, "ja"));

  let rows = stores.flatMap((s) =>
    s.orders.map((o) => ({
      ...o,
      storeName: s.storeName,
      corporationName: s.corporationName,
    })),
  );

  if (corp) rows = rows.filter((r) => r.corporationName === corp);
  if (store) rows = rows.filter((r) => r.storeName === store);
  if (q) {
    const needle = q.trim().toLowerCase();
    rows = rows.filter((r) => (r.orderNumber ?? "").toLowerCase().includes(needle));
  }
  rows.sort((a, b) => (a.shippedAt < b.shippedAt ? 1 : -1));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold">注文一覧</h1>
        <DateRangePicker from={from} to={to} />
      </div>

      <form className="card flex flex-wrap items-end gap-3 text-sm">
        <input type="hidden" name="from" value={from} />
        <input type="hidden" name="to" value={to} />
        <div>
          <label className="mb-1 block text-neutral-600">法人名</label>
          <select name="corp" defaultValue={corp ?? ""} className="input w-auto">
            <option value="">すべて</option>
            {corpNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-neutral-600">店舗名</label>
          <select name="store" defaultValue={store ?? ""} className="input w-auto">
            <option value="">すべて</option>
            {storeNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-neutral-600">注文番号検索</label>
          <input type="text" name="q" defaultValue={q ?? ""} placeholder="注文番号" className="input w-auto" />
        </div>
        <button type="submit" className="btn-primary text-sm">
          絞り込む
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[1080px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
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
                <td className="py-2 whitespace-nowrap">{new Date(r.shippedAt).toLocaleDateString("ja-JP")}</td>
                <td className="py-2 font-mono">{r.orderNumber ?? "-"}</td>
                <td className="py-2">{r.customerName}</td>
                <td className="py-2">
                  {r.storeName}({r.corporationName})
                </td>
                <td className="py-2">{r.productName}</td>
                <td className="py-2">{r.quantity} 点</td>
                <td className="py-2">¥{r.taxExcludedAmount.toLocaleString()}</td>
                <td className="py-2">
                  {r.type === "subscription" ? `定期(${r.subscriptionIntervalLabel ?? "-"})` : "単品"}
                </td>
                <td className="py-2">{r.customerGender ?? "-"}</td>
                <td className="py-2">{r.customerAge ?? "-"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="py-6 text-center text-neutral-400">
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
