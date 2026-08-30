"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PartnerUserRow({
  partnerUserId,
  email,
  isActive,
}: {
  partnerUserId: string;
  email: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [emailInput, setEmailInput] = useState(email);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(payload: { email?: string; isActive?: boolean }) {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/admin/partner-users/${partnerUserId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "更新に失敗しました");
      return false;
    }
    router.refresh();
    return true;
  }

  async function handleSaveEmail() {
    if (emailInput === email) {
      setEditing(false);
      return;
    }
    if (!confirm(`ログインメールアドレスを ${emailInput} に変更します。よろしいですか?`)) return;
    const ok = await patch({ email: emailInput });
    if (ok) setEditing(false);
  }

  async function handleToggleActive() {
    const next = !isActive;
    if (!confirm(next ? "このログインを有効化しますか?" : "このログインをこの法人について停止しますか?")) return;
    await patch({ isActive: next });
  }

  return (
    <li className="flex flex-col gap-1 border-b border-neutral-100 pb-2 last:border-b-0 last:pb-0">
      <div className="flex items-center justify-between gap-2">
        {editing ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              type="email"
              className="input py-1 text-sm"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
            />
            <button
              type="button"
              onClick={handleSaveEmail}
              disabled={submitting}
              className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-50"
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => {
                setEmailInput(email);
                setEditing(false);
                setError(null);
              }}
              className="text-xs text-neutral-500"
            >
              キャンセル
            </button>
          </div>
        ) : (
          <span className="text-sm">{email}</span>
        )}
        <div className="flex shrink-0 items-center gap-2">
          <span className={isActive ? "text-xs text-green-700" : "text-xs text-neutral-400"}>
            {isActive ? "有効" : "停止中"}
          </span>
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-50"
            >
              メール変更
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={submitting}
            className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-50"
          >
            {isActive ? "停止する" : "有効化する"}
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </li>
  );
}
