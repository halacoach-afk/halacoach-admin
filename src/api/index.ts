import {request, requestBlob} from './client';
import type {
  AdminUser,
  CatalogService,
  Client,
  ClientSummary,
  CreateServiceInput,
  CreditsOverview,
  HealthResponse,
  InviteAdminInput,
  LeadDetail,
  LeadSummary,
  Professional,
  ProfessionalSummary,
  RejectVerificationInput,
  SessionResponse,
  UpdateAdminInput,
  UpdateClientInput,
  UpdateLeadInput,
  UpdateProfessionalInput,
  UpdateServiceInput,
  VerificationQueueItem,
  VerificationQueueResponse,
  VerificationDocTypeMeta,
  AdjustCreditsInput,
  SupportTicketDetail,
  SupportTicketSummary,
  UpdateSupportTicketInput,
  ConversationDetail,
  ConversationSummary,
  DashboardOverview,
  OnlinePlanDetail,
  OnlinePlanSummary,
} from './types';

export type {
  AdminRole,
  AdminUser,
  AdjustCreditsInput,
  CatalogService,
  Client,
  ClientConsents,
  ClientSummary,
  ChatMessage,
  ConversationDetail,
  ConversationSummary,
  CreateCreditPackageInput,
  CreatePromoInput,
  CreateServiceInput,
  DashboardActivity,
  DashboardActivityKind,
  DashboardCounts,
  DashboardOverview,
  CreditLedgerEntry,
  CreditPackage,
  CreditPackageBadge,
  CreditsOverview,
  CreditPurchase,
  HealthResponse,
  InviteAdminInput,
  LeadDetail,
  LeadStatus,
  LeadSummary,
  LeadUnlock,
  MessageAuthor,
  NotificationPrefs,
  OnlinePlanDetail,
  OnlinePlanSummary,
  Professional,
  ProfessionalSummary,
  ProfessionalTxn,
  ProPricing,
  ProServiceRate,
  MatchPrefs,
  PersonalProfile,
  PromoCode,
  RejectVerificationInput,
  SessionResponse,
  SessionUser,
  SupportTicketDetail,
  SupportTicketStatus,
  SupportTicketSummary,
  SupportUserType,
  UpdateAdminInput,
  UpdateClientInput,
  UpdateCreditPackageInput,
  UpdateLeadInput,
  UpdateProfessionalInput,
  UpdatePromoInput,
  UpdateServiceInput,
  UpdateSupportTicketInput,
  VerificationStatus,
  VerificationQueueItem,
  VerificationQueueResponse,
  VerificationDocTypeMeta,
  VerificationFile,
} from './types';
export {ApiError, isApiError} from './errors';

export function getHealth() {
  return request<HealthResponse>('/v1/health');
}

export function getDashboardOverview() {
  return request<DashboardOverview>('/v1/dashboard');
}

export function login(email: string, password: string) {
  return request<SessionResponse>('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({email, password}),
  });
}

export function listAdmins() {
  return request<AdminUser[]>('/v1/admins');
}

export function inviteAdmin(input: InviteAdminInput) {
  return request<AdminUser>('/v1/admins', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAdmin(id: number, input: UpdateAdminInput & {actorId: number}) {
  return request<AdminUser>(`/v1/admins/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function getCreditsOverview(): Promise<CreditsOverview> {
  const {listCreditPackages, listPromoCodes} = await import('@/lib/apis');
  const [packs, promos, rest] = await Promise.all([
    listCreditPackages(),
    listPromoCodes(),
    request<Omit<CreditsOverview, 'packs' | 'promos'>>('/v1/credits-meta'),
  ]);
  return {...rest, packs, promos};
}

export {createPromoCode, listPromoCodes, updatePromoCode} from '@/lib/apis';
export {createService, listServices, updateService} from '@/lib/apis';

export function adjustCredits(input: AdjustCreditsInput) {
  return request<Professional>(`/v1/credit-adjustments`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listProfessionals() {
  return request<ProfessionalSummary[]>('/v1/professionals');
}

export function getProfessional(id: string) {
  return request<Professional>(`/v1/professionals/${id}`);
}

export function updateProfessional(id: string, input: UpdateProfessionalInput) {
  return request<Professional>(`/v1/professionals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function listVerificationQueue(): Promise<VerificationQueueResponse> {
  const data = await request<VerificationQueueResponse | VerificationQueueItem[]>(
    '/v1/verification',
  );
  if (Array.isArray(data)) {
    return {documentTypes: [], items: data};
  }
  return {
    documentTypes: data.documentTypes ?? [],
    items: data.items ?? [],
  };
}

export function approveVerification(id: string) {
  return request<Professional>(`/v1/verification/${id}/approve`, {method: 'POST'});
}

export function rejectVerification(id: string, input: RejectVerificationInput = {}) {
  return request<Professional>(`/v1/verification/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function approveVerificationFile(professionalId: string, fileId: string) {
  return request<Professional>(
    `/v1/verification/${encodeURIComponent(professionalId)}/files/${encodeURIComponent(fileId)}/approve`,
    {method: 'POST'},
  );
}

export function rejectVerificationFile(
  professionalId: string,
  fileId: string,
  input: RejectVerificationInput = {},
) {
  return request<Professional>(
    `/v1/verification/${encodeURIComponent(professionalId)}/files/${encodeURIComponent(fileId)}/reject`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export function markVerificationFileUnderReview(professionalId: string, fileId: string) {
  return request<Professional>(
    `/v1/verification/${encodeURIComponent(professionalId)}/files/${encodeURIComponent(fileId)}/under-review`,
    {method: 'POST'},
  );
}

export async function fetchVerificationFileBlob(professionalId: string, fileId: string) {
  return requestBlob(
    `/v1/verification/${encodeURIComponent(professionalId)}/files/${encodeURIComponent(fileId)}`,
  );
}

export async function openVerificationFile(professionalId: string, fileId: string) {
  const blob = await fetchVerificationFileBlob(professionalId, fileId);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function listClients() {
  return request<ClientSummary[]>('/v1/clients');
}

export function getClient(id: string) {
  return request<Client>(`/v1/clients/${id}`);
}

export function updateClient(id: string, input: UpdateClientInput) {
  return request<Client>(`/v1/clients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function listLeads() {
  return request<LeadSummary[]>('/v1/leads');
}

export function getLead(id: number) {
  return request<LeadDetail>(`/v1/leads/${id}`);
}

export function updateLead(id: number, input: UpdateLeadInput) {
  return request<LeadDetail>(`/v1/leads/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function listSupportTickets() {
  return request<SupportTicketSummary[]>('/v1/support');
}

export function getSupportTicket(id: number) {
  return request<SupportTicketDetail>(`/v1/support/${id}`);
}

export function updateSupportTicket(id: number, input: UpdateSupportTicketInput) {
  return request<SupportTicketDetail>(`/v1/support/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function listConversations() {
  return request<ConversationSummary[]>('/v1/messages');
}

export function getConversation(id: string) {
  return request<ConversationDetail>(`/v1/messages/${id}`);
}

export function listOnlinePlans() {
  return request<OnlinePlanSummary[]>('/v1/online-clients');
}

export function getOnlinePlan(id: number) {
  return request<OnlinePlanDetail>(`/v1/online-clients/${id}`);
}
