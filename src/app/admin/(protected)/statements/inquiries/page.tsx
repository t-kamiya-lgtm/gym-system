import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ResolveInquiryButton } from "@/components/admin/ResolveInquiryButton";

export default async function StatementInquiriesPage() {
  const admin = createSupabaseAdminClient();

  const [{ data: inquiries }, { data: corporations }] = await Promise.all([
    admin
      .from("gym_statement_inquiries")
      .select(
        "id, corporation_id, year_month, store_name, contact_name, contact_tel, contact_email, order_number, customer_name, content, status, created_at",
      )
      .order("created_at", { ascending: false }),
    admin.from("gym_corporations").select("id, name"),
  ]);
  const corpNameById = new Map((corporations ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/statements" className="text-sm text-neutral-500 hover:underline">
          ← 支払い明細に戻る
        </Link>
        <h1 className="mt-1 text-lg font-semibold">明細への問い合わせ</h1>
      </div>

      <div className="space-y-3">
        {(inquiries ?? []).map((i) => (
          <div key={i.id} className={`card space-y-2 ${i.status === "open" ? "border-amber-300 bg-amber-50" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium">
                {corpNameById.get(i.corporation_id) ?? "(削除済み法人)"} ・ 対象月 {String(i.year_month).slice(0, 7)}
                {i.store_name && <> ・ {i.store_name}</>}
              </div>
              {i.status === "open" ? (
                <ResolveInquiryButton inquiryId={i.id} />
              ) : (
                <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">対応済み</span>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-neutral-600 sm:grid-cols-4">
              <div>
                <dt className="text-neutral-400">担当者名</dt>
                <dd>{i.contact_name}</dd>
              </div>
              <div>
                <dt className="text-neutral-400">TEL</dt>
                <dd>{i.contact_tel ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-neutral-400">メールアドレス</dt>
                <dd>{i.contact_email ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-neutral-400">受注番号 / 顧客名</dt>
                <dd>
                  {i.order_number ?? "-"} / {i.customer_name ?? "-"}
                </dd>
              </div>
            </dl>
            <p className="whitespace-pre-line text-sm">{i.content}</p>
            <p className="text-right text-xs text-neutral-400">
              {new Date(i.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
            </p>
          </div>
        ))}
        {(inquiries ?? []).length === 0 && (
          <div className="card text-center text-sm text-neutral-400">問い合わせはありません</div>
        )}
      </div>
    </div>
  );
}
