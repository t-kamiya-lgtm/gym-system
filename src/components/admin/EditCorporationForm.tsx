"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  corporationId: string;
  initial: {
    name: string;
    invoiceRegistered: boolean;
    invoiceRegistrationNumber: string | null;
    address: string | null;
    tel: string | null;
    hpUrl: string | null;
    contactName: string | null;
    contactTel: string | null;
    contactEmail: string | null;
    bankName: string | null;
    bankBranchName: string | null;
    bankAccountType: "ordinary" | "checking" | null;
    bankAccountNumber: string | null;
    bankAccountHolder: string | null;
  };
}

export function EditCorporationForm({ corporationId, initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [invoiceRegistered, setInvoiceRegistered] = useState(initial.invoiceRegistered);
  const [invoiceRegistrationNumber, setInvoiceRegistrationNumber] = useState(
    initial.invoiceRegistrationNumber ?? "",
  );
  const [address, setAddress] = useState(initial.address ?? "");
  const [tel, setTel] = useState(initial.tel ?? "");
  const [hpUrl, setHpUrl] = useState(initial.hpUrl ?? "");
  const [contactName, setContactName] = useState(initial.contactName ?? "");
  const [contactTel, setContactTel] = useState(initial.contactTel ?? "");
  const [contactEmail, setContactEmail] = useState(initial.contactEmail ?? "");
  const [bankName, setBankName] = useState(initial.bankName ?? "");
  const [bankBranchName, setBankBranchName] = useState(initial.bankBranchName ?? "");
  const [bankAccountType, setBankAccountType] = useState(initial.bankAccountType ?? "ordinary");
  const [bankAccountNumber, setBankAccountNumber] = useState(initial.bankAccountNumber ?? "");
  const [bankAccountHolder, setBankAccountHolder] = useState(initial.bankAccountHolder ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    const res = await fetch(`/api/admin/corporations/${corporationId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        invoiceRegistered,
        invoiceRegistrationNumber: invoiceRegistered ? invoiceRegistrationNumber : null,
        address: address || null,
        tel: tel || null,
        hpUrl: hpUrl || null,
        contactName: contactName || null,
        contactTel: contactTel || null,
        contactEmail: contactEmail || null,
        bankName: bankName || null,
        bankBranchName: bankBranchName || null,
        bankAccountType: bankName ? bankAccountType : null,
        bankAccountNumber: bankAccountNumber || null,
        bankAccountHolder: bankAccountHolder || null,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "更新に失敗しました");
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3">
      <h2 className="font-medium">法人マスタ編集</h2>
      <div>
        <label className="mb-1 block text-sm text-neutral-600">法人名</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-600">住所</label>
        <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-600">TEL</label>
        <input className="input" value={tel} onChange={(e) => setTel(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-600">HP URL</label>
        <input className="input" value={hpUrl} onChange={(e) => setHpUrl(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-600">担当者名</label>
        <input className="input" value={contactName} onChange={(e) => setContactName(e.target.value)} />
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
          <label className="mb-1 block text-sm text-neutral-600">インボイス登録番号(相手方・宛名欄に記載)</label>
          <input
            className="input"
            placeholder="T1234567890123"
            value={invoiceRegistrationNumber}
            onChange={(e) => setInvoiceRegistrationNumber(e.target.value)}
            required
          />
        </div>
      )}

      <div className="space-y-3 border-t border-neutral-100 pt-3">
        <h3 className="text-sm font-medium">振込先銀行口座(支払い明細書に記載)</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-neutral-600">銀行名</label>
            <input className="input" value={bankName} onChange={(e) => setBankName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">支店名</label>
            <input className="input" value={bankBranchName} onChange={(e) => setBankBranchName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">口座種別</label>
            <select
              className="input"
              value={bankAccountType}
              onChange={(e) => setBankAccountType(e.target.value as "ordinary" | "checking")}
            >
              <option value="ordinary">普通</option>
              <option value="checking">当座</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">口座番号</label>
            <input
              className="input"
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-neutral-600">口座名義(カナ)</label>
            <input
              className="input"
              value={bankAccountHolder}
              onChange={(e) => setBankAccountHolder(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">更新しました。</p>}
      <button type="submit" disabled={submitting} className="btn-primary text-sm">
        更新
      </button>
    </form>
  );
}
