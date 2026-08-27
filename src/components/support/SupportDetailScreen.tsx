'use client';

import Link from 'next/link';
import {FormEvent, useEffect, useState, type ReactNode} from 'react';
import {ArrowLeft, ExternalLink} from 'lucide-react';
import {
  getSupportTicket,
  isApiError,
  updateSupportTicket,
  type SessionUser,
  type SupportTicketDetail,
} from '@/api';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {NotificationPrefsPanel} from '@/components/support/NotificationPrefsPanel';
import {
  formatSupportTimestamp,
  supportStatusLabels,
  supportStatusTone,
  supportUserTypeLabels,
} from '@/lib/support-utils';
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

export function SupportDetailScreen({actor, id}: {actor: SessionUser; id: string}) {
  const canWrite = can(actor.role, 'support:write');
  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyNote, setReplyNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await getSupportTicket(Number(id));
      setTicket(detail);
      setReplyNote(detail.replyNote ?? '');
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load support ticket.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const saveReply = async (event: FormEvent, status?: 'replied' | 'closed') => {
    event.preventDefault();
    if (!ticket || !canWrite) {
      return;
    }
    const note = replyNote.trim();
    if (!note) {
      setError('Reply note is required.');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const next = await updateSupportTicket(Number(id), {
        replyNote: note,
        status: status ?? (ticket.status === 'closed' ? 'closed' : 'replied'),
        actorName: actor.name,
      });
      setTicket(next);
      setReplyNote(next.replyNote ?? '');
      setMessage(status === 'closed' ? 'Ticket closed.' : 'Reply saved.');
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not save reply.');
    } finally {
      setSaving(false);
    }
  };

  const reopen = async () => {
    if (!canWrite) {
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const next = await updateSupportTicket(Number(id), {
        status: 'replied',
        replyNote: replyNote.trim() || ticket?.replyNote || '',
        actorName: actor.name,
      });
      setTicket(next);
      setMessage('Ticket reopened as replied.');
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not reopen ticket.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading ticket…" />;
  }

  if (error && !ticket) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  if (!ticket) {
    return null;
  }

  return (
    <>
      <PageHeader
        module="M11"
        title={ticket.subject}
        description={`${supportUserTypeLabels[ticket.userType]} · ${ticket.userName}`}
        actions={
          <Link href="/support">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Back to inbox
            </Button>
          </Link>
        }
      />

      {error ? (
        <div className="mb-4">
          <ErrorState body={error} onRetry={() => void load()} />
        </div>
      ) : null}
      {message ? (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={supportStatusTone[ticket.status]}>{supportStatusLabels[ticket.status]}</Badge>
        <Badge tone="sky">{supportUserTypeLabels[ticket.userType]}</Badge>
        <span className="text-sm text-muted-foreground">
          Received {formatSupportTimestamp(ticket.createdAt)}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Section title="Message">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{ticket.body}</p>
          </Section>

          {ticket.replyNote ? (
            <Section title="Support reply">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {ticket.replyNote}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {ticket.repliedBy ?? 'Support'} · {formatSupportTimestamp(ticket.repliedAt)}
              </p>
            </Section>
          ) : null}

          {canWrite && ticket.status !== 'closed' ? (
            <Section title="Reply">
              <form className="space-y-4" onSubmit={event => void saveReply(event)}>
                <label className="block text-sm font-medium text-foreground">
                  Internal reply note
                  <textarea
                    value={replyNote}
                    onChange={event => setReplyNote(event.target.value)}
                    rows={5}
                    placeholder="What support told the user…"
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>
                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Save reply'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={event => void saveReply(event, 'closed')}>
                    Save & close
                  </Button>
                </div>
              </form>
            </Section>
          ) : null}

          {canWrite && ticket.status === 'closed' ? (
            <Card>
              <Button variant="outline" disabled={saving} onClick={() => void reopen()}>
                Reopen ticket
              </Button>
            </Card>
          ) : null}
        </div>

        <div className="space-y-5">
          <Section title="User">
            <dl className="grid gap-4">
              <Field label="Name" value={ticket.userName} />
              <Field label="Email" value={ticket.userEmail} />
              <Field label="Phone" value={ticket.userPhone} />
              {ticket.profileHref ? (
                <Field
                  label="Profile"
                  value={
                    <Link
                      href={ticket.profileHref}
                      className="inline-flex items-center gap-1 font-semibold text-primary">
                      Open {supportUserTypeLabels[ticket.userType].toLowerCase()}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  }
                />
              ) : null}
            </dl>
          </Section>

          <Section title="Notification preferences">
            <NotificationPrefsPanel prefs={ticket.notificationPrefs} />
          </Section>
        </div>
      </div>
    </>
  );
}
