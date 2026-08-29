/**
 * 日本の祝日判定(振込予定日の営業日調整用)。内閣府の祝日法(ハッピーマンデー・振替休日を含む)に
 * 基づく標準的な計算式のみで判定する。オリンピック開催に伴う一時的な祝日移動(2020・2021年の
 * 海の日・スポーツの日等)は将来の日付には影響しないため考慮しない。
 * 春分の日・秋分の日は1980〜2099年に有効とされる近似式を使用。
 */

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function nthMondayOfMonth(year: number, month1: number, nth: number): Date {
  const first = new Date(Date.UTC(year, month1 - 1, 1));
  const firstMonday = 1 + ((8 - first.getUTCDay()) % 7);
  return new Date(Date.UTC(year, month1 - 1, firstMonday + (nth - 1) * 7));
}

function vernalEquinoxDay(year: number): number {
  return Math.floor(20.8431 + 0.242194 * (year - 1980)) - Math.floor((year - 1980) / 4);
}

function autumnalEquinoxDay(year: number): number {
  return Math.floor(23.2488 + 0.242194 * (year - 1980)) - Math.floor((year - 1980) / 4);
}

function baseHolidaysForYear(year: number): Map<string, string> {
  const map = new Map<string, string>();
  const add = (month1: number, day: number, name: string) =>
    map.set(toDateStr(new Date(Date.UTC(year, month1 - 1, day))), name);

  add(1, 1, "元日");
  map.set(toDateStr(nthMondayOfMonth(year, 1, 2)), "成人の日");
  add(2, 11, "建国記念の日");
  add(2, 23, "天皇誕生日");
  map.set(toDateStr(new Date(Date.UTC(year, 2, vernalEquinoxDay(year)))), "春分の日");
  add(4, 29, "昭和の日");
  add(5, 3, "憲法記念日");
  add(5, 4, "みどりの日");
  add(5, 5, "こどもの日");
  map.set(toDateStr(nthMondayOfMonth(year, 7, 3)), "海の日");
  add(8, 11, "山の日");
  map.set(toDateStr(nthMondayOfMonth(year, 9, 3)), "敬老の日");
  map.set(toDateStr(new Date(Date.UTC(year, 8, autumnalEquinoxDay(year)))), "秋分の日");
  map.set(toDateStr(nthMondayOfMonth(year, 10, 2)), "スポーツの日");
  add(11, 3, "文化の日");
  add(11, 23, "勤労感謝の日");
  return map;
}

function isNamedHoliday(dateStr: string): boolean {
  const year = Number(dateStr.slice(0, 4));
  const holidays = new Map([
    ...baseHolidaysForYear(year - 1),
    ...baseHolidaysForYear(year),
    ...baseHolidaysForYear(year + 1),
  ]);
  return holidays.has(dateStr);
}

function addDaysUtc(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateStr(d);
}

/**
 * 振替休日(祝日が日曜の場合、その後最初の祝日でない日を休日とする。連休が続く場合も遡って判定)、
 * および国民の休日(前後を祝日に挟まれた平日も休日とする、秋分の日前後のシルバーウィーク等)を
 * 含めて祝日か判定する。
 */
export function isJpHoliday(dateStr: string): boolean {
  if (isNamedHoliday(dateStr)) return true;

  // 振替休日: 直前の日から遡り、祝日が連続する限り遡って、日曜起点の祝日にたどり着けば休日。
  let cursor = dateStr;
  for (;;) {
    cursor = addDaysUtc(cursor, -1);
    if (!isNamedHoliday(cursor)) break;
    if (new Date(`${cursor}T00:00:00Z`).getUTCDay() === 0) return true;
  }

  // 国民の休日: 前日・翌日がともに祝日(日曜以外)である平日も休日とする。
  if (isNamedHoliday(addDaysUtc(dateStr, -1)) && isNamedHoliday(addDaysUtc(dateStr, 1))) {
    return true;
  }

  return false;
}

function isWeekend(dateStr: string): boolean {
  const day = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

/** 土日祝日の場合、直前の平日まで遡る。 */
export function previousBusinessDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  while (isWeekend(toDateStr(d)) || isJpHoliday(toDateStr(d))) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return toDateStr(d);
}
