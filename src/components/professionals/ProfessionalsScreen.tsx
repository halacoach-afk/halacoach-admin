'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState, type ReactNode} from 'react';
import {ChevronRight, Download} from 'lucide-react';
import {
  exportProfessionalsCsv,
  isApiError,
  listProfessionals,
  listServices,
  type CatalogService,
  type ListProfessionalsParams,
  type ProfessionalSortBy,
  type ProfessionalSummary,
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
import {SearchField} from '@/components/ui/SearchField';
import {
  DEFAULT_PER_PAGE,
  emptyPaginationMeta,
  type PaginationMeta,
} from '@/lib/pagination';
import {completionPercent, verificationLabels} from '@/lib/professional-utils';

type AccountFilter = 'all' | 'onboarded' | 'incomplete' | 'suspended' | 'deleted';

type ColumnFilters = {
  id: string;
  name: string;
  email: string;
  phone: string;
  serviceIds: string[];
  location: string;
  createdFrom: string;
  createdTo: string;
  verificationStatuses: string[];
  accountStatuses: string[];
  creditsMin: string;
  creditsMax: string;
  profileMin: string;
  profileMax: string;
};

type FilterColumnKey =
  | 'id'
  | 'name'
  | 'email'
  | 'phone'
  | 'serviceIds'
  | 'location'
  | 'joined'
  | 'verificationStatuses'
  | 'accountStatuses'
  | 'credits'
  | 'profile';

const COLUMN_SORT_BY: Record<FilterColumnKey, ProfessionalSortBy> = {
  id: 'id',
  name: 'name',
  email: 'email',
  phone: 'phone',
  serviceIds: 'services',
  location: 'location',
  joined: 'joined',
  verificationStatuses: 'verification',
  accountStatuses: 'status',
  credits: 'credits',
  profile: 'profile',
};

const DEFAULT_SORT_BY: ProfessionalSortBy = 'joined';
const DEFAULT_SORT_DIR: 'asc' | 'desc' = 'desc';

const EMPTY_COLUMN_FILTERS: ColumnFilters = {
  id: '',
  name: '',
  email: '',
  phone: '',
  serviceIds: [],
  location: '',
  createdFrom: '',
  createdTo: '',
  verificationStatuses: [],
  accountStatuses: [],
  creditsMin: '',
  creditsMax: '',
  profileMin: '',
  profileMax: '',
};

function contactCell(value: string, verified: boolean) {
  const display = value.trim();
  if (!display) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return (
    <div>
      <div className="text-sm text-foreground">{display}</div>
      {!verified ? (
        <div className="text-xs text-muted-foreground">(unverified)</div>
      ) : null}
    </div>
  );
}

function verificationTone(status: ProfessionalSummary['verificationStatus']) {
  if (status === 'verified') return 'primary' as const;
  if (status === 'pending') return 'warning' as const;
  if (status === 'rejected') return 'danger' as const;
  return 'muted' as const;
}

type AccountStatus = 'deleted' | 'suspended' | 'incomplete' | 'onboarded';

function accountStatus(row: ProfessionalSummary): AccountStatus {
  if (row.deletedAt) return 'deleted';
  if (row.suspended) return 'suspended';
  if (!row.onboarded) return 'incomplete';
  return 'onboarded';
}

const accountStatusLabels: Record<AccountStatus, string> = {
  deleted: 'Deleted',
  suspended: 'Suspended',
  incomplete: 'Incomplete',
  onboarded: 'Onboarded',
};

function accountStatusTone(status: AccountStatus) {
  if (status === 'deleted' || status === 'suspended') return 'danger' as const;
  if (status === 'incomplete') return 'warning' as const;
  return 'primary' as const;
}

function servicesLabel(row: ProfessionalSummary) {
  const listed = (row.services ?? []).map(s => s.trim()).filter(Boolean);
  if (listed.length) return listed.join(', ');
  const specialty = row.specialty?.trim();
  if (specialty && specialty.toLowerCase() !== 'coaching') return specialty;
  return null;
}

function formatJoined(iso: string | null | undefined) {
  if (!iso) return null;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return null;
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'}),
  };
}

const COLUMN_CHIP_LABELS: Record<FilterColumnKey, string> = {
  id: 'ID',
  name: 'Name',
  email: 'Email',
  phone: 'Number',
  serviceIds: 'Services',
  location: 'Location',
  joined: 'Joined',
  verificationStatuses: 'Verification',
  accountStatuses: 'Status',
  credits: 'Credits',
  profile: 'Profile',
};

const VERIFICATION_CHIP_LABELS: Record<string, string> = {
  none: 'Not submitted',
  pending: 'In review',
  verified: 'Verified',
  rejected: 'Rejected',
};

function clearedColumnSlice(key: FilterColumnKey): Partial<ColumnFilters> {
  if (key === 'joined') return {createdFrom: '', createdTo: ''};
  if (key === 'credits') return {creditsMin: '', creditsMax: ''};
  if (key === 'profile') return {profileMin: '', profileMax: ''};
  if (key === 'serviceIds') return {serviceIds: []};
  if (key === 'verificationStatuses') return {verificationStatuses: []};
  if (key === 'accountStatuses') return {accountStatuses: []};
  return {[key]: ''};
}

function activeFilterChips(
  filters: ColumnFilters,
  serviceOptions: Array<{value: string; label: string}>,
): Array<{key: FilterColumnKey; text: string}> {
  const chips: Array<{key: FilterColumnKey; text: string}> = [];
  const serviceName = (id: string) =>
    serviceOptions.find(s => s.value === id)?.label ?? id;

  if (filters.id.trim()) {
    chips.push({key: 'id', text: `${COLUMN_CHIP_LABELS.id}: ${filters.id.trim()}`});
  }
  if (filters.name.trim()) {
    chips.push({key: 'name', text: `${COLUMN_CHIP_LABELS.name}: ${filters.name.trim()}`});
  }
  if (filters.email.trim()) {
    chips.push({key: 'email', text: `${COLUMN_CHIP_LABELS.email}: ${filters.email.trim()}`});
  }
  if (filters.phone.trim()) {
    chips.push({key: 'phone', text: `${COLUMN_CHIP_LABELS.phone}: ${filters.phone.trim()}`});
  }
  if (filters.serviceIds.length) {
    chips.push({
      key: 'serviceIds',
      text: `${COLUMN_CHIP_LABELS.serviceIds}: ${filters.serviceIds.map(serviceName).join(', ')}`,
    });
  }
  if (filters.location.trim()) {
    chips.push({
      key: 'location',
      text: `${COLUMN_CHIP_LABELS.location}: ${filters.location.trim()}`,
    });
  }
  if (filters.createdFrom.trim() || filters.createdTo.trim()) {
    const from = filters.createdFrom.trim() || '…';
    const to = filters.createdTo.trim() || '…';
    chips.push({key: 'joined', text: `${COLUMN_CHIP_LABELS.joined}: ${from} → ${to}`});
  }
  if (filters.verificationStatuses.length) {
    chips.push({
      key: 'verificationStatuses',
      text: `${COLUMN_CHIP_LABELS.verificationStatuses}: ${filters.verificationStatuses
        .map(s => VERIFICATION_CHIP_LABELS[s] ?? s)
        .join(', ')}`,
    });
  }
  if (filters.accountStatuses.length) {
    chips.push({
      key: 'accountStatuses',
      text: `${COLUMN_CHIP_LABELS.accountStatuses}: ${filters.accountStatuses
        .map(s => accountStatusLabels[s as AccountStatus] ?? s)
        .join(', ')}`,
    });
  }
  if (filters.creditsMin.trim() || filters.creditsMax.trim()) {
    const min = filters.creditsMin.trim() || '…';
    const max = filters.creditsMax.trim() || '…';
    chips.push({key: 'credits', text: `${COLUMN_CHIP_LABELS.credits}: ${min}–${max}`});
  }
  if (filters.profileMin.trim() || filters.profileMax.trim()) {
    const min = filters.profileMin.trim() || '…';
    const max = filters.profileMax.trim() || '…';
    chips.push({key: 'profile', text: `${COLUMN_CHIP_LABELS.profile}: ${min}–${max}%`});
  }
  return chips;
}

function isColumnActive(filters: ColumnFilters, key: FilterColumnKey): boolean {
  switch (key) {
    case 'joined':
      return Boolean(filters.createdFrom.trim() || filters.createdTo.trim());
    case 'credits':
      return Boolean(filters.creditsMin.trim() || filters.creditsMax.trim());
    case 'profile':
      return Boolean(filters.profileMin.trim() || filters.profileMax.trim());
    case 'serviceIds':
      return filters.serviceIds.length > 0;
    case 'verificationStatuses':
      return filters.verificationStatuses.length > 0;
    case 'accountStatuses':
      return filters.accountStatuses.length > 0;
    default:
      return Boolean(filters[key].trim());
  }
}

export function ProfessionalsScreen() {
  const [rows, setRows] = useState<ProfessionalSummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyPaginationMeta());
  const [counts, setCounts] = useState<Record<string, number>>({
    all: 0,
    onboarded: 0,
    incomplete: 0,
    suspended: 0,
    deleted: 0,
  });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  /** Committed filters sent to the API (multiple columns AND together). */
  const [appliedFilters, setAppliedFilters] =
    useState<ColumnFilters>(EMPTY_COLUMN_FILTERS);
  /** Draft edited inside the open column menu until Apply. */
  const [draftFilters, setDraftFilters] = useState<ColumnFilters>(EMPTY_COLUMN_FILTERS);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [openFilter, setOpenFilter] = useState<FilterColumnKey | null>(null);
  const [sortBy, setSortBy] = useState<ProfessionalSortBy>(DEFAULT_SORT_BY);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(DEFAULT_SORT_DIR);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(query.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    void listServices()
      .then(list => {
        if (!cancelled) {
          setServices(list.filter(s => s.active).sort((a, b) => a.name.localeCompare(b.name)));
        }
      })
      .catch(() => {
        if (!cancelled) setServices([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const patchDraft = <K extends keyof ColumnFilters>(key: K, value: ColumnFilters[K]) => {
    setDraftFilters(prev => ({...prev, [key]: value}));
  };

  const openColumnMenu = (key: FilterColumnKey) => {
    setDraftFilters(appliedFilters);
    setOpenFilter(key);
  };

  const closeColumnMenu = () => {
    setOpenFilter(null);
  };

  const applyColumnDraft = () => {
    setAppliedFilters(draftFilters);
    setPage(1);
  };

  const clearColumnFilters = () => {
    setAppliedFilters(EMPTY_COLUMN_FILTERS);
    setDraftFilters(EMPTY_COLUMN_FILTERS);
    setOpenFilter(null);
  };

  const applySort = (key: FilterColumnKey, dir: 'asc' | 'desc') => {
    const nextBy = COLUMN_SORT_BY[key];
    // Clicking the same sort again clears it (back to default newest-first).
    if (sortBy === nextBy && sortDir === dir) {
      setSortBy(DEFAULT_SORT_BY);
      setSortDir(DEFAULT_SORT_DIR);
    } else {
      setSortBy(nextBy);
      setSortDir(dir);
    }
    setPage(1);
  };

  /** Multi-select toggles commit immediately so selecting again unselects. */
  const commitMultiSelect = (
    key: 'serviceIds' | 'verificationStatuses' | 'accountStatuses',
    values: string[],
  ) => {
    setDraftFilters(prev => ({...prev, [key]: values}));
    setAppliedFilters(prev => ({...prev, [key]: values}));
    setPage(1);
  };

  const setAccountFilterBar = (next: AccountFilter) => {
    const values = next === 'all' ? [] : [next];
    setDraftFilters(prev => ({...prev, accountStatuses: values}));
    setAppliedFilters(prev => ({...prev, accountStatuses: values}));
    setPage(1);
  };

  const clearOneColumn = (key: FilterColumnKey) => {
    const slice = clearedColumnSlice(key);
    setAppliedFilters(prev => ({...prev, ...slice}));
    setDraftFilters(prev => ({...prev, ...slice}));
    setPage(1);
  };

  const listFilterParams = (): Omit<ListProfessionalsParams, 'page' | 'perPage'> => ({
    q: debouncedQ || undefined,
    id: appliedFilters.id.trim() || undefined,
    name: appliedFilters.name.trim() || undefined,
    email: appliedFilters.email.trim() || undefined,
    phone: appliedFilters.phone.trim() || undefined,
    serviceIds: appliedFilters.serviceIds.length
      ? appliedFilters.serviceIds
      : undefined,
    location: appliedFilters.location.trim() || undefined,
    createdFrom: appliedFilters.createdFrom.trim() || undefined,
    createdTo: appliedFilters.createdTo.trim() || undefined,
    verificationStatuses: appliedFilters.verificationStatuses.length
      ? appliedFilters.verificationStatuses
      : undefined,
    accountStatuses: appliedFilters.accountStatuses.length
      ? appliedFilters.accountStatuses
      : undefined,
    creditsMin: appliedFilters.creditsMin.trim() || undefined,
    creditsMax: appliedFilters.creditsMax.trim() || undefined,
    profileMin: appliedFilters.profileMin.trim() || undefined,
    profileMax: appliedFilters.profileMax.trim() || undefined,
    sortBy,
    sortDir,
  });

  const load = async (nextPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listProfessionals({
        page: nextPage,
        perPage,
        ...listFilterParams(),
      });
      setRows(res.data);
      setMeta(res.meta);
      setPage(res.meta.page);
      if (res.counts) {
        setCounts(res.counts);
      }
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load professionals.');
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    setError(null);
    try {
      const blob = await exportProfessionalsCsv(listFilterParams());
      const stamp = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `professionals-export-${stamp}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not export professionals.');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, perPage, appliedFilters, sortBy, sortDir]);

  const serviceOptions = useMemo(
    () => services.map(s => ({value: String(s.id), label: s.name})),
    [services],
  );

  const verificationOptions = [
    {value: 'none', label: 'Not submitted'},
    {value: 'pending', label: 'In review'},
    {value: 'verified', label: 'Verified'},
    {value: 'rejected', label: 'Rejected'},
  ];

  const accountStatusOptions = [
    {value: 'onboarded', label: 'Onboarded'},
    {value: 'incomplete', label: 'Incomplete'},
    {value: 'suspended', label: 'Suspended'},
    {value: 'deleted', label: 'Deleted'},
  ];

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
          else closeColumnMenu();
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
        value={draftFilters.id}
        onChange={v => patchDraft('id', v)}
        placeholder="Equals…"
        autoFocus
      />,
    ),
    header(
      'name',
      'Name',
      <ExcelFilterTextField
        value={draftFilters.name}
        onChange={v => patchDraft('name', v)}
        placeholder="Contains…"
        autoFocus
      />,
    ),
    header(
      'email',
      'Email',
      <ExcelFilterTextField
        value={draftFilters.email}
        onChange={v => patchDraft('email', v)}
        placeholder="Contains…"
        autoFocus
      />,
    ),
    header(
      'phone',
      'Number',
      <ExcelFilterTextField
        value={draftFilters.phone}
        onChange={v => patchDraft('phone', v)}
        placeholder="Contains…"
        autoFocus
      />,
    ),
    header(
      'serviceIds',
      'Services',
      <ExcelFilterMultiSelect
        values={draftFilters.serviceIds}
        onChange={v => commitMultiSelect('serviceIds', v)}
        options={serviceOptions}
        searchPlaceholder="Search services…"
      />,
    ),
    header(
      'location',
      'Location',
      <ExcelFilterTextField
        value={draftFilters.location}
        onChange={v => patchDraft('location', v)}
        placeholder="Contains…"
        autoFocus
      />,
    ),
    header(
      'joined',
      'Joined',
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
    header(
      'verificationStatuses',
      'Verification',
      <ExcelFilterMultiSelect
        values={draftFilters.verificationStatuses}
        onChange={v => commitMultiSelect('verificationStatuses', v)}
        options={verificationOptions}
      />,
    ),
    header(
      'accountStatuses',
      'Status',
      <ExcelFilterMultiSelect
        values={draftFilters.accountStatuses}
        onChange={v => commitMultiSelect('accountStatuses', v)}
        options={accountStatusOptions}
      />,
    ),
    header(
      'credits',
      'Credits',
      <>
        <ExcelFilterTextField
          type="number"
          label="Min"
          value={draftFilters.creditsMin}
          onChange={v => patchDraft('creditsMin', v)}
          placeholder="0"
        />
        <ExcelFilterTextField
          type="number"
          label="Max"
          value={draftFilters.creditsMax}
          onChange={v => patchDraft('creditsMax', v)}
          placeholder="∞"
        />
      </>,
    ),
    header(
      'profile',
      'Profile',
      <>
        <ExcelFilterTextField
          type="number"
          label="Min %"
          value={draftFilters.profileMin}
          onChange={v => patchDraft('profileMin', v)}
          placeholder="0"
        />
        <ExcelFilterTextField
          type="number"
          label="Max %"
          value={draftFilters.profileMax}
          onChange={v => patchDraft('profileMax', v)}
          placeholder="100"
        />
      </>,
    ),
    '',
  ];

  if (!hasLoaded && loading) {
    return <LoadingState label="Loading professionals..." />;
  }

  if (!hasLoaded && error) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  const filterChips = activeFilterChips(appliedFilters, serviceOptions);

  return (
    <>
      <PageHeader
        title="Professionals"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={exporting || loading}
              onClick={() => void exportCsv()}>
              <Download className="size-3.5" strokeWidth={1.8} />
              {exporting ? 'Exporting…' : 'Export CSV'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              Refresh
            </Button>
          </>
        }
      />

      {error ? <ErrorState body={error} onRetry={() => void load()} /> : null}

      <FilterBar>
        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <span className="whitespace-nowrap font-medium">Status</span>
          <select
            aria-label="Filter by account status"
            className="h-9 min-w-[11rem] rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground outline-none focus:border-primary"
            value={
              appliedFilters.accountStatuses.length === 1
                ? appliedFilters.accountStatuses[0]
                : appliedFilters.accountStatuses.length > 1
                  ? '__multiple__'
                  : ''
            }
            onChange={e => {
              const value = e.target.value;
              if (value === '' || value === '__multiple__') {
                setAccountFilterBar('all');
                return;
              }
              setAccountFilterBar(value as AccountFilter);
            }}>
            <option value="">All ({counts.all ?? 0})</option>
            {appliedFilters.accountStatuses.length > 1 ? (
              <option value="__multiple__">
                Multiple ({appliedFilters.accountStatuses.length})
              </option>
            ) : null}
            <option value="onboarded">Onboarded ({counts.onboarded ?? 0})</option>
            <option value="incomplete">Incomplete ({counts.incomplete ?? 0})</option>
            <option value="suspended">Suspended ({counts.suspended ?? 0})</option>
            <option value="deleted">Deleted ({counts.deleted ?? 0})</option>
          </select>
        </label>
        <SearchField value={query} onChange={setQuery} />
      </FilterBar>

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

      <DataTable
        columns={columns}
        pagination={
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
        }>
        {loading && rows.length === 0 ? (
          <tr>
            <td colSpan={12} className="px-4 py-8 text-center text-sm text-muted-foreground">
              Searching…
            </td>
          </tr>
        ) : rows.length === 0 ? (
          <tr>
            <td colSpan={12} className="px-4 py-6">
              <EmptyState
                title="No professionals match"
                body="Try another filter or clear the column filters."
              />
            </td>
          </tr>
        ) : (
          rows.map(row => {
            const pct = completionPercent(row.profileCompletion);
            const servicesText = servicesLabel(row);
            const joined = formatJoined(row.createdAt);
            const location = row.location?.trim();
            const status = accountStatus(row);
            return (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium tabular-nums text-foreground">
                  {row.id}
                </td>
                <td className="px-4 py-3 font-medium text-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{row.name}</span>
                    {row.isFoundingProfessional ? (
                      <Badge tone="coral">Founding</Badge>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {contactCell(row.email, Boolean(row.emailVerified))}
                </td>
                <td className="px-4 py-3">
                  {contactCell(row.phone, Boolean(row.phoneVerified))}
                </td>
                <td className="px-4 py-3">
                  {servicesText ? (
                    <span className="text-sm text-foreground">{servicesText}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {location ? (
                    <span className="text-sm text-foreground">{location}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {joined ? (
                    <div>
                      <div className="text-sm text-foreground">{joined.date}</div>
                      <div className="text-xs text-muted-foreground">{joined.time}</div>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={verificationTone(row.verificationStatus)}>
                    {verificationLabels[row.verificationStatus]}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={accountStatusTone(status)}>
                    {accountStatusLabels[status]}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-medium tabular-nums text-foreground">
                  {row.credits}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{width: `${pct}%`}}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{pct}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-end">
                  <Link
                    href={`/professionals/${row.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    View
                    <ChevronRight size={16} />
                  </Link>
                </td>
              </tr>
            );
          })
        )}
      </DataTable>
    </>
  );
}
