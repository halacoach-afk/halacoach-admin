'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {
  isApiError,
  listLeads,
  listServices,
  type CatalogService,
  type LeadLifecycleStatus,
  type LeadSummary,
} from '@/api';
import {Button} from '@/components/ui/Button';
import {DataTable, FilterBar} from '@/components/ui/DataTable';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {leadPreferenceDisplay} from '@/lib/lead-preference-labels';
import {formatPostedAt} from '@/lib/lead-utils';

type Filter = 'open' | 'in_progress' | 'closed';

function resolvedLeadStatus(row: LeadSummary): LeadLifecycleStatus {
  if (row.leadStatus) {
    return row.leadStatus;
  }
  return row.status === 'closed' ? 'cancelled' : 'open';
}

function matchesTab(row: LeadSummary, filter: Filter) {
  const status = resolvedLeadStatus(row);
  if (filter === 'open') {
    return status === 'open';
  }
  if (filter === 'in_progress') {
    return status === 'in_progress';
  }
  return status === 'completed' || status === 'cancelled';
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
      <div className="max-w-[180px] whitespace-normal break-words">{value}</div>
    </td>
  );
}

export function LeadsScreen() {
  const [rows, setRows] = useState<LeadSummary[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('open');
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [leads, catalog] = await Promise.all([listLeads(), listServices()]);
      setRows(leads);
      setServices(catalog);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load leads.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const serviceNameById = useMemo(
    () => new Map(services.map(item => [item.id, item.name])),
    [services],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(row => {
      if (!matchesTab(row, filter)) {
        return false;
      }
      if (!q) {
        return true;
      }
      const serviceName = serviceNameById.get(row.serviceId) ?? row.service ?? '';
      const prefs = leadPreferenceDisplay(row, serviceName);
      const haystack = [
        String(row.id),
        row.clientName,
        row.assignedCoachName,
        prefs.goal,
        prefs.format,
        prefs.frequency,
        prefs.days,
        prefs.times,
        prefs.location,
        prefs.goalDetails,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, filter, query, serviceNameById]);

  const counts = useMemo(
    () => ({
      open: rows.filter(row => matchesTab(row, 'open')).length,
      in_progress: rows.filter(row => matchesTab(row, 'in_progress')).length,
      closed: rows.filter(row => matchesTab(row, 'closed')).length,
    }),
    [rows],
  );

  if (loading) {
    return <LoadingState label="Loading leads..." />;
  }

  if (error) {
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
            {label} ({counts[key]})
          </Button>
        ))}
        <input
          className="ms-auto h-9 min-w-[220px] rounded-xl border border-border px-3 text-sm"
          placeholder="Search ID, client, goal, location..."
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </FilterBar>

      {visible.length === 0 ? (
        <EmptyState title="No leads match" body="Try another filter or clear the search box." />
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
          {visible.map(row => {
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
    </>
  );
}
