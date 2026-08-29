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

      <div className="card">
        <h2 className="mb-1 font-medium">法人パートナー向け操作マニュアル</h2>
        <p className="mb-3 text-xs text-neutral-500">
          法人・店舗の担当者向けの操作マニュアルです。新規パートナー発行時の案内などにご利用ください。
        </p>
        <a
          href="/manual.html"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-50"
        >
          操作マニュアルを開く
        </a>
      </div>

      <TargetScenarioForm
        scenarios={scenarios ?? []}
        currentScenarioId={settings?.target_scenario_id ?? null}
      />
    </div>
  );
}
