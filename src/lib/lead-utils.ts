import type {Client, LeadDetail, LeadSummary, MarketplaceLead, Professional} from '@/api/types';

export function toLeadSummary(lead: MarketplaceLead, client?: Client): LeadSummary {
  return {
    id: lead.id,
    clientId: lead.clientId,
    clientName: client?.name ?? 'Unknown client',
    goal: lead.goal,
    serviceId: lead.serviceId,
    location: lead.location,
    status: lead.status,
    unlockCount: lead.unlocks.length,
    postedAt: lead.postedAt,
  };
}

export function toLeadDetail(
  lead: MarketplaceLead,
  client: Client | undefined,
  professionals: Professional[],
): LeadDetail {
  const proById = new Map(professionals.map(item => [item.id, item]));
  return {
    ...lead,
    clientName: client?.name ?? 'Unknown client',
    clientEmail: client?.email ?? '-',
    clientPhone: client?.phone ?? '-',
    unlocks: lead.unlocks.map(unlock => ({
      ...unlock,
      professionalName: proById.get(unlock.professionalId)?.name ?? unlock.professionalId,
    })),
  };
}

export function formatPostedAt(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) {
    return `${Math.max(1, minutes)} min ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  const days = Math.round(hours / 24);
  if (days === 1) {
    return 'Yesterday';
  }
  return new Date(iso).toLocaleDateString();
}

/** Date + time on two lines for the leads Posted column (e.g. 10/12/2026 / 2:26 PM). */
export function formatPostedParts(
  iso: string | null | undefined,
): {date: string; time: string} | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return null;
  return {
    date: date.toLocaleDateString('en-US'),
    time: date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
  };
}

/** Display label for lead creation channel. Empty/null → dash. */
export function formatLeadSource(source: string | null | undefined): string {
  switch ((source ?? '').trim().toLowerCase()) {
    case 'website':
      return 'Website';
    case 'android':
      return 'Android';
    case 'ios':
      return 'iOS';
    default:
      return '-';
  }
}
