import type { CustomerWithHealth } from './types';
import { daysBetween } from './health';

export function buildAlertMessage(c: CustomerWithHealth): string {
  const daysToRenewal = daysBetween(new Date().toISOString(), c.renewal_date);
  const mrrFmt = `€${(c.mrr / 1000).toFixed(1)}k`;
  return `🚨 *${c.name}* just dropped to health score *${c.health.score}* — renewal in ${daysToRenewal} days, ${mrrFmt} MRR at risk. Assigned CSM: ${c.csm}.`;
}

export async function sendSlackAlert(text: string): Promise<{ sent: boolean; reason?: string }> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    console.log('[slack:fallback] ' + text);
    return { sent: false, reason: 'SLACK_WEBHOOK_URL not set; logged to console.' };
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      console.log('[slack:fallback after error] ' + text);
      return { sent: false, reason: `Slack responded ${res.status}.` };
    }
    return { sent: true };
  } catch (err) {
    console.log('[slack:fallback after exception] ' + text);
    return { sent: false, reason: String(err) };
  }
}
