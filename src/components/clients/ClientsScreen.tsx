'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {isApiError, listClients, type ClientSummary, type SessionUser} from '@/api';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {DataTable, FilterBar} from '@/components/ui/DataTable';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';

type Filter = 'all' | 'onboarded' | 'incomplete' | 'suspended';

function servicesText(services: string[]) {
  return services.length ? services.join(', ') : '—';
}

export function ClientsScreen({actor}: {actor: SessionUser}) {
  const [rows, setRows] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listClients());
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load clients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(row => {
      if (filter === 'onboarded' && !row.onboarded) {
        return false;
      }
      if (filter === 'incomplete' && row.onboarded) {
        return false;
      }
      if (filter === 'suspended' && !row.suspended) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.location.toLowerCase().includes(q)
      );
    });
  }, [rows, filter, query]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      onboarded: rows.filter(row => row.onboarded).length,
      incomplete: rows.filter(row => !row.onboarded).length,
      suspended: rows.filter(row => row.suspended).length,
    }),
    [rows],
  );

  if (loading) {
    return <LoadingState label="Loading clients…" />;
  }

  if (error) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  return (
    <>
      <PageHeader
        module="M6"
        title="Clients"
        description="Onboarding questionnaire (14 steps), signup consent, and saved coaches. OTP is deferred in the mobile app."
      />

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
            {label} ({counts[key]})
          </Button>
        ))}
        <input
          className="ms-auto h-9 min-w-[200px] rounded-xl border border-border px-3 text-sm"
          placeholder="Search name, email, location…"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </FilterBar>

      {visible.length === 0 ? (
        <EmptyState title="No clients match" body="Try another filter or clear the search box." />
      ) : (
        <DataTable columns={['Client', 'Location', 'Services', 'Onboarded', 'Saved', '']}>
          {visible.map(row => (
            <tr key={row.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3">
                <div className="font-medium text-foreground">{row.name}</div>
                <div className="text-xs text-muted-foreground">{row.email}</div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{row.location}</td>
              <td className="px-4 py-3 text-sm">{servicesText(row.services)}</td>
              <td className="px-4 py-3">
                {row.suspended ? (
                  <Badge tone="danger">Suspended</Badge>
                ) : row.onboarded ? (
                  <Badge tone="primary">Complete</Badge>
                ) : (
                  <Badge tone="muted">Incomplete</Badge>
                )}
              </td>
              <td className="px-4 py-3">{row.savedCount}</td>
              <td className="px-4 py-3 text-end">
                <Link
                  href={`/clients/${row.id}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  View
                  <ChevronRight size={16} />
                </Link>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Signed in as {actor.name} ({actor.role}). Incomplete usually means a half-created DB user
        outside the app (mobile signup is register + data in one step).
      </p>
    </>
  );
}
