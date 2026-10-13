'use client';

import {useEffect, useState} from 'react';
import {isApiError, listActivityLogs, type ActivityLogEntry} from '@/api';
import {Button} from '@/components/ui/Button';
import {DataTable} from '@/components/ui/DataTable';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {PaginationBar} from '@/components/ui/PaginationBar';
import {formatPostedParts} from '@/lib/lead-utils';
import {
  DEFAULT_PER_PAGE,
  emptyPaginationMeta,
  type PaginationMeta,
} from '@/lib/pagination';

function FilterInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
    </label>
  );
}

export function ActivityLogsScreen() {
  const [rows, setRows] = useState<ActivityLogEntry[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyPaginationMeta());
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [event, setEvent] = useState('');
  const [actorType, setActorType] = useState('');
  const [actorId, setActorId] = useState('');
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const toIso = (local: string) => {
    if (!local.trim()) return undefined;
    const ms = Date.parse(local);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined;
  };

  const load = async (nextPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listActivityLogs({
        page: nextPage,
        perPage,
        event: event.trim() || undefined,
        actorType: actorType.trim() || undefined,
        actorId: actorId.trim() || undefined,
        entityType: entityType.trim() || undefined,
        entityId: entityId.trim() || undefined,
        from: toIso(from),
        to: toIso(to),
      });
      setRows(res.data);
      setMeta(res.meta);
      setPage(res.meta.page);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load activity logs.');
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  };

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perPage]);

  if (!hasLoaded && loading) {
    return <LoadingState label="Loading activity..." />;
  }

  if (!hasLoaded && error) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  return (
    <>
      <PageHeader
        title="Activity"
        description="Platform-wide durable event history across leads, credits, verification, and admin actions."
      />

      <div className="mb-4 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <FilterInput
          label="Event"
          value={event}
          onChange={setEvent}
          placeholder="e.g. lead.unlocked"
        />
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Actor type
          </span>
          <select
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={actorType}
            onChange={e => setActorType(e.target.value)}>
            <option value="">Any</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="system">System</option>
          </select>
        </label>
        <FilterInput label="Actor ID" value={actorId} onChange={setActorId} />
        <FilterInput
          label="Entity type"
          value={entityType}
          onChange={setEntityType}
          placeholder="lead, client, coach…"
        />
        <FilterInput label="Entity ID" value={entityId} onChange={setEntityId} />
        <FilterInput
          label="From"
          value={from}
          onChange={setFrom}
          type="datetime-local"
        />
        <FilterInput label="To" value={to} onChange={setTo} type="datetime-local" />
        <div className="flex items-end">
          <Button onClick={() => void load(1)} disabled={loading}>
            Apply filters
          </Button>
        </div>
      </div>

      {error ? <ErrorState body={error} onRetry={() => void load()} /> : null}

      {loading && hasLoaded ? (
        <LoadingState label="Refreshing..." />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No activity found"
          body="Try widening filters or wait for new platform events."
        />
      ) : (
        <>
          <DataTable columns={['When', 'Event', 'Actor', 'Entities']}>
            {rows.map(row => {
              const when = formatPostedParts(row.occurredAt);
              return (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 align-top text-sm text-muted-foreground">
                    {when ? (
                      <div className="leading-snug">
                        <div>{when.date}</div>
                        <div className="text-xs text-muted-foreground/80">{when.time}</div>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-sm font-medium text-foreground">
                    {row.event}
                  </td>
                  <td className="px-4 py-3 align-top text-sm text-foreground">
                    <div>{row.actorName || '—'}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.actorType}
                      {row.actorId ? ` #${row.actorId}` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-sm text-muted-foreground">
                    {row.entities.length
                      ? row.entities.map(e => `${e.type}:${e.id}`).join(', ')
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </DataTable>
          <PaginationBar
            meta={meta}
            onPageChange={next => void load(next)}
            onPerPageChange={next => {
              setPerPage(next);
              setPage(1);
            }}
          />
        </>
      )}
    </>
  );
}
