import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireOperator } from "@/lib/require-operator-role";
import { getStorePointsForCorporation } from "@/lib/points";
import { buildStatementCsv } from "@/lib/statement-csv";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ corporationId: string; ym: string }> },
) {
  const check = await requireOperator();
  if (!check.ok) return check.response;

  const { corporationId, ym } = await params;
  const admin = createSupabaseAdminClient();

  const { stores } = await getStorePointsForCorporation(admin, corporationId, ym);
  const orders = stores.flatMap((s) => s.orders);
  const csv = buildStatementCsv(orders);

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="statement-${ym}.csv"`,
    },
  });
}
