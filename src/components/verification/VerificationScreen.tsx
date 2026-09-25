'use client';

import Link from 'next/link';
import {Fragment, useCallback, useEffect, useMemo, useState} from 'react';
import {ChevronDown, ChevronRight} from 'lucide-react';
import {
  approveVerificationFile,
  fetchVerificationFileBlob,
  isApiError,
  listVerificationQueue,
  rejectVerificationFile,
  type SessionUser,
  type VerificationDocTypeMeta,
  type VerificationFile,
  type VerificationQueueItem,
} from '@/api';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {DataTable, FilterBar} from '@/components/ui/DataTable';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {FileViewerModal} from '@/components/ui/FileViewerModal';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {can} from '@/lib/permissions';
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

function needsDocumentAction(file?: VerificationFile) {
  if (!file) return false;
  const status = file.displayStatus ?? file.status;
  return status !== 'approved' && status !== 'expiring_soon';
}

function queueStatusTone(status?: string) {
  if (status === 'rejected') return 'danger' as const;
  if (status === 'pending') return 'warning' as const;
  return 'muted' as const;
}

function requiredProgressForItem(
  item: VerificationQueueItem,
  documentTypes: VerificationDocTypeMeta[],
) {
  const requiredTypes = documentTypes.filter(meta => meta.required);
  const byType = new Map<string, VerificationFile>();
  for (const file of item.verificationFiles ?? []) {
    if (file.docType) byType.set(file.docType, file);
  }
  const total = requiredTypes.length;
  const approved = requiredTypes.filter(meta => {
    const file = byType.get(meta.id);
    const status = file?.displayStatus ?? file?.status;
    return status === 'approved' || status === 'expiring_soon';
  }).length;
  const submitted = requiredTypes.filter(meta => byType.has(meta.id)).length;
  return {total, approved, submitted};
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

export function VerificationScreen({actor}: {actor: SessionUser}) {
  const canWrite = can(actor, 'verification:write');
  const [queue, setQueue] = useState<VerificationQueueItem[]>([]);
  const [documentTypes, setDocumentTypes] = useState<VerificationDocTypeMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [pendingFileReject, setPendingFileReject] = useState<{
    item: VerificationQueueItem;
    file: VerificationFile;
  } | null>(null);
  const [pendingFileApprove, setPendingFileApprove] = useState<{
    item: VerificationQueueItem;
    file: VerificationFile;
    label: string;
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
      const queueRes = await listVerificationQueue();
      setQueue(queueRes.items);
      setDocumentTypes(queueRes.documentTypes);
      setSelectedId(current =>
        current && queueRes.items.some(item => item.id === current) ? current : null,
      );
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

  const untypedFiles = useMemo(
    () => (selected?.verificationFiles ?? []).filter(file => !file.docType),
    [selected],
  );

  const onFileAction = async (
    action: 'approve' | 'reject',
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
      } else {
        await rejectVerificationFile(item.id, file.id, {reason});
      }
      setPendingFileReject(null);
      setPendingFileApprove(null);
      setRejectReason('');
      await load();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not update document status.');
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading verification queue..." />;
  }

  if (error && queue.length === 0) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  return (
    <>
      <PageHeader
        title="Verification"
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={acting}>
            Refresh
          </Button>
        }
      />

      {error ? <ErrorState body={error} onRetry={() => void load()} /> : null}

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
          placeholder="Search name, email, location..."
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
        <EmptyState
          title="No coaches match"
          body="Try another filter or clear the search box."
        />
      ) : (
        <DataTable
          tableClassName="min-w-[900px]"
          columns={[
            'Coach',
            'Email',
            'Phone',
            'Status',
            'Required',
            'Submitted',
            '',
          ]}>
          {visible.map(item => {
            const status = item.verificationStatus ?? 'pending';
            const required = requiredProgressForItem(item, documentTypes);
            const expanded = selectedId === item.id;
            return (
              <Fragment key={item.id}>
                <tr className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/professionals/${item.id}`}
                      className="font-medium text-primary hover:underline">
                      {item.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{item.email || '—'}</td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {item.phone || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={queueStatusTone(status)}>
                      {verificationLabels[status as keyof typeof verificationLabels] ??
                        statusLabel(status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-foreground">
                    {required.approved}/{required.total} approved
                    <div className="text-xs text-muted-foreground">
                      {required.submitted}/{required.total} submitted
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {formatSubmitted(item.submittedAt)}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      aria-expanded={expanded}
                      onClick={() =>
                        setSelectedId(current => (current === item.id ? null : item.id))
                      }>
                      Review
                      {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </td>
                </tr>
                {expanded && selected ? (
                  <tr className="border-b border-border bg-muted/30 last:border-0">
                    <td colSpan={7} className="px-4 py-4">
                      {(() => {
                        const actionDocs = documentTypes.filter(meta =>
                          needsDocumentAction(fileByType.get(meta.id)),
                        );
                        const actionUntyped = untypedFiles.filter(file =>
                          needsDocumentAction(file),
                        );
                        if (actionDocs.length === 0 && actionUntyped.length === 0) {
                          return (
                            <p className="px-1 py-2 text-sm text-muted-foreground">
                              No documents need action right now.
                            </p>
                          );
                        }
                        return (
                      <DataTable
                        tableClassName="min-w-[700px]"
                        columns={['Document', 'Expires', 'Type', 'Status', '']}>
                        {actionDocs.map(meta => {
                          const file = fileByType.get(meta.id);
                          const display = file?.displayStatus ?? file?.status;
                          return (
                            <tr
                              key={meta.id}
                              className="border-b border-border last:border-0">
                              <td className="px-4 py-3">
                                <div className="font-medium text-foreground">{meta.label}</div>
                                {meta.description ? (
                                  <div className="text-xs text-muted-foreground">
                                    {meta.description}
                                  </div>
                                ) : null}
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">
                                {file?.expiresAt || '—'}
                              </td>
                              <td className="px-4 py-3">
                                <Badge tone={meta.required ? 'warning' : 'muted'}>
                                  {meta.required ? 'Required' : 'Optional'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <Badge tone={file ? statusTone(display) : 'muted'}>
                                  {file ? statusLabel(display) : 'Not submitted'}
                                </Badge>
                                {file?.rejectedReason ? (
                                  <div className="mt-1 text-xs text-destructive">
                                    {file.rejectedReason}
                                  </div>
                                ) : null}
                              </td>
                              <td className="px-4 py-3 text-end">
                                {file ? (
                                  <div className="inline-flex flex-wrap justify-end gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        setViewer({
                                          professionalId: selected.id,
                                          fileId: file.id,
                                          name: file.originalName,
                                        })
                                      }>
                                      View
                                    </Button>
                                    {canWrite ? (
                                      <>
                                        <Button
                                          size="sm"
                                          disabled={acting || file.status === 'approved'}
                                          onClick={() =>
                                            setPendingFileApprove({
                                              item: selected,
                                              file,
                                              label: meta.label,
                                            })
                                          }>
                                          Approve
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          disabled={acting}
                                          onClick={() => {
                                            setRejectReason('');
                                            setPendingFileReject({item: selected, file});
                                          }}>
                                          Reject
                                        </Button>
                                      </>
                                    ) : null}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {actionUntyped.map(file => {
                          const display = file.displayStatus ?? file.status;
                          return (
                            <tr
                              key={file.id}
                              className="border-b border-border last:border-0">
                              <td className="px-4 py-3">
                                <div className="font-medium text-foreground">
                                  Untyped document
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">
                                {file.expiresAt || '—'}
                              </td>
                              <td className="px-4 py-3">
                                <Badge tone="muted">Optional</Badge>
                              </td>
                              <td className="px-4 py-3">
                                <Badge tone={statusTone(display)}>
                                  {statusLabel(display)}
                                </Badge>
                                {file.rejectedReason ? (
                                  <div className="mt-1 text-xs text-destructive">
                                    {file.rejectedReason}
                                  </div>
                                ) : null}
                              </td>
                              <td className="px-4 py-3 text-end">
                                <div className="inline-flex flex-wrap justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setViewer({
                                        professionalId: selected.id,
                                        fileId: file.id,
                                        name: file.originalName,
                                      })
                                    }>
                                    View
                                  </Button>
                                  {canWrite ? (
                                    <>
                                      <Button
                                        size="sm"
                                        disabled={acting || file.status === 'approved'}
                                        onClick={() =>
                                          setPendingFileApprove({
                                            item: selected,
                                            file,
                                            label: file.originalName || 'Untyped document',
                                          })
                                        }>
                                        Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        disabled={acting}
                                        onClick={() => {
                                          setRejectReason('');
                                          setPendingFileReject({item: selected, file});
                                        }}>
                                        Reject
                                      </Button>
                                    </>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </DataTable>
                        );
                      })()}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </DataTable>
      )}

      <FileViewerModal
        open={viewer !== null}
        title={viewer?.name ?? ''}
        onClose={() => setViewer(null)}
        load={loadViewerFile}
      />

      <ConfirmDialog
        open={pendingFileApprove !== null}
        title="Approve this document?"
        body={
          pendingFileApprove
            ? `Confirm approval of “${pendingFileApprove.label}” for ${pendingFileApprove.item.name}.`
            : ''
        }
        confirmLabel="Approve"
        onClose={() => {
          if (!acting) setPendingFileApprove(null);
        }}
        onConfirm={() => {
          if (!pendingFileApprove) return;
          void onFileAction(
            'approve',
            pendingFileApprove.item,
            pendingFileApprove.file,
          );
        }}
      />

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
