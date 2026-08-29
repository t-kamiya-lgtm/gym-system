import { getCurrentPartner } from "@/lib/auth-partner";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStorePointsForCorporationInRange, aggregateMembers } from "@/lib/points";
import { rangeForShortcut } from "@/lib/date-range";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { MemberNoteEditor } from "@/components/partner/MemberNoteEditor";

export default async function PartnerMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const partner = await getCurrentPartner();
  if (!partner) return null;
  const { from: fromParam, to: toParam } = await searchParams;
  const def = rangeForShortcut("thisYear");
  const from = fromParam ?? def.from;
  const to = toParam ?? def.to;

  const admin = createSupabaseAdminClient();
  const { stores } = await getStorePointsForCorporationInRange(admin, partner.corporationId, from, to);
  const members = aggregateMembers(stores);

  const { data: notes } = members.length
    ? await admin
        .from("gym_customer_notes")
        .select("store_id, customer_id, memo1, memo2")
        .in(
          "store_id",
          Array.from(new Set(members.map((m) => m.storeId))),
        )
    : { data: [] as { store_id: string; customer_id: string; memo1: string | null; memo2: string | null }[] };
  const noteByKey = new Map((notes ?? []).map((n) => [`${n.store_id}:${n.customer_id}`, n]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold">会員別実績</h1>
        <DateRangePicker from={from} to={to} />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2">会員名</th>
              <th className="py-2">店舗</th>
              <th className="py-2">単品累計</th>
              <th className="py-2">定期累計</th>
              <th className="py-2">合計購入点数</th>
              <th className="py-2">最終購入日</th>
              <th className="py-2">メモ</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const note = noteByKey.get(`${m.storeId}:${m.customerId}`);
              return (
                <tr key={`${m.storeId}:${m.customerId}`} className="border-b border-neutral-100">
                  <td className="py-2">{m.customerName}</td>
                  <td className="py-2">{m.storeName}</td>
                  <td className="py-2">{m.oneTimePoints.toLocaleString()} 点</td>
                  <td className="py-2">{m.subscriptionPoints.toLocaleString()} 点</td>
                  <td className="py-2 font-medium">{m.totalPoints.toLocaleString()} 点</td>
                  <td className="py-2 whitespace-nowrap">{new Date(m.lastPurchaseDate).toLocaleDateString("ja-JP")}</td>
                  <td className="py-2">
                    <MemberNoteEditor
                      storeId={m.storeId}
                      customerId={m.customerId}
                      initialMemo1={note?.memo1 ?? ""}
                      initialMemo2={note?.memo2 ?? ""}
                    />
                  </td>
                </tr>
              );
            })}
            {members.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-neutral-400">
                  対象期間の実績がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
