'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {isApiError, listClients, type ClientSummary} from '@/api';
import {Button} from '@/components/ui/Button';
import {DataTable, FilterBar} from '@/components/ui/DataTable';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {formatDobWithBand} from '@/lib/age-display';
import {completionPercent} from '@/lib/professional-utils';

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

export function ClientsScreen() {
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
        row.id.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.phone.toLowerCase().includes(q) ||
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
    return <LoadingState label="Loading clients..." />;
  }

  if (error) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  return (
    <>
      <PageHeader
        title="Clients"
        description="Browse and manage client accounts."
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
          placeholder="Search id, name, email, phone..."
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </FilterBar>

      {visible.length === 0 ? (
        <EmptyState title="No clients match" body="Try another filter or clear the search box." />
      ) : (
        <DataTable
          columns={['ID', 'Name', 'Email', 'Number', 'Birth date', 'Profile', '']}>
          {visible.map(row => {
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
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {formatDobWithBand(row.birthDate) ?? '—'}
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
                    href={`/clients/${row.id}`}
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
