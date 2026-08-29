"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface NotificationEmailRow {
  id: string;
  email: string;
  storeId: string | null;
  storeName: string | null;
}

export function NotificationEmailsManager({
  scopeLabel,
  storeId,
  emails,
}: {
  scopeLabel: string;
  storeId: string | null;
  emails: NotificationEmailRow[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/partner/notification-emails", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ storeId, email }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError("追加に失敗しました");
      return;
    }
    setEmail("");
    router.refresh();
  }

  async function handleDelete(id: string) {
    await fetch("/api/partner/notification-emails", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <div className="card space-y-3">
      <h2 className="font-medium">{scopeLabel}の通知先メールアドレス</h2>
      <ul className="space-y-1 text-sm">
        {emails.map((e) => (
          <li key={e.id} className="flex items-center justify-between">
            <span>{e.email}</span>
            <button type="button" onClick={() => handleDelete(e.id)} className="text-xs text-red-600 hover:underline">
              削除
            </button>
          </li>
        ))}
        {emails.length === 0 && <li className="text-neutral-400">未登録</li>}
      </ul>
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="email"
          className="input"
          placeholder="new-order@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={submitting} className="btn-primary whitespace-nowrap text-sm">
          追加
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
