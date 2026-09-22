import type {
  Client,
  Professional,
  SupportTicket,
  SupportTicketDetail,
  SupportTicketStatus,
  SupportTicketSummary,
  SupportUserType,
} from '@/api/types';
import {normalizeNotificationPrefs} from '@/lib/notification-utils';

export const supportStatusLabels: Record<SupportTicketStatus, string> = {
  new: 'New',
  replied: 'Replied',
  closed: 'Closed',
};

export const supportStatusTone: Record<
  SupportTicketStatus,
  'coral' | 'primary' | 'muted' | 'warning'
> = {
  new: 'coral',
  replied: 'primary',
  closed: 'muted',
};

export const supportUserTypeLabels: Record<SupportUserType, string> = {
  client: 'Client',
  professional: 'Professional',
};

function findUser(
  ticket: SupportTicket,
  clients: Client[],
  professionals: Professional[],
) {
  if (ticket.userType === 'client') {
    const client = clients.find(item => item.id === ticket.userId);
    return client
      ? {
          name: client.name,
          email: client.email,
          phone: client.phone,
          notificationPrefs: normalizeNotificationPrefs(client.notificationPrefs),
          profileHref: `/clients/${client.id}`,
        }
      : null;
  }
  const professional = professionals.find(item => item.id === ticket.userId);
  return professional
    ? {
        name: professional.name,
        email: professional.email,
        phone: professional.phone,
        notificationPrefs: normalizeNotificationPrefs(professional.notificationPrefs),
        profileHref: `/professionals/${professional.id}`,
      }
    : null;
}

export function toSupportSummary(
  ticket: SupportTicket,
  clients: Client[],
  professionals: Professional[],
): SupportTicketSummary {
  const user = findUser(ticket, clients, professionals);
  return {
    id: ticket.id,
    userType: ticket.userType,
    userId: ticket.userId,
    userName: user?.name ?? 'Unknown user',
    userEmail: user?.email ?? '-',
    subject: ticket.subject,
    status: ticket.status,
    createdAt: ticket.createdAt,
    repliedAt: ticket.repliedAt,
  };
}

export function toSupportDetail(
  ticket: SupportTicket,
  clients: Client[],
  professionals: Professional[],
): SupportTicketDetail {
  const user = findUser(ticket, clients, professionals);
  return {
    ...ticket,
    userName: user?.name ?? 'Unknown user',
    userEmail: user?.email ?? '-',
    userPhone: user?.phone ?? '-',
    profileHref: user?.profileHref ?? null,
    notificationPrefs: user?.notificationPrefs ?? normalizeNotificationPrefs(),
  };
}

export function formatSupportTimestamp(value: string | null) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
