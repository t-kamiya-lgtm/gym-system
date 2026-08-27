"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreatePartnerUserForm({ corporationId }: { corporationId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    const res = await fetch("/api/admin/partner-users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ corporationId, email, password }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "登録に失敗しました");
      return;
    }
    setEmail("");
    setPassword("");
    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3">
      <h2 className="font-medium">法人側ログインアカウントを発行</h2>
      <div>
        <label className="mb-1 block text-sm text-neutral-600">メールアドレス</label>
        <input
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-600">初期パスワード(8文字以上)</label>
        <input
          type="text"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">発行しました。法人へメールアドレス・パスワードを共有してください。</p>}
      <button type="submit" disabled={submitting} className="btn-primary text-sm">
        発行
      </button>
    </form>
  );
}
