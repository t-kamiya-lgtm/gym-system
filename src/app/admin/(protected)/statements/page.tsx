import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStatementMenuRows } from "@/lib/statements";
import { getUnshippedLinesBefore } from "@/lib/order-lines";
import { previousYearMonthJst } from "@/lib/rewards";
import { CloseMonthButton } from "@/components/admin/CloseMonthButton";

const STATUS_ROW_CLASS: Record<string, string> = {
  not_closed: "bg-white",
  closed: "bg-pink-50",
  agreed: "bg-green-50",
};

const STATUS_LABEL: Record<string, string> = {
  not_closed: "未確定",
  closed: "確定済み(同意待ち)",
  agreed: "同意済み",
};

export default async function AdminStatementsPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  const { ym } = await searchParams;
  const yearMonth = ym ?? previousYearMonthJst();
  const admin = createSupabaseAdminClient();

  const [rows, unshippedLines, { count: openInquiryCount }] = await Promise.all([
    getStatementMenuRows(admin, yearMonth),
    getUnshippedLinesBefore(admin, yearMonth),
    admin.from("gym_statement_inquiries").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-orange-700">運営側管理画面</p>
          <h1 className="text-lg font-semibold">支払い明細</h1>
          <Link href="/admin/statements/inquiries" className="text-sm text-neutral-500 hover:underline">
            明細への問い合わせ{openInquiryCount ? `(未対応${openInquiryCount}件)` : ""} →
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <form className="flex items-center gap-2 text-sm">
            <label htmlFor="ym">対象年月</label>
            <input type="month" id="ym" name="ym" defaultValue={yearMonth} className="input w-auto" />
            <button type="submit" className="btn-primary text-sm">
              表示
            </button>
          </form>
          <CloseMonthButton
            yearMonth={yearMonth}
            label="一括月末確定"
            confirmMessage={`${yearMonth}分の未確定の法人をまとめて月末確定します。パートナーに支払い明細更新連絡が送信されます。よろしいですか?`}
          />
        </div>
      </div>

      {unshippedLines.length > 0 && (
        <div className="card flex items-center gap-3 border-amber-200 bg-amber-50 px-5 py-3.5">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#b45309"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="8" x2="12" y2="13" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm text-amber-900">
            {yearMonth}分より前の受注で、未出荷のまま残っている注文が{unshippedLines.length}件あります。月末確定の前にご確認ください。
          </p>
          <Link href="/admin/statements/unshipped" className="ml-auto shrink-0 text-sm font-medium underline">
            確認する →
          </Link>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2">法人名</th>
              <th className="py-2 text-right">件数</th>
              <th className="py-2 text-right">報酬単価</th>
              <th className="py-2 text-right">報酬金額</th>
              <th className="py-2">状況</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.corporationId} className={`border-b border-neutral-100 ${STATUS_ROW_CLASS[r.status]}`}>
                <td className="py-2 font-medium">{r.corporationName}</td>
                <td className="py-2 text-right">{r.orderCount.toLocaleString()}件</td>
                <td className="py-2 text-right">{r.unitPrice > 0 ? `¥${r.unitPrice.toLocaleString()}` : "-"}</td>
                <td className="py-2 text-right font-medium">
                  {r.status === "not_closed" ? "-" : `¥${r.finalAmount.toLocaleString()}`}
                </td>
                <td className="py-2 text-xs text-neutral-500">{STATUS_LABEL[r.status]}</td>
                <td className="py-2">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/admin/statements/${r.corporationId}/${yearMonth}`}
                      className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs transition hover:bg-white"
                    >
                      注文明細
                    </Link>
                    {r.status !== "agreed" && (
                      <CloseMonthButton
                        corporationId={r.corporationId}
                        yearMonth={yearMonth}
                        label="月末確定"
                        confirmMessage={`${r.corporationName}の${yearMonth}分を月末確定します。パートナーに支払い明細更新連絡が送信されます。よろしいですか?`}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-neutral-400">
                  登録された法人がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
