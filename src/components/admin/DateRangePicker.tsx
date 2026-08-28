"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { rangeForShortcut, DATE_RANGE_SHORTCUT_LABELS, type DateRangeShortcut } from "@/lib/date-range";

const ALL_SHORTCUTS: DateRangeShortcut[] = ["today", "7days", "thisMonth", "lastMonth", "lastWeek", "thisYear"];

export function DateRangePicker({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function applyRange(newFrom: string, newTo: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", newFrom);
    params.set("to", newTo);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <input
        type="date"
        value={from}
        onChange={(e) => applyRange(e.target.value, to)}
        className="input w-auto"
      />
      <span className="text-neutral-400">〜</span>
      <input type="date" value={to} onChange={(e) => applyRange(from, e.target.value)} className="input w-auto" />
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
    </div>
  );
}
