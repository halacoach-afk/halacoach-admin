'use client';

import Link from 'next/link';
import {useEffect, useState, type ReactNode} from 'react';
import {ArrowLeft, ExternalLink} from 'lucide-react';
import {
  getLead,
  isApiError,
  listServices,
  updateLead,
  type CatalogService,
  type LeadDetail,
  type SessionUser,
} from '@/api';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {formatPostedAt} from '@/lib/lead-utils';
import {can} from '@/lib/permissions';

function Section({title, children}: {title: string; children: ReactNode}) {
  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </Card>
  );
}

function Field({label, value}: {label: string; value: ReactNode}) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}

export function LeadDetailScreen({actor, id}: {actor: SessionUser; id: string}) {
  const canWrite = can(actor.role, 'leads:write');
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingClose, setPendingClose] = useState(false);
  const [pendingReopen, setPendingReopen] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, catalog] = await Promise.all([getLead(Number(id)), listServices()]);
      setLead(detail);
      setServices(catalog);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load lead.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const serviceName =
    services.find(item => item.id === lead?.serviceId)?.name ??
    (lead?.serviceId != null ? `#${lead.serviceId}` : '—');

  const setStatus = async (status: 'open' | 'closed') => {
    if (!lead) {
      return;
    }
    try {
      const updated = await updateLead(lead.id, {status});
      setLead(updated);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not update lead status.');
    } finally {
      setPendingClose(false);
      setPendingReopen(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading lead…" />;
  }

  if (error || !lead) {
    return <ErrorState body={error ?? 'Lead not found.'} onRetry={() => void load()} />;
  }

  return (
    <>
      <div className="mb-4">
        <Link
          href="/leads"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} />
          Back to leads
        </Link>
      </div>

      <PageHeader
        module="M7"
        title={lead.goal}
        description={`${lead.location} · ${formatPostedAt(lead.postedAt)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Refresh
            </Button>
            {canWrite && lead.status === 'open' ? (
              <Button variant="outline" size="sm" onClick={() => setPendingClose(true)}>
                Close
              </Button>
            ) : null}
            {canWrite && lead.status === 'closed' ? (
              <Button size="sm" onClick={() => setPendingReopen(true)}>
                Reopen
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone={lead.status === 'open' ? 'primary' : 'muted'}>{lead.status}</Badge>
        <Badge tone="muted">{lead.unlocks?.length ?? 0} unlocks</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Request">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Goal / service" value={serviceName} />
            <Field label="Location" value={lead.location} />
            <Field label="Frequency" value={lead.frequency} />
            <Field label="Format" value={lead.format} />
            <Field label="Days" value={lead.days} />
            <Field label="Time" value={lead.time} />
          </dl>
          {lead.clientNote ? (
            <p className="mt-4 rounded-lg bg-muted/50 p-3 text-sm text-foreground">{lead.clientNote}</p>
          ) : null}
        </Section>

        <Section title="Client">
          <dl className="grid gap-3">
            <Field label="Name" value={lead.clientName} />
            <Field label="Email" value={lead.clientEmail || '—'} />
            <Field label="Phone" value={lead.clientPhone || '—'} />
            {lead.clientId ? (
              <div>
                <Link
                  href={`/clients/${lead.clientId}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  Open client record <ExternalLink size={14} />
                </Link>
              </div>
            ) : null}
          </dl>
        </Section>

        <Section title="Unlocks">
          {!lead.unlocks?.length ? (
            <p className="text-sm text-muted-foreground">No coaches have unlocked this client yet.</p>
          ) : (
            <ul className="space-y-2">
              {lead.unlocks.map(unlock => (
                <li
                  key={unlock.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{unlock.professionalName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(unlock.unlockedAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="font-medium text-foreground">−{unlock.credits} cr</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Unlock cost is computed at unlock time from coach–client match % (100% = 50 credits).
          </p>
        </Section>
      </div>

      <ConfirmDialog
        open={pendingClose}
        title="Close this lead?"
        body="It will be removed from the marketplace. Coaches cannot unlock it until reopened."
        confirmLabel="Close lead"
        destructive
        onClose={() => setPendingClose(false)}
        onConfirm={() => void setStatus('closed')}
      />

      <ConfirmDialog
        open={pendingReopen}
        title="Reopen this lead?"
        body="The request will appear in the marketplace again for coaches to unlock."
        confirmLabel="Reopen"
        onClose={() => setPendingReopen(false)}
        onConfirm={() => void setStatus('open')}
      />
    </>
  );
}
