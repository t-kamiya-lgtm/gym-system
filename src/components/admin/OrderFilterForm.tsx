"use client";

import { useState, type FormEvent } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function OrderFilterForm({
  corpNames,
  storeNames,
  corp,
  store,
  q,
}: {
  corpNames?: string[];
  storeNames: string[];
  corp?: string;
  store?: string;
  q?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [corpValue, setCorpValue] = useState(corp ?? "");
  const [storeValue, setStoreValue] = useState(store ?? "");
  const [qValue, setQValue] = useState(q ?? "");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // from/toは現在のURL(DateRangePickerが即時に反映する値)からそのまま引き継ぐ。
    // サーバー再取得完了前でもuseSearchParamsは最新のURLを反映するため、
    // 期間変更直後に絞り込みを押しても古い期間に戻ることはない。
    const params = new URLSearchParams(searchParams.toString());
    if (corpNames !== undefined) {
      if (corpValue) params.set("corp", corpValue);
      else params.delete("corp");
    }
    if (storeValue) params.set("store", storeValue);
    else params.delete("store");
    if (qValue) params.set("q", qValue);
    else params.delete("q");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-wrap items-end gap-3 text-sm">
      {corpNames !== undefined && (
        <div>
          <label className="mb-1 block text-neutral-600">法人名</label>
          <select value={corpValue} onChange={(e) => setCorpValue(e.target.value)} className="input w-auto">
            <option value="">すべて</option>
            {corpNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="mb-1 block text-neutral-600">店舗名</label>
        <select value={storeValue} onChange={(e) => setStoreValue(e.target.value)} className="input w-auto">
          <option value="">すべて</option>
          {storeNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-neutral-600">注文番号検索</label>
        <input
          type="text"
          value={qValue}
          onChange={(e) => setQValue(e.target.value)}
          placeholder="注文番号"
          className="input w-auto"
        />
      </div>
      <button type="submit" className="btn-primary text-sm">
        絞り込む
      </button>
    </form>
  );
}
