"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateCorporationForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [invoiceRegistered, setInvoiceRegistered] = useState(false);
  const [invoiceRegistrationNumber, setInvoiceRegistrationNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/corporations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        invoiceRegistered,
        invoiceRegistrationNumber: invoiceRegistered ? invoiceRegistrationNumber : null,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "登録に失敗しました");
      return;
    }
    setName("");
    setInvoiceRegistered(false);
    setInvoiceRegistrationNumber("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3">
      <h2 className="font-medium">法人を新規登録</h2>
      <div>
        <label className="mb-1 block text-sm text-neutral-600">法人名</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={invoiceRegistered}
          onChange={(e) => setInvoiceRegistered(e.target.checked)}
        />
        インボイス発行事業者(登録番号あり)
      </label>
      {invoiceRegistered && (
        <div>
          <label className="mb-1 block text-sm text-neutral-600">インボイス登録番号</label>
          <input
            className="input"
            placeholder="T1234567890123"
            value={invoiceRegistrationNumber}
            onChange={(e) => setInvoiceRegistrationNumber(e.target.value)}
            required
          />
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-primary text-sm">
        登録
      </button>
    </form>
  );
}
