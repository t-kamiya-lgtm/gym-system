export function verifyOrderWebhookSecret(request: Request): boolean {
  const secret = request.headers.get("x-webhook-secret");
  return Boolean(process.env.GYM_ORDER_WEBHOOK_SECRET) && secret === process.env.GYM_ORDER_WEBHOOK_SECRET;
}
