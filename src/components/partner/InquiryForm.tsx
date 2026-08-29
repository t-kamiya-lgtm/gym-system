"use client";

import { useState } from "react";

export function InquiryForm({ yearMonth }: { yearMonth: string }) {
  const [open, setOpen] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactTel, setContactTel] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/partner/statements/${yearMonth}/inquiry`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ storeName, contactName, contactTel, contactEmail, orderNumber, customerName, content }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "送信に失敗しました");
      return;
    }
    setSuccess(true);
    setContent("");
    setOrderNumber("");
    setCustomerName("");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-50"
      >
        確認事項を問い合わせる
      </button>
    );
  }

  if (success) {
    return (
      <div className="card space-y-2">
        <p className="text-sm text-green-700">問い合わせを送信しました。運営側からの連絡をお待ちください。</p>
        <button type="button" onClick={() => setSuccess(false)} className="text-xs text-neutral-500 underline">
          続けて別の問い合わせを送る
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3">
      <h3 className="font-medium">{yearMonth}分の明細について問い合わせる</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-neutral-600">店舗名</label>
          <input className="input" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-neutral-600">担当者名</label>
          <input className="input" value={contactName} onChange={(e) => setContactName(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-sm text-neutral-600">担当者TEL</label>
          <input className="input" value={contactTel} onChange={(e) => setContactTel(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-neutral-600">担当者メールアドレス</label>
          <input
            type="email"
            className="input"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-neutral-600">受注番号</label>
          <input className="input" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-neutral-600">顧客名</label>
          <input className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-600">問い合わせ内容</label>
        <textarea
          className="input min-h-24"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-neutral-300 px-4 py-2 text-sm">
          キャンセル
        </button>
        <button type="submit" disabled={submitting} className="btn-primary text-sm">
          送信する
        </button>
      </div>
    </form>
  );
}
