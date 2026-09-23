'use client';

import Link from 'next/link';
import {useCallback, useEffect, useMemo, useState, type ReactNode} from 'react';
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Hash,
  Mail,
  MapPin,
  Phone,
  Shield,
  UserRound,
  Wallet,
} from 'lucide-react';
import {
  fetchVerificationFileBlob,
  getProfessional,
  isApiError,
  listLeads,
  listServices,
  updateProfessional,
  type CatalogService,
  type LeadLifecycleStatus,
  type LeadSummary,
  type Professional,
  type ProfileCompletionPayload,
  type SessionUser,
  type VerificationFile,
} from '@/api';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {DataTable} from '@/components/ui/DataTable';
import {ErrorState} from '@/components/ui/ErrorState';
import {FileViewerModal} from '@/components/ui/FileViewerModal';
import {LoadingState} from '@/components/ui/LoadingState';
import {NotificationPrefsPanel} from '@/components/support/NotificationPrefsPanel';
import {creditTxnLabel} from '@/lib/credit-utils';
import {leadPreferenceDisplay} from '@/lib/lead-preference-labels';
import {formatPostedAt} from '@/lib/lead-utils';
import {can} from '@/lib/permissions';
import {
  coachLeadPrefRows,
  coachLeadPrefsEmpty,
  formatCoachYearsExperience,
  verificationLabels,
} from '@/lib/professional-utils';

function Section({title, children}: {title: string; children: ReactNode}) {
  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </Card>
  );
}

function PrefField({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </p>
      <div className="mt-1 text-sm font-medium text-foreground">{value ?? '—'}</div>
    </div>
  );
}

function ContactValue({value, verified}: {value: string; verified?: boolean}) {
  const display = value.trim();
  if (!display) {
    return <span className="font-normal text-muted-foreground">â€”</span>;
  }
  return (
    <span className="break-all">
      {display}
      {verified === false ? (
        <span className="ms-1.5 text-xs font-normal text-muted-foreground">
          (unverified)
        </span>
      ) : null}
    </span>
  );
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return 'â€”';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return 'â€”';
  return date.toLocaleString();
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return 'â€”';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return 'â€”';
  return date.toLocaleDateString();
}

function resolvedLeadStatus(row: LeadSummary): LeadLifecycleStatus {
  if (row.leadStatus) {
    return row.leadStatus;
  }
  return row.status === 'closed' ? 'cancelled' : 'open';
}

function leadStatusTone(status: LeadLifecycleStatus) {
  if (status === 'in_progress') return 'primary' as const;
  if (status === 'completed') return 'muted' as const;
  if (status === 'cancelled') return 'danger' as const;
  return 'sky' as const;
}

function leadStatusLabel(status: LeadLifecycleStatus) {
  if (status === 'in_progress') return 'In progress';
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled') return 'Cancelled';
  return 'Open';
}

function LeadCell({value, className}: {value: string; className?: string}) {
  return (
    <td className={`px-4 py-3 align-top text-sm text-foreground ${className ?? ''}`}>
      <div className="max-w-[180px] whitespace-normal break-words">{value}</div>
    </td>
  );
}

function verificationTone(status: Professional['verificationStatus']) {
  if (status === 'verified') return 'primary' as const;
  if (status === 'pending') return 'warning' as const;
  if (status === 'rejected') return 'danger' as const;
  return 'muted' as const;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  reps_uae: 'REPs UAE',
  muahal: "Mu'Ahal",
  ministry_or_federation: 'Ministry / federation',
  cpr_aed: 'CPR / AED',
  insurance: 'Insurance',
  additional_certs: 'Additional certifications',
  trade_licence: 'Trade licence',
};

const DOC_TYPE_TAGLINES: Record<string, string> = {
  reps_uae: 'Valid REPs UAE registration certificate.',
  muahal: "Mu'Ahal professional qualification approval.",
  ministry_or_federation:
    'Ministry of Sports licence or federation approval.',
  cpr_aed: 'Current CPR/AED certification.',
  insurance: 'Professional liability or related insurance.',
  additional_certs: 'Specialty or other supporting certifications.',
  trade_licence: 'Commercial or trade licence, if applicable.',
};

function docTypeLabel(file: VerificationFile) {
  if (!file.docType) return 'Untyped';
  return DOC_TYPE_LABELS[file.docType] ?? file.docType;
}

function docTypeTagline(file: VerificationFile) {
  if (!file.docType) return null;
  return DOC_TYPE_TAGLINES[file.docType] ?? null;
}

function docStatusTone(status?: string) {
  if (status === 'approved' || status === 'expiring_soon') return 'primary' as const;
  if (status === 'rejected') return 'danger' as const;
  if (status === 'under_review') return 'sky' as const;
  return 'muted' as const;
}

function docStatusLabel(status?: string) {
  return String(status ?? 'submitted').replace(/_/g, ' ');
}

const COMPLETION_SECTION_LABELS: Record<string, string> = {
  about: 'About',
  verification: 'Verification',
  activated: 'Activated',
};

const COMPLETION_FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  bio: 'Bio',
  years: 'Years experience',
  emailVerified: 'Email verified',
  phoneVerified: 'Phone verified',
  reps_uae: 'REPs UAE',
  muahal: 'Muahal',
  ministry_or_federation: 'Ministry / federation',
  live: 'Live profile',
};

/** Checklist without prefs/pricing/credits - shown elsewhere or not needed here. */
function completionItems(
  value: Professional['profileCompletion'],
): ProfileCompletionPayload['items'] {
  if (!value || typeof value === 'number') {
    return [];
  }
  const items = Array.isArray(value.items) ? value.items : [];
  return items.filter(
    section =>
      section.id !== 'prefs' &&
      section.id !== 'pricing' &&
      section.id !== 'credits',
  );
}

function checklistPercent(items: ProfileCompletionPayload['items']): number {
  const fields = items.flatMap(section => section.fields ?? []);
  if (fields.length === 0) return 0;
  return Math.round((fields.filter(field => field.done).length / fields.length) * 100);
}

export function ProfessionalDetailScreen({
  actor,
  id,
}: {
  actor: SessionUser;
  id: string;
}) {
  const canWrite = can(actor, 'professionals:write');
  const [pro, setPro] = useState<Professional | null>(null);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingActivate, setPendingActivate] = useState<boolean | null>(null);
  const [viewer, setViewer] = useState<{fileId: string; name: string} | null>(null);

  const loadViewerFile = useCallback(async () => {
    if (!viewer) {
      throw new Error('Unable to open file.');
    }
    return fetchVerificationFileBlob(id, viewer.fileId);
  }, [id, viewer]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, catalog, allLeads] = await Promise.all([
        getProfessional(id),
        listServices(),
        listLeads(),
      ]);
      setPro(detail);
      setServices(catalog);
      const coachKey = String(detail.id);
      setLeads(
        allLeads.filter(lead => String(lead.assignedCoachId) === coachKey),
      );
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load professional.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const serviceNameById = useMemo(
    () => new Map(services.map(item => [item.id, item.name])),
    [services],
  );

  const coachLeads = useMemo(() => {
    if (!pro) return [];
    const coachKey = String(pro.id);
    return leads.filter(lead => String(lead.assignedCoachId) === coachKey);
  }, [pro, leads]);

  const toggleActivated = async () => {
    if (!pro || pendingActivate === null) {
      return;
    }
    try {
      const updated = await updateProfessional(pro.id, {activated: pendingActivate});
      setPro(updated);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not update activation.');
    } finally {
      setPendingActivate(null);
    }
  };

  if (loading) {
    return <LoadingState label="Loading professional..." />;
  }

  if (error || !pro) {
    return (
      <ErrorState
        body={error ?? 'Professional not found.'}
        onRetry={() => void load()}
      />
    );
  }

  const checklist = completionItems(pro.profileCompletion);
  const pct = checklistPercent(checklist);
  const leadPrefRows = coachLeadPrefRows(pro, serviceNameById);
  const leadPrefsEmpty = coachLeadPrefsEmpty(pro, serviceNameById);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/professionals"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} />
          Back to professionals
        </Link>
        <div className="flex flex-wrap gap-2">
          {canWrite ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPendingActivate(!pro.activated)}>
              {pro.activated ? 'Deactivate' : 'Activate'}
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Profile">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PrefField
              icon={<Hash className="size-3.5" strokeWidth={1.8} />}
              label="ID"
              value={pro.id}
            />
            <PrefField
              icon={<UserRound className="size-3.5" strokeWidth={1.8} />}
              label="Name"
              value={pro.name}
            />
            <PrefField
              icon={<Mail className="size-3.5" strokeWidth={1.8} />}
              label="Email"
              value={
                <ContactValue
                  value={pro.email}
                  verified={pro.emailVerified}
                />
              }
            />
            <PrefField
              icon={<Phone className="size-3.5" strokeWidth={1.8} />}
              label="Phone"
              value={
                <ContactValue
                  value={pro.phone}
                  verified={pro.phoneVerified}
                />
              }
            />
            <PrefField
              icon={<UserRound className="size-3.5" strokeWidth={1.8} />}
              label="Gender"
              value={pro.gender === 'female' ? 'Female' : 'Male'}
            />
            <PrefField
              icon={<Briefcase className="size-3.5" strokeWidth={1.8} />}
              label="Experience"
              value={formatCoachYearsExperience(
                pro.yearsExperience ?? pro.years,
              )}
            />
            <PrefField
              icon={<MapPin className="size-3.5" strokeWidth={1.8} />}
              label="Location"
              value={pro.location?.trim() || 'â€”'}
            />
          </div>
          {pro.about?.trim() || pro.bio?.trim() ? (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {pro.about?.trim() || pro.bio?.trim()}
            </p>
          ) : null}
        </Section>

        <Section title="Account">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PrefField
              icon={<Shield className="size-3.5" strokeWidth={1.8} />}
              label="Status"
              value={
                pro.suspended ? (
                  <Badge tone="danger">Suspended</Badge>
                ) : (
                  <Badge tone="primary">Active</Badge>
                )
              }
            />
            <PrefField
              icon={<ClipboardCheck className="size-3.5" strokeWidth={1.8} />}
              label="Onboarding"
              value={
                pro.onboarded ? (
                  <Badge tone="primary">Complete</Badge>
                ) : (
                  <Badge tone="warning">Incomplete</Badge>
                )
              }
            />
            <PrefField
              icon={<ClipboardCheck className="size-3.5" strokeWidth={1.8} />}
              label="Verification"
              value={
                <Badge tone={verificationTone(pro.verificationStatus)}>
                  {verificationLabels[pro.verificationStatus]}
                </Badge>
              }
            />
            <PrefField
              icon={<Shield className="size-3.5" strokeWidth={1.8} />}
              label="Marketplace"
              value={
                pro.activated ? (
                  <Badge tone="primary">Live</Badge>
                ) : (
                  <Badge tone="muted">Off</Badge>
                )
              }
            />
            <PrefField
              icon={<CalendarDays className="size-3.5" strokeWidth={1.8} />}
              label="Joined"
              value={
                <span className="break-words">{formatDateTime(pro.createdAt)}</span>
              }
            />
            <PrefField
              icon={<CalendarDays className="size-3.5" strokeWidth={1.8} />}
              label="Last active"
              value={
                <span className="break-words">
                  {formatDateTime(pro.lastActiveAt)}
                </span>
              }
            />
            <PrefField
              icon={<Wallet className="size-3.5" strokeWidth={1.8} />}
              label="Credits"
              value={pro.credits}
            />
          </div>
          {pro.verificationStatus === 'rejected' &&
          pro.verificationRejectedReason ? (
            <p className="mt-4 rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
              Rejected: {pro.verificationRejectedReason}
            </p>
          ) : null}
        </Section>

        <Section title="Profile completion">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{width: `${pct}%`}}
              />
            </div>
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {pct}%
            </span>
          </div>
          {checklist.length === 0 ? (
            <p className="text-sm text-muted-foreground">No checklist data.</p>
          ) : (
            <div className="space-y-4">
              {checklist.map(section => {
                const fields = section.fields ?? [];
                return (
                  <div key={section.id}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {COMPLETION_SECTION_LABELS[section.id] ?? section.id}
                      </p>
                      <Badge tone={section.done ? 'primary' : 'muted'}>
                        {section.done ? 'Done' : 'Incomplete'}
                      </Badge>
                    </div>
                    <ul className="space-y-2">
                      {fields.map(field => (
                        <li
                          key={field.id}
                          className="flex items-center gap-2.5 text-sm">
                          {field.done ? (
                            <CheckCircle2
                              className="size-4 shrink-0 text-primary"
                              strokeWidth={2}
                            />
                          ) : (
                            <Circle
                              className="size-4 shrink-0 text-muted-foreground"
                              strokeWidth={1.8}
                            />
                          )}
                          <span
                            className={
                              field.done
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                            }>
                            {COMPLETION_FIELD_LABELS[field.id] ?? field.id}
                            {field.optional ? (
                              <span className="ms-1 text-xs text-muted-foreground">
                                (optional)
                              </span>
                            ) : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="Notifications">
          <NotificationPrefsPanel prefs={pro.notificationPrefs} />
        </Section>
      </div>

      <div className="mt-6">
        <Section title="Lead preferences">
          {leadPrefsEmpty ? (
            <p className="text-sm text-muted-foreground">
              Coach has not set lead preferences yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {leadPrefRows.map(row => (
                <PrefField
                  key={row.label}
                  icon={<ClipboardCheck className="size-3.5" strokeWidth={1.8} />}
                  label={row.label}
                  value={<span className="break-words">{row.value}</span>}
                />
              ))}
            </div>
          )}
        </Section>
      </div>

      <div className="mt-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Documents
        </h2>
        {(pro.verificationFiles ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">None submitted</p>
        ) : (
          <DataTable
            tableClassName="min-w-[720px]"
            columns={['Name', 'Submitted', 'Verification', 'Expiry', 'Status', '']}>
            {(pro.verificationFiles ?? []).map(file => {
              const status = file.displayStatus ?? file.status;
              return (
                <tr key={file.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 align-top text-sm text-foreground">
                    <p className="font-medium">{docTypeLabel(file)}</p>
                    {docTypeTagline(file) ? (
                      <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                        {docTypeTagline(file)}
                      </p>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top text-sm text-muted-foreground">
                    {formatDate(pro.verificationSubmittedAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top text-sm text-muted-foreground">
                    {formatDate(file.reviewedAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top text-sm text-muted-foreground">
                    {formatDate(file.expiresAt)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Badge tone={docStatusTone(status)}>
                      {docStatusLabel(status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 align-top text-end">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      onClick={() =>
                        setViewer({fileId: file.id, name: file.originalName})
                      }>
                      View
                      <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </div>

      <div className="mt-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Wallet, credits and subscription history
        </h2>
        {(() => {
          const purchaseTxns = pro.txns.filter(
            txn =>
              txn.type === 'purchase' ||
              txn.label === 'credits.purchased' ||
              txn.label === 'credits.membership',
          );
          return (
            <DataTable
              tableClassName="min-w-[560px]"
              columns={['Description', 'Date', 'Amount']}
              footer={
                <tr className="border-t border-border bg-muted/40">
                  <td
                    colSpan={2}
                    className="px-4 py-3 text-sm font-semibold text-foreground">
                    Current balance
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-end text-sm font-bold tabular-nums text-foreground">
                    {pro.credits} credits
                  </td>
                </tr>
              }>
              {purchaseTxns.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-6 text-sm text-muted-foreground">
                    No credit or subscription purchases yet.
                  </td>
                </tr>
              ) : (
                purchaseTxns.map(txn => (
                  <tr key={txn.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 align-top text-sm font-medium text-foreground">
                      {creditTxnLabel(txn.label)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top text-sm text-muted-foreground">
                      {formatDateTime(txn.at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top text-end text-sm font-semibold tabular-nums text-primary">
                      +{txn.credits}
                    </td>
                  </tr>
                ))
              )}
            </DataTable>
          );
        })()}
      </div>

      <div className="mt-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Leads
        </h2>
        {coachLeads.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No assigned leads for this coach.
          </p>
        ) : (
          <DataTable
            tableClassName="min-w-[1000px]"
            columns={['ID', 'Goal', 'Format', 'Frequency', 'Status', 'Posted', '']}>
            {coachLeads.map(row => {
              const status = resolvedLeadStatus(row);
              const serviceName =
                serviceNameById.get(row.serviceId) ??
                row.service ??
                row.goal ??
                `Service #${row.serviceId}`;
              const prefs = leadPreferenceDisplay(row, serviceName);
              return (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 align-top text-sm text-muted-foreground">
                    {row.id}
                  </td>
                  <td className="px-4 py-3 align-top text-sm font-medium text-foreground">
                    {prefs.goal}
                  </td>
                  <LeadCell value={prefs.format} />
                  <LeadCell value={prefs.frequency} />
                  <td className="px-4 py-3 align-top">
                    <Badge tone={leadStatusTone(status)}>
                      {leadStatusLabel(status)}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top text-sm text-muted-foreground">
                    {formatPostedAt(row.postedAt)}
                  </td>
                  <td className="px-4 py-3 align-top text-end">
                    <Link
                      href={`/leads/${row.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                      View
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </div>

      <FileViewerModal
        open={viewer !== null}
        title={viewer?.name ?? ''}
        onClose={() => setViewer(null)}
        load={loadViewerFile}
      />

      <ConfirmDialog
        open={pendingActivate !== null}
        title={pendingActivate ? 'Activate profile?' : 'Deactivate profile?'}
        body={
          pendingActivate
            ? 'The coach profile can go live in the marketplace once verification is approved.'
            : 'The profile will be hidden from clients until activated again.'
        }
        confirmLabel={pendingActivate ? 'Activate' : 'Deactivate'}
        onClose={() => setPendingActivate(null)}
        onConfirm={() => void toggleActivated()}
      />
    </>
  );
}
