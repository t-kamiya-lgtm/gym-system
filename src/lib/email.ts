import type { SupabaseClient } from "@supabase/supabase-js";

interface SendEmailInput {
  to: string;
  from?: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * pm-chat-bot側と同じGAS Webhook経由のメール送信基盤を流用する
 * (同じGoogle Workspace/GASプロジェクトを共有している想定)。
 */
export async function sendResendEmail(input: SendEmailInput): Promise<boolean> {
  const webhookUrl = process.env.GAS_MAIL_WEBHOOK_URL;
  const secret = process.env.GAS_MAIL_SECRET;
  if (!webhookUrl || !secret) {
    console.log("[email] GAS_MAIL_WEBHOOK_URL/GAS_MAIL_SECRET not configured, logging instead:", input);
    return false;
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      secret,
      to: input.to,
      from: input.from,
      subject: input.subject,
      text: input.text,
      html: input.html,
      senderName: "プライムダイレクト",
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to send email via GAS webhook: ${res.status}`);
  }
  return true;
}

export async function sendNewOrderNotification(params: {
  to: string[];
  customerName: string;
  storeName: string;
}): Promise<void> {
  const { to, customerName, storeName } = params;
  const subject = `【${storeName}】新規注文のお知らせ`;
  const text = `${customerName}様の注文が入りました。\n\n店舗: ${storeName}`;
  await Promise.all(to.map((email) => sendResendEmail({ to: email, subject, text })));
}

/**
 * 運営側が月末確定処理を行った際に、法人に登録された通知先メールへ確定連絡を送る。
 * gym_monthly_statements/statements.tsから呼ばれる。
 */
export async function sendStatementClosedNotification(
  admin: SupabaseClient,
  corporationId: string,
  yearMonth: string,
): Promise<void> {
  const [{ data: corporation }, { data: emails }] = await Promise.all([
    admin.from("gym_corporations").select("name").eq("id", corporationId).maybeSingle(),
    admin.from("gym_notification_emails").select("email").eq("corporation_id", corporationId),
  ]);
  const to = (emails ?? []).map((e) => e.email);
  if (to.length === 0) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  const [year, month] = yearMonth.split("-");
  const subject = `【${corporation?.name ?? ""}様】${year}年${Number(month)}月度のアフィリエイト報酬確定のお知らせ`;
  const lines = [
    `${year}年${Number(month)}月度の受注・アフィリエイト報酬が確定しました。`,
    "管理画面にてご確認ください。",
  ];
  if (appUrl) lines.push("", `${appUrl}/partner/statements?ym=${yearMonth}`);
  const text = lines.join("\n");

  await Promise.all(to.map((email) => sendResendEmail({ to: email, subject, text })));
}
