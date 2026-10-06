'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {isApiError, type CreditsOverview} from '@/api';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {DataTable, FilterBar} from '@/components/ui/DataTable';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PaginationBar} from '@/components/ui/PaginationBar';
import {creditTxnLabel, creditTxnTypeLabel, formatAed} from '@/lib/credit-utils';
import {
  DEFAULT_PER_PAGE,
  buildListQuery,
  emptyPaginationMeta,
  type PaginationMeta,
} from '@/lib/pagination';
import {request} from '@/lib/request';

type TxnFilter = 'all' | 'credited' | 'spent';

function formatWhenParts(value: string): {date: string; time: string} | null {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString(),
  };
}

export function TransactionsScreen({
  embedded: _embedded = false,
  refreshKey = 0,
}: {
  embedded?: boolean;
  refreshKey?: number;
}) {
  const [transactions, setTransactions] = useState<CreditsOverview['transactions']>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyPaginationMeta());
  const [counts, setCounts] = useState<Record<string, number>>({
    all: 0,
    credited: 0,
    spent: 0,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TxnFilter>('all');

  const load = async (nextPage = page, nextFilter = filter) => {
    setLoading(true);
    setError(null);
    try {
      const res = await request<Omit<CreditsOverview, 'packs' | 'promos'>>(
        `/v1/credits-meta${buildListQuery({
          page: nextPage,
          perPage: DEFAULT_PER_PAGE,
          filter: nextFilter === 'all' ? undefined : nextFilter,
        })}`,
      );
      setTransactions(res.transactions ?? []);
      setMeta(
        res.meta ?? {
          page: nextPage,
          perPage: DEFAULT_PER_PAGE,
          total: res.transactions?.length ?? 0,
          lastPage: 1,
        },
      );
      setPage(res.meta?.page ?? nextPage);
      if (res.counts) {
        setCounts(res.counts);
      }
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load transactions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(1, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    if (refreshKey === 0) {
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  if (loading && transactions.length === 0) {
    return <LoadingState label="Loading transactions..." />;
  }

  if (error && transactions.length === 0) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  return (
    <>
      <h2 className="mb-4 text-lg font-semibold text-foreground">Transactions</h2>

      <FilterBar>
        {(
          [
            ['all', 'All'],
            ['credited', 'Purchasings'],
            ['spent', 'Spendings'],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? 'primary' : 'outline'}
            onClick={() => setFilter(key)}>
            {label} ({counts[key] ?? 0})
          </Button>
        ))}
      </FilterBar>

      {transactions.length === 0 ? (
        <EmptyState title="No transactions" body="Try another filter." />
      ) : (
        <DataTable columns={['ID', 'Coach', 'Type', 'Credits', 'Details', 'Paid', 'When']}>
          {transactions.map(txn => {
            const when = formatWhenParts(txn.at);
            return (
              <tr key={txn.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">
                  {txn.id}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">
                    {txn.professionalId ? (
                      <Link
                        href={`/professionals/${txn.professionalId}`}
                        className="text-primary hover:underline">
                        {txn.professionalName}
                      </Link>
                    ) : (
                      txn.professionalName
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {txn.professionalEmail ?? txn.professionalId}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    tone={
                      txn.type === 'purchase'
                        ? 'primary'
                        : txn.type === 'spend'
                          ? 'coral'
                          : 'sky'
                    }>
                    {creditTxnTypeLabel(txn.type)}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-medium">
                  {txn.credits > 0 ? `+${txn.credits}` : String(txn.credits)}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {creditTxnLabel(txn.label)}
                  {txn.orderId ? ` | ${txn.orderId}` : ''}
                </td>
                <td className="px-4 py-3 text-sm">
                  {typeof txn.totalAed === 'number' ? formatAed(txn.totalAed) : '-'}
                </td>
                <td className="px-4 py-3">
                  {when ? (
                    <div>
                      <div className="text-sm text-foreground">{when.date}</div>
                      <div className="text-xs text-muted-foreground">{when.time}</div>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            );
          })}
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
