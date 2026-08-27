import type { SupabaseClient } from "@supabase/supabase-js";
import { getStorePointsForCorporation, type StorePoints } from "@/lib/points";
import { unitPriceForPoints } from "@/lib/rewards";
import type { RewardTier } from "@/lib/types";

export interface Adjustment {
  id: string;
  storeId: string | null;
  amount: number;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export interface StoreStatement extends StorePoints {
  rewardAmount: number;
  adjustments: Adjustment[];
  adjustmentTotal: number;
  finalAmount: number;
}

export interface CorporationStatement {
  corporationId: string;
  yearMonth: string;
  totalPoints: number;
  unitPrice: number;
  baseAmount: number;
  corpLevelAdjustments: Adjustment[];
  adjustmentTotal: number;
  finalAmount: number;
  status: "draft" | "agreed";
  agreedAt: string | null;
  agreedBy: string | null;
  stores: StoreStatement[];
}

/**
 * 単価の判定は「法人配下の店舗合計」の点数で行い(決定: 法人はその配下店舗の合計)、
 * 決定した単価を各店舗の点数にも一律適用して店舗別の内訳を出す。
 * 手動調整は明細確定後のキャンセル反映漏れ・計算エラーを吸収するための加算/減算で、
 * 都度再計算されるベース金額に上乗せする(同意はロックではなく支払い実行のトリガー)。
 */
export async function getCorporationStatement(
  admin: SupabaseClient,
  corporationId: string,
  yearMonth: string,
): Promise<CorporationStatement> {
  const [{ stores }, { data: tierRows }, { data: adjustmentRows }, { data: statementRow }] = await Promise.all([
    getStorePointsForCorporation(admin, corporationId, yearMonth),
    admin.from("gym_reward_tiers").select("min_points, max_points, unit_price").order("min_points"),
    admin
      .from("gym_statement_adjustments")
      .select("id, store_id, amount, reason, created_by, created_at")
      .eq("corporation_id", corporationId)
      .eq("year_month", `${yearMonth}-01`),
    admin
      .from("gym_monthly_statements")
      .select("status, agreed_at, agreed_by")
      .eq("corporation_id", corporationId)
      .eq("year_month", `${yearMonth}-01`)
      .maybeSingle(),
  ]);

  const tiers: RewardTier[] = (tierRows ?? []).map((t) => ({
    minPoints: t.min_points,
    maxPoints: t.max_points,
    unitPrice: t.unit_price,
  }));

  const totalPoints = stores.reduce((sum, s) => sum + s.points, 0);
  const unitPrice = unitPriceForPoints(totalPoints, tiers);
  const baseAmount = totalPoints * unitPrice;

  const adjustments: Adjustment[] = (adjustmentRows ?? []).map((a) => ({
    id: a.id,
    storeId: a.store_id,
    amount: a.amount,
    reason: a.reason,
    createdBy: a.created_by,
    createdAt: a.created_at,
  }));
  const corpLevelAdjustments = adjustments.filter((a) => a.storeId === null);
  const adjustmentTotal = adjustments.reduce((sum, a) => sum + a.amount, 0);

  const storeStatements: StoreStatement[] = stores.map((store) => {
    const storeAdjustments = adjustments.filter((a) => a.storeId === store.storeId);
    const storeAdjustmentTotal = storeAdjustments.reduce((sum, a) => sum + a.amount, 0);
    const rewardAmount = store.points * unitPrice;
    return {
      ...store,
      rewardAmount,
      adjustments: storeAdjustments,
      adjustmentTotal: storeAdjustmentTotal,
      finalAmount: rewardAmount + storeAdjustmentTotal,
    };
  });

  return {
    corporationId,
    yearMonth,
    totalPoints,
    unitPrice,
    baseAmount,
    corpLevelAdjustments,
    adjustmentTotal,
    finalAmount: baseAmount + adjustmentTotal,
    status: (statementRow?.status as "draft" | "agreed") ?? "draft",
    agreedAt: statementRow?.agreed_at ?? null,
    agreedBy: statementRow?.agreed_by ?? null,
    stores: storeStatements,
  };
}
