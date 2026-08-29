"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CloseMonthButton({
  corporationId,
  yearMonth,
  label,
  confirmMessage,
}: {
  corporationId?: string;
  yearMonth: string;
  label: string;
  confirmMessage?: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClose() {
    const message =
      confirmMessage ??
      `${yearMonth}分の月末確定処理を行います。パートナーに支払い明細更新連絡が送信されます。よろしいですか?`;
    if (!confirm(message)) {
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/statements/close", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ corporationId, yearMonth }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "確定処理に失敗しました");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button type="button" onClick={handleClose} disabled={submitting} className="btn-primary text-sm">
        {label}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
