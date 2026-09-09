'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {isApiError, listConversations, type ConversationSummary} from '@/api';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {DataTable} from '@/components/ui/DataTable';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {formatMessageTime} from '@/lib/message-utils';

function conversationGoal(row: ConversationSummary) {
  return (row.goal || row.professionalSpecialty || '').trim();
}

export function MessagesScreen() {
  const [rows, setRows] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listConversations());
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load conversations.');
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
    return rows.filter(row => {
      const goal = conversationGoal(row).toLowerCase();
      return (
        row.id.toLowerCase().includes(q) ||
        row.clientName.toLowerCase().includes(q) ||
        row.professionalName.toLowerCase().includes(q) ||
        row.lastMessage.toLowerCase().includes(q) ||
        goal.includes(q) ||
        (row.leadId != null && String(row.leadId).includes(q))
      );
    });
  }, [rows, query]);

  if (loading) {
    return <LoadingState label="Loading conversations…" />;
  }

  if (error) {
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

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className="h-9 w-full max-w-sm rounded-xl border border-border px-3 text-sm"
          placeholder="Search ID, client, coach, goal, or message…"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          body="When a coach unlocks a lead or a client messages a coach, threads appear here."
        />
      ) : (
        <DataTable
          columns={['ID', 'Client', 'Coach', 'Goal', 'Last message', 'Messages', 'Updated', '']}>
          {visible.map(row => {
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
                  <p className="text-sm font-medium text-foreground">{goal || '—'}</p>
                </td>
                <td className="max-w-md px-4 py-3">
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {row.lastMessage || '—'}
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
    </>
  );
}
