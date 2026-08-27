'use client';

import Link from 'next/link';
import {FormEvent, useEffect, useState, type ReactNode} from 'react';
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
import {Input} from '@/components/ui/Input';
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
  const [creditCost, setCreditCost] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);
  const [pendingReopen, setPendingReopen] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, catalog] = await Promise.all([getLead(Number(id)), listServices()]);
      setLead(detail);
      setServices(catalog);
      setCreditCost(String(detail.creditCost));
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

  const saveCost = async (event: FormEvent) => {
    event.preventDefault();
    if (!lead) {
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const updated = await updateLead(lead.id, {creditCost: Number(creditCost)});
      setLead(updated);
      setCreditCost(String(updated.creditCost));
    } catch (err) {
      setFormError(isApiError(err) ? err.message : 'Could not update credit cost.');
    } finally {
      setSaving(false);
    }
  };

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
        description={`${lead.location} · ${formatPostedAt(lead.postedAt)} · base match ${lead.matchScore}%`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Refresh unlocks
            </Button>
            {canWrite ? (
              lead.status === 'open' ? (
                <Button variant="destructive" onClick={() => setPendingClose(true)}>
                  Close lead
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setPendingReopen(true)}>
                  Reopen lead
                </Button>
              )
            ) : null}
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {lead.status === 'open' ? (
          <Badge tone="primary">Open in marketplace</Badge>
        ) : (
          <Badge tone="danger">Closed</Badge>
        )}
        <Badge tone="sky">{lead.creditCost} credits to unlock</Badge>
        <Badge tone={lead.unlocks.length ? 'primary' : 'muted'}>
          {lead.unlocks.length} unlock{lead.unlocks.length === 1 ? '' : 's'}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Request summary">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Service" value={serviceName} />
            <Field label="Location" value={lead.location} />
            <Field label="Frequency" value={lead.frequency} />
            <Field label="Format" value={lead.format} />
            <Field label="Days" value={lead.days} />
            <Field label="Time" value={lead.time} />
            <Field label="Match score" value={`${lead.matchScore}%`} />
            <Field label="Posted" value={new Date(lead.postedAt).toLocaleString()} />
          </dl>
          {lead.clientNote ? (
            <p className="mt-4 rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
              {lead.clientNote}
            </p>
          ) : null}
        </Section>

        <Section title="Client contact">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" value={lead.clientName} />
            <Field label="Email" value={lead.clientEmail} />
            <Field label="Phone" value={lead.clientPhone} />
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            In the pro app, contact details stay hidden until a coach spends credits to unlock this
            lead.
          </p>
          <Link
            href={`/clients/${lead.clientId}`}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            View client profile
            <ExternalLink size={14} />
          </Link>
        </Section>

        <Section title="Unlock history">
          {lead.unlocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No coach has unlocked this lead yet.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {lead.unlocks.map(unlock => (
                <li key={unlock.id} className="flex items-center justify-between py-2">
                  <div>
                    <Link
                      href={`/professionals/${unlock.professionalId}`}
                      className="font-medium text-primary hover:underline">
                      {unlock.professionalName}
                    </Link>
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
            Unlocking in the coach app spends wallet credits, reveals client contact, and opens a
            lead conversation thread. Refresh to see new unlocks immediately.
          </p>
        </Section>

        {canWrite ? (
          <Section title="Credit cost">
            <form onSubmit={saveCost} className="flex flex-wrap items-end gap-3">
              <Input
                label="Credits to unlock"
                type="number"
                min={0}
                max={100}
                value={creditCost}
                onChange={event => setCreditCost(event.target.value)}
              />
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              Override for this lead only. Global default is in Settings.
            </p>
            {formError ? <p className="mt-2 text-sm text-destructive">{formError}</p> : null}
          </Section>
        ) : null}
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
