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
  /** trueの場合、法人側同意時点のスナップショットを表示している(都度のライブ再計算ではない)。 */
  locked: boolean;
  agreedAt: string | null;
  agreedBy: string | null;
  stores: StoreStatement[];
}

/**
 * 単価の判定は「法人配下の店舗合計」の点数で行い(決定: 法人はその配下店舗の合計)、
 * 決定した単価を各店舗の点数にも一律適用して店舗別の内訳を出す。
 * 手動調整は明細確定後のキャンセル反映漏れ・計算エラーを吸収するための加算/減算。
 */
async function computeLiveStatement(
  admin: SupabaseClient,
  corporationId: string,
  yearMonth: string,
): Promise<Omit<CorporationStatement, "status" | "locked" | "agreedAt" | "agreedBy">> {
  const [{ stores }, { data: tierRows }, { data: adjustmentRows }] = await Promise.all([
    getStorePointsForCorporation(admin, corporationId, yearMonth),
    admin.from("gym_reward_tiers").select("min_points, max_points, unit_price").order("min_points"),
    admin
      .from("gym_statement_adjustments")
      .select("id, store_id, amount, reason, created_by, created_at")
      .eq("corporation_id", corporationId)
      .eq("year_month", `${yearMonth}-01`),
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
    stores: storeStatements,
  };
}

/**
 * 未同意(draft)の間は都度ライブ計算(画面を開いた時点の最新DB値)、
 * 同意(agreed)後は同意時点のスナップショットを固定表示する(ロック)。
 * ロック後の修正は運営側管理画面からのみ行い、修正すると再びdraftに戻る。
 */
export async function getCorporationStatement(
  admin: SupabaseClient,
  corporationId: string,
  yearMonth: string,
): Promise<CorporationStatement> {
  const { data: statementRow } = await admin
    .from("gym_monthly_statements")
    .select("id, status, agreed_at, agreed_by, total_points, unit_price, base_amount, adjustment_total, final_amount")
    .eq("corporation_id", corporationId)
    .eq("year_month", `${yearMonth}-01`)
    .maybeSingle();

  if (statementRow?.status === "agreed") {
    const [{ data: storeRows }, { data: stores }, { data: corporation }] = await Promise.all([
      admin
        .from("gym_monthly_statement_stores")
        .select("store_id, points, reward_amount, adjustment_total, final_amount")
        .eq("statement_id", statementRow.id),
      admin.from("gym_stores").select("id, name").eq("corporation_id", corporationId),
      admin.from("gym_corporations").select("name").eq("id", corporationId).maybeSingle(),
    ]);
    const nameById = new Map((stores ?? []).map((s) => [s.id, s.name]));
    const corporationName = corporation?.name ?? "";

    return {
      corporationId,
      yearMonth,
      totalPoints: statementRow.total_points ?? 0,
      unitPrice: statementRow.unit_price ?? 0,
      baseAmount: statementRow.base_amount ?? 0,
      corpLevelAdjustments: [],
      adjustmentTotal: statementRow.adjustment_total ?? 0,
      finalAmount: statementRow.final_amount ?? 0,
      status: "agreed",
      locked: true,
      agreedAt: statementRow.agreed_at,
      agreedBy: statementRow.agreed_by,
      stores: (storeRows ?? []).map((r) => ({
        storeId: r.store_id,
        storeName: nameById.get(r.store_id) ?? "(削除済み店舗)",
        corporationId,
        corporationName,
        points: r.points,
        orderCount: 0,
        revenue: 0,
        oneTimeRevenue: 0,
        oneTimePoints: 0,
        subscriptionRevenue: 0,
        subscriptionPoints: 0,
        orders: [],
        rewardAmount: r.reward_amount,
        adjustments: [],
        adjustmentTotal: r.adjustment_total,
        finalAmount: r.final_amount,
      })),
    };
  }

  const live = await computeLiveStatement(admin, corporationId, yearMonth);
  return {
    ...live,
    status: "draft",
    locked: false,
    agreedAt: statementRow?.agreed_at ?? null,
    agreedBy: statementRow?.agreed_by ?? null,
  };
}

/** 法人側の同意操作。その時点のライブ計算結果をスナップショットとして固定する。 */
export async function agreeToStatement(
  admin: SupabaseClient,
  corporationId: string,
  yearMonth: string,
  agreedByPartnerId: string,
): Promise<void> {
  const live = await computeLiveStatement(admin, corporationId, yearMonth);
  const agreedAt = new Date().toISOString();

  const { data: statement, error } = await admin
    .from("gym_monthly_statements")
    .upsert(
      {
        corporation_id: corporationId,
        year_month: `${yearMonth}-01`,
        status: "agreed",
        agreed_at: agreedAt,
        agreed_by: agreedByPartnerId,
        total_points: live.totalPoints,
        unit_price: live.unitPrice,
        base_amount: live.baseAmount,
        adjustment_total: live.adjustmentTotal,
        final_amount: live.finalAmount,
        computed_at: agreedAt,
      },
      { onConflict: "corporation_id,year_month" },
    )
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await admin.from("gym_monthly_statement_stores").delete().eq("statement_id", statement.id);
  if (live.stores.length > 0) {
    const { error: insertError } = await admin.from("gym_monthly_statement_stores").insert(
      live.stores.map((s) => ({
        statement_id: statement.id,
        store_id: s.storeId,
        points: s.points,
        reward_amount: s.rewardAmount,
        adjustment_total: s.adjustmentTotal,
        final_amount: s.finalAmount,
      })),
    );
    if (insertError) throw new Error(insertError.message);
  }
}

/**
 * 運営側による明細のロック解除(修正)。同意済みの明細をdraftへ戻し、
 * 法人側は再度ライブ計算後の内容を確認して同意し直す必要がある。
 * 明細がまだdraft、または存在しない場合は何もしない。
 */
export async function reopenStatement(
  admin: SupabaseClient,
  corporationId: string,
  yearMonth: string,
): Promise<void> {
  await admin
    .from("gym_monthly_statements")
    .update({ status: "draft", agreed_at: null, agreed_by: null })
    .eq("corporation_id", corporationId)
    .eq("year_month", `${yearMonth}-01`)
    .eq("status", "agreed");
}
