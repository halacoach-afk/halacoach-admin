'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {isApiError, listOnlinePlans, type OnlinePlanSummary} from '@/api';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {DataTable} from '@/components/ui/DataTable';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {PaginationBar} from '@/components/ui/PaginationBar';
import {
  DEFAULT_PER_PAGE,
  emptyPaginationMeta,
  type PaginationMeta,
} from '@/lib/pagination';

function statusTone(status: string): 'primary' | 'muted' | 'warning' | 'danger' {
  if (status === 'published') {
    return 'primary';
  }
  if (status === 'draft') {
    return 'warning';
  }
  return 'muted';
}

export function OnlineClientsScreen() {
  const [rows, setRows] = useState<OnlinePlanSummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyPaginationMeta());
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (nextPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listOnlinePlans({page: nextPage, perPage: DEFAULT_PER_PAGE});
      setRows(res.data);
      setMeta(res.meta);
      setPage(res.meta.page);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load online plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && rows.length === 0) {
    return <LoadingState label="Loading online plans..." />;
  }

  if (error && rows.length === 0) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  return (
    <>
      <PageHeader
        title="Online plans"
        description="Live coaching plans from the coach Clients tab - intake, drafts, and published programs."
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No online plans yet"
          body="When coaches generate or publish plans in the mobile Clients tab, they appear here."
        />
      ) : (
        <DataTable
          columns={['Goal', 'Client', 'Coach', 'Status', 'PAR-Q', 'Updated', '']}>
          {rows.map(row => (
            <tr key={row.id} className="border-t border-border">
              <td className="px-4 py-3 text-sm text-muted-foreground">{row.goal}</td>
              <td className="px-4 py-3 text-sm">
                {row.clientUserId ? (
                  <Link
                    href={`/clients/${row.clientUserId}`}
                    className="font-medium text-primary hover:underline">
                    {row.name}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">{row.name}</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm">
                {row.coachId > 0 && row.coachName?.trim() ? (
                  <Link
                    href={`/professionals/${row.coachId}`}
                    className="font-medium text-primary hover:underline">
                    {row.coachName}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">{row.coachName || '-'}</span>
                )}
              </td>
              <td className="px-4 py-3">
                <Badge tone={statusTone(row.status)}>{row.status}</Badge>
              </td>
              <td className="px-4 py-3">
                <Badge tone={row.parq === 'cleared' ? 'primary' : 'danger'}>
                  {row.parq}
                </Badge>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {new Date(row.updatedAt).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-end">
                <Link
                  href={`/online-clients/${row.id}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Open <ChevronRight className="size-4" />
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
