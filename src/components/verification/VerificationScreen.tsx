'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {ExternalLink, FileCheck2} from 'lucide-react';
import {
  approveVerification,
  isApiError,
  listServices,
  listVerificationQueue,
  openVerificationFile,
  rejectVerification,
  type CatalogService,
  type SessionUser,
  type VerificationQueueItem,
} from '@/api';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {DataTable} from '@/components/ui/DataTable';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {can} from '@/lib/permissions';

function formatSubmitted(at: string) {
  return new Date(at).toLocaleString();
}

export function VerificationScreen({actor}: {actor: SessionUser}) {
  const canWrite = can(actor.role, 'verification:write');
  const [queue, setQueue] = useState<VerificationQueueItem[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [pendingApprove, setPendingApprove] = useState<VerificationQueueItem | null>(null);
  const [pendingReject, setPendingReject] = useState<VerificationQueueItem | null>(null);
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [items, catalog] = await Promise.all([listVerificationQueue(), listServices()]);
      setQueue(items);
      setServices(catalog);
      setSelectedId(current => {
        if (current && items.some(item => item.id === current)) {
          return current;
        }
        return items[0]?.id ?? null;
      });
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load verification queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selected = queue.find(item => item.id === selectedId) ?? null;
  const serviceNames = selected
    ? selected.serviceIds.map(id => services.find(item => item.id === id)?.name ?? `#${id}`)
    : [];

  const onApprove = async () => {
    if (!pendingApprove) {
      return;
    }
    setActing(true);
    setError(null);
    try {
      await approveVerification(pendingApprove.id);
      setPendingApprove(null);
      await load();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not approve verification.');
    } finally {
      setActing(false);
    }
  };

  const onReject = async () => {
    if (!pendingReject) {
      return;
    }
    setActing(true);
    setError(null);
    try {
      await rejectVerification(pendingReject.id, {reason: rejectReason});
      setPendingReject(null);
      setRejectReason('');
      await load();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not reject verification.');
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading verification queue…" />;
  }

  return (
    <>
      <PageHeader
        module="M5"
        title="Verification"
        description="Review coach certifications and insurance. Profiles go live only after approval."
      />

      {error ? <ErrorState body={error} onRetry={() => void load()} /> : null}

      {!error && queue.length === 0 ? (
        <EmptyState
          title="Queue is clear"
          body="No coaches are waiting for document review right now."
        />
      ) : null}

      {!error && queue.length > 0 ? (
        <>
          <DataTable columns={['Coach', 'Submitted', 'Documents', 'Profile', '']}>
            {queue.map(item => (
              <tr
                key={item.id}
                className={`border-b border-border last:border-0 ${
                  selectedId === item.id ? 'bg-primary-soft/40' : ''
                }`}>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.specialty}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatSubmitted(item.submittedAt)}
                </td>
                <td className="px-4 py-3">
                  {(item.verificationFiles?.length ?? 0)} files
                </td>
                <td className="px-4 py-3">
                  <Badge tone="sky">{item.profileCompletion}%</Badge>
                </td>
                <td className="px-4 py-3 text-end">
                  <Button
                    size="sm"
                    variant={selectedId === item.id ? 'primary' : 'outline'}
                    onClick={() => setSelectedId(item.id)}>
                    Review
                  </Button>
                </td>
              </tr>
            ))}
          </DataTable>

          {selected ? (
            <Card className="mt-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{selected.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selected.email} · {selected.phone}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selected.location} · submitted {formatSubmitted(selected.submittedAt)}
                  </p>
                </div>
                <Link
                  href={`/professionals/${selected.id}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  Full profile
                  <ExternalLink size={14} />
                </Link>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Services</h3>
                  <div className="flex flex-wrap gap-2">
                    {serviceNames.map(name => (
                      <Badge key={name} tone="muted">
                        {name}
                      </Badge>
                    ))}
                  </div>
                  <h3 className="mb-2 mt-4 text-sm font-semibold text-foreground">
                    Listed certifications
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selected.profileCertifications.map(item => (
                      <Badge key={item} tone="sky">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Uploaded documents</h3>
                  <ul className="space-y-2">
                    {(selected.verificationFiles ?? []).map(file => (
                      <li
                        key={file.id}
                        className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm">
                        <FileCheck2 size={16} className="text-primary" />
                        <button
                          type="button"
                          className="min-w-0 flex-1 truncate text-start text-primary hover:underline"
                          onClick={() => void openVerificationFile(selected.id, file.id)}>
                          {file.originalName}
                        </button>
                      </li>
                    ))}
                    {(selected.verificationFiles?.length ?? 0) === 0 ? (
                      <li className="text-sm text-muted-foreground">No documents uploaded.</li>
                    ) : null}
                  </ul>
                </div>
              </div>

              {canWrite ? (
                <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
                  <Button onClick={() => setPendingApprove(selected)} disabled={acting}>
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setRejectReason('');
                      setPendingReject(selected);
                    }}
                    disabled={acting}>
                    Reject
                  </Button>
                </div>
              ) : (
                <p className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
                  Your role can review the queue but cannot approve or reject.
                </p>
              )}
            </Card>
          ) : null}
        </>
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingApprove)}
        title="Approve verification?"
        body={`${pendingApprove?.name ?? 'This coach'} will be marked verified and their profile will be activated in the marketplace.`}
        confirmLabel="Approve"
        onClose={() => setPendingApprove(null)}
        onConfirm={() => void onApprove()}
      />

      {pendingReject ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground">Reject verification?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {pendingReject.name} will be notified to re-upload documents.
            </p>
            <label className="mt-4 block text-sm">
              <span className="font-medium">Reason (optional)</span>
              <textarea
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                rows={3}
                placeholder="e.g. Certification expired or name mismatch"
                value={rejectReason}
                onChange={event => setRejectReason(event.target.value)}
              />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPendingReject(null)} disabled={acting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => void onReject()} disabled={acting}>
                Reject
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
