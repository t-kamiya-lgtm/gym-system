/**
 * 税込金額から消費税額を算出する(pm-chat-bot側のスマレジ連携と同じ計算式: 切り捨て)。
 * 商品価格は税込表示のため、注文金額(amount等)は税込として扱う。
 */
export function calcTax(priceInclTax: number, taxRatePercent: number): number {
  return Math.floor(priceInclTax - priceInclTax / (1 + taxRatePercent / 100));
}

export function calcTaxExcluded(priceInclTax: number, taxRatePercent: number): number {
  return priceInclTax - calcTax(priceInclTax, taxRatePercent);
}

/** 生年月日から満年齢を算出する。 */
export function calcAge(birthDate: string | null, on: Date = new Date()): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  let age = on.getFullYear() - birth.getFullYear();
  const monthDiff = on.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && on.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}
