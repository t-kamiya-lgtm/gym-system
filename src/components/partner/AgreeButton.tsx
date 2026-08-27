"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AgreeButton({ yearMonth, alreadyAgreed }: { yearMonth: string; alreadyAgreed: boolean }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAgree() {
    if (!confirm(`${yearMonth}分の支払い明細に同意します。よろしいですか?`)) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/partner/statements/${yearMonth}/agree`, { method: "POST" });
    setSubmitting(false);
    if (!res.ok) {
      setError("同意処理に失敗しました");
      return;
    }
    router.refresh();
  }

  if (alreadyAgreed) {
    return <span className="rounded bg-green-100 px-3 py-1.5 text-sm text-green-700">同意済み</span>;
  }

  return (
    <div>
      <button type="button" onClick={handleAgree} disabled={submitting} className="btn-primary text-sm">
        この内容に同意する
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
