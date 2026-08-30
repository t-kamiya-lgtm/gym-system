import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireOperator } from "@/lib/require-operator-role";

const createSchema = z.object({
  name: z.string().min(1),
  invoiceRegistered: z.boolean(),
  invoiceRegistrationNumber: z.string().min(1).nullable(),
  address: z.string().nullable().optional(),
  tel: z.string().nullable().optional(),
  hpUrl: z.string().nullable().optional(),
  contactName: z.string().nullable().optional(),
  contactTel: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  bankBranchName: z.string().nullable().optional(),
  bankAccountType: z.enum(["ordinary", "checking"]).nullable().optional(),
  bankAccountNumber: z.string().nullable().optional(),
  bankAccountHolder: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const check = await requireOperator();
  if (!check.ok) return check.response;

  const body = createSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }
  const {
    name,
    invoiceRegistered,
    invoiceRegistrationNumber,
    address,
    tel,
    hpUrl,
    contactName,
    contactTel,
    contactEmail,
    bankName,
    bankBranchName,
    bankAccountType,
    bankAccountNumber,
    bankAccountHolder,
  } = body.data;
  if (invoiceRegistered && !invoiceRegistrationNumber) {
    return NextResponse.json({ error: "invoiceRegistrationNumber is required" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("gym_corporations")
    .insert({
      name,
      invoice_registered: invoiceRegistered,
      invoice_registration_number: invoiceRegistered ? invoiceRegistrationNumber : null,
      address: address ?? null,
      tel: tel ?? null,
      hp_url: hpUrl ?? null,
      contact_name: contactName ?? null,
      contact_tel: contactTel ?? null,
      contact_email: contactEmail ?? null,
      bank_name: bankName ?? null,
      bank_branch_name: bankBranchName ?? null,
      bank_account_type: bankAccountType ?? null,
      bank_account_number: bankAccountNumber ?? null,
      bank_account_holder: bankAccountHolder ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data.id }, { status: 201 });
}
