'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {isApiError, listOnlinePlans, type OnlinePlanSummary} from '@/api';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {DataTable} from '@/components/ui/DataTable';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listOnlinePlans());
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load online plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return rows;
    }
    return rows.filter(
      row =>
        row.name.toLowerCase().includes(q) ||
        row.coachName.toLowerCase().includes(q) ||
        row.goal.toLowerCase().includes(q) ||
        (row.clientUserEmail ?? '').toLowerCase().includes(q),
    );
  }, [rows, query]);

  if (loading) {
    return <LoadingState label="Loading online plans…" />;
  }

  if (error) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  return (
    <>
      <PageHeader
        title="Online plans"
        description="Live coaching plans from the coach Clients tab — intake, drafts, and published programs."
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className="h-9 w-full max-w-sm rounded-xl border border-border px-3 text-sm"
          placeholder="Search client, coach, or goal…"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Read-only · {rows.length} plan{rows.length === 1 ? '' : 's'}
        </p>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No online plans yet"
          body="When coaches generate or publish plans in the mobile Clients tab, they appear here."
        />
      ) : (
        <DataTable
          columns={['Client', 'Coach', 'Status', 'PAR-Q', 'Days', 'Updated', '']}>
          {visible.map(row => (
            <tr key={row.id} className="border-t border-border">
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">{row.name}</p>
                <p className="text-xs text-muted-foreground">
                  {row.goal} · {row.frequency}
                </p>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {row.coachName}
              </td>
              <td className="px-4 py-3">
                <Badge tone={statusTone(row.status)}>{row.status}</Badge>
              </td>
              <td className="px-4 py-3">
                <Badge tone={row.parq === 'cleared' ? 'primary' : 'danger'}>
                  {row.parq}
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm">{row.dayCount}</td>
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
    </>
  );
}
