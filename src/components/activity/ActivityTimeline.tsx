'use client';

import {useCallback, useEffect, useState} from 'react';
import {
  isApiError,
  listActivityLogs,
  listClientActivityLogs,
  listLeadActivityLogs,
  listProfessionalActivityLogs,
  type ActivityLogEntry,
} from '@/api';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PaginationBar} from '@/components/ui/PaginationBar';
import {formatPostedParts} from '@/lib/lead-utils';
import {
  DEFAULT_PER_PAGE,
  emptyPaginationMeta,
  type PaginationMeta,
} from '@/lib/pagination';

export type ActivityTimelineScope =
  | {kind: 'global'}
  | {kind: 'client'; id: string}
  | {kind: 'coach'; id: string}
  | {kind: 'lead'; id: string};

type Props = {
  scope: ActivityTimelineScope;
  title?: string;
  compact?: boolean;
  filters?: {
    event?: string;
    actorType?: string;
    actorId?: string;
    from?: string;
    to?: string;
  };
};

function actorLabel(row: ActivityLogEntry) {
  if (row.actorName) return row.actorName;
  if (row.actorType === 'system') return 'System';
  if (row.actorId) return `${row.actorType} #${row.actorId}`;
  return '—';
}

function entitiesLabel(row: ActivityLogEntry) {
  if (!row.entities.length) return '—';
  return row.entities.map(e => `${e.type}:${e.id}`).join(', ');
}

async function fetchScope(
  scope: ActivityTimelineScope,
  page: number,
  perPage: number,
  filters: Props['filters'],
) {
  const params = {
    page,
    perPage,
    event: filters?.event || undefined,
    actorType: filters?.actorType || undefined,
    actorId: filters?.actorId || undefined,
    from: filters?.from || undefined,
    to: filters?.to || undefined,
  };
  if (scope.kind === 'client') return listClientActivityLogs(scope.id, params);
  if (scope.kind === 'coach') return listProfessionalActivityLogs(scope.id, params);
  if (scope.kind === 'lead') return listLeadActivityLogs(scope.id, params);
  return listActivityLogs(params);
}

export function ActivityTimeline({
  scope,
  title = 'Activity',
  compact = false,
  filters,
}: Props) {
  const [rows, setRows] = useState<ActivityLogEntry[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyPaginationMeta());
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(compact ? 5 : DEFAULT_PER_PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const load = useCallback(
    async (nextPage = page) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchScope(scope, nextPage, perPage, filters);
        setRows(res.data);
        setMeta(res.meta);
        setPage(res.meta.page);
      } catch (err) {
        setError(isApiError(err) ? err.message : 'Could not load activity.');
      } finally {
        setLoading(false);
        setHasLoaded(true);
      }
    },
    [scope, page, perPage, filters],
  );

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.kind, 'id' in scope ? scope.id : '', perPage, filters?.event, filters?.actorType, filters?.actorId, filters?.from, filters?.to]);

  return (
    <section className="min-w-0">
      {title ? (
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
      ) : null}

      {!hasLoaded && loading ? <LoadingState label="Loading activity..." /> : null}
      {hasLoaded && error ? (
        <ErrorState body={error} onRetry={() => void load()} />
      ) : null}

      {hasLoaded && !error && rows.length === 0 ? (
        <EmptyState title="No activity yet" body="No recorded events for this view." />
      ) : null}

      {hasLoaded && !error && rows.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {rows.map(row => {
              const when = formatPostedParts(row.occurredAt);
              return (
                <li key={row.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{row.event}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {actorLabel(row)}
                        {!compact ? ` · ${entitiesLabel(row)}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-end text-xs text-muted-foreground">
                      {when ? (
                        <>
                          <div>{when.date}</div>
                          <div className="text-muted-foreground/80">{when.time}</div>
                        </>
                      ) : (
                        '—'
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-border px-3 py-2">
            <PaginationBar
              meta={meta}
              onPageChange={next => void load(next)}
              onPerPageChange={next => {
                setPerPage(next);
                setPage(1);
              }}
              variant="embedded"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
