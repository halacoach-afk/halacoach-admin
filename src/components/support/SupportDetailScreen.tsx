'use client';

import Link from 'next/link';
import {useEffect, useId, useState} from 'react';
import {createPortal} from 'react-dom';
import {
  ExternalLink,
  Mail,
  Phone,
  UserRound,
  X,
} from 'lucide-react';
import {
  getSupportTicket,
  isApiError,
  updateSupportTicket,
  type SessionUser,
  type SupportTicketDetail,
  type SupportTicketStatus,
} from '@/api';
import {Button} from '@/components/ui/Button';
import {ErrorState} from '@/components/ui/ErrorState';
import {supportStatusLabels} from '@/lib/support-utils';
import {can} from '@/lib/permissions';
import {cn} from '@/lib/cn';

const STATUS_OPTIONS: SupportTicketStatus[] = ['new', 'in_progress', 'closed'];

export function SupportDetailModal({
  actor,
  ticketId,
  open,
  onClose,
  onUpdated,
}: {
  actor: SessionUser;
  ticketId: number | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: (ticket: SupportTicketDetail) => void;
}) {
  const titleId = useId();
  const canWrite = can(actor, 'support:write');
  const [mounted, setMounted] = useState(false);
  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SupportTicketStatus>('new');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || ticketId == null) {
      setTicket(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const detail = await getSupportTicket(ticketId);
        if (cancelled) {
          return;
        }
        setTicket(detail);
        setStatus(detail.status);
      } catch (err) {
        if (!cancelled) {
          setTicket(null);
          setError(isApiError(err) ? err.message : 'Could not load support ticket.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, ticketId]);

  const reload = () => {
    if (ticketId == null) {
      return;
    }
    setError(null);
    setLoading(true);
    void getSupportTicket(ticketId)
      .then(detail => {
        setTicket(detail);
        setStatus(detail.status);
      })
      .catch(err => {
        setError(isApiError(err) ? err.message : 'Could not load support ticket.');
      })
      .finally(() => setLoading(false));
  };

  const saveStatus = async () => {
    if (!ticket || !canWrite || ticketId == null) {
      return;
    }
    if (status === ticket.status) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const next = await updateSupportTicket(ticketId, {
        status,
        actorName: actor.name,
      });
      setTicket(next);
      setStatus(next.status);
      onUpdated?.(next);
      onClose();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not update status.');
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || !open) {
    return null;
  }

  const phoneHref = ticket?.userPhone?.trim()
    ? `tel:${ticket.userPhone.replace(/\s/g, '')}`
    : null;
  const emailHref = ticket?.userEmail?.trim()
    ? `mailto:${ticket.userEmail}`
    : null;
  const dirty = ticket != null && status !== ticket.status;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:rounded-3xl">
        <div className="shrink-0 border-b border-border px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <p
              id={titleId}
              className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Ticket {ticketId ?? '—'}
            </p>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          {loading ? (
            <div className="space-y-3">
              <div className="h-20 animate-pulse rounded-2xl bg-muted" />
              <div className="h-24 animate-pulse rounded-2xl bg-muted" />
              <div className="h-12 animate-pulse rounded-2xl bg-muted" />
            </div>
          ) : null}

          {!loading && error && !ticket ? (
            <ErrorState body={error} onRetry={reload} />
          ) : null}

          {ticket ? (
            <>
              {error ? (
                <p className="rounded-2xl border border-destructive/20 bg-red-50 px-3.5 py-2.5 text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              <section>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Contact
                </h3>
                <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
                  {ticket.profileHref ? (
                    <Link
                      href={ticket.profileHref}
                      className="flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-muted/60">
                      <UserRound className="h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-primary">
                        {ticket.userName}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-primary" />
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 px-3.5 py-3">
                      <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {ticket.userName || '—'}
                      </span>
                    </div>
                  )}

                  {emailHref ? (
                    <a
                      href={emailHref}
                      className="flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-muted/60">
                      <Mail className="h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-primary">
                        {ticket.userEmail}
                      </span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 px-3.5 py-3">
                      <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">—</span>
                    </div>
                  )}

                  {phoneHref ? (
                    <a
                      href={phoneHref}
                      className="flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-muted/60">
                      <Phone className="h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-primary">
                        {ticket.userPhone}
                      </span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 px-3.5 py-3">
                      <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">—</span>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Subject
                </h3>
                <p className="text-sm font-semibold text-foreground">
                  {ticket.subject?.trim() || '—'}
                </p>
              </section>

              <section className="min-h-0">
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Message
                </h3>
                <div className="max-h-48 overflow-y-auto rounded-2xl border border-border bg-background px-4 py-3.5 sm:max-h-56">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {ticket.body?.trim() || '—'}
                  </p>
                </div>
              </section>

              {canWrite ? (
                <section>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </h3>
                  <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-border p-1.5">
                    {STATUS_OPTIONS.map(option => {
                      const selected = status === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          disabled={saving}
                          onClick={() => setStatus(option)}
                          className={cn(
                            'rounded-xl px-2 py-2.5 text-xs font-semibold transition-colors',
                            selected
                              ? 'bg-primary text-white'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          )}>
                          {supportStatusLabels[option]}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-3.5 sm:px-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          {canWrite && ticket ? (
            <Button
              type="button"
              disabled={saving || !dirty}
              onClick={() => void saveStatus()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
