'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {
  isApiError,
  listCmsContents,
  type CmsContent,
  type SessionUser,
} from '@/api';
import {Badge} from '@/components/ui/Badge';
import {DataTable} from '@/components/ui/DataTable';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {can} from '@/lib/permissions';

function titleOf(row: CmsContent): string {
  const content = row.content as {en?: {title?: string}} | undefined;
  return content?.en?.title?.trim() || `Guide #${row.id}`;
}

function audienceOf(row: CmsContent): string {
  const content = row.content as {audience?: string} | undefined;
  return content?.audience === 'professional' ? 'Professional' : 'Client';
}

export function CmsScreen({actor}: {actor: SessionUser}) {
  const canWrite = can(actor, 'cms:write');
  const [rows, setRows] = useState<CmsContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const list = await listCmsContents({type: 'resource_guide'});
        if (!cancelled) setRows(list);
      } catch (err) {
        if (!cancelled) {
          setError(isApiError(err) ? err.message : 'Failed to load CMS content.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const publishedCount = useMemo(
    () => rows.filter(r => r.status === 'published').length,
    [rows],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="CMS"
        description="Manage Resources & Guides shown on the public website."
        actions={
          canWrite ? (
            <Link
              href="/cms/new"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-deep">
              New guide
            </Link>
          ) : null
        }
      />

      <p className="text-sm text-muted-foreground">
        Resource guides · {publishedCount} published · {rows.length} total
      </p>

      {loading ? <LoadingState /> : null}
      {!loading && error ? <ErrorState body={error} /> : null}

      {!loading && !error ? (
        <DataTable columns={['ID', 'Title', 'Audience', 'Status', 'Actions']}>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                No guides yet.
              </td>
            </tr>
          ) : null}
          {rows.map(row => (
            <tr key={row.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 font-mono text-sm">{row.id}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/cms/${row.id}`}
                  className="font-medium text-foreground hover:text-primary hover:underline">
                  {titleOf(row)}
                </Link>
              </td>
              <td className="px-4 py-3">{audienceOf(row)}</td>
              <td className="px-4 py-3">
                <Badge
                  tone={
                    row.status === 'published'
                      ? 'primary'
                      : row.status === 'archived'
                        ? 'muted'
                        : 'warning'
                  }>
                  {row.status}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/cms/${row.id}`}
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground hover:bg-muted">
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </DataTable>
      ) : null}
    </div>
  );
}
