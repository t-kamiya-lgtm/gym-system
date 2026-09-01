"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { rangeForShortcut, DATE_RANGE_SHORTCUT_LABELS, type DateRangeShortcut } from "@/lib/date-range";

const ALL_SHORTCUTS: DateRangeShortcut[] = ["today", "7days", "thisMonth", "lastMonth", "lastWeek", "thisYear"];

export function DateRangePicker({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // 表示上の選択日は、サーバー側の再取得(遅い場合がある)を待たずに即座に反映する。
  // props(from/to)が外部要因(戻る/進むボタン等)で変わった場合は、レンダー中に同期する。
  const [prevFrom, setPrevFrom] = useState(from);
  const [prevTo, setPrevTo] = useState(to);
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo, setLocalTo] = useState(to);
  if (from !== prevFrom) {
    setPrevFrom(from);
    setLocalFrom(from);
  }
  if (to !== prevTo) {
    setPrevTo(to);
    setLocalTo(to);
  }

  function applyRange(newFrom: string, newTo: string) {
    setLocalFrom(newFrom);
    setLocalTo(newTo);
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", newFrom);
    params.set("to", newTo);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <input
        type="date"
        value={localFrom}
        onChange={(e) => applyRange(e.target.value, localTo)}
        className="input w-auto"
      />
      <span className="text-neutral-400">〜</span>
      <input
        type="date"
        value={localTo}
        onChange={(e) => applyRange(localFrom, e.target.value)}
        className="input w-auto"
      />
      <div className="flex flex-wrap gap-1">
        {ALL_SHORTCUTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              const r = rangeForShortcut(s);
              applyRange(r.from, r.to);
            }}
            className="whitespace-nowrap rounded border border-neutral-300 px-2 py-1 text-xs transition hover:bg-neutral-50"
          >
            {DATE_RANGE_SHORTCUT_LABELS[s]}
          </button>
        ))}
      </div>
      {isPending && (
        <span className="flex items-center gap-1 text-xs text-neutral-400" role="status">
          <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          更新中…
        </span>
      )}
    </div>
  );
}
