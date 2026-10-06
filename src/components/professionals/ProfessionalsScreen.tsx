'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {isApiError, listProfessionals, type ProfessionalSummary} from '@/api';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {DataTable, FilterBar} from '@/components/ui/DataTable';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
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

type Filter = 'all' | 'onboarded' | 'incomplete' | 'suspended';

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

export function ProfessionalsScreen() {
  const [rows, setRows] = useState<ProfessionalSummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyPaginationMeta());
  const [counts, setCounts] = useState<Record<string, number>>({
    all: 0,
    onboarded: 0,
    incomplete: 0,
    suspended: 0,
  });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(query.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [query]);

  const load = async (nextPage = page, nextFilter = filter) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listProfessionals({
        page: nextPage,
        perPage,
        q: debouncedQ || undefined,
        filter: nextFilter === 'all' ? undefined : nextFilter,
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

  useEffect(() => {
    void load(1, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, filter, perPage]);

  if (!hasLoaded && loading) {
    return <LoadingState label="Loading professionals..." />;
  }

  if (!hasLoaded && error) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  return (
    <>
      <PageHeader
        title="Professionals"
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {error ? <ErrorState body={error} onRetry={() => void load()} /> : null}

      <FilterBar>
        {(
          [
            ['all', 'All'],
            ['onboarded', 'Onboarded'],
            ['incomplete', 'Incomplete'],
            ['suspended', 'Suspended'],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            variant={filter === key ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter(key)}>
            {label} ({counts[key] ?? 0})
          </Button>
        ))}
        <SearchField value={query} onChange={setQuery} />
      </FilterBar>

      {loading && rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Searching…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No professionals match"
          body="Try another filter or clear the search box."
        />
      ) : (
        <DataTable
          columns={[
            'ID',
            'Name',
            'Email',
            'Number',
            'Verification',
            'Credits',
            'Profile',
            '',
          ]}
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
          {rows.map(row => {
            const pct = completionPercent(row.profileCompletion);
            return (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium tabular-nums text-foreground">
                  {row.id}
                </td>
                <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                <td className="px-4 py-3">
                  {contactCell(row.email, Boolean(row.emailVerified))}
                </td>
                <td className="px-4 py-3">
                  {contactCell(row.phone, Boolean(row.phoneVerified))}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={verificationTone(row.verificationStatus)}>
                    {verificationLabels[row.verificationStatus]}
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
          })}
        </DataTable>
      )}
    </>
  );
}
