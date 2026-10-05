'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {isApiError, listConversations, type ConversationSummary} from '@/api';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {DataTable} from '@/components/ui/DataTable';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {PaginationBar} from '@/components/ui/PaginationBar';
import {formatMessageTime} from '@/lib/message-utils';
import {
  DEFAULT_PER_PAGE,
  emptyPaginationMeta,
  type PaginationMeta,
} from '@/lib/pagination';

function conversationGoal(row: ConversationSummary) {
  return (row.goal || row.professionalSpecialty || '').trim();
}

export function MessagesScreen() {
  const [rows, setRows] = useState<ConversationSummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyPaginationMeta());
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (nextPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listConversations({page: nextPage, perPage: DEFAULT_PER_PAGE});
      setRows(res.data);
      setMeta(res.meta);
      setPage(res.meta.page);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load conversations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && rows.length === 0) {
    return <LoadingState label="Loading conversations..." />;
  }

  if (error && rows.length === 0) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  return (
    <>
      <PageHeader
        title="Messages"
        description="Unlocking a lead opens a conversation"
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          body="When a coach unlocks a lead or a client messages a coach, threads appear here."
        />
      ) : (
        <DataTable
          columns={['ID', 'Client', 'Coach', 'Goal', 'Last message', 'Messages', 'Updated', '']}>
          {rows.map(row => {
            const goal = conversationGoal(row);
            return (
              <tr key={row.id} className="border-t border-border">
                <td className="px-4 py-3 font-mono text-sm font-semibold text-foreground">
                  {row.id}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/clients/${row.clientId}`}
                    className="font-medium text-foreground hover:text-primary">
                    {row.clientName}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/professionals/${row.professionalId}`}
                    className="font-medium text-foreground hover:text-primary">
                    {row.professionalName}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-foreground">{goal || '-'}</p>
                </td>
                <td className="max-w-md px-4 py-3">
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {row.lastMessage || '-'}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <Badge tone="muted">{row.messageCount}</Badge>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {formatMessageTime(row.lastMessageAt)}
                </td>
                <td className="px-4 py-3 text-end">
                  <Link
                    href={`/messages/${row.id}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    View messages
                    <ChevronRight className="h-4 w-4" />
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
