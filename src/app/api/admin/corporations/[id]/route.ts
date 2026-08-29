import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireOperator } from "@/lib/require-operator-role";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  invoiceRegistered: z.boolean().optional(),
  invoiceRegistrationNumber: z.string().min(1).nullable().optional(),
  address: z.string().nullable().optional(),
  tel: z.string().nullable().optional(),
  hpUrl: z.string().nullable().optional(),
  contactName: z.string().nullable().optional(),
  contactTel: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireOperator();
  if (!check.ok) return check.response;

  const { id } = await params;
  const body = updateSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.data.name !== undefined) patch.name = body.data.name;
  if (body.data.invoiceRegistered !== undefined) patch.invoice_registered = body.data.invoiceRegistered;
  if (body.data.invoiceRegistrationNumber !== undefined) {
    patch.invoice_registration_number = body.data.invoiceRegistrationNumber;
  }
  if (body.data.address !== undefined) patch.address = body.data.address;
  if (body.data.tel !== undefined) patch.tel = body.data.tel;
  if (body.data.hpUrl !== undefined) patch.hp_url = body.data.hpUrl;
  if (body.data.contactName !== undefined) patch.contact_name = body.data.contactName;
  if (body.data.contactTel !== undefined) patch.contact_tel = body.data.contactTel;
  if (body.data.contactEmail !== undefined) patch.contact_email = body.data.contactEmail;

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("gym_corporations").update(patch).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
