import {request} from '@/lib/request';
import {buildListQuery} from '@/lib/pagination';
import type {
  AdminRolesResponse,
  AdminRoleRecord,
  CatalogService,
  CreditBenefit,
  CreditPlan,
  CreditSubscriptionAdmin,
  CreditSubscriptionDetail,
  CreateCreditPlanInput,
  CreatePromoInput,
  CreateServiceInput,
  FoundingMembersResponse,
  Paginated,
  PromoCode,
  ReorderServicesInput,
  UpdateCreditPlanInput,
  UpdatePromoInput,
  UpdateServiceInput,
} from '@/api/types';

// ── Admin roles ───────────────────────────────────────────────────────────────

export function listAdminRoles() {
  return request<AdminRolesResponse>('/v1/admin-roles');
}

export function createAdminRole(input: {
  name: string;
  slug: string;
  permissions: string[];
}) {
  return request<AdminRoleRecord>('/v1/admin-roles', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAdminRole(
  id: number,
  input: {name?: string; permissions?: string[]},
) {
  return request<AdminRoleRecord>(`/v1/admin-roles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteAdminRole(id: number) {
  return request<void>(`/v1/admin-roles/${id}`, {method: 'DELETE'});
}

// ── Credit Plans ──────────────────────────────────────────────────────────────

export function listCreditPlans() {
  return request<CreditPlan[]>('/v1/credit-plans');
}

/** @deprecated Prefer listCreditPlans */
export function listCreditPackages() {
  return listCreditPlans();
}

export function listCreditSubscriptions(
  params: {page?: number; perPage?: number; status?: string; q?: string} = {},
) {
  return request<Paginated<CreditSubscriptionAdmin>>(
    `/v1/credit-subscriptions${buildListQuery(params)}`,
  );
}

export function getCreditSubscription(id: string) {
  return request<CreditSubscriptionDetail>(`/v1/credit-subscriptions/${id}`);
}

export function listFoundingMembers(params: {q?: string} = {}) {
  return request<FoundingMembersResponse>(
    `/v1/founding-members${buildListQuery(params)}`,
  );
}

export function createCreditPlan(input: CreateCreditPlanInput) {
  return request<CreditPlan>('/v1/credit-plans', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** @deprecated Prefer createCreditPlan */
export function createCreditPackage(input: CreateCreditPlanInput) {
  return createCreditPlan(input);
}

export function updateCreditPlan(id: number, input: UpdateCreditPlanInput) {
  return request<CreditPlan>(`/v1/credit-plans/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

/** @deprecated Prefer updateCreditPlan */
export function updateCreditPackage(id: number, input: UpdateCreditPlanInput) {
  return updateCreditPlan(id, input);
}

// ── Credit benefits ───────────────────────────────────────────────────────────

export function listCreditBenefits() {
  return request<CreditBenefit[]>('/v1/credit-benefits');
}

export function createCreditBenefit(input: {
  title: string;
  type: 'unlock_credit_discount' | 'free_unlocks';
  value: number;
}) {
  return request<CreditBenefit>('/v1/credit-benefits', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateCreditBenefit(
  id: number,
  input: {
    title?: string;
    value?: number | null;
  },
) {
  return request<CreditBenefit>(`/v1/credit-benefits/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteCreditBenefit(id: number) {
  return request<{ok: boolean}>(`/v1/credit-benefits/${id}`, {
    method: 'DELETE',
  });
}

// ── Promo Codes ───────────────────────────────────────────────────────────────

export function listPromoCodes() {
  return request<PromoCode[]>('/v1/promo-codes');
}

export function createPromoCode(input: CreatePromoInput) {
  return request<PromoCode>('/v1/promo-codes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updatePromoCode(id: number, input: UpdatePromoInput) {
  return request<PromoCode>(`/v1/promo-codes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

// ── Services ──────────────────────────────────────────────────────────────────

export function listServices() {
  return request<CatalogService[]>('/v1/services');
}

export function createService(input: CreateServiceInput) {
  return request<CatalogService>('/v1/services', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateService(id: number, input: UpdateServiceInput) {
  return request<CatalogService>(`/v1/services/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function reorderServices(input: ReorderServicesInput) {
  return request<CatalogService[]>('/v1/services/reorder', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
