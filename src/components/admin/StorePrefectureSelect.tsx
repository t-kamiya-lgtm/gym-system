"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { JP_PREFECTURES } from "@/lib/prefectures";

export function StorePrefectureSelect({ storeId, value }: { storeId: string; value: string | null }) {
  const router = useRouter();
  const [current, setCurrent] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  async function handleChange(next: string) {
    setCurrent(next);
    setSaving(true);
    const res = await fetch(`/api/admin/stores/${storeId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prefecture: next || null }),
    });
    setSaving(false);
    if (!res.ok) {
      setCurrent(value ?? "");
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
      <option value="">未設定</option>
      {JP_PREFECTURES.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}
