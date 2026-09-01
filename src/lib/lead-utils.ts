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
    clientEmail: client?.email ?? '—',
    clientPhone: client?.phone ?? '—',
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
