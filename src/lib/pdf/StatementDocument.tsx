import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import type { CorporationStatement } from "@/lib/statements";
import { OWN_COMPANY } from "@/lib/company-info";
import { transferDueDateJst } from "@/lib/rewards";

// 日本語(氏名・住所・法人名等)を含むPDFのため、和文フォントを登録する。
// Helvetica等の標準フォントは和文グリフを持たず文字化けするため必須。
// Googleフォントのgstatic配信URLは発行後不変のため、直接参照して問題ない。
Font.register({
  family: "Noto Sans JP",
  fonts: [
    { src: "https://fonts.gstatic.com/s/notosansjp/v56/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75s.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/notosansjp/v56/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFPYk75s.ttf", fontWeight: 700 },
  ],
});
// 和文は単語区切りにハイフンを入れる概念がないため、既定のハイフネーションを無効化する。
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Noto Sans JP" },
  title: { fontSize: 16, marginBottom: 4 },
  subtitle: { fontSize: 10, marginBottom: 16, color: "#555" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ddd", paddingVertical: 4 },
  headerRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#333", paddingVertical: 4, fontWeight: 700 },
  cellName: { width: "40%" },
  cellNum: { width: "20%", textAlign: "right" },
  summary: { marginTop: 16, alignItems: "flex-end" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", width: 220, paddingVertical: 2 },
  note: { marginTop: 24, fontSize: 8, color: "#666" },
});

/**
 * 税額表記はインボイス(適格請求書発行事業者)登録有無に応じて出し分ける。
 * 対象: 登録番号を明記し、税抜金額・消費税額(10%)・税込合計を分けて表示する(適格請求書の記載事項)。
 * 非対象: 登録番号は表示せず、消費税額の内訳を「参考」扱いの注記のみとする
 * (仕入税額控除の可否は弊社側の税務判断による旨を明記)。
 */
const BANK_ACCOUNT_TYPE_LABEL: Record<string, string> = {
  ordinary: "普通",
  checking: "当座",
};

export interface BankAccountInfo {
  bankName: string | null;
  bankBranchName: string | null;
  bankAccountType: "ordinary" | "checking" | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
}

export function StatementDocument({
  statement,
  corporationName,
  corporationAddress,
  invoiceRegistered,
  invoiceRegistrationNumber,
  bankAccount,
}: {
  statement: CorporationStatement;
  corporationName: string;
  corporationAddress: string | null;
  invoiceRegistered: boolean;
  invoiceRegistrationNumber: string | null;
  bankAccount: BankAccountInfo | null;
}) {
  const taxExcluded = statement.finalAmount;
  const tax = Math.floor(taxExcluded * 0.1);
  const taxIncluded = taxExcluded + tax;
  const transferDueDate = transferDueDateJst(statement.yearMonth);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>支払い明細書</Text>
        <Text style={styles.subtitle}>対象月: {statement.yearMonth}</Text>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
          <View>
            <Text style={{ fontSize: 12, marginBottom: 4 }}>{corporationName} 様</Text>
            {corporationAddress && <Text style={styles.subtitle}>{corporationAddress}</Text>}
            {invoiceRegistered && invoiceRegistrationNumber && (
              <Text style={styles.subtitle}>登録番号: {invoiceRegistrationNumber}</Text>
            )}
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.subtitle, { textAlign: "right" }]}>発行元: {OWN_COMPANY.name}</Text>
            <Text style={[styles.subtitle, { textAlign: "right" }]}>登録番号: {OWN_COMPANY.invoiceRegistrationNumber}</Text>
            <Text style={[styles.subtitle, { textAlign: "right" }]}>
              〒{OWN_COMPANY.postalCode} {OWN_COMPANY.address}
            </Text>
            <Text style={[styles.subtitle, { textAlign: "right" }]}>{OWN_COMPANY.email}</Text>
          </View>
        </View>

        <View style={styles.headerRow}>
          <Text style={styles.cellName}>店舗名</Text>
          <Text style={styles.cellNum}>点数</Text>
          <Text style={styles.cellNum}>調整額</Text>
          <Text style={styles.cellNum}>金額</Text>
        </View>
        {statement.stores.map((s) => (
          <View style={styles.row} key={s.storeId}>
            <Text style={styles.cellName}>{s.storeName}</Text>
            <Text style={styles.cellNum}>{s.points.toLocaleString()} 点</Text>
            <Text style={styles.cellNum}>¥{s.adjustmentTotal.toLocaleString()}</Text>
            <Text style={styles.cellNum}>¥{s.finalAmount.toLocaleString()}</Text>
          </View>
        ))}

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text>合計点数</Text>
            <Text>{statement.totalPoints.toLocaleString()} 点</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>適用単価</Text>
            <Text>¥{statement.unitPrice.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>{invoiceRegistered ? "小計(税抜)" : "お支払金額(税込目安)"}</Text>
            <Text>¥{taxExcluded.toLocaleString()}</Text>
          </View>
          {invoiceRegistered && (
            <>
              <View style={styles.summaryRow}>
                <Text>税率10%対象</Text>
                <Text>¥{taxExcluded.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text>消費税額(10%)</Text>
                <Text>¥{tax.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text>総計</Text>
                <Text>¥{taxIncluded.toLocaleString()}</Text>
              </View>
            </>
          )}
          <View style={[styles.summaryRow, { marginTop: 8 }]}>
            <Text>振込予定日</Text>
            <Text>{transferDueDate}</Text>
          </View>
        </View>

        {bankAccount?.bankName && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 10, marginBottom: 4, fontWeight: 700 }}>お振込先</Text>
            <Text style={styles.subtitle}>
              {bankAccount.bankName} {bankAccount.bankBranchName}
              {bankAccount.bankAccountType && ` ${BANK_ACCOUNT_TYPE_LABEL[bankAccount.bankAccountType]}`}
              {bankAccount.bankAccountNumber && ` ${bankAccount.bankAccountNumber}`}
            </Text>
            {bankAccount.bankAccountHolder && (
              <Text style={styles.subtitle}>口座名義: {bankAccount.bankAccountHolder}</Text>
            )}
          </View>
        )}

        <Text style={styles.note}>
          {invoiceRegistered
            ? "本書は適格請求書等保存方式(インボイス制度)に基づく記載事項を含みます。"
            : "貴社はインボイス発行事業者として登録されていないため、本書は適格請求書に該当しません。仕入税額控除の取り扱いは弊社の税務処理に依ります。"}
        </Text>
        <Text style={styles.note}>振込予定日は対象月の翌月末日(土日祝日の場合は直前の平日)です。</Text>
        <Text style={styles.note}>※振込手数料は、パートナー加盟店負担となります。</Text>
      </Page>
    </Document>
  );
}
