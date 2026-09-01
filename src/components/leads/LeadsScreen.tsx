'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {isApiError, listLeads, listServices, type CatalogService, type LeadSummary, type SessionUser} from '@/api';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {DataTable, FilterBar} from '@/components/ui/DataTable';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {formatPostedAt} from '@/lib/lead-utils';

type Filter = 'all' | 'open' | 'unlocked' | 'closed';

export function LeadsScreen({actor}: {actor: SessionUser}) {
  const [rows, setRows] = useState<LeadSummary[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
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
      if (filter === 'open' && (row.status !== 'open' || row.unlockCount > 0)) {
        return false;
      }
      if (filter === 'unlocked' && row.unlockCount === 0) {
        return false;
      }
      if (filter === 'closed' && row.status !== 'closed') {
        return false;
      }
      if (!q) {
        return true;
      }
      const serviceName = serviceNameById.get(row.serviceId) ?? '';
      return (
        row.goal.toLowerCase().includes(q) ||
        row.clientName.toLowerCase().includes(q) ||
        row.location.toLowerCase().includes(q) ||
        serviceName.toLowerCase().includes(q)
      );
    });
  }, [rows, filter, query, serviceNameById]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      open: rows.filter(row => row.status === 'open' && row.unlockCount === 0).length,
      unlocked: rows.filter(row => row.unlockCount > 0).length,
      closed: rows.filter(row => row.status === 'closed').length,
    }),
    [rows],
  );

  if (loading) {
    return <LoadingState label="Loading leads…" />;
  }

  if (error) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  return (
    <>
      <PageHeader
        module="M7"
        title="Leads"
        description="Client requests in the marketplace, credit unlock cost, and which coaches unlocked contact details. Closed leads stay here for ops but are hidden from the coach app."
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      <FilterBar>
        {(
          [
            ['all', 'All'],
            ['open', 'New'],
            ['unlocked', 'Unlocked'],
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
          className="ms-auto h-9 min-w-[200px] rounded-xl border border-border px-3 text-sm"
          placeholder="Search goal, client, location…"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </FilterBar>

      {visible.length === 0 ? (
        <EmptyState title="No leads match" body="Try another filter or clear the search box." />
      ) : (
        <DataTable
          columns={['Goal', 'Client', 'Location', 'Format', 'Unlocks', 'Posted', '']}>
          {visible.map(row => (
            <tr key={row.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3">
                <div className="font-medium text-foreground">{row.goal}</div>
                <div className="text-xs text-muted-foreground">
                  {serviceNameById.get(row.serviceId) ?? row.service ?? `#${row.serviceId}`}
                  {row.frequency ? ` · ${row.frequency}` : ''}
                </div>
              </td>
              <td className="px-4 py-3 text-sm">{row.clientName}</td>
              <td className="px-4 py-3 text-muted-foreground">{row.location}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{row.format ?? '—'}</td>
              <td className="px-4 py-3">
                {row.unlockCount > 0 ? (
                  <Badge tone="primary">{row.unlockCount}</Badge>
                ) : (
                  <Badge tone="muted">0</Badge>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {formatPostedAt(row.postedAt)}
              </td>
              <td className="px-4 py-3 text-end">
                <div className="flex items-center justify-end gap-2">
                  {row.status === 'closed' ? <Badge tone="danger">Closed</Badge> : null}
                  <Link
                    href={`/leads/${row.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    View
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Signed in as {actor.name} ({actor.role}). Coaches spend credits to unlock client contact on
        each lead.
      </p>
    </>
  );
}
