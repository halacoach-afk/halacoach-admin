import type {Professional, ProfessionalSummary, VerificationQueueItem} from '@/api/types';
import {matchPrefsDisplayRows} from '@/lib/lead-preference-labels';

export function completionPercent(
  value: number | {percent?: number} | null | undefined,
): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object' && typeof value.percent === 'number') {
    return value.percent;
  }
  return 0;
}

export function profileCompletion(pro: Professional): number {
  return completionPercent(pro.profileCompletion);
}

export function toProfessionalSummary(pro: Professional): ProfessionalSummary {
  return {
    id: pro.id,
    name: pro.name,
    email: pro.email,
    phone: pro.phone,
    emailVerified: Boolean(pro.emailVerified),
    phoneVerified: Boolean(pro.phoneVerified),
    specialty: pro.specialty,
    location: pro.location,
    years: String(pro.yearsExperience ?? pro.years ?? '').trim(),
    about: pro.about || pro.bio || '',
    serviceCount: pro.serviceIds.length,
    verificationStatus: pro.verificationStatus,
    credits: pro.credits,
    activated: pro.activated,
    onboarded: pro.onboarded,
    suspended: pro.suspended,
    profileCompletion: completionPercent(pro.profileCompletion),
    createdAt: pro.createdAt,
    lastActiveAt: pro.lastActiveAt ?? pro.createdAt,
  };
}

export function toVerificationQueueItem(pro: Professional): VerificationQueueItem {
  return {
    id: pro.id,
    name: pro.name,
    email: pro.email,
    phone: pro.phone,
    specialty: pro.specialty,
    location: pro.location,
    submittedAt: pro.verificationSubmittedAt ?? pro.createdAt,
    verificationFiles: pro.verificationFiles ?? [],
    serviceIds: pro.serviceIds,
    profileCompletion: profileCompletion(pro),
    profileCertifications: pro.profileCertifications,
  };
}

export const verificationLabels = {
  none: 'Not submitted',
  pending: 'In review',
  verified: 'Verified',
  rejected: 'Rejected',
} as const;

export const locationLabels: Record<string, string> = {
  coach: 'My location',
  client: 'Client location',
  online_live: 'Live virtual coaching',
  online: 'Online',
};

/** Coach profile experience bands (same as app/web about.yearsOpt*). */
const YEARS_EXPERIENCE_LABELS: Record<string, string> = {
  '0-1': 'Less than 2 years',
  '2-4': '2–4 years',
  '5-7': '5–7 years',
  '8-10': '8–10 years',
  '11-15': '11–15 years',
  '16+': '16 or more years',
};

/** Map stored experience (band id or legacy number) to coach-profile label. */
export function formatCoachYearsExperience(
  raw: string | number | null | undefined,
): string {
  const value = String(raw ?? '').trim();
  if (!value) return '—';
  if (YEARS_EXPERIENCE_LABELS[value]) {
    return YEARS_EXPERIENCE_LABELS[value];
  }
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) return value;
  if (n <= 1) return YEARS_EXPERIENCE_LABELS['0-1'];
  if (n <= 4) return YEARS_EXPERIENCE_LABELS['2-4'];
  if (n <= 7) return YEARS_EXPERIENCE_LABELS['5-7'];
  if (n <= 10) return YEARS_EXPERIENCE_LABELS['8-10'];
  if (n <= 15) return YEARS_EXPERIENCE_LABELS['11-15'];
  return YEARS_EXPERIENCE_LABELS['16+'];
}

/** Coach match / lead preference rows for admin detail. */
export function coachLeadPrefRows(
  pro: Professional,
  serviceNameById?: Map<number, string>,
): Array<{label: string; value: string}> {
  return matchPrefsDisplayRows(pro.matchPrefs, serviceNameById);
}

export function coachLeadPrefsEmpty(
  pro: Professional,
  serviceNameById?: Map<number, string>,
): boolean {
  const rows = coachLeadPrefRows(pro, serviceNameById);
  return rows.every(row => row.value === '—');
}
