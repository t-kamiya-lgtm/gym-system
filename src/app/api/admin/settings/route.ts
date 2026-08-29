import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireOperatorAdmin } from "@/lib/require-operator-role";

const updateSchema = z.object({ targetScenarioId: z.string().uuid() });

/** 集計対象シナリオ(1つのみ)の設定。 */
export async function PATCH(request: Request) {
  const check = await requireOperatorAdmin();
  if (!check.ok) return check.response;

  const body = updateSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("gym_settings")
    .update({ target_scenario_id: body.data.targetScenarioId, updated_at: new Date().toISOString() })
    .eq("id", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
