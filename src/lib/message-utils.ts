import type {
  Client,
  Conversation,
  ConversationDetail,
  ConversationSummary,
  Professional,
} from '@/api/types';

export function toConversationSummary(
  conversation: Conversation,
  clients: Client[],
  professionals: Professional[],
): ConversationSummary {
  const client = clients.find(item => item.id === conversation.clientId);
  const professional = professionals.find(item => item.id === conversation.professionalId);
  const last = conversation.messages[conversation.messages.length - 1];
  return {
    id: conversation.id,
    clientId: conversation.clientId,
    clientName: client?.name ?? 'Unknown client',
    professionalId: conversation.professionalId,
    professionalName: professional?.name ?? 'Unknown coach',
    professionalSpecialty: professional?.specialty ?? '-',
    lastMessage: last?.body ?? '-',
    lastMessageAt: last?.sentAt ?? conversation.updatedAt,
    messageCount: conversation.messages.length,
  };
}

export function toConversationDetail(
  conversation: Conversation,
  clients: Client[],
  professionals: Professional[],
): ConversationDetail {
  const client = clients.find(item => item.id === conversation.clientId);
  const professional = professionals.find(item => item.id === conversation.professionalId);
  return {
    ...conversation,
    clientName: client?.name ?? 'Unknown client',
    clientEmail: client?.email ?? '-',
    professionalName: professional?.name ?? 'Unknown coach',
    professionalEmail: professional?.email ?? '-',
    professionalSpecialty: professional?.specialty ?? '-',
  };
}

export function formatMessageTime(value: string) {
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const messageAuthorLabels = {
  client: 'Client',
  professional: 'Coach',
  system: 'System',
} as const;
