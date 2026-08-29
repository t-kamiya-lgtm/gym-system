import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePartner } from "@/lib/require-partner-role";

const createSchema = z.object({
  storeId: z.string().uuid().nullable(),
  email: z.string().email(),
});

/** 通知先メールは法人単位・店舗単位のいずれでも複数登録可能(決定事項)。 */
export async function POST(request: Request) {
  const check = await requirePartner();
  if (!check.ok) return check.response;

  const body = createSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }
  const { storeId, email } = body.data;
  const admin = createSupabaseAdminClient();

  if (storeId) {
    const { data: store } = await admin
      .from("gym_stores")
      .select("corporation_id")
      .eq("id", storeId)
      .maybeSingle();
    if (!store || store.corporation_id !== check.partner.corporationId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const { error } = await admin.from("gym_notification_emails").insert({
    corporation_id: storeId ? null : check.partner.corporationId,
    store_id: storeId,
    email,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

const deleteSchema = z.object({ id: z.string().uuid() });

export async function DELETE(request: Request) {
  const check = await requirePartner();
  if (!check.ok) return check.response;

  const body = deleteSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: row } = await admin
    .from("gym_notification_emails")
    .select("id, corporation_id, store_id")
    .eq("id", body.data.id)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  let ownerCorpId = row.corporation_id;
  if (!ownerCorpId && row.store_id) {
    const { data: store } = await admin
      .from("gym_stores")
      .select("corporation_id")
      .eq("id", row.store_id)
      .maybeSingle();
    ownerCorpId = store?.corporation_id ?? null;
  }
  if (ownerCorpId !== check.partner.corporationId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { error } = await admin.from("gym_notification_emails").delete().eq("id", body.data.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
