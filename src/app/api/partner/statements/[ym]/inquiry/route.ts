import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePartner } from "@/lib/require-partner-role";

const schema = z.object({
  storeName: z.string().optional(),
  contactName: z.string().min(1),
  contactTel: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  orderNumber: z.string().optional(),
  customerName: z.string().optional(),
  content: z.string().min(1),
});

/**
 * 支払い明細への問い合わせ。運営側が内容を確認し、対応後にフラグ解除(reopen)する
 * (通知先メールアドレスは未設定のため、現時点では保存のみ)。
 */
export async function POST(request: Request, { params }: { params: Promise<{ ym: string }> }) {
  const check = await requirePartner();
  if (!check.ok) return check.response;

  const { ym } = await params;
  if (!/^\d{4}-\d{2}$/.test(ym)) {
    return NextResponse.json({ error: "invalid year_month" }, { status: 400 });
  }

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }
  const { storeName, contactName, contactTel, contactEmail, orderNumber, customerName, content } = body.data;

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("gym_statement_inquiries").insert({
    corporation_id: check.partner.corporationId,
    year_month: `${ym}-01`,
    store_name: storeName || null,
    contact_name: contactName,
    contact_tel: contactTel || null,
    contact_email: contactEmail || null,
    order_number: orderNumber || null,
    customer_name: customerName || null,
    content,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
