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
