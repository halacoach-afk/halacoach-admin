'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState, type ReactNode} from 'react';
import {ChevronRight} from 'lucide-react';
import {
  isApiError,
  listLeads,
  listServices,
  type CatalogService,
  type LeadLifecycleStatus,
  type LeadSortBy,
  type LeadSummary,
} from '@/api';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {DataTable, FilterBar} from '@/components/ui/DataTable';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {
  ExcelColumnFilter,
  ExcelFilterMultiSelect,
  ExcelFilterTextField,
} from '@/components/ui/ExcelColumnFilter';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {PaginationBar} from '@/components/ui/PaginationBar';
import {leadPreferenceDisplay} from '@/lib/lead-preference-labels';
import {formatLeadSource, formatPostedParts} from '@/lib/lead-utils';
import {
  DEFAULT_PER_PAGE,
  emptyPaginationMeta,
  type PaginationMeta,
} from '@/lib/pagination';

type FilterColumnKey =
  | 'id'
  | 'goal'
  | 'goalDetail'
  | 'formats'
  | 'frequencies'
  | 'days'
  | 'times'
  | 'location'
  | 'client'
  | 'coach'
  | 'sources'
  | 'unlocks'
  | 'statuses'
  | 'posted';

type ColumnFilters = {
  id: string;
  serviceIds: string[];
  goalDetail: string;
  formats: string[];
  frequencies: string[];
  days: string[];
  times: string[];
  location: string;
  radiusMin: string;
  radiusMax: string;
  client: string;
  coach: string;
  sources: string[];
  unlocksMin: string;
  unlocksMax: string;
  statuses: string[];
  createdFrom: string;
  createdTo: string;
};

const COLUMN_SORT_BY: Record<FilterColumnKey, LeadSortBy> = {
  id: 'id',
  goal: 'goal',
  goalDetail: 'goalDetail',
  formats: 'format',
  frequencies: 'frequency',
  days: 'days',
  times: 'times',
  location: 'location',
  client: 'client',
  coach: 'coach',
  sources: 'source',
  unlocks: 'unlocks',
  statuses: 'status',
  posted: 'posted',
};

const DEFAULT_SORT_BY: LeadSortBy = 'posted';
const DEFAULT_SORT_DIR: 'asc' | 'desc' = 'desc';

const EMPTY_COLUMN_FILTERS: ColumnFilters = {
  id: '',
  serviceIds: [],
  goalDetail: '',
  formats: [],
  frequencies: [],
  days: [],
  times: [],
  location: '',
  radiusMin: '',
  radiusMax: '',
  client: '',
  coach: '',
  sources: [],
  unlocksMin: '',
  unlocksMax: '',
  statuses: [],
  createdFrom: '',
  createdTo: '',
};

/** Default list view: Open leads. */
const DEFAULT_COLUMN_FILTERS: ColumnFilters = {
  ...EMPTY_COLUMN_FILTERS,
  statuses: ['open'],
};

const COLUMN_CHIP_LABELS: Record<FilterColumnKey, string> = {
  id: 'ID',
  goal: 'Goal',
  goalDetail: 'Goal details',
  formats: 'Format',
  frequencies: 'Frequency',
  days: 'Days',
  times: 'Times',
  location: 'Location',
  client: 'Client',
  coach: 'Coach',
  sources: 'Source',
  unlocks: 'Unlocks',
  statuses: 'Status',
  posted: 'Posted',
};

const FORMAT_OPTIONS = [
  {value: 'client', label: "Client's location"},
  {value: 'coach', label: "Coach's location"},
  {value: 'online', label: 'Online'},
  {value: 'online_live', label: 'Online live'},
];

const FREQUENCY_OPTIONS = [
  {value: '1-2', label: '1–2 times/week'},
  {value: '3-4', label: '3–4 times/week'},
  {value: '5+', label: '5+ times/week'},
];

const DAY_OPTIONS = [
  {value: 'any', label: 'Any day'},
  {value: 'mon', label: 'Monday'},
  {value: 'tue', label: 'Tuesday'},
  {value: 'wed', label: 'Wednesday'},
  {value: 'thu', label: 'Thursday'},
  {value: 'fri', label: 'Friday'},
  {value: 'sat', label: 'Saturday'},
  {value: 'sun', label: 'Sunday'},
];

const TIME_OPTIONS = [
  {value: 'any', label: 'Any time'},
  {value: 'early-morning', label: 'Early morning'},
  {value: 'morning', label: 'Morning'},
  {value: 'early-afternoon', label: 'Early afternoon'},
  {value: 'late-afternoon', label: 'Late afternoon'},
  {value: 'evening', label: 'Evening'},
  {value: 'other', label: 'Other'},
];

const SOURCE_OPTIONS = [
  {value: 'website', label: 'Website'},
  {value: 'android', label: 'Android'},
  {value: 'ios', label: 'iOS'},
];

const STATUS_OPTIONS = [
  {value: 'open', label: 'Open'},
  {value: 'in_progress', label: 'In progress'},
  {value: 'completed', label: 'Completed'},
  {value: 'cancelled', label: 'Cancelled'},
];

const STATUS_FILTER_OPTIONS = [
  {value: 'all', label: 'All'},
  ...STATUS_OPTIONS,
];

function resolvedLeadStatus(row: LeadSummary): LeadLifecycleStatus {
  if (row.leadStatus) {
    return row.leadStatus;
  }
  return row.status === 'closed' ? 'cancelled' : 'open';
}

function leadStatusTone(status: LeadLifecycleStatus) {
  if (status === 'in_progress') return 'primary' as const;
  if (status === 'completed') return 'muted' as const;
  if (status === 'cancelled') return 'danger' as const;
  return 'sky' as const;
}

function leadStatusLabel(status: LeadLifecycleStatus) {
  if (status === 'in_progress') return 'In progress';
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled') return 'Cancelled';
  return 'Open';
}

function isColumnActive(filters: ColumnFilters, key: FilterColumnKey): boolean {
  switch (key) {
    case 'posted':
      return Boolean(filters.createdFrom.trim() || filters.createdTo.trim());
    case 'goal':
      return filters.serviceIds.length > 0;
    case 'formats':
      return filters.formats.length > 0;
    case 'frequencies':
      return filters.frequencies.length > 0;
    case 'days':
      return filters.days.length > 0;
    case 'times':
      return filters.times.length > 0;
    case 'sources':
      return filters.sources.length > 0;
    case 'unlocks':
      return Boolean(filters.unlocksMin.trim() || filters.unlocksMax.trim());
    case 'statuses':
      return filters.statuses.length > 0;
    case 'location':
      return Boolean(
        filters.location.trim() ||
          filters.radiusMin.trim() ||
          filters.radiusMax.trim(),
      );
    case 'id':
    case 'goalDetail':
    case 'client':
    case 'coach':
      return Boolean(filters[key].trim());
    default:
      return false;
  }
}

function clearedColumnSlice(key: FilterColumnKey): Partial<ColumnFilters> {
  if (key === 'posted') return {createdFrom: '', createdTo: ''};
  if (key === 'goal') return {serviceIds: []};
  if (key === 'formats') return {formats: []};
  if (key === 'frequencies') return {frequencies: []};
  if (key === 'days') return {days: []};
  if (key === 'times') return {times: []};
  if (key === 'sources') return {sources: []};
  if (key === 'unlocks') return {unlocksMin: '', unlocksMax: ''};
  if (key === 'statuses') return {statuses: []};
  if (key === 'id') return {id: ''};
  if (key === 'goalDetail') return {goalDetail: ''};
  if (key === 'location') return {location: '', radiusMin: '', radiusMax: ''};
  if (key === 'client') return {client: ''};
  if (key === 'coach') return {coach: ''};
  return {};
}

function activeFilterChips(
  filters: ColumnFilters,
  serviceOptions: Array<{value: string; label: string}>,
): Array<{key: FilterColumnKey; text: string}> {
  const chips: Array<{key: FilterColumnKey; text: string}> = [];
  const labelOf = (
    values: string[],
    options: Array<{value: string; label: string}>,
  ) => values.map(v => options.find(o => o.value === v)?.label ?? v).join(', ');

  if (filters.id.trim()) {
    chips.push({key: 'id', text: `${COLUMN_CHIP_LABELS.id}: ${filters.id.trim()}`});
  }
  if (filters.serviceIds.length) {
    chips.push({
      key: 'goal',
      text: `${COLUMN_CHIP_LABELS.goal}: ${labelOf(filters.serviceIds, serviceOptions)}`,
    });
  }
  if (filters.goalDetail.trim()) {
    chips.push({
      key: 'goalDetail',
      text: `${COLUMN_CHIP_LABELS.goalDetail}: ${filters.goalDetail.trim()}`,
    });
  }
  if (filters.formats.length) {
    chips.push({
      key: 'formats',
      text: `${COLUMN_CHIP_LABELS.formats}: ${labelOf(filters.formats, FORMAT_OPTIONS)}`,
    });
  }
  if (filters.frequencies.length) {
    chips.push({
      key: 'frequencies',
      text: `${COLUMN_CHIP_LABELS.frequencies}: ${labelOf(filters.frequencies, FREQUENCY_OPTIONS)}`,
    });
  }
  if (filters.days.length) {
    chips.push({
      key: 'days',
      text: `${COLUMN_CHIP_LABELS.days}: ${labelOf(filters.days, DAY_OPTIONS)}`,
    });
  }
  if (filters.times.length) {
    chips.push({
      key: 'times',
      text: `${COLUMN_CHIP_LABELS.times}: ${labelOf(filters.times, TIME_OPTIONS)}`,
    });
  }
  if (
    filters.location.trim() ||
    filters.radiusMin.trim() ||
    filters.radiusMax.trim()
  ) {
    const parts: string[] = [];
    if (filters.location.trim()) parts.push(filters.location.trim());
    if (filters.radiusMin.trim() || filters.radiusMax.trim()) {
      const min = filters.radiusMin.trim() || '…';
      const max = filters.radiusMax.trim() || '…';
      parts.push(`Radius ${min}–${max} km`);
    }
    chips.push({
      key: 'location',
      text: `${COLUMN_CHIP_LABELS.location}: ${parts.join(' · ')}`,
    });
  }
  if (filters.client.trim()) {
    chips.push({
      key: 'client',
      text: `${COLUMN_CHIP_LABELS.client}: ${filters.client.trim()}`,
    });
  }
  if (filters.coach.trim()) {
    chips.push({
      key: 'coach',
      text: `${COLUMN_CHIP_LABELS.coach}: ${filters.coach.trim()}`,
    });
  }
  if (filters.sources.length) {
    chips.push({
      key: 'sources',
      text: `${COLUMN_CHIP_LABELS.sources}: ${labelOf(filters.sources, SOURCE_OPTIONS)}`,
    });
  }
  if (filters.unlocksMin.trim() || filters.unlocksMax.trim()) {
    const min = filters.unlocksMin.trim() || '…';
    const max = filters.unlocksMax.trim() || '…';
    chips.push({
      key: 'unlocks',
      text: `${COLUMN_CHIP_LABELS.unlocks}: ${min} – ${max}`,
    });
  }
  if (filters.statuses.length) {
    chips.push({
      key: 'statuses',
      text: `${COLUMN_CHIP_LABELS.statuses}: ${labelOf(filters.statuses, STATUS_OPTIONS)}`,
    });
  }
  if (filters.createdFrom.trim() || filters.createdTo.trim()) {
    const from = filters.createdFrom.trim() || '…';
    const to = filters.createdTo.trim() || '…';
    chips.push({
      key: 'posted',
      text: `${COLUMN_CHIP_LABELS.posted}: ${from} → ${to}`,
    });
  }
  return chips;
}

function Cell({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <td className={`px-4 py-3 align-top text-sm text-foreground ${className ?? ''}`}>
      {value}
    </td>
  );
}

export function LeadsScreen() {
  const [rows, setRows] = useState<LeadSummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyPaginationMeta());
  const [counts, setCounts] = useState<Record<string, number>>({
    all: 0,
    open: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] =
    useState<ColumnFilters>(DEFAULT_COLUMN_FILTERS);
  const [draftFilters, setDraftFilters] =
    useState<ColumnFilters>(DEFAULT_COLUMN_FILTERS);
  const [openFilter, setOpenFilter] = useState<FilterColumnKey | null>(null);
  const [sortBy, setSortBy] = useState<LeadSortBy>(DEFAULT_SORT_BY);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(DEFAULT_SORT_DIR);

  const serviceOptions = useMemo(
    () =>
      services
        .filter(s => s.active)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(s => ({value: String(s.id), label: s.name})),
    [services],
  );

  const filterParams = useMemo(
    () => ({
      id: appliedFilters.id.trim() || undefined,
      serviceIds: appliedFilters.serviceIds.length
        ? appliedFilters.serviceIds
        : undefined,
      goalDetail: appliedFilters.goalDetail.trim() || undefined,
      formats: appliedFilters.formats.length ? appliedFilters.formats : undefined,
      frequencies: appliedFilters.frequencies.length
        ? appliedFilters.frequencies
        : undefined,
      days: appliedFilters.days.length ? appliedFilters.days : undefined,
      times: appliedFilters.times.length ? appliedFilters.times : undefined,
      location: appliedFilters.location.trim() || undefined,
      radiusMin: appliedFilters.radiusMin.trim() || undefined,
      radiusMax: appliedFilters.radiusMax.trim() || undefined,
      client: appliedFilters.client.trim() || undefined,
      coach: appliedFilters.coach.trim() || undefined,
      sources: appliedFilters.sources.length ? appliedFilters.sources : undefined,
      unlocksMin: appliedFilters.unlocksMin.trim() || undefined,
      unlocksMax: appliedFilters.unlocksMax.trim() || undefined,
      statuses: appliedFilters.statuses.length ? appliedFilters.statuses : undefined,
      createdFrom: appliedFilters.createdFrom.trim() || undefined,
      createdTo: appliedFilters.createdTo.trim() || undefined,
      sortBy,
      sortDir,
    }),
    [appliedFilters, sortBy, sortDir],
  );

  const load = async (nextPage = page, nextPerPage = perPage) => {
    setLoading(true);
    setError(null);
    try {
      const [leads, catalog] = await Promise.all([
        listLeads({
          page: nextPage,
          perPage: nextPerPage,
          ...filterParams,
        }),
        listServices(),
      ]);
      setRows(leads.data);
      setMeta(leads.meta);
      setPage(leads.meta.page);
      setPerPage(leads.meta.perPage);
      if (leads.counts) {
        setCounts(leads.counts);
      }
      setServices(catalog);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load leads.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [filterParams]);

  useEffect(() => {
    void load(page, perPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, filterParams]);

  const filterChips = useMemo(
    () => activeFilterChips(appliedFilters, serviceOptions),
    [appliedFilters, serviceOptions],
  );

  const patchDraft = <K extends keyof ColumnFilters>(
    key: K,
    value: ColumnFilters[K],
  ) => {
    setDraftFilters(prev => ({...prev, [key]: value}));
  };

  const openColumnMenu = (key: FilterColumnKey) => {
    setDraftFilters(appliedFilters);
    setOpenFilter(key);
  };

  const applyColumnDraft = () => {
    setAppliedFilters(draftFilters);
    setPage(1);
  };

  const clearColumnFilters = () => {
    setAppliedFilters(EMPTY_COLUMN_FILTERS);
    setDraftFilters(EMPTY_COLUMN_FILTERS);
    setOpenFilter(null);
    setPage(1);
  };

  const clearOneColumn = (key: FilterColumnKey) => {
    const slice = clearedColumnSlice(key);
    setAppliedFilters(prev => ({...prev, ...slice}));
    setDraftFilters(prev => ({...prev, ...slice}));
    setPage(1);
  };

  const commitMultiSelect = (
    key:
      | 'serviceIds'
      | 'formats'
      | 'frequencies'
      | 'days'
      | 'times'
      | 'sources'
      | 'statuses',
    values: string[],
  ) => {
    setDraftFilters(prev => ({...prev, [key]: values}));
    setAppliedFilters(prev => ({...prev, [key]: values}));
    setPage(1);
  };

  const applySort = (key: FilterColumnKey, dir: 'asc' | 'desc') => {
    const nextBy = COLUMN_SORT_BY[key];
    if (sortBy === nextBy && sortDir === dir) {
      setSortBy(DEFAULT_SORT_BY);
      setSortDir(DEFAULT_SORT_DIR);
    } else {
      setSortBy(nextBy);
      setSortDir(dir);
    }
    setPage(1);
  };

  const statusBarValue =
    appliedFilters.statuses.length === 1
      ? appliedFilters.statuses[0]
      : appliedFilters.statuses.length > 1
        ? '__multiple__'
        : 'all';

  const setStatusBar = (next: string) => {
    if (next === 'all' || next === '__multiple__') {
      commitMultiSelect('statuses', []);
      return;
    }
    commitMultiSelect('statuses', [next]);
  };

  const header = (key: FilterColumnKey, label: string, body: ReactNode) => {
    const sortKey = COLUMN_SORT_BY[key];
    return (
      <ExcelColumnFilter
        label={label}
        active={isColumnActive(appliedFilters, key)}
        sortDirection={sortBy === sortKey ? sortDir : null}
        open={openFilter === key}
        onOpenChange={next => {
          if (next) openColumnMenu(key);
          else setOpenFilter(null);
        }}
        onClear={() => clearOneColumn(key)}
        onApply={applyColumnDraft}
        onSortAsc={() => applySort(key, 'asc')}
        onSortDesc={() => applySort(key, 'desc')}
        sortAscLabel="Ascending"
        sortDescLabel="Descending">
        {body}
      </ExcelColumnFilter>
    );
  };

  const columns = [
    header(
      'id',
      'ID',
      <ExcelFilterTextField
        label="Search"
        value={draftFilters.id}
        onChange={v => patchDraft('id', v)}
        autoFocus
      />,
    ),
    header(
      'goal',
      'Goal',
      <ExcelFilterMultiSelect
        values={draftFilters.serviceIds}
        onChange={v => commitMultiSelect('serviceIds', v)}
        options={serviceOptions}
      />,
    ),
    header(
      'goalDetail',
      'Goal details',
      <ExcelFilterTextField
        label="Search"
        value={draftFilters.goalDetail}
        onChange={v => patchDraft('goalDetail', v)}
        autoFocus
      />,
    ),
    header(
      'formats',
      'Format',
      <ExcelFilterMultiSelect
        values={draftFilters.formats}
        onChange={v => commitMultiSelect('formats', v)}
        options={FORMAT_OPTIONS}
      />,
    ),
    header(
      'frequencies',
      'Frequency',
      <ExcelFilterMultiSelect
        values={draftFilters.frequencies}
        onChange={v => commitMultiSelect('frequencies', v)}
        options={FREQUENCY_OPTIONS}
      />,
    ),
    header(
      'days',
      'Days',
      <ExcelFilterMultiSelect
        values={draftFilters.days}
        onChange={v => commitMultiSelect('days', v)}
        options={DAY_OPTIONS}
      />,
    ),
    header(
      'times',
      'Times',
      <ExcelFilterMultiSelect
        values={draftFilters.times}
        onChange={v => commitMultiSelect('times', v)}
        options={TIME_OPTIONS}
      />,
    ),
    header(
      'location',
      'Location',
      <>
        <ExcelFilterTextField
          label="Search"
          value={draftFilters.location}
          onChange={v => patchDraft('location', v)}
          autoFocus
        />
        <ExcelFilterTextField
          type="number"
          label="Radius min (km)"
          value={draftFilters.radiusMin}
          onChange={v => patchDraft('radiusMin', v)}
          placeholder="0"
        />
        <ExcelFilterTextField
          type="number"
          label="Radius max (km)"
          value={draftFilters.radiusMax}
          onChange={v => patchDraft('radiusMax', v)}
          placeholder="∞"
        />
      </>,
    ),
    header(
      'client',
      'Client',
      <ExcelFilterTextField
        label="Search"
        value={draftFilters.client}
        onChange={v => patchDraft('client', v)}
        autoFocus
      />,
    ),
    header(
      'coach',
      'Coach',
      <ExcelFilterTextField
        label="Search"
        value={draftFilters.coach}
        onChange={v => patchDraft('coach', v)}
        autoFocus
      />,
    ),
    header(
      'sources',
      'Source',
      <ExcelFilterMultiSelect
        values={draftFilters.sources}
        onChange={v => commitMultiSelect('sources', v)}
        options={SOURCE_OPTIONS}
      />,
    ),
    header(
      'unlocks',
      'Unlocks',
      <>
        <ExcelFilterTextField
          type="number"
          label="Min"
          value={draftFilters.unlocksMin}
          onChange={v => patchDraft('unlocksMin', v)}
          placeholder="0"
        />
        <ExcelFilterTextField
          type="number"
          label="Max"
          value={draftFilters.unlocksMax}
          onChange={v => patchDraft('unlocksMax', v)}
          placeholder="∞"
        />
      </>,
    ),
    header(
      'statuses',
      'Status',
      <ExcelFilterMultiSelect
        values={draftFilters.statuses}
        onChange={v => commitMultiSelect('statuses', v)}
        options={STATUS_OPTIONS}
      />,
    ),
    header(
      'posted',
      'Posted',
      <>
        <ExcelFilterTextField
          type="date"
          label="From"
          value={draftFilters.createdFrom}
          onChange={v => patchDraft('createdFrom', v)}
        />
        <ExcelFilterTextField
          type="date"
          label="To"
          value={draftFilters.createdTo}
          onChange={v => patchDraft('createdTo', v)}
        />
      </>,
    ),
    '',
  ];

  const serviceNameById = useMemo(
    () => new Map(services.map(item => [item.id, item.name])),
    [services],
  );

  if (loading && rows.length === 0) {
    return <LoadingState label="Loading leads..." />;
  }

  if (error && rows.length === 0) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  return (
    <>
      <PageHeader
        title="Leads"
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        }
      />

      <FilterBar>
        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <span className="whitespace-nowrap font-medium">Status</span>
          <select
            aria-label="Filter by lead status"
            className="h-9 min-w-[12rem] rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground outline-none focus:border-primary"
            value={statusBarValue}
            onChange={e => setStatusBar(e.target.value)}>
            {STATUS_FILTER_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label} ({counts[option.value] ?? 0})
              </option>
            ))}
            {statusBarValue === '__multiple__' ? (
              <option value="__multiple__">
                Multiple ({appliedFilters.statuses.length})
              </option>
            ) : null}
          </select>
        </label>
      </FilterBar>

      {filterChips.length > 0 ? (
        <div className="mb-4 flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Active filters:</span>
          {filterChips.map(chip => (
            <button
              key={chip.key}
              type="button"
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground hover:bg-muted"
              onClick={() => clearOneColumn(chip.key)}
              title={`Remove ${COLUMN_CHIP_LABELS[chip.key]} filter`}>
              <span className="min-w-0 truncate">{chip.text}</span>
              <span aria-hidden className="text-muted-foreground">
                ×
              </span>
            </button>
          ))}
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
            onClick={clearColumnFilters}>
            Clear all filters
          </button>
        </div>
      ) : null}

      {error ? <ErrorState body={error} onRetry={() => void load()} /> : null}

      {rows.length === 0 ? (
        <EmptyState
          title="No leads match"
          body={
            filterChips.length > 0
              ? 'Try clearing or changing filters.'
              : 'Try another status filter.'
          }
        />
      ) : (
        <DataTable
          columns={columns}
          pagination={
            <PaginationBar
              variant="embedded"
              meta={meta}
              disabled={loading}
              onPageChange={next => setPage(next)}
              onPerPageChange={next => {
                setPage(1);
                setPerPage(next);
              }}
            />
          }>
          {rows.map(row => {
            const serviceName =
              serviceNameById.get(row.serviceId) ??
              row.service ??
              row.goal ??
              `Service #${row.serviceId}`;
            const prefs = leadPreferenceDisplay(row, serviceName);
            const status = resolvedLeadStatus(row);
            const posted = formatPostedParts(row.postedAt);
            return (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 align-top text-sm text-muted-foreground">
                  {row.id}
                </td>
                <td className="px-4 py-3 align-top text-sm font-medium text-foreground">
                  {prefs.goal}
                </td>
                <td
                  className="max-w-[180px] px-4 py-3 align-top text-sm text-foreground"
                  title={
                    prefs.goalDetails && prefs.goalDetails !== '-'
                      ? prefs.goalDetails
                      : undefined
                  }>
                  <span className="block truncate">{prefs.goalDetails}</span>
                </td>
                <Cell value={prefs.format} />
                <Cell value={prefs.frequency} />
                <Cell value={prefs.days} />
                <Cell value={prefs.times} />
                <td className="px-4 py-3 align-top text-sm text-foreground">
                  {prefs.location !== '-' ? (
                    <div className="leading-snug">
                      <div>{prefs.location}</div>
                      {prefs.radius !== '-' ? (
                        <div className="text-xs text-muted-foreground">
                          Radius {prefs.radius}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-sm">
                  {row.clientId ? (
                    <Link
                      href={`/clients/${row.clientId}`}
                      className="font-medium text-primary hover:underline">
                      {row.clientName}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">{row.clientName}</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-sm">
                  {row.assignedCoachName && row.assignedCoachId ? (
                    <Link
                      href={`/professionals/${row.assignedCoachId}`}
                      className="font-medium text-primary hover:underline">
                      {row.assignedCoachName}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-top text-sm text-muted-foreground">
                  {formatLeadSource(row.source)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-top text-end text-sm tabular-nums text-foreground">
                  {row.unlockCount ?? 0}
                </td>
                <td className="px-4 py-3 align-top">
                  <Badge tone={leadStatusTone(status)}>{leadStatusLabel(status)}</Badge>
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-top text-sm text-muted-foreground">
                  {posted ? (
                    <div className="leading-snug">
                      <div>{posted.date}</div>
                      <div className="text-xs text-muted-foreground/80">{posted.time}</div>
                    </div>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-4 py-3 align-top text-end">
                  <Link
                    href={`/leads/${row.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    View
                    <ChevronRight size={16} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}
    </>
  );
}
