"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TargetScenarioForm({
  scenarios,
  currentScenarioId,
}: {
  scenarios: { id: string; name: string }[];
  currentScenarioId: string | null;
}) {
  const router = useRouter();
  const [scenarioId, setScenarioId] = useState(currentScenarioId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetScenarioId: scenarioId }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError("更新に失敗しました");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3">
      <h2 className="font-medium">集計対象シナリオ</h2>
      <p className="text-xs text-neutral-500">
        アフィリエイト集計の対象は1シナリオのみ。このシナリオ経由以外の注文は集計対象外です。
      </p>
      <select className="input" value={scenarioId} onChange={(e) => setScenarioId(e.target.value)} required>
        <option value="" disabled>
          選択してください
        </option>
        {scenarios.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-primary text-sm">
        保存
      </button>
    </form>
  );
}
