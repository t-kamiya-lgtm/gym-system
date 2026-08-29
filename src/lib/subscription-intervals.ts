/** pm-chat-bot側のsubscriptions.intervalの値と表示用ラベル(同じ命名をこちらでも踏襲)。 */
export const SUBSCRIPTION_INTERVAL_LABELS: Record<string, string> = {
  biweekly: "2週間ごと",
  monthly: "1ヶ月ごと",
  bimonthly: "2ヶ月ごと",
};

export function subscriptionIntervalLabel(interval: string | null): string | null {
  if (!interval) return null;
  return SUBSCRIPTION_INTERVAL_LABELS[interval] ?? interval;
}
