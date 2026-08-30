import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentOperator } from "@/lib/auth-operator";
import { TargetScenarioForm } from "@/components/admin/TargetScenarioForm";
import { CreateOperatorUserForm } from "@/components/admin/CreateOperatorUserForm";
import { BackfillOrderLinesButton } from "@/components/admin/BackfillOrderLinesButton";

export default async function AdminSettingsPage() {
  const operator = await getCurrentOperator();
  const admin = createSupabaseAdminClient();
  const [{ data: scenarios }, { data: settings }] = await Promise.all([
    admin.from("scenarios").select("id, name").order("name"),
    admin.from("gym_settings").select("target_scenario_id").single(),
  ]);

  const { data: operatorUsers } =
    operator?.role === "admin"
      ? await admin.from("users").select("id, email, role, auth_user_id").order("email")
      : { data: null };

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">設定</h1>

      <div className="card space-y-4">
        <div>
          <h2 className="mb-1 font-medium">運営側操作マニュアル</h2>
          <p className="mb-3 text-xs text-neutral-500">
            運営側の操作方法と、月次締めの業務フローをまとめたマニュアルです。
          </p>
          <a
            href="/manual-admin.html"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm transition hover:bg-neutral-50"
          >
            運営側操作マニュアルを開く
          </a>
        </div>
        <div className="border-t border-neutral-100 pt-4">
          <h2 className="mb-1 font-medium">パートナー法人向け操作マニュアル</h2>
          <p className="mb-3 text-xs text-neutral-500">
            パートナー法人・各店舗の担当者向けの操作マニュアルです。新規パートナー法人発行時の案内などにご利用ください。
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
      </div>

      {operator?.role === "admin" && (
        <div className="card">
          <h2 className="mb-1 font-medium">受注明細台帳の再同期</h2>
          <p className="mb-3 text-xs text-neutral-500">
            通知や集計に反映されない注文がある場合に使うリカバリ用の操作です。クーポン経由の注文のうち、まだ受注明細台帳(注文一覧・支払い明細のもとになるデータ)に取り込まれていないものをまとめて取り込みます。既に取り込み済みの注文はスキップされるため、何度実行しても問題ありません。
          </p>
          <BackfillOrderLinesButton />
        </div>
      )}

      <TargetScenarioForm
        scenarios={scenarios ?? []}
        currentScenarioId={settings?.target_scenario_id ?? null}
      />

      {operator?.role === "admin" && (
        <div className="card space-y-4">
          <div>
            <h2 className="font-medium">運営ユーザー(社内アカウント)</h2>
            <p className="text-xs text-neutral-500">
              pm-chat-bot(チャットボット決済システム)と共有のアカウント一覧です。ここで招待したアカウントは、両システムで共通してログインできます。
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-500">
                  <th className="py-2">メールアドレス</th>
                  <th className="py-2">権限</th>
                  <th className="py-2">状態</th>
                </tr>
              </thead>
              <tbody>
                {(operatorUsers ?? []).map((u) => (
                  <tr key={u.id} className="border-b border-neutral-100">
                    <td className="py-2">{u.email}</td>
                    <td className="py-2">{u.role}</td>
                    <td className="py-2">
                      {u.auth_user_id ? (
                        <span className="text-green-700">ログイン済み</span>
                      ) : (
                        <span className="text-neutral-400">招待中(未ログイン)</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(operatorUsers ?? []).length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-neutral-400">
                      登録なし
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <CreateOperatorUserForm />
        </div>
      )}
    </div>
  );
}
