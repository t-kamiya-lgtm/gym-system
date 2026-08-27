"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddAdjustmentForm({
  corporationId,
  yearMonth,
  stores,
}: {
  corporationId: string;
  yearMonth: string;
  stores: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [storeId, setStoreId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/statement-adjustments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        corporationId,
        storeId: storeId || null,
        yearMonth,
        amount: Number(amount),
        reason,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "登録に失敗しました");
      return;
    }
    setAmount("");
    setReason("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3">
      <h2 className="font-medium">手動調整を追加({yearMonth})</h2>
      <p className="text-xs text-neutral-500">
        明細確定後のキャンセル反映漏れ・計算エラー等を、金額の加算(プラス)/減算(マイナス)で補正します。
      </p>
      <div>
        <label className="mb-1 block text-sm text-neutral-600">対象(店舗を選ばなければ法人全体への調整)</label>
        <select className="input" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
          <option value="">法人全体</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-600">金額(円、マイナス可)</label>
        <input
          type="number"
          className="input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-600">理由</label>
        <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} required />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-primary text-sm">
        追加
      </button>
    </form>
  );
}
