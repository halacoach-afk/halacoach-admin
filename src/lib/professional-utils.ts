import type {Professional, ProfessionalSummary, VerificationQueueItem} from '@/api/types';

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
    specialty: pro.specialty,
    location: pro.location,
    serviceCount: pro.serviceIds.length,
    verificationStatus: pro.verificationStatus,
    credits: pro.credits,
    activated: pro.activated,
    onboarded: pro.onboarded,
    suspended: pro.suspended,
    profileCompletion: completionPercent(pro.profileCompletion),
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
