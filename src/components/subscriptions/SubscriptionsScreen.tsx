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

export function SubscriptionsScreen({actor: _actor}: {actor: SessionUser}) {
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

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(query.trim()), 300);
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
    }
  };

  useEffect(() => {
    void load(1, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, debouncedQ]);

  if (loading && rows.length === 0) {
    return <LoadingState label="Loading subscriptions..." />;
  }

  if (error && rows.length === 0) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  return (
    <>
      <PageHeader
        title="Subscriptions"
        description="Membership plans, period usage, wallet balance, and renewal status for coaches."
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      <FilterBar>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['all', `All (${counts.all ?? 0})`],
              ['active', `Active (${counts.active ?? 0})`],
              ['past_due', `Past due (${counts.past_due ?? 0})`],
              ['canceled', `Canceled (${counts.canceled ?? 0})`],
              ['expired', `Expired (${counts.expired ?? 0})`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={
                filter === value
                  ? 'rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground'
                  : 'rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground'
              }>
              {label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search coach, email, plan..."
          className="w-full max-w-xs rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </FilterBar>

      {rows.length === 0 ? (
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
          columnWidths={['22%', '16%', '12%', '10%', '14%', '16%', '10%']}>
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
