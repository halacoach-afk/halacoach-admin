'use client';

import Link from 'next/link';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {ChevronRight} from 'lucide-react';
import {
  isApiError,
  listSupportTickets,
  type SessionUser,
  type SupportTicketDetail,
  type SupportTicketSummary,
} from '@/api';
import {SupportDetailModal} from '@/components/support/SupportDetailScreen';
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

type Filter = 'all' | 'new' | 'in_progress' | 'closed';

function profileHref(row: SupportTicketSummary): string | null {
  if (!row.userId || row.userType === 'guest') {
    return null;
  }
  return row.userType === 'professional'
    ? `/professionals/${row.userId}`
    : `/clients/${row.userId}`;
}

export function SupportScreen({
  actor,
  initialTicketId = null,
}: {
  actor: SessionUser;
  initialTicketId?: number | null;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<SupportTicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [openTicketId, setOpenTicketId] = useState<number | null>(initialTicketId);

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

  useEffect(() => {
    setOpenTicketId(initialTicketId);
  }, [initialTicketId]);

  const closeModal = useCallback(() => {
    setOpenTicketId(null);
    if (initialTicketId != null) {
      router.replace('/support');
    }
  }, [initialTicketId, router]);

  const onUpdated = useCallback((ticket: SupportTicketDetail) => {
    setRows(prev =>
      prev.map(row =>
        row.id === ticket.id
          ? {
              ...row,
              status: ticket.status,
              subject: ticket.subject,
              body: ticket.body,
              userName: ticket.userName,
              userEmail: ticket.userEmail,
              userPhone: ticket.userPhone,
              repliedAt: ticket.repliedAt,
            }
          : row,
      ),
    );
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
        (row.body || '').toLowerCase().includes(q) ||
        row.userName.toLowerCase().includes(q) ||
        row.userEmail.toLowerCase().includes(q) ||
        (row.userPhone || '').toLowerCase().includes(q)
      );
    });
  }, [rows, filter, query]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      new: rows.filter(row => row.status === 'new').length,
      in_progress: rows.filter(row => row.status === 'in_progress').length,
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
            ['new', 'Open'],
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
          placeholder="Search subject, name, email, phone..."
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </FilterBar>

      {visible.length === 0 ? (
        <EmptyState title="No tickets match" body="Try another filter or clear the search box." />
      ) : (
        <DataTable
          columns={[
            'ID',
            'Subject',
            'Message',
            'Name',
            'Email',
            'Phone',
            'Type',
            'Status',
            'Received',
            '',
          ]}>
          {visible.map(row => {
            const href = profileHref(row);
            return (
              <tr key={row.id} className="border-t border-border">
                <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground whitespace-nowrap">
                  {row.id}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-foreground max-w-[180px]">
                  {row.subject}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground max-w-[280px]">
                  <p className="line-clamp-2 whitespace-pre-wrap break-words">
                    {row.body?.trim() ? row.body : '—'}
                  </p>
                </td>
                <td className="px-4 py-3 text-sm text-foreground">
                  {href ? (
                    <Link href={href} className="font-medium text-primary hover:underline">
                      {row.userName}
                    </Link>
                  ) : (
                    row.userName
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{row.userEmail}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {row.userPhone?.trim() ? row.userPhone : '—'}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    tone={
                      row.userType === 'professional'
                        ? 'muted'
                        : row.userType === 'guest'
                          ? 'warning'
                          : 'sky'
                    }>
                    {supportUserTypeLabels[row.userType]}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={supportStatusTone[row.status]}>
                    {supportStatusLabels[row.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                  {formatSupportTimestamp(row.createdAt)}
                </td>
                <td className="px-4 py-3 text-end">
                  <button
                    type="button"
                    onClick={() => setOpenTicketId(row.id)}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                    Open
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}

      <SupportDetailModal
        actor={actor}
        ticketId={openTicketId}
        open={openTicketId != null}
        onClose={closeModal}
        onUpdated={onUpdated}
      />
    </>
  );
}
