"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface NotificationEmailRow {
  id: string;
  email: string;
  scopeLabel: string;
  storeId: string | null;
}

export function NotificationEmailsManager({
  emails,
  scopeOptions,
}: {
  emails: NotificationEmailRow[];
  scopeOptions: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [scope, setScope] = useState(scopeOptions[0]?.value ?? "");
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
      body: JSON.stringify({ storeId: scope || null, email }),
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
    <div className="card space-y-4">
      <div>
        <h2 className="mb-1 font-medium">新規注文の通知先メールアドレス</h2>
        <p className="text-xs text-neutral-500">
          新規注文が入ると、登録したメールアドレスへ「〇〇様の注文が入りました」という通知が送信されます。法人全体・店舗ごとに複数登録できます。
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2">対象</th>
              <th className="py-2">メールアドレス</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {emails.map((e) => (
              <tr key={e.id} className="border-b border-neutral-100">
                <td className="py-2">{e.scopeLabel}</td>
                <td className="py-2">{e.email}</td>
                <td className="py-2">
                  <button type="button" onClick={() => handleDelete(e.id)} className="text-xs text-red-600 hover:underline">
                    削除
                  </button>
                </td>
              </tr>
            ))}
            {emails.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-neutral-400">
                  未登録
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 border-t border-neutral-100 pt-3">
        <div>
          <label className="mb-1 block text-xs text-neutral-600">対象</label>
          <select value={scope} onChange={(e) => setScope(e.target.value)} className="input w-auto">
            {scopeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-600">メールアドレス</label>
          <input
            type="email"
            className="input"
            placeholder="new-order@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={submitting} className="btn-primary whitespace-nowrap text-sm">
          追加
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
