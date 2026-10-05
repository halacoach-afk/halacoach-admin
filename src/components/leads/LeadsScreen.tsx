'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {
  isApiError,
  listLeads,
  listServices,
  type CatalogService,
  type LeadSummary,
} from '@/api';
import {Button} from '@/components/ui/Button';
import {DataTable, FilterBar} from '@/components/ui/DataTable';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {PaginationBar} from '@/components/ui/PaginationBar';
import {leadPreferenceDisplay} from '@/lib/lead-preference-labels';
import {formatPostedAt} from '@/lib/lead-utils';
import {
  DEFAULT_PER_PAGE,
  emptyPaginationMeta,
  type PaginationMeta,
} from '@/lib/pagination';

type Filter = 'open' | 'in_progress' | 'closed';

function Cell({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <td className={`px-4 py-3 align-top text-sm text-foreground ${className ?? ''}`}>
      <div className="max-w-[180px] whitespace-normal break-words">{value}</div>
    </td>
  );
}

export function LeadsScreen() {
  const [rows, setRows] = useState<LeadSummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyPaginationMeta());
  const [counts, setCounts] = useState<Record<string, number>>({
    open: 0,
    in_progress: 0,
    closed: 0,
  });
  const [page, setPage] = useState(1);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('open');

  const load = async (nextPage = page, nextFilter = filter) => {
    setLoading(true);
    setError(null);
    try {
      const [leads, catalog] = await Promise.all([
        listLeads({page: nextPage, perPage: DEFAULT_PER_PAGE, status: nextFilter}),
        listServices(),
      ]);
      setRows(leads.data);
      setMeta(leads.meta);
      setPage(leads.meta.page);
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
    void load(1, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

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
        description="Client training requests across the marketplace."
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      <FilterBar>
        {(
          [
            ['open', 'New'],
            ['in_progress', 'In progress'],
            ['closed', 'Closed'],
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
      </FilterBar>

      {rows.length === 0 ? (
        <EmptyState title="No leads match" body="Try another status tab." />
      ) : (
        <DataTable
          tableClassName="min-w-[1600px]"
          columns={[
            'ID',
            'Goal',
            'Goal details',
            'Format',
            'Frequency',
            'Days',
            'Times',
            'Location',
            'Client',
            'Assigned coach',
            'Posted',
            '',
          ]}>
          {rows.map(row => {
            const serviceName =
              serviceNameById.get(row.serviceId) ?? row.service ?? row.goal ?? `Service #${row.serviceId}`;
            const prefs = leadPreferenceDisplay(row, serviceName);
            return (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 align-top text-sm text-muted-foreground">{row.id}</td>
                <td className="px-4 py-3 align-top text-sm font-medium text-foreground">{prefs.goal}</td>
                <Cell value={prefs.goalDetails} className="min-w-[140px]" />
                <Cell value={prefs.format} />
                <Cell value={prefs.frequency} />
                <Cell value={prefs.days} />
                <Cell value={prefs.times} />
                <Cell value={prefs.location} />
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
                  {formatPostedAt(row.postedAt)}
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

      <PaginationBar
        meta={meta}
        disabled={loading}
        onPageChange={next => void load(next)}
      />
    </>
  );
}
