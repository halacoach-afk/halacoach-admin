'use client';

import Link from 'next/link';
import {useCallback, useEffect, useState} from 'react';
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
import {PaginationBar} from '@/components/ui/PaginationBar';
import {SearchField} from '@/components/ui/SearchField';
import {
  DEFAULT_PER_PAGE,
  emptyPaginationMeta,
  type PaginationMeta,
} from '@/lib/pagination';
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
  const [meta, setMeta] = useState<PaginationMeta>(emptyPaginationMeta());
  const [counts, setCounts] = useState<Record<string, number>>({
    all: 0,
    new: 0,
    in_progress: 0,
    closed: 0,
  });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [openTicketId, setOpenTicketId] = useState<number | null>(initialTicketId);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(query.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [query]);

  const load = async (nextPage = page, nextFilter = filter) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listSupportTickets({
        page: nextPage,
        perPage,
        status: nextFilter === 'all' ? undefined : nextFilter,
        q: debouncedQ || undefined,
      });
      setRows(res.data);
      setMeta(res.meta);
      setPage(res.meta.page);
      if (res.counts) {
        setCounts(res.counts);
      }
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load support inbox.');
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  };

  useEffect(() => {
    void load(1, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, debouncedQ, perPage]);

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

  if (!hasLoaded && loading) {
    return <LoadingState label="Loading support inbox..." />;
  }

  if (!hasLoaded && error) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  return (
    <>
      <PageHeader
        title="Support"
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {error ? <ErrorState body={error} onRetry={() => void load()} /> : null}

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
            {label} ({counts[key] ?? 0})
          </Button>
        ))}
        <SearchField value={query} onChange={setQuery} />
      </FilterBar>

      {loading && rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Searching…</p>
      ) : rows.length === 0 ? (
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
          ]}
          pagination={
            <PaginationBar
              variant="embedded"
              meta={meta}
              disabled={loading}
              onPageChange={next => void load(next)}
              onPerPageChange={next => {
                setPage(1);
                setPerPage(next);
              }}
            />
          }>
          {rows.map(row => {
            const href = profileHref(row);
            return (
              <tr key={row.id} className="border-t border-border">
                <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground whitespace-nowrap">
                  {row.id}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-foreground">
                  {row.subject}
                </td>
                <td
                  className="max-w-[14rem] truncate px-4 py-3 text-sm text-muted-foreground"
                  title={row.body?.trim() || undefined}>
                  {row.body?.trim()
                    ? row.body.trim().length > 72
                      ? `${row.body.trim().slice(0, 72)}…`
                      : row.body.trim()
                    : '—'}
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
