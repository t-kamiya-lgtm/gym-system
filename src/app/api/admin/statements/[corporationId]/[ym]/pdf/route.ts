import { renderToBuffer } from "@react-pdf/renderer";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireOperator } from "@/lib/require-operator-role";
import { getCorporationStatement } from "@/lib/statements";
import { StatementDocument } from "@/lib/pdf/StatementDocument";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ corporationId: string; ym: string }> },
) {
  const check = await requireOperator();
  if (!check.ok) return check.response;

  const { corporationId, ym } = await params;
  const admin = createSupabaseAdminClient();

  const { data: corporation } = await admin
    .from("gym_corporations")
    .select("name, invoice_registered, invoice_registration_number")
    .eq("id", corporationId)
    .maybeSingle();

  const statement = await getCorporationStatement(admin, corporationId, ym);

  const buffer = await renderToBuffer(
    StatementDocument({
      statement,
      corporationName: corporation?.name ?? "",
      invoiceRegistered: corporation?.invoice_registered ?? false,
      invoiceRegistrationNumber: corporation?.invoice_registration_number ?? null,
    }),
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="statement-${ym}.pdf"`,
    },
  });
}
