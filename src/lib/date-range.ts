export type DateRangeShortcut = "today" | "7days" | "thisMonth" | "lastMonth" | "lastWeek" | "thisYear";

function todayJst(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

function addDaysJst(dateStr: string, days: number): string {
  // 相対日数のシフトのみなので、サーバーのローカルタイムゾーンがUTC(DSTなし)であれば安全。
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

function pad(n: number, len = 2): string {
  return String(n).padStart(len, "0");
}

/**
 * 年月(1-indexed月)に対して月単位のオフセットを加算した年月を返す。
 * Dateオブジェクトのタイムゾーン依存な月操作(setMonth等)は、サーバーのローカルタイムゾーンが
 * JSTでない場合に日付がズレる(例: 月初が前日UTC基準になり1日ずれる)ため、
 * 純粋な整数演算のみで計算する。
 */
function addMonths(y: number, m: number, delta: number): { y: number; m: number } {
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  return { y: ny, m: nm + 1 };
}

function daysInMonth(y: number, m: number): number {
  // m(1-indexed)の月末日。UTC基準の日数計算のみで時刻成分を含まないため安全。
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** JSTでの「YYYY-MM-01」を返す。 */
function firstOfMonthJst(dateStr: string, monthOffset = 0): string {
  const [y, m] = dateStr.split("-").map(Number);
  const { y: ny, m: nm } = addMonths(y, m, monthOffset);
  return `${pad(ny, 4)}-${pad(nm)}-01`;
}

function lastOfMonthJst(dateStr: string, monthOffset = 0): string {
  const [y, m] = dateStr.split("-").map(Number);
  const { y: ny, m: nm } = addMonths(y, m, monthOffset);
  return `${pad(ny, 4)}-${pad(nm)}-${pad(daysInMonth(ny, nm))}`;
}

/** 曜日(0=日,1=月...)。Date#getDay()はサーバーのローカルタイムゾーン依存のため使わない。 */
function dayOfWeekJst(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
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
      const day = dayOfWeekJst(today);
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

/** JSTの'YYYY-MM-DD'(from/to、両端含む)から、date型カラム比較用の[開始日, 終了日)を'YYYY-MM-DD'で作る。 */
export function dayRangeJstToDates(from: string, to: string): { startDate: string; endDate: string } {
  return { startDate: from, endDate: addDaysJst(to, 1) };
}

/** 任意のISOタイムスタンプをJSTの'YYYY-MM-DD'に変換する。 */
export function dateJstFromIso(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

/** 'YYYY-MM'の翌月末日を'YYYY-MM-DD'で返す(振込予定日の起点計算用)。 */
export function lastDayOfNextMonthJst(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const { y: ny, m: nm } = addMonths(y, m, 1);
  return `${pad(ny, 4)}-${pad(nm)}-${pad(daysInMonth(ny, nm))}`;
}
