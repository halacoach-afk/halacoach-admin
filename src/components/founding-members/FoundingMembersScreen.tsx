'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState, type ReactNode} from 'react';
import {isApiError, type SessionUser} from '@/api';
import type {FoundingMember} from '@/api/types';
import {listFoundingMembers} from '@/lib/apis';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {DataTable} from '@/components/ui/DataTable';
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
import {DEFAULT_PER_PAGE, type PaginationMeta} from '@/lib/pagination';

type FilterColumnKey =
  | 'coach'
  | 'bundles'
  | 'membership'
  | 'benefits'
  | 'freeUnlocks'
  | 'discountedUnlocks';

/** `joinedAt` is default latest-first order (no visible Joined column). */
type SortBy = FilterColumnKey | 'joinedAt';

type ColumnFilters = {
  coach: string;
  bundles: string[];
  membershipStatuses: string[];
  benefitTypes: string[];
  freeConsumedMin: string;
  freeConsumedMax: string;
  discountedMin: string;
  discountedMax: string;
};

const EMPTY_COLUMN_FILTERS: ColumnFilters = {
  coach: '',
  bundles: [],
  membershipStatuses: [],
  benefitTypes: [],
  freeConsumedMin: '',
  freeConsumedMax: '',
  discountedMin: '',
  discountedMax: '',
};

const COLUMN_CHIP_LABELS: Record<FilterColumnKey, string> = {
  coach: 'Coach',
  bundles: 'Bundle',
  membership: 'Membership',
  benefits: 'Benefits',
  freeUnlocks: 'Free unlocks',
  discountedUnlocks: 'Discounted unlocks',
};

const MEMBERSHIP_OPTIONS = [
  {value: 'active', label: 'Active'},
  {value: 'past_due', label: 'Past due'},
  {value: 'canceled', label: 'Canceled'},
  {value: 'expired', label: 'Expired'},
  {value: 'none', label: 'Trial only'},
];

const BENEFIT_OPTIONS = [
  {value: 'founding_badge', label: 'Founding badge'},
  {value: 'free_unlocks', label: 'Free unlocks'},
  {value: 'unlock_credit_discount', label: 'Unlock discount'},
];

const DEFAULT_SORT_BY: SortBy = 'joinedAt';
const DEFAULT_SORT_DIR: 'asc' | 'desc' = 'desc';

function statusTone(
  status: FoundingMember['membershipStatus'],
): 'sky' | 'warning' | 'muted' | 'danger' | 'primary' {
  switch (status) {
    case 'active':
      return 'sky';
    case 'past_due':
      return 'warning';
    case 'canceled':
      return 'muted';
    case 'expired':
      return 'danger';
    default:
      return 'muted';
  }
}

function statusLabel(status: FoundingMember['membershipStatus']) {
  if (status === 'none') return 'Trial only';
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function bundlesLabel(bundles: string[] | undefined) {
  if (!bundles?.length) return '—';
  return bundles.join(', ');
}

function benefitShort(b: FoundingMember['benefits'][number]) {
  if (b.type === 'founding_badge') return 'Founding badge';
  if (b.type === 'free_unlocks') {
    return `Free unlocks ×${b.value ?? 0}`;
  }
  if (b.type === 'unlock_credit_discount') {
    return `${b.value ?? 0}% unlock discount`;
  }
  return b.title || b.type;
}

function parseBound(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function isColumnActive(filters: ColumnFilters, key: FilterColumnKey): boolean {
  switch (key) {
    case 'coach':
      return filters.coach.trim().length > 0;
    case 'bundles':
      return filters.bundles.length > 0;
    case 'membership':
      return filters.membershipStatuses.length > 0;
    case 'benefits':
      return filters.benefitTypes.length > 0;
    case 'freeUnlocks':
      return Boolean(filters.freeConsumedMin.trim() || filters.freeConsumedMax.trim());
    case 'discountedUnlocks':
      return Boolean(filters.discountedMin.trim() || filters.discountedMax.trim());
    default:
      return false;
  }
}

function clearedColumnSlice(key: FilterColumnKey): Partial<ColumnFilters> {
  switch (key) {
    case 'coach':
      return {coach: ''};
    case 'bundles':
      return {bundles: []};
    case 'membership':
      return {membershipStatuses: []};
    case 'benefits':
      return {benefitTypes: []};
    case 'freeUnlocks':
      return {freeConsumedMin: '', freeConsumedMax: ''};
    case 'discountedUnlocks':
      return {discountedMin: '', discountedMax: ''};
    default:
      return {};
  }
}

function activeFilterChips(filters: ColumnFilters): Array<{key: FilterColumnKey; text: string}> {
  const chips: Array<{key: FilterColumnKey; text: string}> = [];
  if (filters.coach.trim()) {
    chips.push({key: 'coach', text: `Coach: ${filters.coach.trim()}`});
  }
  if (filters.bundles.length) {
    chips.push({key: 'bundles', text: `Bundle: ${filters.bundles.join(', ')}`});
  }
  if (filters.membershipStatuses.length) {
    const labels = filters.membershipStatuses.map(
      v => MEMBERSHIP_OPTIONS.find(o => o.value === v)?.label ?? v,
    );
    chips.push({key: 'membership', text: `Membership: ${labels.join(', ')}`});
  }
  if (filters.benefitTypes.length) {
    const labels = filters.benefitTypes.map(
      v => BENEFIT_OPTIONS.find(o => o.value === v)?.label ?? v,
    );
    chips.push({key: 'benefits', text: `Benefits: ${labels.join(', ')}`});
  }
  if (filters.freeConsumedMin.trim() || filters.freeConsumedMax.trim()) {
    chips.push({
      key: 'freeUnlocks',
      text: `Free used: ${filters.freeConsumedMin.trim() || '0'}–${filters.freeConsumedMax.trim() || '∞'}`,
    });
  }
  if (filters.discountedMin.trim() || filters.discountedMax.trim()) {
    chips.push({
      key: 'discountedUnlocks',
      text: `Discounted: ${filters.discountedMin.trim() || '0'}–${filters.discountedMax.trim() || '∞'}`,
    });
  }
  return chips;
}

function rowMatchesFilters(row: FoundingMember, filters: ColumnFilters): boolean {
  const coachQ = filters.coach.trim().toLowerCase();
  if (coachQ) {
    const hay = [row.name, row.email, row.phone, row.professionalId]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!hay.includes(coachQ)) return false;
  }

  if (filters.bundles.length) {
    const rowBundles = row.bundles ?? [];
    const ok = filters.bundles.some(b => rowBundles.includes(b));
    if (!ok) return false;
  }

  if (filters.membershipStatuses.length) {
    if (!filters.membershipStatuses.includes(row.membershipStatus)) return false;
  }

  if (filters.benefitTypes.length) {
    const types = new Set(row.benefits.map(b => b.type));
    const ok = filters.benefitTypes.some(t => types.has(t));
    if (!ok) return false;
  }

  const freeMin = parseBound(filters.freeConsumedMin);
  const freeMax = parseBound(filters.freeConsumedMax);
  if (freeMin != null && row.freeUnlocksConsumed < freeMin) return false;
  if (freeMax != null && row.freeUnlocksConsumed > freeMax) return false;

  const discMin = parseBound(filters.discountedMin);
  const discMax = parseBound(filters.discountedMax);
  if (discMin != null && row.discountedUnlocksConsumed < discMin) return false;
  if (discMax != null && row.discountedUnlocksConsumed > discMax) return false;

  return true;
}

function compareRows(
  a: FoundingMember,
  b: FoundingMember,
  sortBy: SortBy,
  sortDir: 'asc' | 'desc',
): number {
  const dir = sortDir === 'asc' ? 1 : -1;
  let cmp = 0;
  switch (sortBy) {
    case 'coach':
      cmp = (a.name || '').localeCompare(b.name || '', undefined, {sensitivity: 'base'});
      break;
    case 'joinedAt':
      cmp = new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
      break;
    case 'bundles':
      cmp = bundlesLabel(a.bundles).localeCompare(bundlesLabel(b.bundles));
      break;
    case 'membership':
      cmp = a.membershipStatus.localeCompare(b.membershipStatus);
      break;
    case 'benefits':
      cmp = a.benefits.length - b.benefits.length;
      break;
    case 'freeUnlocks':
      cmp = a.freeUnlocksConsumed - b.freeUnlocksConsumed;
      break;
    case 'discountedUnlocks':
      cmp = a.discountedUnlocksConsumed - b.discountedUnlocksConsumed;
      break;
    default:
      cmp = 0;
  }
  if (cmp !== 0) return cmp * dir;
  return (new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()) || a.userId - b.userId;
}

export function FoundingMembersScreen({actor: _actor}: {actor: SessionUser}) {
  const [rows, setRows] = useState<FoundingMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [appliedFilters, setAppliedFilters] =
    useState<ColumnFilters>(EMPTY_COLUMN_FILTERS);
  const [draftFilters, setDraftFilters] = useState<ColumnFilters>(EMPTY_COLUMN_FILTERS);
  const [openFilter, setOpenFilter] = useState<FilterColumnKey | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>(DEFAULT_SORT_BY);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(DEFAULT_SORT_DIR);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listFoundingMembers();
      setRows(res.data);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load founding members.');
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const matched = rows.filter(row => rowMatchesFilters(row, appliedFilters));
    return [...matched].sort((a, b) => compareRows(a, b, sortBy, sortDir));
  }, [rows, appliedFilters, sortBy, sortDir]);

  const meta: PaginationMeta = useMemo(() => {
    const total = filtered.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage) || 1);
    const safePage = Math.min(page, lastPage);
    return {page: safePage, perPage, total, lastPage};
  }, [filtered.length, page, perPage]);

  const pageRows = useMemo(() => {
    const start = (meta.page - 1) * meta.perPage;
    return filtered.slice(start, start + meta.perPage);
  }, [filtered, meta.page, meta.perPage]);

  useEffect(() => {
    if (page !== meta.page) setPage(meta.page);
  }, [page, meta.page]);

  const filterChips = useMemo(() => activeFilterChips(appliedFilters), [appliedFilters]);

  const bundleOptions = useMemo(() => {
    const names = new Set<string>();
    for (const row of rows) {
      for (const name of row.bundles ?? []) {
        if (name.trim()) names.add(name.trim());
      }
    }
    return [...names]
      .sort((a, b) => a.localeCompare(b))
      .map(name => ({value: name, label: name}));
  }, [rows]);

  const patchDraft = <K extends keyof ColumnFilters>(key: K, value: ColumnFilters[K]) => {
    setDraftFilters(prev => ({...prev, [key]: value}));
  };

  const openColumnMenu = (key: FilterColumnKey) => {
    setDraftFilters(appliedFilters);
    setOpenFilter(key);
  };

  const applyColumnDraft = () => {
    setAppliedFilters(draftFilters);
    setOpenFilter(null);
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
    key: 'bundles' | 'membershipStatuses' | 'benefitTypes',
    values: string[],
  ) => {
    setDraftFilters(prev => ({...prev, [key]: values}));
    setAppliedFilters(prev => ({...prev, [key]: values}));
    setPage(1);
  };

  const applySort = (key: FilterColumnKey, dir: 'asc' | 'desc') => {
    if (sortBy === key && sortDir === dir) {
      setSortBy(DEFAULT_SORT_BY);
      setSortDir(DEFAULT_SORT_DIR);
    } else {
      setSortBy(key);
      setSortDir(dir);
    }
    setPage(1);
  };

  const header = (key: FilterColumnKey, label: string, body: ReactNode) => (
    <ExcelColumnFilter
      label={label}
      active={isColumnActive(appliedFilters, key)}
      sortDirection={sortBy === key ? sortDir : null}
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

  const columns = [
    header(
      'coach',
      'Coach',
      <ExcelFilterTextField
        value={draftFilters.coach}
        onChange={v => patchDraft('coach', v)}
        placeholder="Contains…"
        autoFocus
      />,
    ),
    header(
      'bundles',
      'Bundle',
      <ExcelFilterMultiSelect
        values={draftFilters.bundles}
        onChange={v => commitMultiSelect('bundles', v)}
        options={bundleOptions}
      />,
    ),
    header(
      'membership',
      'Membership',
      <ExcelFilterMultiSelect
        values={draftFilters.membershipStatuses}
        onChange={v => commitMultiSelect('membershipStatuses', v)}
        options={MEMBERSHIP_OPTIONS}
      />,
    ),
    header(
      'benefits',
      'Benefits',
      <ExcelFilterMultiSelect
        values={draftFilters.benefitTypes}
        onChange={v => commitMultiSelect('benefitTypes', v)}
        options={BENEFIT_OPTIONS}
      />,
    ),
    header(
      'freeUnlocks',
      'Free unlocks',
      <>
        <ExcelFilterTextField
          type="number"
          label="Used min"
          value={draftFilters.freeConsumedMin}
          onChange={v => patchDraft('freeConsumedMin', v)}
          placeholder="0"
          autoFocus
        />
        <ExcelFilterTextField
          type="number"
          label="Used max"
          value={draftFilters.freeConsumedMax}
          onChange={v => patchDraft('freeConsumedMax', v)}
          placeholder="∞"
        />
      </>,
    ),
    header(
      'discountedUnlocks',
      'Discounted unlocks',
      <>
        <ExcelFilterTextField
          type="number"
          label="Min"
          value={draftFilters.discountedMin}
          onChange={v => patchDraft('discountedMin', v)}
          placeholder="0"
          autoFocus
        />
        <ExcelFilterTextField
          type="number"
          label="Max"
          value={draftFilters.discountedMax}
          onChange={v => patchDraft('discountedMax', v)}
          placeholder="∞"
        />
      </>,
    ),
  ];

  if (!hasLoaded && loading) {
    return <LoadingState label="Loading founding members..." />;
  }

  if (!hasLoaded && error) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  const hasActiveFilters = filterChips.length > 0;

  return (
    <>
      <PageHeader
        title="Founding Members"
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {error ? <ErrorState body={error} onRetry={() => void load()} /> : null}

      {filterChips.length > 0 ? (
        <div className="mb-4 flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Active filters:</span>
          {filterChips.map(chip => (
            <button
              key={chip.key}
              type="button"
              onClick={() => clearOneColumn(chip.key)}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground hover:border-primary hover:text-primary"
              title={`Remove ${COLUMN_CHIP_LABELS[chip.key]} filter`}>
              <span className="truncate">{chip.text}</span>
              <span aria-hidden className="text-muted-foreground">
                ×
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={clearColumnFilters}
            className="text-xs font-medium text-primary hover:underline">
            Clear all filters
          </button>
        </div>
      ) : null}

      {loading && rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No founding members"
          body={
            hasActiveFilters
              ? 'No founding members match these column filters.'
              : 'No founding memberships or trial packs yet.'
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
              onPageChange={setPage}
              onPerPageChange={next => {
                setPage(1);
                setPerPage(next);
              }}
            />
          }>
          {pageRows.map(row => {
            return (
              <tr key={row.userId} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">
                    <Link
                      href={`/professionals/${row.professionalId}`}
                      className="text-primary hover:underline">
                      {row.name}
                    </Link>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.email || row.professionalId}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {(row.bundles ?? []).length === 0 ? (
                    <span className="text-sm text-muted-foreground">—</span>
                  ) : (
                    <ul className="space-y-0.5 text-sm text-foreground">
                      {(row.bundles ?? []).map(name => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(row.membershipStatus)}>
                    {statusLabel(row.membershipStatus)}
                  </Badge>
                  {row.activeDiscountPercent > 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.activeDiscountPercent}% unlock discount active
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <ul className="space-y-0.5 text-xs text-muted-foreground">
                    {row.benefits.length === 0 ? (
                      <li>—</li>
                    ) : (
                      row.benefits.map(b => (
                        <li key={`${b.type}-${b.id}`}>{benefitShort(b)}</li>
                      ))
                    )}
                  </ul>
                </td>
                <td className="px-4 py-3 text-sm tabular-nums">
                  <div className="text-foreground">
                    {row.freeUnlocksConsumed} / {row.freeUnlocksGranted} used
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {row.freeUnlocksRemaining} remaining
                  </div>
                </td>
                <td className="px-4 py-3 text-sm tabular-nums text-foreground">
                  {row.discountedUnlocksConsumed}
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}
    </>
  );
}
