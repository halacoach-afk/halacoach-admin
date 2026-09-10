import {request} from '@/lib/request';
import type {
  CatalogService,
  CreditPackage,
  CreditSubscriptionAdmin,
  CreateCreditPackageInput,
  CreatePromoInput,
  CreateServiceInput,
  PromoCode,
  UpdateCreditPackageInput,
  UpdatePromoInput,
  UpdateServiceInput,
} from '@/api/types';

// ── Credit Packages ───────────────────────────────────────────────────────────

export function listCreditPackages() {
  return request<CreditPackage[]>('/v1/credit-packages');
}

export function listCreditSubscriptions() {
  return request<CreditSubscriptionAdmin[]>('/v1/credit-subscriptions');
}

export function createCreditPackage(input: CreateCreditPackageInput) {
  return request<CreditPackage>('/v1/credit-packages', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateCreditPackage(id: number, input: UpdateCreditPackageInput) {
  return request<CreditPackage>(`/v1/credit-packages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
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
