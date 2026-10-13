import type {ActivityLogEntry, ActivityLogEntityRef} from '@/api/types';
import {formatDashboardTime} from '@/lib/dashboard-utils';

export type ActivityActorKind = 'system' | 'admin' | 'coach' | 'client' | 'user';

/** Human-readable event titles. */
export const ACTIVITY_EVENT_LABELS: Record<string, string> = {
  'user.registered': 'User registered',
  'user.password_changed': 'Password changed',
  'user.avatar_updated': 'Avatar updated',
  'user.avatar_deleted': 'Avatar deleted',
  'user.contact_verified': 'Contact verified',
  'user.account_deleted': 'Account deleted',
  'user.password_reset': 'Password reset',
  'user.profile_updated': 'Profile updated',
  'user.preferences_updated': 'Preferences updated',
  'lead.created': 'Lead created',
  'lead.updated': 'Lead updated',
  'lead.assigned': 'Lead assigned',
  'lead.unlocked': 'Lead unlocked',
  'lead.completion_requested': 'Completion requested',
  'lead.completion_accepted': 'Completion accepted',
  'lead.completion_rejected': 'Completion rejected',
  'credits.spent': 'Credits spent',
  'credits.added': 'Credits added',
  'credits.purchased': 'Credits purchased',
  'credits.subscribed': 'Subscription started',
  'credits.subscription_cancelled': 'Subscription cancelled',
  'credits.adjusted': 'Credits adjusted',
  'credits.expired': 'Credits expired',
  'verification.submitted': 'Verification submitted',
  'verification.approved': 'Verification approved',
  'verification.rejected': 'Verification rejected',
  'verification.file_approved': 'Verification file approved',
  'verification.file_rejected': 'Verification file rejected',
  'verification.file_under_review': 'Verification file under review',
  'verification.expiry_updated': 'Verification expiry updated',
  'message.sent': 'Message sent',
  'conversation.created': 'Conversation created',
  'support.ticket_created': 'Support ticket created',
  'support.ticket_updated': 'Support ticket updated',
  'online_plan.updated': 'Online plan updated',
  'online_plan.generated': 'Online plan generated',
  'online_plan.day_regenerated': 'Plan day regenerated',
  'online_plan.nutrition_regenerated': 'Nutrition regenerated',
  'online_plan.intake_updated': 'Intake updated',
  'online_plan.checkin': 'Plan check-in',
  'online_plan.progress_updated': 'Progress updated',
  'admin.created': 'Admin created',
  'admin.updated': 'Admin updated',
  'admin.deleted': 'Admin deleted',
  'admin.role_created': 'Admin role created',
  'admin.role_updated': 'Admin role updated',
  'admin.role_deleted': 'Admin role deleted',
  'admin.client_updated': 'Client updated by admin',
  'admin.professional_updated': 'Coach updated by admin',
  'admin.professional_bulk': 'Bulk coach update',
  'admin.lead_updated': 'Lead updated by admin',
  'admin.note_created': 'Admin note created',
  'admin.note_updated': 'Admin note updated',
  'admin.note_deleted': 'Admin note deleted',
  'admin.credit_package_created': 'Credit package created',
  'admin.credit_package_updated': 'Credit package updated',
  'admin.promo_created': 'Promo code created',
  'admin.promo_updated': 'Promo code updated',
  'admin.service_created': 'Service created',
  'admin.service_updated': 'Service updated',
  'admin.services_reordered': 'Services reordered',
  'admin.settings_updated': 'Settings updated',
  'admin.password_reset': 'Admin password reset',
};

export const ACTIVITY_EVENT_FILTER_OPTIONS = Object.entries(ACTIVITY_EVENT_LABELS)
  .map(([value, label]) => ({value, label}))
  .sort((a, b) => a.label.localeCompare(b.label));

export const ACTIVITY_ACTOR_KIND_OPTIONS = [
  {value: 'system', label: 'System'},
  {value: 'admin', label: 'Admin'},
  {value: 'coach', label: 'Coach'},
  {value: 'client', label: 'Client'},
];

const ENTITY_TYPE_LABELS: Record<string, string> = {
  lead: 'Lead',
  client: 'Client',
  coach: 'Coach',
  user: 'User',
  admin: 'Admin',
  admin_role: 'Admin role',
  credit_transaction: 'Credit transaction',
  support_ticket: 'Support ticket',
  service: 'Service',
  credit_package: 'Credit package',
  promo_code: 'Promo code',
  online_plan: 'Online plan',
  message: 'Message',
  conversation: 'Conversation',
  note: 'Note',
  platform_setting: 'Platform setting',
};

export function activityEventLabel(event: string) {
  return ACTIVITY_EVENT_LABELS[event] ?? humanizeToken(event);
}

export function activityActorKindLabel(kind: string | null | undefined) {
  if (kind === 'system') return 'System';
  if (kind === 'admin') return 'Admin';
  if (kind === 'coach') return 'Coach';
  if (kind === 'client') return 'Client';
  if (kind === 'user') return 'User';
  return kind ? humanizeToken(kind) : '—';
}

export function resolveActivityActorKind(row: ActivityLogEntry): ActivityActorKind {
  if (row.actorKind === 'system' || row.actorKind === 'admin' || row.actorKind === 'coach' || row.actorKind === 'client') {
    return row.actorKind;
  }
  if (row.actorType === 'system') return 'system';
  if (row.actorType === 'admin') return 'admin';
  const coach = row.entities.some(e => e.type === 'coach' && row.actorId && e.id === row.actorId);
  if (coach) return 'coach';
  const client = row.entities.some(e => e.type === 'client' && row.actorId && e.id === row.actorId);
  if (client) return 'client';
  return 'user';
}

export function activityActorLabel(row: ActivityLogEntry) {
  if (row.actorName?.trim()) return row.actorName.trim();
  if (resolveActivityActorKind(row) === 'system') return 'System';
  return '—';
}

export function activityActorHref(row: ActivityLogEntry): string | null {
  if (!row.actorId) return null;
  const kind = resolveActivityActorKind(row);
  if (kind === 'admin') return `/admins/${row.actorId}`;
  if (kind === 'coach') return `/professionals/${row.actorId}`;
  if (kind === 'client') return `/clients/${row.actorId}`;
  return null;
}

export function activityEntityTypeLabel(type: string) {
  return ENTITY_TYPE_LABELS[type] ?? humanizeToken(type);
}

export function activityEntityLabel(entity: ActivityLogEntityRef) {
  return `${activityEntityTypeLabel(entity.type)} #${entity.id}`;
}

export function activityEntityHref(
  entity: ActivityLogEntityRef,
  siblings: ActivityLogEntityRef[] = [],
): string | null {
  if (entity.type === 'lead') return `/leads/${entity.id}`;
  if (entity.type === 'client') return `/clients/${entity.id}`;
  if (entity.type === 'coach') return `/professionals/${entity.id}`;
  if (entity.type === 'support_ticket') return `/support/${entity.id}`;
  if (entity.type === 'online_plan') return `/online-clients/${entity.id}`;
  if (entity.type === 'admin') return `/admins/${entity.id}`;
  if (entity.type === 'credit_transaction') {
    return '/billing';
  }
  if (entity.type === 'credit_package') return '/credits';
  if (entity.type === 'promo_code') return '/credits';
  if (entity.type === 'service') return '/services';
  if (entity.type === 'admin_role') return '/admins';
  if (entity.type === 'platform_setting') return '/settings';
  if (entity.type === 'note') {
    const coach = siblings.find(e => e.type === 'coach');
    if (coach) return `/professionals/${coach.id}`;
  }
  if (entity.type === 'conversation' || entity.type === 'message') return '/messages';
  return null;
}

export function formatActivityOccurredAt(value: string | null) {
  if (!value) return '—';
  return formatDashboardTime(value);
}

/** Absolute + relative timestamp for the When column. */
export function formatActivityWhenParts(
  value: string | null | undefined,
): {absolute: string; relative: string} | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const absolute = date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return {absolute, relative: formatRelativeTime(date)};
}

/** Short human summary from activity payload. */
export function activitySummary(row: ActivityLogEntry): string {
  const p = row.payload ?? {};
  const parts: string[] = [];

  const credits = asNumber(p.credits ?? p.creditsSpent);
  if (credits != null) {
    parts.push(`${credits} credit${credits === 1 ? '' : 's'}`);
  }

  const match = asNumber(p.matchPercent ?? p.match);
  if (match != null) {
    parts.push(`${match}% match`);
  }

  if (typeof p.status === 'string' && p.status.trim()) {
    parts.push(`Status: ${humanizeToken(p.status)}`);
  }
  if (typeof p.previousStatus === 'string' && p.previousStatus.trim()) {
    parts.push(`From ${humanizeToken(p.previousStatus)}`);
  }

  if (typeof p.format === 'string' && p.format.trim()) {
    parts.push(humanizeToken(p.format));
  }
  if (typeof p.source === 'string' && p.source.trim()) {
    parts.push(humanizeToken(p.source));
  }

  if (typeof p.name === 'string' && p.name.trim()) {
    parts.push(p.name.trim());
  }
  if (typeof p.code === 'string' && p.code.trim()) {
    parts.push(`Code ${p.code.trim()}`);
  }
  if (typeof p.email === 'string' && p.email.trim()) {
    parts.push(p.email.trim());
  }
  if (typeof p.subject === 'string' && p.subject.trim()) {
    parts.push(p.subject.trim());
  }
  if (typeof p.role === 'string' && p.role.trim()) {
    const role = p.role === 'pro' ? 'Coach' : humanizeToken(p.role);
    parts.push(`Role: ${role}`);
  }
  if (typeof p.channel === 'string' && p.channel.trim()) {
    parts.push(humanizeToken(p.channel));
  }
  if (typeof p.docType === 'string' && p.docType.trim()) {
    parts.push(humanizeToken(p.docType));
  }
  if (typeof p.reason === 'string' && p.reason.trim()) {
    parts.push(truncate(p.reason.trim(), 80));
  }
  if (typeof p.label === 'string' && p.label.trim()) {
    parts.push(humanizeToken(p.label));
  }
  if (typeof p.type === 'string' && p.type.trim() && p.credits == null) {
    parts.push(humanizeToken(p.type));
  }
  if (typeof p.benefitType === 'string' && p.benefitType.trim()) {
    parts.push(humanizeToken(p.benefitType));
  }
  if (typeof p.preview === 'string' && p.preview.trim()) {
    parts.push(truncate(p.preview.trim(), 80));
  }
  const leadId = asNumber(p.leadId);
  if (leadId != null) {
    parts.push(`Lead #${leadId}`);
  }
  const requestId = asNumber(p.requestId);
  if (requestId != null) {
    parts.push(`Request #${requestId}`);
  }

  const price = asNumber(p.price);
  if (price != null) {
    parts.push(`AED ${price}`);
  }

  if (Array.isArray(p.fields) && p.fields.length) {
    const labels = p.fields
      .filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
      .map(f => humanizeToken(f));
    if (labels.length) {
      parts.push(`Updated: ${labels.slice(0, 4).join(', ')}${labels.length > 4 ? '…' : ''}`);
    }
  }

  if (typeof p.action === 'string' && p.action.trim()) {
    parts.push(humanizeToken(p.action));
  }
  if (Array.isArray(p.updatedIds) && p.updatedIds.length) {
    parts.push(`${p.updatedIds.length} updated`);
  }
  if (Array.isArray(p.failedIds) && p.failedIds.length) {
    parts.push(`${p.failedIds.length} failed`);
  }

  if (typeof p.key === 'string' && p.key.trim()) {
    parts.push(humanizeToken(p.key));
  }

  if (typeof p.verificationStatus === 'string' && p.verificationStatus.trim()) {
    parts.push(humanizeToken(p.verificationStatus));
  }

  if (!parts.length) {
    // Prefer a readable event label over a blank Details cell.
    return activityEventLabel(row.event);
  }
  return uniqueParts(parts).join(' · ');
}

function formatRelativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (Math.abs(minutes) < 1) return 'Just now';
  if (Math.abs(minutes) < 60) {
    const m = Math.abs(minutes);
    return minutes < 0 ? `In ${m} min` : `${m} min ago`;
  }
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    const h = Math.abs(hours);
    return hours < 0
      ? `In ${h} hour${h === 1 ? '' : 's'}`
      : `${h} hour${h === 1 ? '' : 's'} ago`;
  }
  const days = Math.round(hours / 24);
  if (Math.abs(days) === 1) return days < 0 ? 'Tomorrow' : 'Yesterday';
  if (Math.abs(days) < 7) {
    const d = Math.abs(days);
    return days < 0 ? `In ${d} days` : `${d} days ago`;
  }
  return date.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function uniqueParts(parts: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(part);
  }
  return out;
}

function humanizeToken(value: string) {
  return value
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase())
    .trim();
}
