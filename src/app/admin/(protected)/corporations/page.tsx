import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { managementCode } from "@/lib/types";
import { CreateCorporationForm } from "@/components/admin/CreateCorporationForm";

export default async function CorporationsPage() {
  const admin = createSupabaseAdminClient();
  const { data: corporations } = await admin
    .from("gym_corporations")
    .select("id, corp_no, name, invoice_registered, created_at")
    .order("created_at", { ascending: false });

  const { data: stores } = await admin.from("gym_stores").select("id, corporation_id");
  const storeCountByCorp = new Map<string, number>();
  for (const s of stores ?? []) {
    storeCountByCorp.set(s.corporation_id, (storeCountByCorp.get(s.corporation_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">法人・店舗管理</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-500">
                  <th className="py-2">法人No</th>
                  <th className="py-2">法人名</th>
                  <th className="py-2">店舗数</th>
                  <th className="py-2">インボイス</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {(corporations ?? []).map((c) => (
                  <tr key={c.id} className="border-b border-neutral-100">
                    <td className="py-2 font-mono">{managementCode(c.corp_no)}</td>
                    <td className="py-2">{c.name}</td>
                    <td className="py-2">{storeCountByCorp.get(c.id) ?? 0}</td>
                    <td className="py-2">{c.invoice_registered ? "対象" : "非対象"}</td>
                    <td className="py-2">
                      <Link href={`/admin/corporations/${c.id}`} className="text-blue-600 hover:underline">
                        詳細・店舗管理
                      </Link>
                    </td>
                  </tr>
                ))}
                {(corporations ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-neutral-400">
                      登録された法人がありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <CreateCorporationForm />
        </div>
      </div>
    </div>
  );
}
