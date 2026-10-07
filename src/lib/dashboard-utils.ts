import type {DashboardActivity, SupportTicketStatus} from '@/api/types';
import {creditTxnLabel} from '@/lib/credit-utils';
import {supportStatusLabels} from '@/lib/support-utils';

export function formatDashboardTime(value: string) {
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const dashboardActivityLabels: Record<DashboardActivity['kind'], string> = {
  client_signup: 'Client',
  pro_signup: 'Professional',
  verification_pending: 'Verification',
  lead_unlock: 'Unlock',
  credit_purchase: 'Credits',
  support_ticket: 'Support',
};

/** Turn API i18n/status keys in activity subtitles into readable copy. */
export function formatActivitySubtitle(item: DashboardActivity): string {
  if (item.kind === 'credit_purchase') {
    return creditTxnLabel(item.subtitle);
  }
  if (item.kind === 'support_ticket') {
    const sep = ' · ';
    const idx = item.subtitle.lastIndexOf(sep);
    if (idx === -1) {
      return item.subtitle;
    }
    const name = item.subtitle.slice(0, idx);
    const status = item.subtitle.slice(idx + sep.length) as SupportTicketStatus;
    const statusLabel = supportStatusLabels[status] ?? status;
    return `${name}${sep}${statusLabel}`;
  }
  return item.subtitle;
}
