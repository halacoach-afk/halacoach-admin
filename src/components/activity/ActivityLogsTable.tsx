'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState, type ReactNode} from 'react';
import {
  isApiError,
  listActivityLogs,
  listClientActivityLogs,
  listLeadActivityLogs,
  listProfessionalActivityLogs,
  type ActivityLogEntry,
} from '@/api';
import {
  ExcelColumnFilter,
  ExcelFilterMultiSelect,
  ExcelFilterSelectField,
  ExcelFilterTextField,
} from '@/components/ui/ExcelColumnFilter';
import {DataTable} from '@/components/ui/DataTable';
import {ErrorState} from '@/components/ui/ErrorState';
import {PaginationBar} from '@/components/ui/PaginationBar';
import {
  ACTIVITY_ACTOR_KIND_OPTIONS,
  ACTIVITY_EVENT_FILTER_OPTIONS,
  activityActorHref,
  activityActorKindLabel,
  activityActorLabel,
  activityEntityHref,
  activityEntityTypeLabel,
  activityEventLabel,
  activitySummary,
  formatActivityWhenParts,
  resolveActivityActorKind,
} from '@/lib/activity-utils';
import {
  DEFAULT_PER_PAGE,
  emptyPaginationMeta,
  type PaginationMeta,
} from '@/lib/pagination';

export type ActivityLogsTableScope =
  | {kind: 'global'}
  | {kind: 'client'; id: string}
  | {kind: 'coach'; id: string}
  | {kind: 'lead'; id: string};

type ColumnKey = 'id' | 'when' | 'type' | 'event' | 'actor' | 'entities';

type Filters = {
  id: string;
  events: string[];
  actorKind: string;
  actorName: string;
  actorId: string;
  entityType: string;
  entityId: string;
  from: string;
  to: string;
};

const EMPTY_FILTERS: Filters = {
  id: '',
  events: [],
  actorKind: '',
  actorName: '',
  actorId: '',
  entityType: '',
  entityId: '',
  from: '',
  to: '',
};

const TYPE_FILTER_OPTIONS = [
  {value: '', label: 'Any'},
  ...ACTIVITY_ACTOR_KIND_OPTIONS,
];

function toIso(local: string) {
  if (!local.trim()) return undefined;
  const ms = Date.parse(local);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined;
}

function isColumnActive(filters: Filters, key: ColumnKey) {
  if (key === 'id') return Boolean(filters.id.trim());
  if (key === 'when') return Boolean(filters.from || filters.to);
  if (key === 'type') return Boolean(filters.actorKind);
  if (key === 'event') return filters.events.length > 0;
  if (key === 'actor') {
    return Boolean(filters.actorName.trim() || filters.actorId.trim());
  }
  return Boolean(filters.entityType.trim() || filters.entityId.trim());
}

function clearedColumn(key: ColumnKey): Partial<Filters> {
  if (key === 'id') return {id: ''};
  if (key === 'when') return {from: '', to: ''};
  if (key === 'type') return {actorKind: ''};
  if (key === 'event') return {events: []};
  if (key === 'actor') return {actorName: '', actorId: ''};
  return {entityType: '', entityId: ''};
}

function pickColumn(filters: Filters, key: ColumnKey): Partial<Filters> {
  if (key === 'id') return {id: filters.id};
  if (key === 'when') return {from: filters.from, to: filters.to};
  if (key === 'type') return {actorKind: filters.actorKind};
  if (key === 'event') return {events: filters.events};
  if (key === 'actor') return {actorName: filters.actorName, actorId: filters.actorId};
  return {entityType: filters.entityType, entityId: filters.entityId};
}

async function fetchRows(
  scope: ActivityLogsTableScope,
  page: number,
  perPage: number,
  filters: Filters,
) {
  const params = {
    page,
    perPage,
    id: filters.id.trim() || undefined,
    events: filters.events.length ? filters.events : undefined,
    actorKind: filters.actorKind || undefined,
    actorName: filters.actorName.trim() || undefined,
    actorId: filters.actorId.trim() || undefined,
    entityType: filters.entityType.trim() || undefined,
    entityId: filters.entityId.trim() || undefined,
    from: toIso(filters.from),
    to: toIso(filters.to),
  };
  if (scope.kind === 'client') return listClientActivityLogs(scope.id, params);
  if (scope.kind === 'coach') return listProfessionalActivityLogs(scope.id, params);
  if (scope.kind === 'lead') return listLeadActivityLogs(scope.id, params);
  return listActivityLogs(params);
}

type Props = {
  scope: ActivityLogsTableScope;
  /** When true, hide entity-type filters (scope already pins entity). */
  compactFilters?: boolean;
};

export function ActivityLogsTable({scope, compactFilters = false}: Props) {
  const [rows, setRows] = useState<ActivityLogEntry[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyPaginationMeta());
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [openColumn, setOpenColumn] = useState<ColumnKey | null>(null);

  const scopeKey = scope.kind === 'global' ? 'global' : `${scope.kind}:${scope.id}`;

  const load = async (nextPage = page, filters = applied) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchRows(scope, nextPage, perPage, filters);
      setRows(res.data);
      setMeta(res.meta);
      setPage(res.meta.page);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load activity.');
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  };

  useEffect(() => {
    setApplied(EMPTY_FILTERS);
    setDraft(EMPTY_FILTERS);
    setPage(1);
    void load(1, EMPTY_FILTERS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey, perPage]);

  const patchDraft = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setDraft(prev => ({...prev, [key]: value}));
  };

  const applyColumn = (key: ColumnKey) => {
    const next = {...applied, ...pickColumn(draft, key)};
    setApplied(next);
    setOpenColumn(null);
    setPage(1);
    void load(1, next);
  };

  const clearColumn = (key: ColumnKey) => {
    const next = {...applied, ...clearedColumn(key)};
    setApplied(next);
    setDraft(prev => ({...prev, ...clearedColumn(key)}));
    setOpenColumn(null);
    setPage(1);
    void load(1, next);
  };

  const openMenu = (key: ColumnKey, open: boolean) => {
    if (open) {
      setDraft(applied);
      setOpenColumn(key);
    } else {
      setOpenColumn(null);
    }
  };

  const header = (key: ColumnKey, label: string, children: ReactNode) => (
    <ExcelColumnFilter
      label={label}
      active={isColumnActive(applied, key)}
      open={openColumn === key}
      onOpenChange={open => openMenu(key, open)}
      onApply={() => applyColumn(key)}
      onClear={() => clearColumn(key)}>
      {children}
    </ExcelColumnFilter>
  );

  const columns = useMemo(() => {
    const cols: ReactNode[] = [
      header(
        'id',
        'ID',
        <ExcelFilterTextField
          label="Activity ID"
          value={draft.id}
          onChange={v => patchDraft('id', v)}
          placeholder="e.g. 42"
        />,
      ),
      header(
        'when',
        'When',
        <>
          <ExcelFilterTextField
            type="datetime-local"
            label="From"
            value={draft.from}
            onChange={v => patchDraft('from', v)}
          />
          <ExcelFilterTextField
            type="datetime-local"
            label="To"
            value={draft.to}
            onChange={v => patchDraft('to', v)}
          />
        </>,
      ),
      header(
        'event',
        'Event',
        <ExcelFilterMultiSelect
          values={draft.events}
          onChange={v => patchDraft('events', v)}
          options={ACTIVITY_EVENT_FILTER_OPTIONS}
        />,
      ),
      header(
        'actor',
        'Actor',
        <>
          <ExcelFilterTextField
            label="Name"
            value={draft.actorName}
            onChange={v => patchDraft('actorName', v)}
            placeholder="Search name"
          />
          <ExcelFilterTextField
            label="ID"
            value={draft.actorId}
            onChange={v => patchDraft('actorId', v)}
            placeholder="Actor ID"
          />
        </>,
      ),
      header(
        'type',
        'Actor Type',
        <ExcelFilterSelectField
          label="Actor type"
          value={draft.actorKind}
          onChange={v => patchDraft('actorKind', v)}
          options={TYPE_FILTER_OPTIONS}
        />,
      ),
    ];
    if (!compactFilters) {
      cols.push(
        header(
          'entities',
          'Entities',
          <>
            <ExcelFilterTextField
              label="Type"
              value={draft.entityType}
              onChange={v => patchDraft('entityType', v)}
              placeholder="lead, client, coach…"
            />
            <ExcelFilterTextField
              label="ID"
              value={draft.entityId}
              onChange={v => patchDraft('entityId', v)}
              placeholder="Entity ID"
            />
          </>,
        ),
      );
    } else {
      cols.push('Entities');
    }
    cols.push('Details');
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied, draft, openColumn, compactFilters]);

  const colSpan = columns.length;
  const showSpinner = loading && rows.length === 0;
  const showEmpty = !loading && rows.length === 0;

  return (
    <>
      {error ? (
        <div className="mb-3">
          <ErrorState
            body={error}
            onRetry={() => void load(hasLoaded ? page : 1)}
          />
        </div>
      ) : null}
      <DataTable
        columns={columns}
        pagination={
          rows.length > 0 || meta.total > 0 ? (
            <PaginationBar
              variant="embedded"
              meta={meta}
              disabled={loading}
              onPageChange={next => void load(next)}
              onPerPageChange={next => {
                setPage(1);
                setPerPage(next);
              }}
            />
          ) : undefined
        }>
        {showSpinner ? (
          <tr>
            <td colSpan={colSpan} className="px-4 py-10 text-center">
              <div className="inline-flex items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
                Loading activity…
              </div>
            </td>
          </tr>
        ) : showEmpty ? (
          <tr>
            <td
              colSpan={colSpan}
              className="whitespace-normal px-4 py-10 text-center text-sm text-muted-foreground">
              No activity found. Try widening column filters or wait for new events.
            </td>
          </tr>
        ) : (
          rows.map(row => {
            const when = formatActivityWhenParts(row.occurredAt);
            const kind = resolveActivityActorKind(row);
            const actorHref = activityActorHref(row);
            const actorName = activityActorLabel(row);
            const details = activitySummary(row);
            return (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 align-top text-sm font-medium tabular-nums text-foreground">
                  {row.id}
                </td>
                <td className="px-4 py-3 align-top text-sm text-muted-foreground">
                  {when ? (
                    <div className="leading-snug">
                      <div className="text-foreground">{when.absolute}</div>
                      <div className="text-xs text-muted-foreground/80">{when.relative}</div>
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="whitespace-normal px-4 py-3 align-top text-sm font-medium text-foreground">
                  {activityEventLabel(row.event)}
                </td>
                <td className="px-4 py-3 align-top text-sm text-foreground">
                  {actorHref && actorName !== '—' ? (
                    <Link href={actorHref} className="font-medium text-primary hover:underline">
                      {actorName}
                    </Link>
                  ) : (
                    <span>{actorName}</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-sm text-foreground">
                  {activityActorKindLabel(kind)}
                </td>
                <td className="whitespace-normal px-4 py-3 align-top text-sm text-muted-foreground">
                  {row.entities.length === 0 ? (
                    '—'
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
                      {row.entities.map((entity, index) => {
                        const href = activityEntityHref(entity, row.entities);
                        const typeLabel = activityEntityTypeLabel(entity.type);
                        const key = `${entity.type}:${entity.id}`;
                        return (
                          <span key={key} className="inline-flex items-center gap-1">
                            {index > 0 ? (
                              <span className="text-muted-foreground/50">·</span>
                            ) : null}
                            <span>
                              {typeLabel}{' '}
                              {href ? (
                                <Link href={href} className="text-primary hover:underline">
                                  #{entity.id}
                                </Link>
                              ) : (
                                <span>#{entity.id}</span>
                              )}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </td>
                <td className="max-w-[18rem] whitespace-normal px-4 py-3 align-top text-sm text-muted-foreground">
                  {details}
                </td>
              </tr>
            );
          })
        )}
      </DataTable>
    </>
  );
}
