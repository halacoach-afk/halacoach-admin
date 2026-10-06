'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {isApiError, type SessionUser} from '@/api';
import type {CreditSubscriptionAdmin} from '@/api/types';
import {listCreditSubscriptions} from '@/lib/apis';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {DataTable, FilterBar} from '@/components/ui/DataTable';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {PaginationBar} from '@/components/ui/PaginationBar';
import {SearchField} from '@/components/ui/SearchField';
import {formatAed} from '@/lib/credit-utils';
import {
  DEFAULT_PER_PAGE,
  emptyPaginationMeta,
  type PaginationMeta,
} from '@/lib/pagination';

type Filter = 'all' | 'active' | 'canceled' | 'expired' | 'past_due';

function statusTone(status: string): 'sky' | 'warning' | 'muted' | 'danger' | 'primary' {
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

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

export function SubscriptionsScreen({
  actor: _actor,
  embedded = false,
  refreshKey = 0,
}: {
  actor: SessionUser;
  embedded?: boolean;
  refreshKey?: number;
}) {
  const [rows, setRows] = useState<CreditSubscriptionAdmin[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyPaginationMeta());
  const [counts, setCounts] = useState<Record<string, number>>({
    all: 0,
    active: 0,
    canceled: 0,
    expired: 0,
    past_due: 0,
  });
  const [page, setPage] = useState(1);
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
      const res = await listCreditSubscriptions({
        page: nextPage,
        perPage: DEFAULT_PER_PAGE,
        status: nextFilter === 'all' ? undefined : nextFilter,
        q: debouncedQ || undefined,
      });
      setRows(res.data);
      setMeta(res.meta);
      setPage(res.meta.page);
      if (res.counts) {
        setCounts(res.counts);
      }
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load subscriptions.');
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  };

  useEffect(() => {
    void load(1, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, debouncedQ]);

  useEffect(() => {
    if (refreshKey === 0) {
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  if (!hasLoaded && loading) {
    return <LoadingState label="Loading subscriptions..." />;
  }

  if (!hasLoaded && error) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  return (
    <>
      {embedded ? (
        <h2 className="mb-4 text-lg font-semibold text-foreground">Subscriptions</h2>
      ) : (
        <PageHeader
          title="Subscriptions"
          description="Membership plans, period usage, wallet balance, and renewal status for coaches."
          actions={
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              Refresh
            </Button>
          }
        />
      )}

      {error ? <ErrorState body={error} onRetry={() => void load()} /> : null}

      <FilterBar>
        {(
          [
            ['all', 'All'],
            ['active', 'Active'],
            ['past_due', 'Past due'],
            ['canceled', 'Canceled'],
            ['expired', 'Expired'],
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
          title="No subscriptions"
          body={
            query || filter !== 'all'
              ? 'No subscriptions match this filter.'
              : 'No membership subscriptions yet.'
          }
        />
      ) : (
        <DataTable
          columns={[
            'Coach',
            'Plan',
            'Status',
            'Wallet',
            'Period remaining',
            'Period end',
            '',
          ]}
        >
          {rows.map(sub => (
            <tr key={sub.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">{sub.professionalName}</p>
                <p className="text-xs text-muted-foreground">
                  {sub.professionalEmail ?? sub.professionalId}
                </p>
              </td>
              <td className="px-4 py-3">
                <p className="text-sm text-foreground">{sub.package?.name ?? '-'}</p>
                <p className="text-xs text-muted-foreground">
                  {sub.package
                    ? `${sub.package.credits}/period - ${formatAed(sub.package.price)}`
                    : ''}
                </p>
              </td>
              <td className="px-4 py-3">
                <Badge tone={statusTone(sub.status)}>{sub.status}</Badge>
                {sub.cancelAtPeriodEnd ? (
                  <p className="mt-1 text-xs text-muted-foreground">Cancels at period end</p>
                ) : null}
              </td>
              <td className="px-4 py-3 text-sm text-foreground">{sub.walletBalance}</td>
              <td className="px-4 py-3">
                <p className="text-sm text-foreground">{sub.periodRemainingCredits}</p>
                <p className="text-xs text-muted-foreground">
                  {sub.periodGrantedCredits} granted - {sub.periodSpentCredits} spent
                </p>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {formatDate(sub.currentPeriodEnd)}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/subscriptions/${sub.id}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  Open
                  <ChevronRight size={14} />
                </Link>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      <PaginationBar
        meta={meta}
        disabled={loading}
        onPageChange={next => void load(next)}
      />
    </>
  );
}
