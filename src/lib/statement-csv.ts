import type { StoreOrderRow } from "@/lib/points";

/** 月次明細のCSV(購入明細)。日付, 会員名, 購入点数, 商品種別(単品/定期(頻度))、末尾に合計件数行。 */
export function buildStatementCsv(orders: StoreOrderRow[]): string {
  const sorted = [...orders].sort((a, b) => (a.shippedAt < b.shippedAt ? -1 : 1));
  const rows: string[] = ["日付,会員名,購入点数,商品種別"];

  let totalPoints = 0;
  for (const o of sorted) {
    const date = new Date(o.shippedAt).toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
    const typeLabel =
      o.type === "subscription" ? `定期(${o.subscriptionIntervalLabel ?? "-"})` : "単品";
    totalPoints += o.quantity;
    rows.push([date, csvEscape(o.customerName), String(o.quantity), csvEscape(typeLabel)].join(","));
  }
  rows.push(`合計件数,,${totalPoints},`);

  return `﻿${rows.join("\n")}`;
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
