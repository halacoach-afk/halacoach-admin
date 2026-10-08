'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState, type ReactNode} from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Dumbbell,
  Hash,
  Mail,
  MapPin,
  Phone,
  Shield,
  UserRound,
} from 'lucide-react';
import {
  getClient,
  isApiError,
  listLeads,
  listServices,
  updateClient,
  type CatalogService,
  type Client,
  type LeadLifecycleStatus,
  type LeadSummary,
  type ProfileCompletionPayload,
  type SessionUser,
} from '@/api';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {DataTable} from '@/components/ui/DataTable';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {NotificationPrefsPanel} from '@/components/support/NotificationPrefsPanel';
import {dobWithBandParts} from '@/lib/age-display';
import {leadPreferenceDisplay} from '@/lib/lead-preference-labels';
import {formatPostedAt} from '@/lib/lead-utils';
import {can} from '@/lib/permissions';
import {completionPercent} from '@/lib/professional-utils';

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
    return <span className="font-normal text-muted-foreground">—</span>;
  }
  return (
    <span>
      <span className="break-all">{display}</span>
      {verified === false ? (
        <span className="ms-1.5 whitespace-nowrap text-xs font-normal text-muted-foreground">
          (unverified)
        </span>
      ) : null}
    </span>
  );
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleString();
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
      {value}
    </td>
  );
}

const COMPLETION_SECTION_LABELS: Record<string, string> = {
  about: 'About',
  verification: 'Verification',
};

const COMPLETION_FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  gender: 'Gender',
  birth_date: 'Birth date',
  gymAccess: 'Gym access',
  emailVerified: 'Email verified',
  phoneVerified: 'Phone verified',
};

function completionItems(value: Client['profileCompletion']): ProfileCompletionPayload['items'] {
  if (!value || typeof value === 'number') {
    return [];
  }
  return Array.isArray(value.items) ? value.items : [];
}

export function ClientDetailScreen({
  actor,
  id,
}: {
  actor: SessionUser;
  id: string;
}) {
  const canWrite = can(actor, 'clients:write');
  const [client, setClient] = useState<Client | null>(null);
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingSuspend, setPendingSuspend] = useState<boolean | null>(null);
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, allLeads, catalog] = await Promise.all([
        getClient(id),
        listLeads({clientId: id, perPage: 100}),
        listServices(),
      ]);
      setClient(detail);
      setLeads(allLeads.data);
      setServices(catalog);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load client.');
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

  const clientLeads = useMemo(() => {
    if (!client) {
      return [];
    }
    const clientKey = String(client.id);
    return leads.filter(lead => String(lead.clientId) === clientKey);
  }, [client, leads]);

  const toggleSuspended = async () => {
    if (!client || pendingSuspend === null) {
      return;
    }
    setActing(true);
    setError(null);
    try {
      const updated = await updateClient(client.id, {suspended: pendingSuspend});
      setClient(updated);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not update suspension.');
    } finally {
      setPendingSuspend(null);
      setActing(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading client..." />;
  }

  if (error && !client) {
    return <ErrorState body={error ?? 'Client not found.'} onRetry={() => void load()} />;
  }

  if (!client) {
    return <ErrorState body="Client not found." onRetry={() => void load()} />;
  }

  const profile = client.profile ?? {};
  const birthDate = client.birthDate ?? profile.birth_date ?? null;
  const pct = completionPercent(client.profileCompletion);
  const checklist = completionItems(client.profileCompletion);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} />
          Back to clients
        </Link>
        <div className="flex flex-wrap gap-2">
          {canWrite && !client.deletedAt ? (
            <Button
              variant={client.suspended ? 'primary' : 'destructive'}
              size="sm"
              disabled={acting}
              onClick={() => setPendingSuspend(!client.suspended)}>
              {client.suspended ? 'Unsuspend' : 'Suspend'}
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={acting}>
            Refresh
          </Button>
        </div>
      </div>

      {error ? <ErrorState body={error} onRetry={() => void load()} /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Profile">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PrefField
              icon={<Hash className="size-3.5" strokeWidth={1.8} />}
              label="ID"
              value={client.id}
            />
            <PrefField
              icon={<UserRound className="size-3.5" strokeWidth={1.8} />}
              label="Name"
              value={client.name}
            />
            <PrefField
              icon={<Mail className="size-3.5" strokeWidth={1.8} />}
              label="Email"
              value={
                <ContactValue
                  value={client.email}
                  verified={client.emailVerified}
                />
              }
            />
            <PrefField
              icon={<Phone className="size-3.5" strokeWidth={1.8} />}
              label="Phone"
              value={
                <ContactValue
                  value={client.phone}
                  verified={client.phoneVerified}
                />
              }
            />
            <PrefField
              icon={<CalendarDays className="size-3.5" strokeWidth={1.8} />}
              label="Birth date"
              value={(() => {
                const parts = dobWithBandParts(birthDate);
                if (!parts) return '—';
                return (
                  <span>
                    <span className="block">{parts.date}</span>
                    {parts.band ? (
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                        {parts.band}
                      </span>
                    ) : null}
                  </span>
                );
              })()}
            />
            <PrefField
              icon={<UserRound className="size-3.5" strokeWidth={1.8} />}
              label="Gender"
              value={profile.gender?.trim() || '—'}
            />
            <PrefField
              icon={<Dumbbell className="size-3.5" strokeWidth={1.8} />}
              label="Gym access"
              value={profile.gymAccess?.trim() || '—'}
            />
            <PrefField
              icon={<MapPin className="size-3.5" strokeWidth={1.8} />}
              label="Location"
              value={profile.location?.trim() || '—'}
            />
          </div>
        </Section>

        <Section title="Account">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PrefField
              icon={<Shield className="size-3.5" strokeWidth={1.8} />}
              label="Status"
              value={
                client.deletedAt ? (
                  <Badge tone="danger">Deleted</Badge>
                ) : client.suspended ? (
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
                client.onboarded ? (
                  <Badge tone="primary">Complete</Badge>
                ) : (
                  <Badge tone="warning">Incomplete</Badge>
                )
              }
            />
            <PrefField
              icon={<CalendarDays className="size-3.5" strokeWidth={1.8} />}
              label="Joined"
              value={
                <span className="break-words">{formatDateTime(client.createdAt)}</span>
              }
            />
            <PrefField
              icon={<CalendarDays className="size-3.5" strokeWidth={1.8} />}
              label="Last active"
              value={
                <span className="break-words">
                  {formatDateTime(client.lastActiveAt)}
                </span>
              }
            />
          </div>
          {client.note ? (
            <p className="mt-4 rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
              {client.note}
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
          <NotificationPrefsPanel prefs={client.notificationPrefs} />
        </Section>
      </div>

      <div className="mt-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Leads
        </h2>
        {clientLeads.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leads for this client.</p>
        ) : (
          <DataTable
            columns={[
              'ID',
              'Goal',
              'Format',
              'Frequency',
              'Coach',
              'Status',
              'Posted',
              '',
            ]}>
            {clientLeads.map(row => {
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
                  <td className="px-4 py-3 align-top text-sm">
                    {row.assignedCoachName && row.assignedCoachId ? (
                      <Link
                        href={`/professionals/${row.assignedCoachId}`}
                        className="font-medium text-primary hover:underline">
                        {row.assignedCoachName}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
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

      <ConfirmDialog
        open={pendingSuspend !== null}
        title={pendingSuspend ? 'Suspend this client?' : 'Unsuspend this client?'}
        body={
          pendingSuspend
            ? 'They will be signed out and cannot log in until unsuspended. Their leads stay in the system but leave the marketplace.'
            : 'They will be able to log in and use the app again.'
        }
        confirmLabel={pendingSuspend ? 'Suspend' : 'Unsuspend'}
        destructive={pendingSuspend === true}
        onClose={() => {
          if (!acting) setPendingSuspend(null);
        }}
        onConfirm={() => void toggleSuspended()}
      />
    </>
  );
}
