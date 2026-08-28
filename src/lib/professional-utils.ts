import type {Professional, ProfessionalSummary, VerificationQueueItem} from '@/api/types';

export function profileCompletion(pro: Professional): number {
  const pricing = pro.pricing;
  const hasPricing =
    Object.keys(pricing?.rates ?? {}).length > 0 ||
    Boolean(pricing?.onlineMonthly) ||
    Boolean(pricing?.notes);
  const checks = [
    Boolean(pro.name && pro.email),
    pro.onboarded,
    pro.serviceIds.length > 0,
    pro.locations.length > 0,
    hasPricing,
    pro.certificationFiles.length > 0,
    pro.activated,
    pro.verification === 'pending' || pro.verification === 'verified',
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
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
    verification: pro.verification,
    credits: pro.credits,
    activated: pro.activated,
    onboarded: pro.onboarded,
    suspended: pro.suspended,
    profileCompletion: profileCompletion(pro),
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
    certificationFiles: pro.certificationFiles,
    insuranceFiles: pro.insuranceFiles,
    serviceIds: pro.serviceIds,
    profileCompletion: profileCompletion(pro),
    profileCertifications: pro.profileCertifications,
  };
}

export const verificationLabels = {
  none: 'None',
  pending: 'Pending',
  verified: 'Verified',
  rejected: 'Rejected',
} as const;

export const locationLabels: Record<string, string> = {
  coach: 'My location',
  client: 'Client location',
  online: 'Online',
};
