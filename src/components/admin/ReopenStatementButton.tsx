"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReopenStatementButton({ corporationId, yearMonth }: { corporationId: string; yearMonth: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReopen() {
    if (!confirm(`${yearMonth}分の同意済み明細のロックを解除します。法人側は再度同意が必要になります。よろしいですか?`)) {
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/statements/reopen", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ corporationId, yearMonth }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError("解除に失敗しました");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleReopen}
        disabled={submitting}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm transition hover:bg-neutral-50"
      >
        ロックを解除して修正する
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
