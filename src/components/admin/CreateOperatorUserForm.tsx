"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateOperatorUserForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    const res = await fetch("/api/admin/operator-users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "登録に失敗しました");
      return;
    }
    setEmail("");
    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t border-neutral-100 pt-4">
      <h3 className="text-sm font-medium">新しい運営ユーザーを招待</h3>
      <p className="text-xs text-neutral-500">
        自社のGoogle Workspaceアカウントのメールアドレスを登録すると、そのアカウントで初回ログインした時点で有効になります(招待制)。
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-neutral-600">メールアドレス</label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-600">権限</label>
          <select value={role} onChange={(e) => setRole(e.target.value as "staff" | "admin")} className="input w-auto">
            <option value="staff">staff</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <button type="submit" disabled={submitting} className="btn-primary text-sm">
          招待
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">登録しました。</p>}
    </form>
  );
}
