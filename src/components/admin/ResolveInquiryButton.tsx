"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResolveInquiryButton({ inquiryId }: { inquiryId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleResolve() {
    if (!confirm("対応済みにします。対象法人の明細のフラグを解除(未承認に戻す)します。よろしいですか?")) return;
    setSubmitting(true);
    const res = await fetch(`/api/admin/statement-inquiries/${inquiryId}/resolve`, { method: "POST" });
    setSubmitting(false);
    if (!res.ok) {
      alert("処理に失敗しました");
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleResolve}
      disabled={submitting}
      className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs transition hover:bg-neutral-50"
    >
      対応済みにする(フラグ解除)
    </button>
  );
}
