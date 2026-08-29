"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateStoreForm({ corporationId }: { corporationId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/stores", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ corporationId, name, couponCode }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "登録に失敗しました");
      return;
    }
    setName("");
    setCouponCode("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3">
      <h2 className="font-medium">店舗を追加</h2>
      <div>
        <label className="mb-1 block text-sm text-neutral-600">店舗名</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-600">
          クーポンコード(チャットシステム側で発行済みのものを入力)
        </label>
        <input
          className="input"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-primary text-sm">
        追加
      </button>
    </form>
  );
}
