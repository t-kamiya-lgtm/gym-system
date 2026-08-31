"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { unitPriceForPoints } from "@/lib/rewards";
import type { RewardTier } from "@/lib/types";

const FLAG_LABELS: Record<string, string> = {
  not_shipped: "未出荷",
  shipped: "出荷済",
  canceled: "キャンセル",
  excluded: "その他報酬対象外",
};

const FLAG_BADGE_CLASS: Record<string, string> = {
  not_shipped: "bg-orange-100 text-orange-800",
  shipped: "bg-green-100 text-green-700",
  canceled: "bg-neutral-200 text-neutral-500 line-through",
  excluded: "bg-neutral-100 text-neutral-500",
};

interface LineRow {
  id: string;
  storeId: string;
  storeName: string;
  orderNumber: string | null;
  orderDate: string;
  customerName: string;
  productName: string;
  quantity: number;
  shipmentFlag: string;
  isManual: boolean;
  isReversal: boolean;
}

interface NewRow {
  tempId: string;
  storeId: string;
  orderDate: string;
  orderNumber: string;
  customerName: string;
  productName: string;
  quantity: number;
  shipmentFlag: string;
}

export function OrderLinesEditor({
  corporationId,
  yearMonth,
  initialLines,
  initialFinalAmount,
  tiers,
  storeOptions,
}: {
  corporationId: string;
  yearMonth: string;
  initialLines: LineRow[];
  initialFinalAmount: number;
  tiers: RewardTier[];
  storeOptions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<LineRow[]>(initialLines);
  const [newRows, setNewRows] = useState<NewRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 単価は店舗単位の月間合計点数に応じて店舗ごとに決まる(決定事項)。まず店舗ごとの出荷済み点数を集計する。
  const storeUnitPriceById = useMemo(() => {
    const quantityByStore = new Map<string, number>();
    for (const r of rows) {
      if (r.shipmentFlag !== "shipped") continue;
      quantityByStore.set(r.storeId, (quantityByStore.get(r.storeId) ?? 0) + r.quantity);
    }
    for (const r of newRows) {
      if (r.shipmentFlag !== "shipped") continue;
      quantityByStore.set(r.storeId, (quantityByStore.get(r.storeId) ?? 0) + r.quantity);
    }
    const result = new Map<string, number>();
    for (const [storeId, quantity] of quantityByStore) {
      result.set(storeId, unitPriceForPoints(quantity, tiers));
    }
    return result;
  }, [rows, newRows, tiers]);

  function unitPriceForStore(storeId: string): number {
    return storeUnitPriceById.get(storeId) ?? unitPriceForPoints(0, tiers);
  }

  const shippedQuantity = useMemo(() => {
    const fromExisting = rows.filter((r) => r.shipmentFlag === "shipped").reduce((sum, r) => sum + r.quantity, 0);
    const fromNew = newRows.filter((r) => r.shipmentFlag === "shipped").reduce((sum, r) => sum + r.quantity, 0);
    return fromExisting + fromNew;
  }, [rows, newRows]);
  const finalAmount = useMemo(() => {
    const fromExisting = rows
      .filter((r) => r.shipmentFlag === "shipped")
      .reduce((sum, r) => sum + r.quantity * unitPriceForStore(r.storeId), 0);
    const fromNew = newRows
      .filter((r) => r.shipmentFlag === "shipped")
      .reduce((sum, r) => sum + r.quantity * unitPriceForStore(r.storeId), 0);
    return fromExisting + fromNew;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, newRows, storeUnitPriceById]);
  // 表示用の参考値(店舗ごとの単価が異なる場合があるため、ポイント数による加重平均で1つの値にする)。
  const averageUnitPrice = shippedQuantity > 0 ? Math.round(finalAmount / shippedQuantity) : 0;

  function updateRow(id: string, patch: Partial<LineRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addBlankRow() {
    setNewRows((prev) => [
      ...prev,
      {
        tempId: `new-${Date.now()}-${prev.length}`,
        storeId: storeOptions[0]?.id ?? "",
        orderDate: new Date().toISOString().slice(0, 10),
        orderNumber: "",
        customerName: "",
        productName: "",
        quantity: 0,
        shipmentFlag: "shipped",
      },
    ]);
  }

  function updateNewRow(tempId: string, patch: Partial<NewRow>) {
    setNewRows((prev) => prev.map((r) => (r.tempId === tempId ? { ...r, ...patch } : r)));
  }

  function removeNewRow(tempId: string) {
    setNewRows((prev) => prev.filter((r) => r.tempId !== tempId));
  }

  async function handleSave() {
    const invalidNewRow = newRows.find((r) => !r.productName || r.quantity === 0);
    if (invalidNewRow) {
      setError("追加した受注行は、商品・点数・出荷フラグの入力が必須です");
      return;
    }

    const message = [
      "内容を更新しますか?",
      "",
      "【修正前】",
      `${initialLines.filter((l) => l.shipmentFlag === "shipped").reduce((s, l) => s + l.quantity, 0)}点 = ¥${initialFinalAmount.toLocaleString()}`,
      "",
      "【修正後】",
      `${shippedQuantity}点 = ¥${finalAmount.toLocaleString()}(店舗ごとの単価で算出)`,
    ].join("\n");
    if (!confirm(message)) return;

    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/order-lines/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        corporationId,
        yearMonth,
        updates: rows.map((r) => ({ id: r.id, quantity: r.quantity, shipmentFlag: r.shipmentFlag })),
        newLines: newRows.map((r) => ({
          storeId: r.storeId,
          orderDate: r.orderDate,
          orderNumber: r.orderNumber || undefined,
          customerName: r.customerName || undefined,
          productName: r.productName,
          quantity: r.quantity,
          shipmentFlag: r.shipmentFlag,
        })),
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "更新に失敗しました");
      return;
    }
    setEditing(false);
    setNewRows([]);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="card grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
        <div>
          <p className="text-xs text-neutral-500">合計点数</p>
          <p className="text-xl font-bold">{shippedQuantity.toLocaleString()} pt</p>
        </div>
        <div className="border-t border-neutral-100 pt-3 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0">
          <p className="text-xs text-neutral-500">平均単価</p>
          <p className="text-xl font-bold">¥{averageUnitPrice.toLocaleString()}</p>
          <p className="text-[11px] text-neutral-400">単価は店舗ごとの月間合計点数に応じて店舗単位で決まります。これは加重平均の参考値です。</p>
        </div>
        <div className="border-t border-neutral-100 pt-3 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0">
          <p className="text-xs text-neutral-500">報酬合計金額</p>
          <p className="text-xl font-bold">¥{finalAmount.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {editing ? (
          <>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setRows(initialLines);
                setNewRows([]);
                setError(null);
              }}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-50"
            >
              キャンセル
            </button>
            <button type="button" onClick={handleSave} disabled={submitting} className="btn-primary text-sm">
              保存
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="btn-primary text-sm">
            修正・編集
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2">出荷フラグ</th>
              <th className="py-2">受注日</th>
              <th className="py-2">注文番号</th>
              <th className="py-2">会員名</th>
              <th className="py-2">店舗名</th>
              <th className="py-2">商品</th>
              <th className="py-2 text-right">点数</th>
              <th className="py-2 text-right">単価</th>
              <th className="py-2 text-right">金額</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-neutral-100">
                <td className="py-2">
                  {editing ? (
                    <select
                      className="input w-auto py-1 text-xs"
                      value={r.shipmentFlag}
                      onChange={(e) => updateRow(r.id, { shipmentFlag: e.target.value })}
                    >
                      {Object.entries(FLAG_LABELS).map(([v, label]) => (
                        <option key={v} value={v}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${FLAG_BADGE_CLASS[r.shipmentFlag]}`}>
                      {FLAG_LABELS[r.shipmentFlag] ?? r.shipmentFlag}
                    </span>
                  )}
                </td>
                <td className="py-2 whitespace-nowrap">{r.orderDate}</td>
                <td className="py-2 font-mono">{r.orderNumber ?? "-"}</td>
                <td className="py-2">
                  {r.customerName}
                  {r.isReversal && <span className="ml-1 text-xs text-red-600">(返品)</span>}
                  {r.isManual && !r.isReversal && <span className="ml-1 text-xs text-neutral-400">(手動追加)</span>}
                </td>
                <td className="py-2">{r.storeName}</td>
                <td className="py-2">{r.productName}</td>
                <td className="py-2 text-right">
                  {editing ? (
                    <input
                      type="number"
                      className="input w-20 py-1 text-right text-xs"
                      value={r.quantity}
                      onChange={(e) => updateRow(r.id, { quantity: Number(e.target.value) })}
                    />
                  ) : (
                    r.quantity.toLocaleString()
                  )}
                </td>
                <td className="py-2 text-right">
                  {r.shipmentFlag === "shipped" ? `¥${unitPriceForStore(r.storeId).toLocaleString()}` : "-"}
                </td>
                <td className="py-2 text-right">
                  ¥{(r.shipmentFlag === "shipped" ? r.quantity * unitPriceForStore(r.storeId) : 0).toLocaleString()}
                </td>
              </tr>
            ))}
            {editing &&
              newRows.map((r) => (
                <tr key={r.tempId} className="border-b border-neutral-100 bg-blue-50">
                  <td className="py-2">
                    <select
                      className="input w-auto py-1 text-xs"
                      value={r.shipmentFlag}
                      onChange={(e) => updateNewRow(r.tempId, { shipmentFlag: e.target.value })}
                    >
                      {Object.entries(FLAG_LABELS).map(([v, label]) => (
                        <option key={v} value={v}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2">
                    <input
                      type="date"
                      className="input w-auto py-1 text-xs"
                      value={r.orderDate}
                      onChange={(e) => updateNewRow(r.tempId, { orderDate: e.target.value })}
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="text"
                      className="input w-28 py-1 text-xs"
                      value={r.orderNumber}
                      onChange={(e) => updateNewRow(r.tempId, { orderNumber: e.target.value })}
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="text"
                      className="input w-24 py-1 text-xs"
                      value={r.customerName}
                      onChange={(e) => updateNewRow(r.tempId, { customerName: e.target.value })}
                    />
                  </td>
                  <td className="py-2">
                    <select
                      className="input w-auto py-1 text-xs"
                      value={r.storeId}
                      onChange={(e) => updateNewRow(r.tempId, { storeId: e.target.value })}
                    >
                      {storeOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2">
                    <input
                      type="text"
                      required
                      placeholder="商品名(必須)"
                      className="input w-32 py-1 text-xs"
                      value={r.productName}
                      onChange={(e) => updateNewRow(r.tempId, { productName: e.target.value })}
                    />
                  </td>
                  <td className="py-2 text-right">
                    <input
                      type="number"
                      required
                      className="input w-20 py-1 text-right text-xs"
                      value={r.quantity}
                      onChange={(e) => updateNewRow(r.tempId, { quantity: Number(e.target.value) })}
                    />
                  </td>
                  <td className="py-2 text-right">
                    {r.shipmentFlag === "shipped" ? `¥${unitPriceForStore(r.storeId).toLocaleString()}` : "-"}
                  </td>
                  <td className="py-2 text-right">
                    <button type="button" onClick={() => removeNewRow(r.tempId)} className="text-xs text-red-600 underline">
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            {editing && (
              <tr className="bg-neutral-50">
                <td colSpan={9} className="border border-dashed border-neutral-300 p-0">
                  <button
                    type="button"
                    onClick={addBlankRow}
                    className="flex w-full items-center justify-center gap-1.5 py-2.5 text-sm text-neutral-600 hover:bg-neutral-100"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    受注行を追加する
                  </button>
                </td>
              </tr>
            )}
            {rows.length === 0 && newRows.length === 0 && (
              <tr>
                <td colSpan={9} className="py-6 text-center text-neutral-400">
                  対象月の受注データがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
