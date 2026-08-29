"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FLAG_LABELS: Record<string, string> = {
  not_shipped: "未出荷",
  shipped: "出荷済",
  canceled: "キャンセル",
  excluded: "その他報酬対象外",
};

export function ShipmentFlagSelect({ lineId, value }: { lineId: string; value: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState(value);
  const [saving, setSaving] = useState(false);

  async function handleChange(next: string) {
    setCurrent(next);
    setSaving(true);
    const res = await fetch(`/api/admin/order-lines/${lineId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ shipmentFlag: next }),
    });
    setSaving(false);
    if (!res.ok) {
      setCurrent(value);
      alert("更新に失敗しました");
      return;
    }
    router.refresh();
  }

  return (
    <select
      className="input w-auto py-1 text-xs"
      value={current}
      disabled={saving}
      onChange={(e) => handleChange(e.target.value)}
    >
      {Object.entries(FLAG_LABELS).map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}
