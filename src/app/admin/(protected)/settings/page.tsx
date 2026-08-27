import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { TargetScenarioForm } from "@/components/admin/TargetScenarioForm";

export default async function AdminSettingsPage() {
  const admin = createSupabaseAdminClient();
  const [{ data: scenarios }, { data: settings }] = await Promise.all([
    admin.from("scenarios").select("id, name").order("name"),
    admin.from("gym_settings").select("target_scenario_id").single(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">設定</h1>
      <TargetScenarioForm
        scenarios={scenarios ?? []}
        currentScenarioId={settings?.target_scenario_id ?? null}
      />
    </div>
  );
}
