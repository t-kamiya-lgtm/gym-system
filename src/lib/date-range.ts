export type DateRangeShortcut = "today" | "7days" | "thisMonth" | "lastMonth" | "lastWeek" | "thisYear";

function todayJst(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

function addDaysJst(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

/** JSTでの「YYYY-MM-01」を返す。 */
function firstOfMonthJst(dateStr: string, monthOffset = 0): string {
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  d.setMonth(d.getMonth() + monthOffset, 1);
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

function lastOfMonthJst(dateStr: string, monthOffset = 0): string {
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  d.setMonth(d.getMonth() + monthOffset + 1, 0);
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

export function rangeForShortcut(shortcut: DateRangeShortcut): { from: string; to: string } {
  const today = todayJst();
  switch (shortcut) {
    case "today":
      return { from: today, to: today };
    case "7days":
      return { from: addDaysJst(today, -6), to: today };
    case "thisMonth":
      return { from: firstOfMonthJst(today), to: today };
    case "lastMonth":
      return { from: firstOfMonthJst(today, -1), to: lastOfMonthJst(today, -1) };
    case "lastWeek": {
      // 直近の月曜始まり週の前の週(月〜日)
      const d = new Date(`${today}T00:00:00+09:00`);
      const day = d.getDay(); // 0=日,1=月...
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const thisMonday = addDaysJst(today, mondayOffset);
      const lastMonday = addDaysJst(thisMonday, -7);
      const lastSunday = addDaysJst(thisMonday, -1);
      return { from: lastMonday, to: lastSunday };
    }
    case "thisYear":
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    default:
      return { from: firstOfMonthJst(today), to: today };
  }
}

export const DATE_RANGE_SHORTCUT_LABELS: Record<DateRangeShortcut, string> = {
  today: "当日",
  "7days": "直近7日間",
  thisMonth: "当月",
  lastMonth: "前月",
  lastWeek: "前週",
  thisYear: "年間",
};

/** JSTの'YYYY-MM-DD'(from/to、両端含む)から、UTC ISOの[開始, 終了)範囲を作る。 */
export function dayRangeJstToIso(from: string, to: string): { startIso: string; endIso: string } {
  const start = new Date(`${from}T00:00:00+09:00`);
  const endExclusive = new Date(`${to}T00:00:00+09:00`);
  endExclusive.setDate(endExclusive.getDate() + 1);
  return { startIso: start.toISOString(), endIso: endExclusive.toISOString() };
}

export function defaultRange(): { from: string; to: string } {
  return rangeForShortcut("thisMonth");
}
