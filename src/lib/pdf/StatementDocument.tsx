import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { CorporationStatement } from "@/lib/statements";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
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
export function StatementDocument({
  statement,
  corporationName,
  invoiceRegistered,
  invoiceRegistrationNumber,
}: {
  statement: CorporationStatement;
  corporationName: string;
  invoiceRegistered: boolean;
  invoiceRegistrationNumber: string | null;
}) {
  const taxExcluded = statement.finalAmount;
  const tax = Math.floor(taxExcluded * 0.1);
  const taxIncluded = taxExcluded + tax;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>支払い明細書</Text>
        <Text style={styles.subtitle}>
          {corporationName} 様 / 対象月: {statement.yearMonth}
        </Text>
        {invoiceRegistered && invoiceRegistrationNumber && (
          <Text style={styles.subtitle}>登録番号: {invoiceRegistrationNumber}</Text>
        )}

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
            <Text>{invoiceRegistered ? "税抜金額" : "お支払金額(税込目安)"}</Text>
            <Text>¥{taxExcluded.toLocaleString()}</Text>
          </View>
          {invoiceRegistered && (
            <>
              <View style={styles.summaryRow}>
                <Text>消費税(10%)</Text>
                <Text>¥{tax.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text>税込合計</Text>
                <Text>¥{taxIncluded.toLocaleString()}</Text>
              </View>
            </>
          )}
        </View>

        <Text style={styles.note}>
          {invoiceRegistered
            ? "本書は適格請求書等保存方式(インボイス制度)に基づく記載事項を含みます。"
            : "貴社はインボイス発行事業者として登録されていないため、本書は適格請求書に該当しません。仕入税額控除の取り扱いは弊社の税務処理に依ります。"}
        </Text>
      </Page>
    </Document>
  );
}
