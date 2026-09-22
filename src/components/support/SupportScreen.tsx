'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {isApiError, listSupportTickets, type SessionUser, type SupportTicketSummary} from '@/api';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {DataTable, FilterBar} from '@/components/ui/DataTable';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {
  formatSupportTimestamp,
  supportStatusLabels,
  supportStatusTone,
  supportUserTypeLabels,
} from '@/lib/support-utils';

type Filter = 'all' | 'new' | 'replied' | 'closed';

export function SupportScreen(_props: {actor: SessionUser}) {
  const [rows, setRows] = useState<SupportTicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listSupportTickets());
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load support inbox.');
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
      if (filter !== 'all' && row.status !== filter) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        row.subject.toLowerCase().includes(q) ||
        row.userName.toLowerCase().includes(q) ||
        row.userEmail.toLowerCase().includes(q)
      );
    });
  }, [rows, filter, query]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      new: rows.filter(row => row.status === 'new').length,
      replied: rows.filter(row => row.status === 'replied').length,
      closed: rows.filter(row => row.status === 'closed').length,
    }),
    [rows],
  );

  if (loading) {
    return <LoadingState label="Loading support inbox..." />;
  }

  if (error) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  return (
    <>
      <PageHeader
        title="Support"
        description="Contact-us messages from clients and professionals in the mobile app."
      />

      <FilterBar>
        {(
          [
            ['all', 'All'],
            ['new', 'New'],
            ['replied', 'Replied'],
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
          placeholder="Search subject, user, email..."
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </FilterBar>

      {visible.length === 0 ? (
        <EmptyState title="No tickets match" body="Try another filter or clear the search box." />
      ) : (
        <DataTable
          columns={['Subject', 'User', 'Type', 'Status', 'Received', '']}>
          {visible.map(row => (
            <tr key={row.id} className="border-t border-border">
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">{row.subject}</p>
                <p className="text-xs text-muted-foreground">{row.userEmail}</p>
              </td>
              <td className="px-4 py-3 text-sm">{row.userName}</td>
              <td className="px-4 py-3">
                <Badge tone="sky">{supportUserTypeLabels[row.userType]}</Badge>
              </td>
              <td className="px-4 py-3">
                <Badge tone={supportStatusTone[row.status]}>
                  {supportStatusLabels[row.status]}
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {formatSupportTimestamp(row.createdAt)}
              </td>
              <td className="px-4 py-3 text-end">
                <Link
                  href={`/support/${row.id}`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  Open
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </>
  );
}
