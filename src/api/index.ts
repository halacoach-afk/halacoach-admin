import {request, requestBlob} from './client';
import {buildListQuery} from '@/lib/pagination';
import type {
  AdminUser,
  AdminUserDetail,
  CatalogService,
  Client,
  ClientSummary,
  CreateServiceInput,
  CreditsOverview,
  HealthResponse,
  InviteAdminInput,
  LeadDetail,
  LeadSummary,
  Paginated,
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
  NavBadges,
  OnlinePlanDetail,
  OnlinePlanRevision,
  OnlinePlanSummary,
} from './types';

export type {
  AdminPermission,
  AdminPermissionCatalogItem,
  AdminRole,
  AdminRoleRecord,
  AdminRolesResponse,
  AdminUser,
  AdminUserDetail,

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
  NavBadges,
  CreditLedgerEntry,
  CreditPackage,
  CreditPackageBadge,
  CreditsOverview,
  CreditPurchase,
  HealthResponse,
  InviteAdminInput,
  LeadDetail,
  LeadLifecycleStatus,
  LeadStatus,
  LeadSummary,
  LeadUnlock,
  MessageAuthor,
  NotificationPrefs,
  OnlinePlanDetail,
  OnlinePlanRevision,
  OnlinePlanSummary,
  Paginated,
  PaginationMeta,
  Professional,
  ProfessionalSummary,
  ProfessionalTxn,
  ProPricing,
  ProServiceRate,
  MatchPrefs,
  PersonalProfile,
  ProfileCompletionPayload,
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

export function getNavBadges() {
  return request<NavBadges>('/v1/nav-badges');
}

export function login(email: string, password: string) {
  return request<SessionResponse>('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({email, password}),
  });
}

export function forgotPassword(email: string) {
  return request<{ok: boolean; message: string}>('/v1/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({email: email.trim().toLowerCase()}),
  });
}

export function resendForgotPassword(email: string) {
  return request<{ok: boolean; message: string}>('/v1/auth/forgot-password/resend', {
    method: 'POST',
    body: JSON.stringify({email: email.trim().toLowerCase()}),
  });
}

export function resetPassword(input: {
  email: string;
  code: string;
  password: string;
  passwordConfirmation: string;
}) {
  return request<SessionResponse & {ok: boolean; message: string}>('/v1/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      code: input.code.trim(),
      password: input.password,
      passwordConfirmation: input.passwordConfirmation,
    }),
  });
}

export function listAdmins() {
  return request<AdminUser[]>('/v1/admins');
}

export function getAdmin(id: number | string) {
  return request<AdminUserDetail>(`/v1/admins/${id}`);
}

export function inviteAdmin(input: InviteAdminInput) {
  return request<AdminUser>('/v1/admins', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAdmin(id: number, input: UpdateAdminInput & {actorId: number}) {
  return request<AdminUserDetail>(`/v1/admins/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function getCreditsOverview(
  params: {page?: number; perPage?: number} = {},
): Promise<CreditsOverview> {
  const {listCreditPackages, listPromoCodes} = await import('@/lib/apis');
  const [packs, promos, rest] = await Promise.all([
    listCreditPackages(),
    listPromoCodes(),
    request<Omit<CreditsOverview, 'packs' | 'promos'>>(
      `/v1/credits-meta${buildListQuery(params)}`,
    ),
  ]);
  return {...rest, packs, promos};
}

export {createPromoCode, listPromoCodes, updatePromoCode} from '@/lib/apis';
export {createService, listServices, reorderServices, updateService} from '@/lib/apis';

export function adjustCredits(input: AdjustCreditsInput) {
  return request<Professional>(`/v1/credit-adjustments`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listProfessionals(
  params: {page?: number; perPage?: number; q?: string; filter?: string} = {},
) {
  return request<Paginated<ProfessionalSummary>>(`/v1/professionals${buildListQuery(params)}`);
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

export async function listVerificationQueue(
  params: {page?: number; perPage?: number; status?: string; q?: string} = {},
): Promise<
  VerificationQueueResponse & {
    meta: Paginated<VerificationQueueItem>['meta'];
    counts: Record<string, number>;
  }
> {
  const data = await request<
    | (VerificationQueueResponse & {
        data?: VerificationQueueItem[];
        meta?: Paginated<VerificationQueueItem>['meta'];
        counts?: Record<string, number>;
      })
    | VerificationQueueItem[]
  >(`/v1/verification${buildListQuery(params)}`);
  if (Array.isArray(data)) {
    return {
      documentTypes: [],
      items: data,
      meta: {page: 1, perPage: data.length || 20, total: data.length, lastPage: 1},
      counts: {all: data.length, pending: 0, rejected: 0},
    };
  }
  const items = data.data ?? data.items ?? [];
  return {
    documentTypes: data.documentTypes ?? [],
    items,
    meta: data.meta ?? {
      page: 1,
      perPage: items.length || 20,
      total: items.length,
      lastPage: 1,
    },
    counts: data.counts ?? {all: items.length, pending: 0, rejected: 0},
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

export function listClients(
  params: {page?: number; perPage?: number; q?: string; filter?: string} = {},
) {
  return request<Paginated<ClientSummary>>(`/v1/clients${buildListQuery(params)}`);
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

export function listLeads(
  params: {
    page?: number;
    perPage?: number;
    status?: string;
    clientId?: string | number;
    assignedCoachId?: string | number;
  } = {},
) {
  return request<Paginated<LeadSummary>>(`/v1/leads${buildListQuery(params)}`);
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

export function listSupportTickets(
  params: {page?: number; perPage?: number; status?: string; q?: string} = {},
) {
  return request<Paginated<SupportTicketSummary>>(`/v1/support${buildListQuery(params)}`);
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

export type SupportContactSettings = {
  supportEmail: string;
  supportPhone: string;
};

export type BillingSettings = {
  vatRate: number;
  vatPercent: number;
};

export function getSupportContactSettings() {
  return request<SupportContactSettings>('/v1/platform-settings/support-contact');
}

export function updateSupportContactSettings(input: SupportContactSettings) {
  return request<SupportContactSettings>('/v1/platform-settings/support-contact', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function getBillingSettings() {
  return request<BillingSettings>('/v1/platform-settings/billing');
}

export function updateBillingSettings(input: {vatPercent: number}) {
  return request<BillingSettings>('/v1/platform-settings/billing', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export type FeaturesSettings = {
  onlinePlansEnabled: boolean;
};

export function getFeaturesSettings() {
  return request<FeaturesSettings>('/v1/platform-settings/features');
}

export function updateFeaturesSettings(input: Partial<FeaturesSettings>) {
  return request<FeaturesSettings>('/v1/platform-settings/features', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function listConversations(params: {page?: number; perPage?: number} = {}) {
  return request<Paginated<ConversationSummary>>(`/v1/messages${buildListQuery(params)}`);
}

export function getConversation(id: string) {
  return request<ConversationDetail>(`/v1/messages/${id}`);
}

export function listOnlinePlans(params: {page?: number; perPage?: number} = {}) {
  return request<Paginated<OnlinePlanSummary>>(`/v1/online-plans${buildListQuery(params)}`);
}

export function getOnlinePlan(id: number) {
  return request<OnlinePlanDetail>(`/v1/online-plans/${id}`);
}
