import { renderToBuffer } from "@react-pdf/renderer";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePartner } from "@/lib/require-partner-role";
import { getCorporationStatement } from "@/lib/statements";
import { StatementDocument } from "@/lib/pdf/StatementDocument";

export async function GET(request: Request, { params }: { params: Promise<{ ym: string }> }) {
  const check = await requirePartner();
  if (!check.ok) return check.response;

  const { ym } = await params;
  const admin = createSupabaseAdminClient();

  const { data: corporation } = await admin
    .from("gym_corporations")
    .select(
      "name, address, invoice_registered, invoice_registration_number, bank_name, bank_branch_name, bank_account_type, bank_account_number, bank_account_holder",
    )
    .eq("id", check.partner.corporationId)
    .maybeSingle();

  const statement = await getCorporationStatement(admin, check.partner.corporationId, ym);

  const buffer = await renderToBuffer(
    StatementDocument({
      statement,
      corporationName: corporation?.name ?? "",
      corporationAddress: corporation?.address ?? null,
      invoiceRegistered: corporation?.invoice_registered ?? false,
      invoiceRegistrationNumber: corporation?.invoice_registration_number ?? null,
      bankAccount: corporation
        ? {
            bankName: corporation.bank_name,
            bankBranchName: corporation.bank_branch_name,
            bankAccountType: corporation.bank_account_type,
            bankAccountNumber: corporation.bank_account_number,
            bankAccountHolder: corporation.bank_account_holder,
          }
        : null,
    }),
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="statement-${ym}.pdf"`,
    },
  });
}
