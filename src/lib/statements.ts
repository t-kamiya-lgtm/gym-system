import type { SupabaseClient } from "@supabase/supabase-js";
import { getShippedPointsByStoreForMonth, getUnshippedCountByCorp } from "@/lib/order-lines";
import { unitPriceForPoints, monthDateRangeJst } from "@/lib/rewards";
import { sendStatementClosedNotification } from "@/lib/email";
import type { RewardTier } from "@/lib/types";

export interface Adjustment {
  id: string;
  storeId: string | null;
  amount: number;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export interface StoreStatementLine {
  storeId: string;
  storeName: string;
  points: number;
  unitPrice: number;
  rewardAmount: number;
  adjustments: Adjustment[];
  adjustmentTotal: number;
  finalAmount: number;
}

export interface CorporationStatement {
  corporationId: string;
  yearMonth: string;
  totalPoints: number;
  /** 店舗ごとの単価をポイント数で加重平均した参考値(店舗ごとの単価が異なる場合がある)。 */
  unitPrice: number;
  baseAmount: number;
  corpLevelAdjustments: Adjustment[];
  adjustmentTotal: number;
  finalAmount: number;
  /**
   * not_closed: 運営側の月末確定処理がまだ行われていない(明細行自体が存在しない)。
   * closed: 運営側が月末確定処理を行い、数値が固定された状態(法人側の同意待ち)。
   * agreed: 法人側が同意済み。
   */
  status: "not_closed" | "closed" | "agreed";
  agreedAt: string | null;
  agreedBy: string | null;
  stores: StoreStatementLine[];
}

async function buildStoreStatements(
  admin: SupabaseClient,
  corporationId: string,
  yearMonth: string,
): Promise<Omit<CorporationStatement, "status" | "agreedAt" | "agreedBy">> {
  const [storePoints, { data: tierRows }, { data: adjustmentRows }] = await Promise.all([
    getShippedPointsByStoreForMonth(admin, corporationId, yearMonth),
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

  // 単価は店舗単位の月間合計点数に応じて店舗ごとに決まる(決定事項)。
  const stores: StoreStatementLine[] = storePoints.map((store) => {
    const storeUnitPrice = unitPriceForPoints(store.points, tiers);
    const storeAdjustments = adjustments.filter((a) => a.storeId === store.storeId);
    const storeAdjustmentTotal = storeAdjustments.reduce((sum, a) => sum + a.amount, 0);
    const rewardAmount = store.points * storeUnitPrice;
    return {
      storeId: store.storeId,
      storeName: store.storeName,
      points: store.points,
      unitPrice: storeUnitPrice,
      rewardAmount,
      adjustments: storeAdjustments,
      adjustmentTotal: storeAdjustmentTotal,
      finalAmount: rewardAmount + storeAdjustmentTotal,
    };
  });

  const totalPoints = stores.reduce((sum, s) => sum + s.points, 0);
  const baseAmount = stores.reduce((sum, s) => sum + s.rewardAmount, 0);
  // 表示用の参考値(店舗ごとの単価が異なる場合があるため、ポイント数による加重平均で1つの値にする)。
  const unitPrice = totalPoints > 0 ? Math.round(baseAmount / totalPoints) : 0;

  return {
    corporationId,
    yearMonth,
    totalPoints,
    unitPrice,
    baseAmount,
    corpLevelAdjustments,
    adjustmentTotal,
    finalAmount: baseAmount + adjustmentTotal,
    stores,
  };
}

/**
 * 明細の表示用取得。運営側の月末確定処理を経て初めてgym_monthly_statementsの行が作られるため、
 * 行が存在しない場合は「未確定」を返す(従来のような都度ライブ計算は行わない)。
 * 行が存在する場合(closed/agreedいずれも)は、月末確定時点のスナップショットを固定表示する。
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

  if (!statementRow) {
    const { data: stores } = await admin.from("gym_stores").select("id, name").eq("corporation_id", corporationId);
    return {
      corporationId,
      yearMonth,
      totalPoints: 0,
      unitPrice: 0,
      baseAmount: 0,
      corpLevelAdjustments: [],
      adjustmentTotal: 0,
      finalAmount: 0,
      status: "not_closed",
      agreedAt: null,
      agreedBy: null,
      stores: (stores ?? []).map((s) => ({
        storeId: s.id,
        storeName: s.name,
        points: 0,
        unitPrice: 0,
        rewardAmount: 0,
        adjustments: [],
        adjustmentTotal: 0,
        finalAmount: 0,
      })),
    };
  }

  const [{ data: storeRows }, { data: stores }] = await Promise.all([
    admin
      .from("gym_monthly_statement_stores")
      .select("store_id, points, unit_price, reward_amount, adjustment_total, final_amount")
      .eq("statement_id", statementRow.id),
    admin.from("gym_stores").select("id, name").eq("corporation_id", corporationId),
  ]);
  const nameById = new Map((stores ?? []).map((s) => [s.id, s.name]));

  return {
    corporationId,
    yearMonth,
    totalPoints: statementRow.total_points ?? 0,
    unitPrice: statementRow.unit_price ?? 0,
    baseAmount: statementRow.base_amount ?? 0,
    corpLevelAdjustments: [],
    adjustmentTotal: statementRow.adjustment_total ?? 0,
    finalAmount: statementRow.final_amount ?? 0,
    status: statementRow.status as "closed" | "agreed",
    agreedAt: statementRow.agreed_at,
    agreedBy: statementRow.agreed_by,
    stores: (storeRows ?? []).map((r) => ({
      storeId: r.store_id,
      storeName: nameById.get(r.store_id) ?? "(削除済み店舗)",
      points: r.points,
      unitPrice: r.unit_price ?? 0,
      rewardAmount: r.reward_amount,
      adjustments: [],
      adjustmentTotal: r.adjustment_total,
      finalAmount: r.final_amount,
    })),
  };
}

/**
 * 運営側の月末確定(締め)処理。受注明細台帳(gym_order_lines)の出荷済行から集計し直し、
 * gym_monthly_statements / gym_monthly_statement_stores にスナップショットとして書き込む。
 * 既に締め済み・同意済みの月に対して呼び出した場合も同じロジックで再集計する(修正時の再計算を兼ねる)。
 * 再集計すると同意状況は必ずclosed(未同意)に戻り、法人側の再同意が必要になる。
 */
export async function closeMonthForCorporation(
  admin: SupabaseClient,
  corporationId: string,
  yearMonth: string,
  operatorEmail: string,
): Promise<CorporationStatement> {
  const computed = await buildStoreStatements(admin, corporationId, yearMonth);
  const closedAt = new Date().toISOString();

  const { data: statement, error } = await admin
    .from("gym_monthly_statements")
    .upsert(
      {
        corporation_id: corporationId,
        year_month: `${yearMonth}-01`,
        status: "closed",
        agreed_at: null,
        agreed_by: null,
        total_points: computed.totalPoints,
        unit_price: computed.unitPrice,
        base_amount: computed.baseAmount,
        adjustment_total: computed.adjustmentTotal,
        final_amount: computed.finalAmount,
        computed_at: closedAt,
        closed_by: operatorEmail,
      },
      { onConflict: "corporation_id,year_month" },
    )
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await admin.from("gym_monthly_statement_stores").delete().eq("statement_id", statement.id);
  if (computed.stores.length > 0) {
    const { error: insertError } = await admin.from("gym_monthly_statement_stores").insert(
      computed.stores.map((s) => ({
        statement_id: statement.id,
        store_id: s.storeId,
        points: s.points,
        unit_price: s.unitPrice,
        reward_amount: s.rewardAmount,
        adjustment_total: s.adjustmentTotal,
        final_amount: s.finalAmount,
      })),
    );
    if (insertError) throw new Error(insertError.message);
  }

  const { startDate, endDate } = monthDateRangeJst(yearMonth);
  for (const store of computed.stores) {
    const { error: lineUpdateError } = await admin
      .from("gym_order_lines")
      .update({ locked: true, statement_id: statement.id, unit_price_snapshot: store.unitPrice })
      .eq("corporation_id", corporationId)
      .eq("store_id", store.storeId)
      .eq("shipment_flag", "shipped")
      .gte("order_date", startDate)
      .lt("order_date", endDate);
    if (lineUpdateError) throw new Error(lineUpdateError.message);
  }

  await sendStatementClosedNotification(admin, corporationId, yearMonth);

  return { ...computed, status: "closed", agreedAt: null, agreedBy: null };
}

/**
 * 未確定(gym_monthly_statementsの行が存在しない)法人すべてを対象に、まとめて月末確定処理を行う。
 * 既に一度でも締め処理を行った法人(closed/agreed)は対象外(個別の「月末確定」ボタンで再集計する)。
 */
export async function bulkCloseMonth(
  admin: SupabaseClient,
  yearMonth: string,
  operatorEmail: string,
): Promise<{ closedCorporationIds: string[] }> {
  const [{ data: corporations }, { data: existingStatements }] = await Promise.all([
    admin.from("gym_corporations").select("id"),
    admin.from("gym_monthly_statements").select("corporation_id").eq("year_month", `${yearMonth}-01`),
  ]);
  const alreadyClosed = new Set((existingStatements ?? []).map((s) => s.corporation_id));
  const targets = (corporations ?? []).map((c) => c.id).filter((id) => !alreadyClosed.has(id));

  for (const corporationId of targets) {
    await closeMonthForCorporation(admin, corporationId, yearMonth, operatorEmail);
  }
  return { closedCorporationIds: targets };
}

export interface StatementMenuRow {
  corporationId: string;
  corporationName: string;
  orderCount: number;
  unshippedCount: number;
  unitPrice: number;
  finalAmount: number;
  status: "not_closed" | "closed" | "agreed";
}

/** 支払い明細メニュー画面用。対象月の全法人の状況を一覧で返す。 */
export async function getStatementMenuRows(admin: SupabaseClient, yearMonth: string): Promise<StatementMenuRow[]> {
  const [{ data: corporations }, { data: statementRows }, unshippedCountByCorp] = await Promise.all([
    admin.from("gym_corporations").select("id, name").order("name"),
    admin
      .from("gym_monthly_statements")
      .select("corporation_id, status, unit_price, final_amount")
      .eq("year_month", `${yearMonth}-01`),
    getUnshippedCountByCorp(admin, yearMonth),
  ]);
  const statementByCorp = new Map((statementRows ?? []).map((s) => [s.corporation_id, s]));

  const { startDate, endDate } = monthDateRangeJst(yearMonth);
  const { data: lines } = await admin
    .from("gym_order_lines")
    .select("corporation_id")
    .eq("shipment_flag", "shipped")
    .gte("order_date", startDate)
    .lt("order_date", endDate);
  const countByCorp = new Map<string, number>();
  for (const l of lines ?? []) {
    countByCorp.set(l.corporation_id, (countByCorp.get(l.corporation_id) ?? 0) + 1);
  }

  return (corporations ?? []).map((c) => {
    const s = statementByCorp.get(c.id);
    return {
      corporationId: c.id,
      corporationName: c.name,
      orderCount: countByCorp.get(c.id) ?? 0,
      unshippedCount: unshippedCountByCorp.get(c.id) ?? 0,
      unitPrice: s?.unit_price ?? 0,
      finalAmount: s?.final_amount ?? 0,
      status: (s?.status as "closed" | "agreed" | undefined) ?? "not_closed",
    };
  });
}

/** 法人側の同意操作。運営側が月末確定済み(closed)の明細のみ同意できる。 */
export async function agreeToStatement(
  admin: SupabaseClient,
  corporationId: string,
  yearMonth: string,
  agreedByPartnerId: string,
): Promise<void> {
  const { data: statementRow } = await admin
    .from("gym_monthly_statements")
    .select("id, status")
    .eq("corporation_id", corporationId)
    .eq("year_month", `${yearMonth}-01`)
    .maybeSingle();

  if (!statementRow) {
    throw new Error("まだ運営側の月末確定処理が行われていません");
  }
  if (statementRow.status === "agreed") {
    return;
  }

  const { error } = await admin
    .from("gym_monthly_statements")
    .update({ status: "agreed", agreed_at: new Date().toISOString(), agreed_by: agreedByPartnerId })
    .eq("id", statementRow.id);
  if (error) throw new Error(error.message);
}

/**
 * 運営側による同意済み明細のロック解除。同意状況をclosed(未同意)へ戻すのみで、
 * 数値の再集計は行わない(受注明細の修正等で数値も変える場合はcloseMonthForCorporationを使う)。
 * 明細が存在しない、またはまだ同意されていない場合は何もしない。
 */
export async function reopenStatement(
  admin: SupabaseClient,
  corporationId: string,
  yearMonth: string,
): Promise<void> {
  await admin
    .from("gym_monthly_statements")
    .update({ status: "closed", agreed_at: null, agreed_by: null })
    .eq("corporation_id", corporationId)
    .eq("year_month", `${yearMonth}-01`)
    .eq("status", "agreed");
}
