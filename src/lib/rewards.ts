import type { RewardTier } from "@/lib/types";

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
