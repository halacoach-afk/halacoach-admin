'use client';

import Link from 'next/link';
import {useCallback, useEffect, useMemo, useState, type ReactNode} from 'react';
import {ExternalLink, Eye, FileText} from 'lucide-react';
import {
  approveVerification,
  approveVerificationFile,
  fetchVerificationFileBlob,
  isApiError,
  listServices,
  listVerificationQueue,
  markVerificationFileUnderReview,
  rejectVerification,
  rejectVerificationFile,
  type CatalogService,
  type SessionUser,
  type VerificationDocTypeMeta,
  type VerificationFile,
  type VerificationQueueItem,
} from '@/api';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {FilterBar} from '@/components/ui/DataTable';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {FileViewerModal} from '@/components/ui/FileViewerModal';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {can} from '@/lib/permissions';
import {cn} from '@/lib/cn';
import {verificationLabels} from '@/lib/professional-utils';

const REJECT_REASON_OPTIONS = [
  'Document is blurry or unreadable',
  'Document is expired',
  'Name on document does not match profile',
  'Wrong document type uploaded',
  'Document is incomplete or cropped',
  'Document appears altered or invalid',
  'Expiry date is missing or unclear',
] as const;

type Filter = 'all' | 'pending' | 'rejected';

function formatSubmitted(at: string) {
  return new Date(at).toLocaleString();
}

function formatRelative(at: string) {
  const ms = Date.now() - new Date(at).getTime();
  const mins = Math.max(0, Math.floor(ms / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function docLabel(file: VerificationFile, catalog: VerificationDocTypeMeta[]) {
  if (!file.docType) return 'Untyped document';
  return catalog.find(item => item.id === file.docType)?.label ?? file.docType;
}

function statusTone(status?: string) {
  if (status === 'approved') return 'primary' as const;
  if (status === 'rejected') return 'danger' as const;
  if (status === 'expiring_soon') return 'warning' as const;
  if (status === 'under_review') return 'sky' as const;
  return 'muted' as const;
}

function statusLabel(status?: string) {
  return String(status ?? 'submitted').replace(/_/g, ' ');
}

function queueStatusTone(status?: string) {
  if (status === 'rejected') return 'danger' as const;
  if (status === 'pending') return 'warning' as const;
  return 'muted' as const;
}

function fileCounts(files: VerificationFile[]) {
  let approved = 0;
  let rejected = 0;
  let pending = 0;
  for (const file of files) {
    const status = file.displayStatus ?? file.status;
    if (status === 'approved' || status === 'expiring_soon') approved += 1;
    else if (status === 'rejected') rejected += 1;
    else pending += 1;
  }
  return {approved, rejected, pending, total: files.length};
}

function Section({title, children, action}: {title: string; children: ReactNode; action?: ReactNode}) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        {action}
      </div>
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

function ReasonSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      required
      className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      value={value}
      onChange={event => onChange(event.target.value)}>
      <option value="">Select a reason</option>
      {REJECT_REASON_OPTIONS.map(option => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function DocumentRow({
  title,
  description,
  file,
  canWrite,
  acting,
  onView,
  onUnderReview,
  onApprove,
  onReject,
}: {
  title: string;
  description?: string;
  file?: VerificationFile;
  canWrite: boolean;
  acting: boolean;
  onView?: () => void;
  onUnderReview?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const display = file?.displayStatus ?? file?.status;
  return (
    <li className="rounded-xl border border-border bg-background px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <FileText size={16} className="mt-0.5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              {description ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
              ) : null}
              {file ? (
                <button
                  type="button"
                  className="mt-2 inline-flex max-w-full items-center gap-1 truncate text-sm font-medium text-primary hover:underline"
                  onClick={onView}>
                  <Eye size={14} />
                  <span className="truncate">{file.originalName}</span>
                </button>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Not submitted</p>
              )}
              {file?.expiresAt ? (
                <p className="mt-1 text-xs text-muted-foreground">Expires {file.expiresAt}</p>
              ) : null}
              {file?.rejectedReason ? (
                <p className="mt-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-destructive">
                  {file.rejectedReason}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <Badge tone={file ? statusTone(display) : 'muted'}>
          {file ? statusLabel(display) : 'Not submitted'}
        </Badge>
      </div>

      {canWrite && file ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
          <Button
            size="sm"
            variant="outline"
            disabled={acting || file.status === 'under_review'}
            onClick={onUnderReview}>
            Under review
          </Button>
          <Button
            size="sm"
            disabled={acting || file.status === 'approved'}
            onClick={onApprove}>
            Approve
          </Button>
          <Button size="sm" variant="destructive" disabled={acting} onClick={onReject}>
            Reject
          </Button>
        </div>
      ) : null}
    </li>
  );
}

export function VerificationScreen({actor}: {actor: SessionUser}) {
  const canWrite = can(actor.role, 'verification:write');
  const [queue, setQueue] = useState<VerificationQueueItem[]>([]);
  const [documentTypes, setDocumentTypes] = useState<VerificationDocTypeMeta[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectReasonsByFile, setRejectReasonsByFile] = useState<Record<string, string>>({});
  const [pendingApprove, setPendingApprove] = useState<VerificationQueueItem | null>(null);
  const [pendingReject, setPendingReject] = useState<VerificationQueueItem | null>(null);
  const [pendingFileReject, setPendingFileReject] = useState<{
    item: VerificationQueueItem;
    file: VerificationFile;
  } | null>(null);
  const [acting, setActing] = useState(false);
  const [viewer, setViewer] = useState<{
    professionalId: string;
    fileId: string;
    name: string;
  } | null>(null);

  const loadViewerFile = useCallback(async () => {
    if (!viewer) {
      throw new Error('Unable to open file.');
    }
    return fetchVerificationFileBlob(viewer.professionalId, viewer.fileId);
  }, [viewer]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [queueRes, catalog] = await Promise.all([listVerificationQueue(), listServices()]);
      setQueue(queueRes.items);
      setDocumentTypes(queueRes.documentTypes);
      setServices(catalog);
      setSelectedId(current => {
        if (current && queueRes.items.some(item => item.id === current)) {
          return current;
        }
        return queueRes.items[0]?.id ?? null;
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

  const counts = useMemo(
    () => ({
      all: queue.length,
      pending: queue.filter(item => item.verificationStatus !== 'rejected').length,
      rejected: queue.filter(item => item.verificationStatus === 'rejected').length,
    }),
    [queue],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return queue.filter(item => {
      if (filter === 'pending' && item.verificationStatus === 'rejected') {
        return false;
      }
      if (filter === 'rejected' && item.verificationStatus !== 'rejected') {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        item.name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.specialty.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q)
      );
    });
  }, [queue, filter, query]);

  const selected = queue.find(item => item.id === selectedId) ?? null;

  const fileByType = useMemo(() => {
    const map = new Map<string, VerificationFile>();
    for (const file of selected?.verificationFiles ?? []) {
      if (file.docType) map.set(file.docType, file);
    }
    return map;
  }, [selected]);

  const requiredTypes = useMemo(
    () => documentTypes.filter(item => item.required),
    [documentTypes],
  );
  const optionalTypes = useMemo(
    () => documentTypes.filter(item => !item.required),
    [documentTypes],
  );
  const untypedFiles = useMemo(
    () => (selected?.verificationFiles ?? []).filter(file => !file.docType),
    [selected],
  );

  const requiredProgress = useMemo(() => {
    const total = requiredTypes.length;
    const approved = requiredTypes.filter(meta => {
      const file = fileByType.get(meta.id);
      const status = file?.displayStatus ?? file?.status;
      return status === 'approved' || status === 'expiring_soon';
    }).length;
    const submitted = requiredTypes.filter(meta => fileByType.has(meta.id)).length;
    return {total, approved, submitted};
  }, [requiredTypes, fileByType]);

  const serviceNames = selected
    ? selected.serviceIds.map(id => services.find(item => item.id === id)?.name ?? `#${id}`)
    : [];

  const pendingRejectFiles = useMemo(() => {
    if (!pendingReject) return [];
    const order = new Map(documentTypes.map((item, index) => [item.id, index]));
    return [...(pendingReject.verificationFiles ?? [])].sort((a, b) => {
      const ai = a.docType != null ? (order.get(a.docType) ?? 999) : 998;
      const bi = b.docType != null ? (order.get(b.docType) ?? 999) : 998;
      return ai - bi;
    });
  }, [documentTypes, pendingReject]);

  const rejectAllReady =
    pendingRejectFiles.length > 0 &&
    pendingRejectFiles.every(file => Boolean(rejectReasonsByFile[file.id]?.trim()));

  const onApprove = async () => {
    if (!pendingApprove) return;
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
    if (!pendingReject) return;
    if (!rejectAllReady) {
      setError('Please select a rejection reason for each document.');
      return;
    }
    setActing(true);
    setError(null);
    try {
      await rejectVerification(pendingReject.id, {
        reasons: pendingRejectFiles.map(file => ({
          fileId: file.id,
          reason: rejectReasonsByFile[file.id],
        })),
      });
      setPendingReject(null);
      setRejectReasonsByFile({});
      await load();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not reject verification.');
    } finally {
      setActing(false);
    }
  };

  const onFileAction = async (
    action: 'approve' | 'under_review' | 'reject',
    item: VerificationQueueItem,
    file: VerificationFile,
    reason?: string,
  ) => {
    if (action === 'reject' && !reason?.trim()) {
      setError('Please select a rejection reason.');
      return;
    }
    setActing(true);
    setError(null);
    try {
      if (action === 'approve') {
        await approveVerificationFile(item.id, file.id);
      } else if (action === 'under_review') {
        await markVerificationFileUnderReview(item.id, file.id);
      } else {
        await rejectVerificationFile(item.id, file.id, {reason});
      }
      setPendingFileReject(null);
      setRejectReason('');
      await load();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not update document status.');
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading verification queue…" />;
  }

  if (error && queue.length === 0) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  return (
    <>
      <PageHeader
        module="M5"
        title="Verification"
        description="Review coach documents one case at a time. Profiles go live when all required documents are approved."
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={acting}>
            Refresh
          </Button>
        }
      />

      {error ? <ErrorState body={error} onRetry={() => void load()} /> : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="!p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            In queue
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{counts.all}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pending review
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{counts.pending}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Rejected
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-destructive">{counts.rejected}</p>
        </Card>
      </div>

      <FilterBar>
        {(
          [
            ['all', 'All'],
            ['pending', 'Pending'],
            ['rejected', 'Rejected'],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            variant={filter === key ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter(key)}>
            {label} ({counts[key]})
          </Button>
        ))}
        <input
          className="ms-auto h-9 min-w-[200px] rounded-xl border border-border px-3 text-sm"
          placeholder="Search name, email, location…"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </FilterBar>

      {queue.length === 0 ? (
        <EmptyState
          title="Queue is clear"
          body="No coaches are waiting for document review right now."
        />
      ) : visible.length === 0 ? (
        <EmptyState title="No coaches match" body="Try another filter or clear the search box." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
          <Card className="!p-0 overflow-hidden xl:sticky xl:top-4 xl:max-h-[calc(100vh-7rem)]">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Queue</p>
              <p className="text-xs text-muted-foreground">
                {visible.length} coach{visible.length === 1 ? '' : 'es'}
              </p>
            </div>
            <ul className="max-h-[24rem] overflow-y-auto xl:max-h-[calc(100vh-11rem)]">
              {visible.map(item => {
                const docs = fileCounts(item.verificationFiles ?? []);
                const status = item.verificationStatus ?? 'pending';
                const active = item.id === selectedId;
                return (
                  <li key={item.id} className="border-b border-border last:border-0">
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={cn(
                        'w-full px-4 py-3 text-start transition-colors',
                        active ? 'bg-primary-soft/60' : 'hover:bg-muted/50',
                      )}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {item.name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {item.specialty || 'Coach'} · {formatRelative(item.submittedAt)}
                          </p>
                        </div>
                        <Badge tone={queueStatusTone(status)}>
                          {verificationLabels[status as keyof typeof verificationLabels] ??
                            statusLabel(status)}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge tone="muted">{docs.total} docs</Badge>
                        {docs.pending > 0 ? (
                          <Badge tone="warning">{docs.pending} open</Badge>
                        ) : null}
                        {docs.rejected > 0 ? (
                          <Badge tone="danger">{docs.rejected} rejected</Badge>
                        ) : null}
                        {docs.approved > 0 ? (
                          <Badge tone="primary">{docs.approved} ok</Badge>
                        ) : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          {selected ? (
            <div className="min-w-0 space-y-4">
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-foreground">{selected.name}</h2>
                      <Badge tone={queueStatusTone(selected.verificationStatus)}>
                        {verificationLabels[
                          (selected.verificationStatus ??
                            'pending') as keyof typeof verificationLabels
                        ] ?? statusLabel(selected.verificationStatus)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selected.specialty || 'Professional coach'}
                    </p>
                  </div>
                  <Link
                    href={`/professionals/${selected.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    Full profile
                    <ExternalLink size={14} />
                  </Link>
                </div>

                <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Email" value={selected.email} />
                  <Field label="Phone" value={selected.phone || '—'} />
                  <Field label="Location" value={selected.location || '—'} />
                  <Field label="Submitted" value={formatSubmitted(selected.submittedAt)} />
                </dl>

                <div className="mt-4 rounded-xl bg-muted/50 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      Required docs · {requiredProgress.approved}/{requiredProgress.total}{' '}
                      approved
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {requiredProgress.submitted}/{requiredProgress.total} submitted ·{' '}
                      {selected.profileCompletion}% profile
                    </p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{
                        width: `${
                          requiredProgress.total > 0
                            ? Math.round(
                                (requiredProgress.approved / requiredProgress.total) * 100,
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {canWrite ? (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                    <Button
                      onClick={() => setPendingApprove(selected)}
                      disabled={acting}>
                      Approve all
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setRejectReasonsByFile({});
                        setPendingReject(selected);
                      }}
                      disabled={acting || (selected.verificationFiles?.length ?? 0) === 0}>
                      Reject all
                    </Button>
                  </div>
                ) : (
                  <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
                    Your role can review the queue but cannot approve or reject.
                  </p>
                )}
              </Card>

              <Section title="Profile context">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Services</p>
                    <div className="flex flex-wrap gap-2">
                      {serviceNames.length > 0 ? (
                        serviceNames.map(name => (
                          <Badge key={name} tone="muted">
                            {name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">None listed</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Listed certifications
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selected.profileCertifications.length > 0 ? (
                        selected.profileCertifications.map(item => (
                          <Badge key={item} tone="sky">
                            {item}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">None listed</span>
                      )}
                    </div>
                  </div>
                </div>
              </Section>

              <Section
                title="Required documents"
                action={
                  <span className="text-xs text-muted-foreground">
                    {requiredProgress.submitted}/{requiredProgress.total} submitted
                  </span>
                }>
                <ul className="space-y-3">
                  {requiredTypes.map(meta => {
                    const file = fileByType.get(meta.id);
                    return (
                      <DocumentRow
                        key={meta.id}
                        title={meta.label}
                        description={meta.description}
                        file={file}
                        canWrite={canWrite}
                        acting={acting}
                      onView={
                        file
                          ? () =>
                              setViewer({
                                professionalId: selected.id,
                                fileId: file.id,
                                name: file.originalName,
                              })
                          : undefined
                      }
                        onUnderReview={
                          file
                            ? () => void onFileAction('under_review', selected, file)
                            : undefined
                        }
                        onApprove={
                          file ? () => void onFileAction('approve', selected, file) : undefined
                        }
                        onReject={
                          file
                            ? () => {
                                setRejectReason('');
                                setPendingFileReject({item: selected, file});
                              }
                            : undefined
                        }
                      />
                    );
                  })}
                </ul>
              </Section>

              <Section
                title="Optional documents"
                action={
                  <span className="text-xs text-muted-foreground">
                    {optionalTypes.filter(meta => fileByType.has(meta.id)).length}/
                    {optionalTypes.length} submitted
                  </span>
                }>
                <ul className="space-y-3">
                  {optionalTypes.map(meta => {
                    const file = fileByType.get(meta.id);
                    return (
                      <DocumentRow
                        key={meta.id}
                        title={meta.label}
                        description={meta.description}
                        file={file}
                        canWrite={canWrite}
                        acting={acting}
                      onView={
                        file
                          ? () =>
                              setViewer({
                                professionalId: selected.id,
                                fileId: file.id,
                                name: file.originalName,
                              })
                          : undefined
                      }
                        onUnderReview={
                          file
                            ? () => void onFileAction('under_review', selected, file)
                            : undefined
                        }
                        onApprove={
                          file ? () => void onFileAction('approve', selected, file) : undefined
                        }
                        onReject={
                          file
                            ? () => {
                                setRejectReason('');
                                setPendingFileReject({item: selected, file});
                              }
                            : undefined
                        }
                      />
                    );
                  })}
                  {untypedFiles.map(file => (
                    <DocumentRow
                      key={file.id}
                      title="Untyped document"
                      file={file}
                      canWrite={canWrite}
                      acting={acting}
                      onView={() =>
                        setViewer({
                          professionalId: selected.id,
                          fileId: file.id,
                          name: file.originalName,
                        })
                      }
                      onUnderReview={() => void onFileAction('under_review', selected, file)}
                      onApprove={() => void onFileAction('approve', selected, file)}
                      onReject={() => {
                        setRejectReason('');
                        setPendingFileReject({item: selected, file});
                      }}
                    />
                  ))}
                </ul>
              </Section>
            </div>
          ) : (
            <Card className="flex min-h-[16rem] items-center justify-center">
              <p className="text-sm text-muted-foreground">Select a coach from the queue.</p>
            </Card>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Signed in as {actor.name} ({actor.role}).
      </p>

      <ConfirmDialog
        open={Boolean(pendingApprove)}
        title="Approve all documents?"
        body={`${pendingApprove?.name ?? 'This coach'} will be marked verified and their profile will be activated in the marketplace.`}
        confirmLabel="Approve all"
        onClose={() => setPendingApprove(null)}
        onConfirm={() => void onApprove()}
      />

      <FileViewerModal
        open={viewer !== null}
        title={viewer?.name ?? ''}
        onClose={() => setViewer(null)}
        load={loadViewerFile}
      />

      {pendingReject ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground">Reject all documents?</h2>
            <div className="mt-4 space-y-3">
              {pendingRejectFiles.map(file => (
                <label key={file.id} className="block rounded-xl border border-border p-3 text-sm">
                  <span className="block font-medium text-foreground">{file.originalName}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {docLabel(file, documentTypes)}
                  </span>
                  <ReasonSelect
                    value={rejectReasonsByFile[file.id] ?? ''}
                    onChange={value =>
                      setRejectReasonsByFile(prev => ({
                        ...prev,
                        [file.id]: value,
                      }))
                    }
                  />
                </label>
              ))}
              {pendingRejectFiles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents submitted.</p>
              ) : null}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPendingReject(null);
                  setRejectReasonsByFile({});
                }}
                disabled={acting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => void onReject()}
                disabled={acting || !rejectAllReady}>
                Reject all
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingFileReject ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground">Reject this document?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {pendingFileReject.file.originalName}
            </p>
            <label className="mt-4 block text-sm">
              <span className="font-medium">Reason</span>
              <ReasonSelect value={rejectReason} onChange={setRejectReason} />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setPendingFileReject(null)}
                disabled={acting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={acting || !rejectReason}
                onClick={() =>
                  void onFileAction(
                    'reject',
                    pendingFileReject.item,
                    pendingFileReject.file,
                    rejectReason,
                  )
                }>
                Reject document
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
