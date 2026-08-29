import type { RewardTier } from "@/lib/types";
import { lastDayOfNextMonthJst } from "@/lib/date-range";
import { previousBusinessDay } from "@/lib/jp-holidays";

/**
 * 月間合計点数(店舗単位、法人はその配下店舗の合計)に応じて一律の単価を適用する。
 * 段階制ではなく、該当する区分の単価を全点数に一律適用する。
 * 例: 10点→10×450円=4,500円。100点→100×600円=60,000円。
 */
export function unitPriceForPoints(totalPoints: number, tiers: RewardTier[]): number {
  const tier = tiers.find(
    (t) => totalPoints >= t.minPoints && (t.maxPoints === null || totalPoints <= t.maxPoints),
  );
  return tier?.unitPrice ?? 0;
}

export function computeRewardAmount(totalPoints: number, tiers: RewardTier[]): number {
  return totalPoints * unitPriceForPoints(totalPoints, tiers);
}

/** JSTの'YYYY-MM'から、その月の[開始, 翌月開始)のUTC ISO文字列範囲を作る。 */
export function monthRangeJst(yearMonth: string): { startIso: string; endIso: string } {
  const [y, m] = yearMonth.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, -9, 0, 0)); // JST 00:00 = UTC-9h
  const end = new Date(Date.UTC(y, m, 1, -9, 0, 0));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export function currentYearMonthJst(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }).slice(0, 7);
}

/** 振込予定日(対象月の翌月末日。土日祝日の場合はそれより前の直近平日)。 */
export function transferDueDateJst(yearMonth: string): string {
  return previousBusinessDay(lastDayOfNextMonthJst(yearMonth));
}

/** 前月の'YYYY-MM'(JST基準)。支払い明細メニューのデフォルト対象月に使う。 */
export function previousYearMonthJst(): string {
  const [y, m] = currentYearMonthJst().split("-").map(Number);
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  return `${py}-${String(pm).padStart(2, "0")}`;
}

/** JSTの'YYYY-MM'から、その月の[開始日, 翌月開始日)を'YYYY-MM-DD'(date型カラム比較用)で返す。 */
export function monthDateRangeJst(yearMonth: string): { startDate: string; endDate: string } {
  const [y, m] = yearMonth.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const startDate = `${yearMonth}-01`;
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const endDate = `${nextY}-${pad(nextM)}-01`;
  return { startDate, endDate };
}

export interface DailyPointRow {
  date: string;
  points: number;
}

/** 出荷日(JST)ごとの点数内訳。月次明細の合計欄の元になる日別件数。 */
export function dailyPointBreakdown(orders: { shippedAt: string; quantity: number }[]): DailyPointRow[] {
  const byDate = new Map<string, number>();
  for (const o of orders) {
    const date = new Date(o.shippedAt).toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
    byDate.set(date, (byDate.get(date) ?? 0) + o.quantity);
  }
  return Array.from(byDate.entries())
    .map(([date, points]) => ({ date, points }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}
