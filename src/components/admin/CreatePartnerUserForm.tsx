"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreatePartnerUserForm({ corporationId }: { corporationId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    const res = await fetch("/api/admin/partner-users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ corporationId, email, password }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(typeof body.error === "string" ? body.error : "登録に失敗しました");
      return;
    }
    setEmail("");
    setPassword("");
    setSuccessMessage(
      body.reusedExistingAccount
        ? "発行しました。このメールアドレスは既存のログイン情報のまま、この法人にも追加で紐付けました(入力したパスワードは使われません)。"
        : "発行しました。法人へメールアドレス・パスワードを共有してください。",
    );
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3">
      <h2 className="font-medium">法人側ログインアカウントを発行</h2>
      <p className="text-xs text-neutral-500">
        既に他の法人で発行済みのメールアドレスを入力した場合、新規アカウントは作らず、その既存のログインにこの法人を追加で紐付けます(1つのログインで複数法人を切り替えて閲覧できます)。
      </p>
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
        <p className="mt-1 text-xs text-neutral-500">既存アカウントに追加で紐付ける場合、この値は使われません。</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {successMessage && <p className="text-sm text-green-700">{successMessage}</p>}
      <button type="submit" disabled={submitting} className="btn-primary text-sm">
        発行
      </button>
    </form>
  );
}
