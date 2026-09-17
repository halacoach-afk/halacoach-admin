'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {isApiError, type SessionUser} from '@/api';
import type {CreditSubscriptionAdmin} from '@/api/types';
import {listCreditSubscriptions} from '@/lib/apis';
import {Badge} from '@/components/ui/Badge';
import {DataTable, FilterBar} from '@/components/ui/DataTable';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {formatAed} from '@/lib/credit-utils';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listCreditSubscriptions());
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load subscriptions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const counts = useMemo(
    () => ({
      all: rows.length,
      active: rows.filter(row => row.status === 'active').length,
      canceled: rows.filter(row => row.status === 'canceled').length,
      expired: rows.filter(row => row.status === 'expired').length,
      past_due: rows.filter(row => row.status === 'past_due').length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(row => {
      if (filter !== 'all' && row.status !== filter) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        row.professionalName.toLowerCase().includes(q) ||
        (row.professionalEmail ?? '').toLowerCase().includes(q) ||
        (row.package?.name ?? '').toLowerCase().includes(q) ||
        row.id.includes(q)
      );
    });
  }, [rows, filter, query]);

  if (loading && rows.length === 0) {
    return <LoadingState label="Loading subscriptions..." />;
  }

  if (error && rows.length === 0) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  return (
    <>
      <PageHeader
        module="M9b"
        title="Subscriptions"
        description="Membership plans, period usage, wallet balance, and renewal status for coaches."
      />

      <FilterBar>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['all', `All (${counts.all})`],
              ['active', `Active (${counts.active})`],
              ['past_due', `Past due (${counts.past_due})`],
              ['canceled', `Canceled (${counts.canceled})`],
              ['expired', `Expired (${counts.expired})`],
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

      {visible.length === 0 ? (
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
          {visible.map(sub => (
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
    </>
  );
}
