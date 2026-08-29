"use client";

import { useState } from "react";

export function MemberNoteEditor({
  storeId,
  customerId,
  initialMemo1,
  initialMemo2,
}: {
  storeId: string;
  customerId: string;
  initialMemo1: string;
  initialMemo2: string;
}) {
  const [memo1, setMemo1] = useState(initialMemo1);
  const [memo2, setMemo2] = useState(initialMemo2);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/partner/customer-notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ storeId, customerId, memo1: memo1 || null, memo2: memo2 || null }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <input
        type="text"
        value={memo1}
        onChange={(e) => {
          setMemo1(e.target.value);
          setSaved(false);
        }}
        placeholder="メモ1(担当者名等)"
        className="w-32 rounded border border-neutral-300 px-1.5 py-1 text-xs"
      />
      <input
        type="text"
        value={memo2}
        onChange={(e) => {
          setMemo2(e.target.value);
          setSaved(false);
        }}
        placeholder="メモ2(会員番号等)"
        className="w-32 rounded border border-neutral-300 px-1.5 py-1 text-xs"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded border border-neutral-300 px-2 py-1 text-xs transition hover:bg-neutral-50"
      >
        {saved ? "保存済" : "保存"}
      </button>
    </div>
  );
}
