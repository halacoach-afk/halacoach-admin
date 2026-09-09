'use client';

import Link from 'next/link';
import {FormEvent, useEffect, useMemo, useState, type ReactNode} from 'react';
import {ArrowLeft, ExternalLink} from 'lucide-react';
import {
  getClient,
  isApiError,
  listProfessionals,
  updateClient,
  type Client,
  type ProfessionalSummary,
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
import {NotificationPrefsPanel} from '@/components/support/NotificationPrefsPanel';
import {clientMatchPrefRows, consentLabels} from '@/lib/client-utils';
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

export function ClientDetailScreen({actor, id}: {actor: SessionUser; id: string}) {
  const canWrite = can(actor.role, 'clients:write');
  const [client, setClient] = useState<Client | null>(null);
  const [coaches, setCoaches] = useState<ProfessionalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({name: '', email: '', phone: ''});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingSuspend, setPendingSuspend] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, professionals] = await Promise.all([
        getClient(id),
        listProfessionals(),
      ]);
      setClient(detail);
      setCoaches(professionals);
      setForm({name: detail.name, email: detail.email, phone: detail.phone});
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load client.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const answerRows = useMemo(
    () => (client ? clientMatchPrefRows(client) : []),
    [client],
  );

  const savedCoaches = useMemo(() => {
    if (!client) {
      return [];
    }
    return client.savedCoachIds
      .map(coachId => coaches.find(item => item.id === coachId))
      .filter(Boolean) as ProfessionalSummary[];
  }, [client, coaches]);

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!client) {
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const updated = await updateClient(client.id, form);
      setClient(updated);
      setForm({name: updated.name, email: updated.email, phone: updated.phone});
      setEditing(false);
    } catch (err) {
      setFormError(isApiError(err) ? err.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSuspended = async () => {
    if (!client) {
      return;
    }
    try {
      const updated = await updateClient(client.id, {suspended: !client.suspended});
      setClient(updated);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not update account status.');
    } finally {
      setPendingSuspend(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading client…" />;
  }

  if (error || !client) {
    return <ErrorState body={error ?? 'Client not found.'} onRetry={() => void load()} />;
  }

  return (
    <>
      <div className="mb-4">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} />
          Back to clients
        </Link>
      </div>

      <PageHeader
        module="M6"
        title={client.name}
        description={`${client.email} · ${client.profile?.location ?? 'No location'} · mobile register + questionnaire`}
        actions={
          canWrite ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setEditing(value => !value)}>
                {editing ? 'Cancel edit' : 'Edit contact'}
              </Button>
              <Button
                variant={client.suspended ? 'primary' : 'destructive'}
                onClick={() => setPendingSuspend(true)}>
                {client.suspended ? 'Unsuspend' : 'Suspend'}
              </Button>
            </div>
          ) : null
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {client.onboarded ? (
          <Badge tone="primary">Onboarding complete</Badge>
        ) : (
          <Badge tone="warning">Onboarding incomplete</Badge>
        )}
        {client.onboarded ? (
          <Badge tone="primary">Signup consent accepted</Badge>
        ) : (
          <Badge tone="muted">Consent pending</Badge>
        )}
        {client.suspended ? <Badge tone="danger">Suspended</Badge> : null}
      </div>

      {editing && canWrite ? (
        <Card className="mb-6">
          <h2 className="mb-4 text-lg font-semibold">Edit contact</h2>
          <form onSubmit={saveEdit} className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            <Input label="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            <Input label="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            {formError ? <p className="text-sm text-destructive sm:col-span-2">{formError}</p> : null}
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Account">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" value={client.name} />
            <Field label="Email" value={client.email} />
            <Field label="Phone" value={client.phone} />
            <Field label="Joined" value={new Date(client.createdAt).toLocaleString()} />
            <Field label="Last active" value={new Date(client.lastActiveAt).toLocaleString()} />
          </dl>
          {client.note ? (
            <p className="mt-4 rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
              {client.note}
            </p>
          ) : null}
        </Section>

        <Section title="Signup">
          {client.onboarded ? (
            <>
              <Badge tone="primary">Registered via mobile onboarding</Badge>
              <p className="mt-2 text-sm text-muted-foreground">
                Account and questionnaire saved together (`register` + `data`). Phone OTP is
                deferred in the current app build.
              </p>
              {client.consents.acceptedAt ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Consent accepted {new Date(client.consents.acceptedAt).toLocaleString()}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <Badge tone="warning">Incomplete</Badge>
              <p className="mt-2 text-sm text-muted-foreground">
                This user exists in the database but never finished signup. The mobile app no longer
                resumes incomplete accounts — delete or ignore for local testing.
              </p>
            </>
          )}
        </Section>

        <Section title="Consents (at signup)">
          <p className="mb-3 text-sm text-muted-foreground">
            The app uses one consent covering terms, privacy, and the coach agreement.
          </p>
          <ul className="space-y-2 text-sm">
            {(Object.keys(consentLabels) as Array<keyof typeof consentLabels>).map(key => (
              <li key={key} className="flex items-center justify-between gap-3">
                <span>{consentLabels[key]}</span>
                {client.consents[key] ? (
                  <Badge tone="primary">Accepted</Badge>
                ) : (
                  <Badge tone="muted">Not accepted</Badge>
                )}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Saved coaches">
          {savedCoaches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved coaches yet.</p>
          ) : (
            <ul className="space-y-2">
              {savedCoaches.map(coach => (
                <li key={coach.id}>
                  <Link
                    href={`/professionals/${coach.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    {coach.name} · {coach.specialty}
                    <ExternalLink size={14} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Online coaching plans">
          {(client.onlinePlans ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No published or draft online plans linked to this account.
            </p>
          ) : (
            <ul className="space-y-2">
              {(client.onlinePlans ?? []).map(plan => (
                <li key={plan.id} className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {plan.coachName} · {plan.goal}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      tone={
                        plan.status === 'published'
                          ? 'primary'
                          : plan.status === 'draft'
                            ? 'warning'
                            : 'muted'
                      }>
                      {plan.status}
                    </Badge>
                    <Link
                      href={`/online-clients/${plan.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                      Open
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Notification preferences">
          <NotificationPrefsPanel prefs={client.notificationPrefs} />
        </Section>
      </div>

      <Card className="mt-4">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Matching questionnaire (14 steps)
        </h2>
        <dl className="divide-y divide-border">
          {answerRows.map(row => (
            <div key={row.step} className="grid gap-1 py-3 sm:grid-cols-[220px_1fr]">
              <dt className="text-xs font-medium text-muted-foreground">
                {row.step}. {row.label}
              </dt>
              <dd className="text-sm text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Step 14 is account creation. Consent is collected on that step; OTP is not used yet.
        </p>
      </Card>

      <ConfirmDialog
        open={pendingSuspend}
        title={client.suspended ? 'Unsuspend client?' : 'Suspend client?'}
        body={
          client.suspended
            ? `${client.name} can sign in and request matches again.`
            : `${client.name} will be blocked from the client app until unsuspended.`
        }
        confirmLabel={client.suspended ? 'Unsuspend' : 'Suspend'}
        destructive={!client.suspended}
        onClose={() => setPendingSuspend(false)}
        onConfirm={() => void toggleSuspended()}
      />
    </>
  );
}
