"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BackfillOrderLinesButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleClick() {
    setSubmitting(true);
    setResult(null);
    const res = await fetch("/api/admin/order-lines/backfill", { method: "POST" });
    setSubmitting(false);
    if (!res.ok) {
      setResult("実行に失敗しました");
      return;
    }
    const body = await res.json();
    setResult(`完了しました(新規登録 ${body.created}件 / スキップ ${body.skipped}件)`);
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={submitting}
        className="rounded-md border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-50"
      >
        受注明細台帳を再同期する
      </button>
      {result && <p className="mt-2 text-sm text-neutral-600">{result}</p>}
    </div>
  );
}
