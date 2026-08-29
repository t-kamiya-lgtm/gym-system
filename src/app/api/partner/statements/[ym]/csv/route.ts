import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePartner } from "@/lib/require-partner-role";
import { getStorePointsForCorporation } from "@/lib/points";
import { buildStatementCsv } from "@/lib/statement-csv";

export async function GET(request: Request, { params }: { params: Promise<{ ym: string }> }) {
  const check = await requirePartner();
  if (!check.ok) return check.response;

  const { ym } = await params;
  const admin = createSupabaseAdminClient();

  const { stores } = await getStorePointsForCorporation(admin, check.partner.corporationId, ym);
  const orders = stores.flatMap((s) => s.orders);
  const csv = buildStatementCsv(orders);

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="statement-${ym}.csv"`,
    },
  });
}
